import { UserProfile, HistoryItem } from '../types';
import { supabase } from './supabase'; // 确保这里正确引入了 supabase

const STORAGE_KEY = 'bazi_archives';

// 模拟 ID 生成
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 1. 基础读取：只读本地 (用于离线显示或未登录时)
 */
export const getArchives = async (): Promise<UserProfile[]> => {
  if (typeof window === 'undefined') return [];
  const json = localStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
};

/**
 * 🔥 2. 从云端拉取并同步到本地
 * (登录成功后调用)
 */
export const syncArchivesFromCloud = async (userId: string): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('archives')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (data) {
      // 假设数据库存的是结构: { id, user_id, data: { ...profile }, updated_at }
      const cloudArchives: UserProfile[] = data.map((item: any) => ({
         ...item.data, 
         id: item.id || item.data.id, 
      }));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudArchives));
      return cloudArchives;
    }
    return [];
  } catch (error) {
    console.error("云端同步失败:", error);
    return getArchives();
  }
};

/**
 * 3. 保存或更新档案 (智能合并 + 云端同步)
 */
export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  const archives = await getArchives();
  
  // A. 本地合并逻辑
  const existingIndex = archives.findIndex(p => 
      p.birthDate === profile.birthDate && 
      p.birthTime === profile.birthTime && 
      p.gender === profile.gender
  );

  let finalProfile = profile;

  if (existingIndex > -1) {
    const oldProfile = archives[existingIndex];
    const newName = (profile.name && profile.name.trim() !== '某某' && profile.name.trim() !== '') 
        ? profile.name 
        : oldProfile.name;
    const mergedTags = Array.from(new Set([...(oldProfile.tags||[]), ...(profile.tags||[])]));
    
    finalProfile = {
        ...oldProfile,
        ...profile,
        name: newName,
        tags: mergedTags,
        aiReports: oldProfile.aiReports || [],
        id: oldProfile.id // 保持原ID
    };
    archives[existingIndex] = finalProfile;
  } else {
    finalProfile = { 
        ...profile, 
        id: generateId(),
        createdAt: Date.now(),
        tags: profile.tags || [],
        aiReports: []
    };
    archives.unshift(finalProfile);
  }

  // B. 写入本地
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

  // C. 写入云端
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
      try {
          await supabase.from('archives').upsert({
              user_id: session.user.id,
              id: finalProfile.id,
              data: finalProfile,
              updated_at: new Date().toISOString()
          });
      } catch (e) {
          console.error("云端保存失败:", e);
      }
  }

  return archives;
};

/**
 * 4. 删除档案 (本地 + 云端)
 */
export const deleteArchive = async (id: string): Promise<UserProfile[]> => {
  const archives = await getArchives();
  const newList = archives.filter(p => p.id !== id);
  
  // A. 本地删除
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  localStorage.removeItem(`chat_history_${id}`); // 同时清理聊天记录

  // B. 云端删除
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
      try {
          await supabase.from('archives').delete().eq('id', id).eq('user_id', session.user.id);
      } catch (e) {
          console.error("云端删除失败:", e);
      }
  }

  return newList;
};

/**
 * 5. 更新档案 (本地 + 云端)
 */
export const updateArchive = async (updatedProfile: UserProfile): Promise<UserProfile[]> => {
  const archives = await getArchives();
  const index = archives.findIndex(p => p.id === updatedProfile.id);
  
  if (index > -1) {
    archives[index] = updatedProfile;
    
    // A. 本地更新
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

    // B. 云端更新
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        try {
            await supabase.from('archives').upsert({
                user_id: session.user.id,
                id: updatedProfile.id,
                data: updatedProfile,
                updated_at: new Date().toISOString()
            });
        } catch (e) {
            console.error("云端更新失败:", e);
        }
    }
  }
  return archives;
};

/**
 * 6. 保存 AI 报告 (本地 + 云端)
 */
export const saveAiReportToArchive = async (
    profileId: string, 
    content: string, 
    type: 'bazi' | 'ziwei'
): Promise<UserProfile[]> => {
    const archives = await getArchives();
    const index = archives.findIndex(p => p.id === profileId);
    
    if (index > -1) {
        const profile = archives[index];
        const newReport: HistoryItem = {
            id: generateId(),
            date: Date.now(),
            content,
            type
        };
        
        const reports = profile.aiReports || [];
        profile.aiReports = [newReport, ...reports];
        archives[index] = profile;
        
        // A. 本地保存
        localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

        // B. 云端保存
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            try {
                await supabase.from('archives').upsert({
                    user_id: session.user.id,
                    id: profile.id,
                    data: profile,
                    updated_at: new Date().toISOString()
                });
            } catch (e) {
                console.error("云端报告保存失败:", e);
            }
        }
    }
    return archives;
};

// --- VIP 相关接口 (保持不变) ---
export const getVipStatus = async (): Promise<boolean> => {
    // 这里简单起见还是读本地，实际生产环境建议也去查数据库
    return localStorage.getItem('is_vip_user') === 'true';
};

export const activateVipOnCloud = async (): Promise<boolean> => {
    localStorage.setItem('is_vip_user', 'true');
    return true;
};