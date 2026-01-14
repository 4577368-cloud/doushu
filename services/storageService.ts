
import { UserProfile, AiReportRecord } from "../types";

const STORAGE_KEY = 'xuanshu_archive_v1';

export const getArchives = (): UserProfile[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed: any[] = JSON.parse(data);
    return parsed;
  } catch (e) {
    console.error("Failed to load archives", e);
    return [];
  }
};

export const saveArchive = (profile: UserProfile): UserProfile[] => {
  const archives = getArchives();
  const index = archives.findIndex(p => p.id === profile.id);
  
  const updatedProfile = {
      ...profile,
      lastUpdated: Date.now()
  };

  let newArchives;
  if (index >= 0) {
    newArchives = [...archives];
    newArchives[index] = updatedProfile;
  } else {
    newArchives = [updatedProfile, ...archives];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newArchives));
  return newArchives;
};

export const deleteArchive = (id: string): UserProfile[] => {
  const archives = getArchives();
  const newArchives = archives.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newArchives));
  return newArchives;
};

export const saveAiReportToArchive = (id: string, reportContent: string, type: 'bazi' | 'ziwei' = 'bazi'): UserProfile[] => {
    const archives = getArchives();
    const index = archives.findIndex(p => p.id === id);
    if (index >= 0) {
        const profile = archives[index];
        const newReport: AiReportRecord = {
            id: `${type}-${Date.now()}`,
            date: Date.now(),
            content: reportContent,
            type: type
        };
        const updatedReports = [newReport, ...(profile.aiReports || [])];
        
        archives[index] = { 
            ...profile, 
            aiReports: updatedReports, 
            lastUpdated: Date.now() 
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
    }
    return archives;
};
