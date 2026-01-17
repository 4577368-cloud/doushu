import { UserProfile, HistoryItem } from '../types';
import { supabase } from './supabase';

const STORAGE_KEY = 'bazi_archives';

// 使用原生 API 生成唯一 ID，确保云端主键不冲突
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substr(2, 9);
};

export const getArchives = async (): Promise<UserProfile[]> => {
  if (typeof window === 'undefined') return [];
  const json = localStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
};

/**
 * 🔥 核心修复：账号隔离同步
 * 逻辑：只拉取属于当前 user_id 的数据，拉取前不清理本地（由 App.tsx 登录时处理清理）
 */
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
      // 适配您的数据库字段结构
      const cloudArchives: UserProfile[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        gender: item.gender,
        birthDate: item.birth_date || item.data?.birthDate, // 兼容旧数据
        birthTime: item.birth_time,
        isSolarTime: item.is_solar_time,
        province: item.province,
        city: item.city,
        longitude: item.longitude,
        tags: item.tags || [],
        createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
        isSelf: item.is_self,
        avatar: item.avatar,
        // 如果有 aiReports 存储在 data 字段中
        aiReports: item.data?.aiReports || []
      }));

      const localArchives = await getArchives();
      const mergedMap = new Map<string, UserProfile>();

      // 智能合并：本地离线数据优先，云端已同步数据覆盖更新
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

/**
 * 🔥 核心修复：精准字段推送
 */
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

  // 1. 本地落盘
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

  // 2. 推送云端
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
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
      // 将完整对象存在 data 字段中作为备份和 AI 报告存储
      data: finalProfile 
    };

    const { error } = await supabase.from('archives').upsert(payload);
    if (error) (archives as any)._cloudError = error.message;
  }

  return archives;
};

/**
 * 🔥 核心修复：本人状态切换
 */
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

export const deleteArchive = async (id: string): Promise<UserProfile[]> => {
  const archives = await getArchives();
  const newList = archives.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));

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