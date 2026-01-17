import { UserProfile, HistoryItem } from '../types';
import { supabase } from './supabase';

const STORAGE_KEY = 'bazi_archives';

// 模拟 ID 生成
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 1. 基础读取：只读本地
 */
export const getArchives = async (): Promise<UserProfile[]> => {
  if (typeof window === 'undefined') return [];
  const json = localStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
};

/**
 * 🔥 2. 智能同步：拉取云端 -> 合并本地 (保留离线草稿)
 */
export const syncArchivesFromCloud = async (userId: string): Promise<UserProfile[]> => {
  console.log("☁️ [Sync] 正在从云端拉取所有数据...");
  let cloudError = null;

  try {
    const { data, error } = await supabase
      .from('archives')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("❌ [Sync] 拉取失败:", error.message);
      cloudError = error.message;
      // 拉取失败不中断，继续返回本地数据，但标记错误
    } else if (data) {
      const cloudArchives: UserProfile[] = data.map((item: any) => ({
         ...item.data, 
         id: item.id || item.data.id, 
      }));

      const localArchives = await getArchives();
      const mergedMap = new Map<string, UserProfile>();

      // 本地打底，云端覆盖
      localArchives.forEach(p => mergedMap.set(p.id, p));
      cloudArchives.forEach(p => mergedMap.set(p.id, p));

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => 
        (b.createdAt || 0) - (a.createdAt || 0)
      );

      console.log(`✅ [Sync] 完成。共 ${mergedList.length} 条档案。`);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));
      return mergedList;
    }
  } catch (error: any) {
    console.error("❌ [Sync] 异常:", error);
    cloudError = error.message || "未知网络错误";
  }

  // 返回本地数据，如果有云端错误，挂载到数组对象上
  const fallbackList = await getArchives();
  if (cloudError) {
      (fallbackList as any)._cloudError = cloudError;
  }
  return fallbackList;
};

/**
 * 🔥 3. 保存档案：全量同步
 */
export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  console.log("📝 [Save] 保存档案:", profile.name);
  let cloudError = null;
  
  let archives = await getArchives();
  
  const existingIndex = archives.findIndex(p => p.id === profile.id);
  let finalProfile = profile;

  if (existingIndex > -1) {
    const oldProfile = archives[existingIndex];
    finalProfile = {
        ...oldProfile,
        ...profile,
        tags: Array.from(new Set([...(oldProfile.tags||[]), ...(profile.tags||[])])),
        aiReports: oldProfile.aiReports || [],
        id: oldProfile.id 
    };
    archives[existingIndex] = finalProfile;
  } else {
    finalProfile = { 
        ...profile, 
        id: profile.id || generateId(),
        createdAt: Date.now(),
        tags: profile.tags || [],
        aiReports: []
    };
    archives.unshift(finalProfile);
  }

  // 1. 存本地 (必须成功)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

  // 2. 存云端
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
      console.log(`☁️ [Cloud] 正在同步【${finalProfile.name}】...`);
      const payload = {
          user_id: session.user.id,
          id: finalProfile.id,
          data: finalProfile, 
          updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('archives').upsert(payload);
      
      if (error) {
          console.error("❌ [Cloud] 同步失败:", error.message);
          cloudError = error.message;
      } else {
          console.log("🚀 [Cloud] 同步成功!");
      }
  }

  // 如果有云端错误，挂载到返回结果上
  if (cloudError) {
      (archives as any)._cloudError = cloudError;
  }
  return archives;
};

/**
 * 🔥 4. 设为本人
 */
export const setArchiveAsSelf = async (id: string): Promise<UserProfile[]> => {
    console.log("👤 [Self] 切换本人:", id);
    let cloudError = null;
    let archives = await getArchives();
    
    const oldSelf = archives.find(p => p.isSelf);
    archives = archives.map(p => ({
        ...p,
        isSelf: p.id === id
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        const promises = [];
        const newSelf = archives.find(p => p.id === id);
        if (newSelf) {
            promises.push(supabase.from('archives').upsert({
                user_id: session.user.id,
                id: newSelf.id,
                data: newSelf,
                updated_at: new Date().toISOString()
            }));
        }
        if (oldSelf && oldSelf.id !== id) {
            const updatedOldSelf = archives.find(p => p.id === oldSelf.id);
            if (updatedOldSelf) {
                promises.push(supabase.from('archives').upsert({
                    user_id: session.user.id,
                    id: updatedOldSelf.id,
                    data: updatedOldSelf,
                    updated_at: new Date().toISOString()
                }));
            }
        }

        try {
            await Promise.all(promises);
            console.log("🚀 [Self] 状态已同步至云端");
        } catch (e: any) {
            console.error("❌ [Self] 状态同步失败", e);
            cloudError = e.message || "同步失败";
        }
    }
    
    if (cloudError) {
        (archives as any)._cloudError = cloudError;
    }
    return archives;
};

export const deleteArchive = async (id: string): Promise<UserProfile[]> => {
  let cloudError = null;
  const archives = await getArchives();
  const newList = archives.filter(p => p.id !== id);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  localStorage.removeItem(`chat_history_${id}`);

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
      const { error } = await supabase.from('archives').delete().eq('id', id);
      if(error) {
          console.error("❌ [Storage] 云端删除失败", error);
          cloudError = error.message;
      }
  }

  if (cloudError) {
      (newList as any)._cloudError = cloudError;
  }
  return newList;
};

export const updateArchive = async (p: UserProfile) => saveArchive(p);

export const saveAiReportToArchive = async (pid: string, content: string, type: 'bazi'|'ziwei') => {
    const archives = await getArchives();
    const idx = archives.findIndex(p=>p.id===pid);
    if(idx>-1) {
        const p = archives[idx];
        p.aiReports = [{id:generateId(), date:Date.now(), content, type}, ...(p.aiReports||[])];
        return saveArchive(p);
    }
    return archives;
};

export const getVipStatus = async () => localStorage.getItem('is_vip_user') === 'true';
export const activateVipOnCloud = async () => { localStorage.setItem('is_vip_user', 'true'); return true; };