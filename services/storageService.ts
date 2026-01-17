import { UserProfile, HistoryItem } from '../types';
import { supabase } from './supabase';

const STORAGE_KEY = 'bazi_archives';

// 模拟 ID 生成 (建议后续使用 crypto.randomUUID())
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 1. 基础读取：从本地 localStorage 获取数据
 */
export const getArchives = async (): Promise<UserProfile[]> => {
  if (typeof window === 'undefined') return [];
  const json = localStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
};

/**
 * 🔥 2. 强化版云端同步：拉取当前账号数据并智能合并
 * 解决切换账号后数据混淆的问题
 */
export const syncArchivesFromCloud = async (userId: string): Promise<UserProfile[]> => {
  console.log("☁️ [Sync] 正在从云端拉取当前账号数据...");
  let cloudError = null;

  try {
    // 强制按当前登录的 userId 进行过滤
    const { data, error } = await supabase
      .from('archives')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("❌ [Sync] 拉取失败:", error.message);
      cloudError = error.message;
    } else if (data) {
      const cloudArchives: UserProfile[] = data.map((item: any) => ({
        ...item.data,
        id: item.id // 确保使用数据库的主键 ID
      }));

      const localArchives = await getArchives();
      const mergedMap = new Map<string, UserProfile>();

      // 智能合并策略：本地打底，云端覆盖最新状态
      localArchives.forEach(p => mergedMap.set(p.id, p));
      cloudArchives.forEach(p => mergedMap.set(p.id, p));

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => 
        (b.createdAt || 0) - (a.createdAt || 0)
      );

      console.log(`✅ [Sync] 同步完成。当前账号共 ${mergedList.length} 条档案。`);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));
      return mergedList;
    }
  } catch (err: any) {
    console.error("❌ [Sync] 异常:", err);
    cloudError = err.message || "网络连接异常";
  }

  // 如果出错，返回本地数据并在数组上挂载错误标记，供 UI 弹出提示
  const fallbackList = await getArchives();
  if (cloudError) {
    (fallbackList as any)._cloudError = cloudError;
  }
  return fallbackList;
};

/**
 * 🔥 3. 强化版保存：确保数据精准推送到所属账号云端
 */
export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  console.log("📝 [Save] 正在处理档案保存:", profile.name);
  let cloudError = null;
  
  let archives = await getArchives();
  const existingIndex = archives.findIndex(p => p.id === profile.id);
  let finalProfile = profile;

  // 本地数据更新逻辑
  if (existingIndex > -1) {
    const oldProfile = archives[existingIndex];
    finalProfile = {
      ...oldProfile,
      ...profile,
      tags: Array.from(new Set([...(oldProfile.tags || []), ...(profile.tags || [])])),
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

  // 第一步：立刻保存到本地，防止丢数据
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

  // 第二步：异步推送到云端
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    console.log(`☁️ [Cloud] 正在同步【${finalProfile.name}】至云端...`);
    const payload = {
      id: finalProfile.id,
      user_id: session.user.id, // 核心：绑定用户ID
      data: finalProfile,
      updated_at: new Date().toISOString()
    };

    // 使用默认 upsert 逻辑，避免因 onConflict 约束缺失导致的报错
    const { error } = await supabase.from('archives').upsert(payload);
    
    if (error) {
      console.error("❌ [Cloud] 保存失败:", error.message);
      cloudError = error.message;
    } else {
      console.log("🚀 [Cloud] 云端同步成功!");
    }
  }

  if (cloudError) {
    (archives as any)._cloudError = cloudError;
  }
  return archives;
};

/**
 * 🔥 4. 设置本人档案 (云端同步版)
 */
export const setArchiveAsSelf = async (id: string): Promise<UserProfile[]> => {
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
        id: newSelf.id,
        user_id: session.user.id,
        data: newSelf,
        updated_at: new Date().toISOString()
      }));
    }

    if (oldSelf && oldSelf.id !== id) {
      const updatedOldSelf = archives.find(p => p.id === oldSelf.id);
      if (updatedOldSelf) {
        promises.push(supabase.from('archives').upsert({
          id: updatedOldSelf.id,
          user_id: session.user.id,
          data: updatedOldSelf,
          updated_at: new Date().toISOString()
        }));
      }
    }

    try {
      await Promise.all(promises);
    } catch (e: any) {
      cloudError = e.message || "云端状态更新失败";
    }
  }
  
  if (cloudError) {
    (archives as any)._cloudError = cloudError;
  }
  return archives;
};

/**
 * 5. 删除档案 (全量同步)
 */
export const deleteArchive = async (id: string): Promise<UserProfile[]> => {
  let cloudError = null;
  const archives = await getArchives();
  const newList = archives.filter(p => p.id !== id);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  localStorage.removeItem(`chat_history_${id}`);

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { error } = await supabase.from('archives').delete().eq('id', id);
    if (error) cloudError = error.message;
  }

  if (cloudError) {
    (newList as any)._cloudError = cloudError;
  }
  return newList;
};

export const updateArchive = async (p: UserProfile) => saveArchive(p);

export const saveAiReportToArchive = async (pid: string, content: string, type: 'bazi'|'ziwei') => {
  const archives = await getArchives();
  const idx = archives.findIndex(p => p.id === pid);
  if (idx > -1) {
    const p = archives[idx];
    p.aiReports = [{ id: generateId(), date: Date.now(), content, type }, ...(p.aiReports || [])];
    return saveArchive(p);
  }
  return archives;
};

export const getVipStatus = async () => localStorage.getItem('is_vip_user') === 'true';
export const activateVipOnCloud = async () => { localStorage.setItem('is_vip_user', 'true'); return true; };