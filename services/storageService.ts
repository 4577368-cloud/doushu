import { supabase } from './supabase';
import { UserProfile } from '../types';

// 数据库 -> 前端
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

// 前端 -> 数据库
const mapProfileToDb = (profile: UserProfile, userId: string) => ({
  user_id: userId,
  name: profile.name,
  gender: profile.gender,
  birth_date: profile.birthDate,
  birth_time: profile.birthTime,
  is_solar_time: profile.isSolarTime || false,
  province: profile.province || '',
  city: profile.city || '',
  longitude: profile.longitude || 0,
  tags: profile.tags || [],
  avatar: profile.avatar || 'default',
  updated_at: new Date().toISOString()
});

export const getArchives = async (): Promise<UserProfile[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('archives')
    .select('*, reports(*)') 
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取档案失败:', error);
    return [];
  }
  return data?.map(mapDbToProfile) || [];
};

export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
      alert("请先登录再保存");
      throw new Error("未登录");
  }

  const dbData = mapProfileToDb(profile, user.id);
  // 检查是否为有效的 UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile.id);

  let error;
  if (isUUID) {
      // 旧档案：更新
      const { error: updateErr } = await supabase.from('archives').update(dbData).eq('id', profile.id);
      error = updateErr;
  } else {
      // 新档案：插入（不传 id，由数据库生成）
      const { error: insertErr } = await supabase.from('archives').insert(dbData);
      error = insertErr;
  }

  if (error) {
    console.error('保存失败:', error);
    alert(`保存失败！数据库返回错误：\n${error.message}`);
    throw error;
  }

  return getArchives();
};

export const updateArchive = async (profile: UserProfile): Promise<UserProfile[]> => saveArchive(profile);

export const deleteArchive = async (id: string): Promise<UserProfile[]> => {
  await supabase.from('archives').delete().eq('id', id);
  return getArchives();
};

export const saveAiReportToArchive = async (profileId: string, reportContent: string, type: 'bazi' | 'ziwei' = 'bazi'): Promise<UserProfile[]> => {
  const { error } = await supabase.from('reports').insert({
      archive_id: profileId,
      content: reportContent,
      report_type: type,
      created_at: new Date().toISOString()
    });
  if (error) console.error('报告保存失败:', error);
  return getArchives();
};