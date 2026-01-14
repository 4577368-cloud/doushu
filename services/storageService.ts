import { UserProfile } from '../types';

const STORAGE_KEY = 'bazi_archives';

export const getArchives = (): UserProfile[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveArchive = (profile: UserProfile): UserProfile[] => {
  const archives = getArchives();
  const index = archives.findIndex(p => p.id === profile.id);
  
  if (index !== -1) {
    // Update existing (merge logic if needed, but usually profile update comes from generation)
    // 这里主要是生成时更新，保留原有的 aiReports 和 tags
    const existing = archives[index];
    archives[index] = { 
        ...profile, 
        aiReports: existing.aiReports || [],
        tags: existing.tags || [] 
    };
  } else {
    // Add new
    archives.unshift({ ...profile, aiReports: [], tags: [] });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
  return archives;
};

// 🔥 新增：专门用于更新档案信息（如姓名、标签）
export const updateArchive = (profile: UserProfile): UserProfile[] => {
    const archives = getArchives();
    const index = archives.findIndex(p => p.id === profile.id);
    if (index !== -1) {
        // 直接替换，信任传入的 profile 是最新的
        archives[index] = profile;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
    }
    return archives;
};

export const deleteArchive = (id: string): UserProfile[] => {
  const archives = getArchives().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
  return archives;
};

export const saveAiReportToArchive = (profileId: string, reportContent: string, type: 'bazi' | 'ziwei' = 'bazi'): UserProfile[] => {
    const archives = getArchives();
    const index = archives.findIndex(p => p.id === profileId);
    if (index !== -1) {
        const profile = archives[index];
        if (!profile.aiReports) profile.aiReports = [];
        profile.aiReports.unshift({
            id: Date.now().toString(),
            date: Date.now(),
            content: reportContent,
            type
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
    }
    return archives;
};