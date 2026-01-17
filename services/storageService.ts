import { UserProfile, HistoryItem } from '../types';
import { supabase } from './supabase';

const STORAGE_KEY = 'bazi_archives';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const getArchives = async (): Promise<UserProfile[]> => {
  if (typeof window === 'undefined') return [];
  const json = localStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
};

export const syncArchivesFromCloud = async (userId: string): Promise<UserProfile[]> => {
  console.log("☁️ [Sync] 正在从云端拉取所有数据...");
  try {
    // 1. 获取云端最新数据
    const { data, error } = await supabase
      .from('archives')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("❌ [Sync] 拉取失败:", error.message);
      // 如果云端拉取失败，退回使用本地数据，防止白屏
      return getArchives(); 
    }

    if (data) {
      // 2. 转换云端数据格式
      // 数据库结构通常是 { id, data: { ...profile } }
      const cloudArchives: UserProfile[] = data.map((item: any) => ({
         ...item.data, 
         id: item.id || item.data.id, 
      }));

      // 3. 获取当前本地数据 (这是为了防止覆盖掉还未同步的本地草稿)
      const localArchives = await getArchives();

      // 4. 🔥 智能合并逻辑
      // 使用 Map 以 ID 为 Key 进行去重
      const mergedMap = new Map<string, UserProfile>();

      // A. 先把【本地数据】放进去 (作为底板)
      localArchives.forEach(p => mergedMap.set(p.id, p));

      // B. 再把【云端数据】覆盖进去 (云端为最新真理)
      // 这样做的结果：
      // - 两边都有：变成了云端版 (实现多端同步，以云端为准)
      // - 只有本地有：保留 (可能是刚建的还没传上去的离线草稿)
      // - 只有云端有：新增 (实现换设备拉取)
      cloudArchives.forEach(p => mergedMap.set(p.id, p));

      // 5. 转回数组并按创建时间倒序排序
      const mergedList = Array.from(mergedMap.values()).sort((a, b) => 
        (b.createdAt || 0) - (a.createdAt || 0)
      );

      console.log(`✅ [Sync] 同步完成。本地原有 ${localArchives.length} 条，云端拉取 ${cloudArchives.length} 条 -> 合并后共 ${mergedList.length} 条。`);

      // 6. 写入本地缓存 (作为最新源)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));
      return mergedList;
    }
    
    // 如果云端没有任何数据 (新用户)，返回本地数据
    return getArchives();

  } catch (error) {
    console.error("❌ [Sync] 发生异常:", error);
    return getArchives();
  }
};

/**
 * 🔥 3. 保存档案：全量同步 (不分本人/他人)
 */
export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  console.log("📝 [Save] 保存档案:", profile.name);
  
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

  // 1. 存本地
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

  // 2. 存云端 (不论是谁的档案，都同步)
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
      if (error) console.error("❌ [Cloud] 同步失败:", error.message);
      else console.log("🚀 [Cloud] 同步成功!");
  }

  return archives;
};

/**
 * 🔥 4. 设为本人 (严谨版：更新旧本人 + 新本人)
 */
export const setArchiveAsSelf = async (id: string): Promise<UserProfile[]> => {
    console.log("👤 [Self] 切换本人:", id);
    let archives = await getArchives();
    
    // 找到旧的本人 (用于后续云端更新)
    const oldSelf = archives.find(p => p.isSelf);
    
    // 本地状态全量更新
    archives = archives.map(p => ({
        ...p,
        isSelf: p.id === id
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));

    // 云端同步：为了数据一致性，需推送变动的数据
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        const promises = [];

        // 推送【新本人】
        const newSelf = archives.find(p => p.id === id);
        if (newSelf) {
            promises.push(supabase.from('archives').upsert({
                user_id: session.user.id,
                id: newSelf.id,
                data: newSelf,
                updated_at: new Date().toISOString()
            }));
        }

        // 推送【旧本人】(取消其状态)
        if (oldSelf && oldSelf.id !== id) {
            const updatedOldSelf = archives.find(p => p.id === oldSelf.id); // 拿最新的状态(isSelf=false)
            if (updatedOldSelf) {
                promises.push(supabase.from('archives').upsert({
                    user_id: session.user.id,
                    id: updatedOldSelf.id,
                    data: updatedOldSelf,
                    updated_at: new Date().toISOString()
                }));
            }
        }

        await Promise.all(promises);
        console.log("🚀 [Self] 状态已同步至云端");
    }
    
    return archives;
};

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