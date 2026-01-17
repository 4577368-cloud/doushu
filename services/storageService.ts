import { UserProfile, HistoryItem } from '../types';
import { supabase } from './supabase';

const STORAGE_KEY = 'bazi_archives';

// 安全生成唯一 ID
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
  console.log("☁️ [Sync] 正在拉取云端档案...");
  let cloudError = null;

  try {
    const { data, error } = await supabase
      .from('archives')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (data) {
      // 严格匹配数据库字段名
      const cloudArchives: UserProfile[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        gender: item.gender,
        birthDate: item.data?.birthDate || '', 
        birthTime: item.birth_time,
        isSolarTime: item.is_solar_time,
        province: item.province,
        city: item.city,
        longitude: item.longitude,
        tags: item.tags || [],
        createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
        isSelf: item.is_self,
        avatar: item.avatar,
        aiReports: item.data?.aiReports || []
      }));

      const localArchives = await getArchives();
      const mergedMap = new Map<string, UserProfile>();

      // 智能合并：本地优先，云端覆盖
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
    cloudError = err.message;
  }

  const fallback = await getArchives();
  if (cloudError) (fallback as any)._cloudError = cloudError;
  return fallback;
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

  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    // 构造适配数据库字段的 Payload
    const payload = {
      id: finalProfile.id,
      user_id: session.user.id,
      name: finalProfile.name,
      gender: finalProfile.gender,
      birth_time: finalProfile.birthTime,
      is_solar_time: finalProfile.isSolarTime || false,
      province: finalProfile.province || '',
      city: finalProfile.city || '',
      longitude: finalProfile.longitude || 120,
      tags: finalProfile.tags || [],
      is_self: finalProfile.isSelf || false,
      avatar: finalProfile.avatar || '',
      updated_at: new Date().toISOString(),
      data: finalProfile 
    };

    const { error } = await supabase.from('archives').upsert(payload);
    if (error) (archives as any)._cloudError = error.message;
  }

  return archives;
};

// 4. 设为本人
export const setArchiveAsSelf = async (id: string): Promise<UserProfile[]> => {
  let archives = await getArchives();
  const oldSelf = archives.find(p => p.isSelf);
  
  archives = archives.map(p => ({ ...p, isSelf: p.id === id }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const updateTasks = archives
      .filter(p => p.id === id || (oldSelf && p.id === oldSelf.id))
      .map(p => saveArchive(p));
    
    await Promise.all(updateTasks);
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
  return localStorage.getItem('is_vip_user') === 'true';
};

export const activateVipOnCloud = async (): Promise<boolean> => {
  localStorage.setItem('is_vip_user', 'true');
  return true;
};