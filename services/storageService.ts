import { supabase } from './supabase';
import { UserProfile } from '../types';

// 🛠️ 辅助：数据库字段 -> 前端字段
const mapDbToProfile = (row: any): UserProfile => ({
  id: row.id,
  name: row.name,
  gender: row.gender,
  birthDate: row.birth_date,
  birthTime: row.birth_time,
  isSolarTime: row.is_solar_time,
  province: row.province,
  city: row.city,
  longitude: row.longitude,
  createdAt: new Date(row.created_at).getTime(),
  tags: row.tags || [],
  avatar: row.avatar,
  aiReports: row.reports ? row.reports.map((r: any) => ({
      id: r.id,
      date: new Date(r.created_at).getTime(),
      content: r.content,
      type: r.report_type
  })) : []
});

// 🛠️ 辅助：前端字段 -> 数据库字段
const mapProfileToDb = (profile: UserProfile, userId: string) => {
  const dbData: any = {
    user_id: userId,
    name: profile.name,
    gender: profile.gender,
    birth_date: profile.birthDate,
    birth_time: profile.birthTime,
    is_solar_time: profile.isSolarTime,
    province: profile.province,
    city: profile.city,
    longitude: profile.longitude,
    tags: profile.tags,
    avatar: profile.avatar,
    updated_at: new Date().toISOString()
  };
  return dbData;
};

/**
 * 获取所有档案
 */
export const getArchives = async (): Promise<UserProfile[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('archives')
    .select('*, reports(*)') 
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取失败:', error);
    return [];
  }
  return data?.map(mapDbToProfile) || [];
};

/**
 * 保存档案 (核心修复)
 */
export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("请先登录");

  const dbData = mapProfileToDb(profile, user.id);

  // 检查 ID 是否为有效的 UUID (数据库生成的都是 UUID)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile.id);

  let error;
  if (isUUID) {
      // 如果是旧档案（UUID），则更新
      const { error: updateErr } = await supabase.from('archives').update(dbData).eq('id', profile.id);
      error = updateErr;
  } else {
      // 🔥 关键修改：如果是新排盘（时间戳 ID），不要传 ID，让数据库自动生成 UUID
      const { error: insertErr } = await supabase.from('archives').insert(dbData);
      error = insertErr;
  }

  if (error) {
    console.error('保存失败详情:', error);
    throw error;
  }

  return getArchives();
};

export const updateArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  return saveArchive(profile);
};

export const deleteArchive = async (id: string): Promise<UserProfile[]> => {
  await supabase.from('archives').delete().eq('id', id);
  return getArchives();
};

export const saveAiReportToArchive = async (
  profileId: string, 
  reportContent: string, 
  type: 'bazi' | 'ziwei' = 'bazi'
): Promise<UserProfile[]> => {
  await supabase.from('reports').insert({
      archive_id: profileId,
      content: reportContent,
      report_type: type,
      created_at: new Date().toISOString()
    });
  return getArchives();
};