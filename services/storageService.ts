import { UserProfile, HistoryItem } from '../types';
import { supabase } from './supabase';

const STORAGE_KEY = 'bazi_archives';

// 模拟 ID 生成
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substr(2, 9);
};

// 1. 获取本地缓存
export const getArchives = async (): Promise<UserProfile[]> => {
  if (typeof window === 'undefined') return [];
  const json = localStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
};

// 2. 从云端同步
export const syncArchivesFromCloud = async (userId: string): Promise<UserProfile[]> => {
  if (!userId) {
    console.warn("⚠️ [Sync] 无效的 UserId，取消同步");
    return getArchives();
  }

  console.log("☁️ [Sync] 正在拉取云端档案...");
  try {
    const { data, error } = await supabase
      .from('archives')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (data) {
      // 字段映射：数据库下划线 -> 前端驼峰
      const cloudArchives: UserProfile[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        gender: item.gender,
        // ⚠️ 注意：您的数据库字段里没有 birth_date，如果 birth_time 存的是完整时间字符串则没问题
        // 如果 birth_time 只有 "12:00"，那么日期可能会丢失。建议检查数据库是否需要加 birth_date 字段
        birthDate: item.birth_date || '', 
        birthTime: item.birth_time,
        isSolarTime: item.is_solar_time,
        province: item.province,
        city: item.city,
        longitude: item.longitude,
        tags: item.tags || [],
        createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
        isSelf: item.is_self,
        avatar: item.avatar,
        // AI 报告如果没地方存，暂时给空数组，防止报错
        aiReports: [] 
      }));

      const localArchives = await getArchives();
      const mergedMap = new Map<string, UserProfile>();

      localArchives.forEach(p => mergedMap.set(p.id, p));
      cloudArchives.forEach(p => mergedMap.set(p.id, p));

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => 
        (b.createdAt || 0) - (a.createdAt || 0)
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));
      return mergedList;
    }
  } catch (err: any) {
    console.error("❌ [Sync] 失败:", err.message);
  }

  return getArchives();
};

// 3. 保存或更新档案
export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  let archives = await getArchives();
  const existingIndex = archives.findIndex(p => p.id === profile.id);
  let finalProfile = { ...profile };

  if (existingIndex > -1) {
    finalProfile = { ...archives[existingIndex], ...profile };
    archives[existingIndex] = finalProfile;
  } else {
    finalProfile.id = profile.id || generateId();
    finalProfile.createdAt = Date.now();
    archives.unshift(finalProfile);
  }

  // 先存本地
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

  // 后存云端
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    // 🔥 严格只发送数据库存在的字段，移除 extra data
    const payload = {
      id: finalProfile.id,
      user_id: session.user.id,
      name: finalProfile.name,
      gender: finalProfile.gender,
      // 如果您数据库里补了 birth_date 字段，请把下面注释解开
      // birth_date: finalProfile.birthDate, 
      birth_time: finalProfile.birthTime,
      is_solar_time: finalProfile.isSolarTime || false,
      province: finalProfile.province || '',
      city: finalProfile.city || '',
      longitude: finalProfile.longitude || 120,
      tags: finalProfile.tags || [],
      is_self: finalProfile.isSelf || false,
      avatar: finalProfile.avatar || '',
      updated_at: new Date().toISOString()
      // ❌ 已移除 data 字段，防止 400 错误
    };

    const { error } = await supabase.from('archives').upsert(payload);
    if (error) {
        console.error("❌ [Cloud Save] 失败:", error.message);
        // 这里不抛出错误，以免阻塞 UI，但在控制台记录
        (archives as any)._cloudError = error.message;
    } else {
        console.log("✅ [Cloud Save] 成功");
    }
  }

  return archives;
};

// 4. 设为本人
export const setArchiveAsSelf = async (id: string): Promise<UserProfile[]> => {
  let archives = await getArchives();
  
  // 1. 先在本地更新状态
  const oldSelf = archives.find(p => p.isSelf);
  archives = archives.map(p => ({ ...p, isSelf: p.id === id }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

  // 2. 云端更新（使用 update 而不是 upsert，更安全且只更新必要字段）
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const promises = [];

    // 将新的本人设为 true
    promises.push(
      supabase
        .from('archives')
        .update({ is_self: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', session.user.id)
    );

    // 将旧的本人设为 false
    if (oldSelf && oldSelf.id !== id) {
      promises.push(
        supabase
          .from('archives')
          .update({ is_self: false, updated_at: new Date().toISOString() })
          .eq('id', oldSelf.id)
          .eq('user_id', session.user.id)
      );
    }

    try {
      await Promise.all(promises);
      console.log("✅ [Self] 云端状态已更新");
    } catch (e: any) {
      console.error("❌ [Self] 云端更新失败", e);
    }
  }
  
  return archives;
};

// 5. 删除档案
export const deleteArchive = async (id: string): Promise<UserProfile[]> => {
  const archives = await getArchives();
  const newList = archives.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  localStorage.removeItem(`chat_history_${id}`);

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await supabase.from('archives').delete().eq('id', id);
  }
  return newList;
};

export const updateArchive = async (p: UserProfile) => saveArchive(p);

export const saveAiReportToArchive = async (pid: string, content: string, type: 'bazi'|'ziwei') => {
  const archives = await getArchives();
  const idx = archives.findIndex(p => p.id === pid);
  if (idx > -1) {
    const p = archives[idx];
    const newReport: HistoryItem = { id: generateId(), date: Date.now(), content, type };
    p.aiReports = [newReport, ...(p.aiReports || [])];
    return saveArchive(p);
  }
  return archives;
};

// VIP 状态管理
export const getVipStatus = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('is_vip_user') === 'true';
};

export const activateVipOnCloud = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  localStorage.setItem('is_vip_user', 'true');
  return true;
};