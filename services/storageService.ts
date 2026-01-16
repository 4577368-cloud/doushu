import { UserProfile, HistoryItem } from '../types';
import { supabase } from './supabase';

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
 * (登录成功后调用，如果云端有数据，会覆盖本地缓存)
 */
export const syncArchivesFromCloud = async (userId: string): Promise<UserProfile[]> => {
  console.log("☁️ [Sync] 正在从云端拉取数据...");
  try {
    const { data, error } = await supabase
      .from('archives')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("❌ [Sync] 拉取失败:", error.message);
      return getArchives(); // 出错退回本地
    }

    if (data && data.length > 0) {
      console.log(`✅ [Sync] 成功拉取 ${data.length} 条云端档案，正在同步到本地...`);
      // 解析数据库结构: { id, data: { ...profile } } -> UserProfile
      const cloudArchives: UserProfile[] = data.map((item: any) => ({
         ...item.data, 
         id: item.id || item.data.id, 
      }));

      // 写入本地缓存 (作为最新源)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudArchives));
      return cloudArchives;
    } else {
        console.log("⚠️ [Sync] 云端无数据 (可能是新用户)");
        return getArchives();
    }
  } catch (error) {
    console.error("❌ [Sync] 发生异常:", error);
    return getArchives();
  }
};

/**
 * 🔥 3. 保存或更新档案 (核心函数：本地+云端双写)
 */
export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  console.log("📝 [Storage] 开始保存档案:", profile.name);
  
  let archives = await getArchives();
  
  // A. 本地数组逻辑：查找是否存在 (优先用ID匹配，其次用关键信息匹配)
  const existingIndex = archives.findIndex(p => 
      p.id === profile.id || 
      (p.birthDate === profile.birthDate && p.birthTime === profile.birthTime && p.name === profile.name)
  );

  let finalProfile = profile;

  if (existingIndex > -1) {
    // 更新旧档案
    const oldProfile = archives[existingIndex];
    finalProfile = {
        ...oldProfile,
        ...profile,
        // 智能合并标签，不丢失旧标签
        tags: Array.from(new Set([...(oldProfile.tags||[]), ...(profile.tags||[])])),
        aiReports: oldProfile.aiReports || [],
        id: oldProfile.id // 保持原ID不变
    };
    archives[existingIndex] = finalProfile;
  } else {
    // 新增档案
    finalProfile = { 
        ...profile, 
        id: profile.id || generateId(), // 确保一定有ID
        createdAt: Date.now(),
        tags: profile.tags || [],
        aiReports: []
    };
    archives.unshift(finalProfile);
  }

  // B. 🔥 第一步：必须立刻写入本地 (保证刷新不丢)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
  console.log("✅ [Storage] 本地保存成功");

  // C. 🔥 第二步：尝试写入云端 (带详细日志)
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
      console.log("☁️ [Storage] 检测到登录状态，正在推送到云端...", session.user.id);
      
      const payload = {
          user_id: session.user.id,
          id: finalProfile.id,
          data: finalProfile, // 直接存整个对象
          updated_at: new Date().toISOString()
      };

      // 使用 upsert: 有则更新，无则插入
      const { error } = await supabase.from('archives').upsert(payload);

      if (error) {
          console.error("❌ [Storage] 云端同步失败! 错误信息:", error.message);
          // 这里的错误通常是 RLS 权限问题，或者表结构不对
      } else {
          console.log("🚀 [Storage] 云端同步成功!", finalProfile.name);
      }
  } else {
      console.warn("⚠️ [Storage] 未登录，仅保存到本地");
  }

  return archives;
};

/**
 * 4. 删除档案
 */
export const deleteArchive = async (id: string): Promise<UserProfile[]> => {
  console.log("🗑️ [Storage] 正在删除档案:", id);
  const archives = await getArchives();
  const newList = archives.filter(p => p.id !== id);
  
  // A. 本地删除
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  localStorage.removeItem(`chat_history_${id}`); // 顺便清理聊天记录

  // B. 云端删除
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
      const { error } = await supabase.from('archives').delete().eq('id', id);
      if (error) console.error("❌ [Storage] 云端删除失败:", error.message);
      else console.log("🚀 [Storage] 云端删除成功");
  }

  return newList;
};

/**
 * 5. 更新档案 (别名，直接复用 saveArchive)
 */
export const updateArchive = async (updatedProfile: UserProfile): Promise<UserProfile[]> => {
  return saveArchive(updatedProfile);
};

/**
 * 6. 保存 AI 报告
 */
export const saveAiReportToArchive = async (
    profileId: string, 
    content: string, 
    type: 'bazi' | 'ziwei'
): Promise<UserProfile[]> => {
    console.log("🤖 [Storage] 保存 AI 报告...");
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
        
        // 插入新报告到头部
        profile.aiReports = [newReport, ...(profile.aiReports || [])];
        archives[index] = profile;
        
        // 复用 saveArchive 逻辑 (它会自动处理本地+云端)
        // 注意：这里我们只传 profile，saveArchive 会识别并更新它
        return saveArchive(profile);
    }
    return archives;
};

// --- VIP 相关 (暂时仅本地，如需云端需建 user_settings 表) ---
export const getVipStatus = async (): Promise<boolean> => {
    return localStorage.getItem('is_vip_user') === 'true';
};

export const activateVipOnCloud = async (): Promise<boolean> => {
    localStorage.setItem('is_vip_user', 'true');
    return true;
};