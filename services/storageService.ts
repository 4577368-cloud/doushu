import { UserProfile, HistoryItem } from '../types';

const STORAGE_KEY = 'bazi_archives';

// 模拟 ID 生成
const generateId = () => Math.random().toString(36).substr(2, 9);

export const getArchives = async (): Promise<UserProfile[]> => {
  if (typeof window === 'undefined') return [];
  const json = localStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
};

/**
 * 保存或更新档案 (智能合并版)
 */
export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  const archives = await getArchives();
  
  // 🔥 核心优化：查找是否存在“日期+时间+性别”完全一致的旧档案
  // 注意：我们不比较 name，因为用户可能第一次没填名字，第二次填了
  const existingIndex = archives.findIndex(p => 
      p.birthDate === profile.birthDate && 
      p.birthTime === profile.birthTime && 
      p.gender === profile.gender
  );

  if (existingIndex > -1) {
    // === 情况 A: 找到旧档案 -> 执行“丰富/更新”逻辑 ===
    const oldProfile = archives[existingIndex];

    // 1. 名字处理：如果新名字有效且不默认，就覆盖；否则保留旧名字
    // 假设 '某某' 或 '' 是默认空名
    const newName = (profile.name && profile.name.trim() !== '某某' && profile.name.trim() !== '') 
        ? profile.name 
        : oldProfile.name;

    // 2. 标签合并：把新旧标签合并并去重
    const oldTags = oldProfile.tags || [];
    const newTags = profile.tags || [];
    const mergedTags = Array.from(new Set([...oldTags, ...newTags]));

    // 3. 构建合并后的新对象
    // ⚠️ 关键：必须保留 oldProfile.id，否则关联的聊天记录会丢失
    const mergedProfile: UserProfile = {
        ...oldProfile, // 继承旧档案的所有属性（包括 id, createdAt, aiReports）
        
        // 更新可能变动的基础信息 (以最新的为准)
        name: newName,
        isSolarTime: profile.isSolarTime, // 更新真太阳时设置
        province: profile.province || oldProfile.province, // 新的有就用新的，没有就保留旧的
        city: profile.city || oldProfile.city,
        longitude: profile.longitude || oldProfile.longitude,
        
        // 更新合并后的标签
        tags: mergedTags,
        
        // 确保 AI 报告不丢失 (如果 newProfile 里还没报告，就用旧的)
        aiReports: oldProfile.aiReports || [] 
    };

    // 替换掉旧记录
    archives[existingIndex] = mergedProfile;

  } else {
    // === 情况 B: 没找到 -> 执行“新增”逻辑 ===
    // 只有在完全匹配不到时，才视为新档案
    const newEntry = { 
        ...profile, 
        id: generateId(), // 生成新 ID
        createdAt: Date.now(),
        tags: profile.tags || [],
        aiReports: []
    };
    // 新增的放最前面
    archives.unshift(newEntry);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
  return archives;
};

// --- 以下其他函数保持不变 ---

export const deleteArchive = async (id: string): Promise<UserProfile[]> => {
  const archives = await getArchives();
  const newList = archives.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  // 同时清理关联的聊天记录
  localStorage.removeItem(`chat_history_${id}`);
  return newList;
};

export const updateArchive = async (updatedProfile: UserProfile): Promise<UserProfile[]> => {
  const archives = await getArchives();
  const index = archives.findIndex(p => p.id === updatedProfile.id);
  if (index > -1) {
    archives[index] = updatedProfile;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
  }
  return archives;
};

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
        // 确保 aiReports 数组存在
        const reports = profile.aiReports || [];
        // 新报告插在最前
        profile.aiReports = [newReport, ...reports];
        
        archives[index] = profile;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
    }
    return archives;
};

// --- 模拟 VIP 接口 (保持不变) ---
export const getVipStatus = async (): Promise<boolean> => {
    return localStorage.getItem('is_vip_user') === 'true';
};

export const activateVipOnCloud = async (): Promise<boolean> => {
    localStorage.setItem('is_vip_user', 'true');
    return true;
};