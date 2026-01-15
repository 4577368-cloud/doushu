import { supabase } from './supabase'; // ✅ 这里的 ./ 是关键，确保在同一文件夹下
import { UserProfile } from '../types';

// 🛠️ 辅助函数：把数据库的下划线字段转回前端的驼峰字段
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
  // 映射关联的报告表
  aiReports: row.reports ? row.reports.map((r: any) => ({
      id: r.id,
      date: new Date(r.created_at).getTime(),
      content: r.content,
      type: r.report_type
  })) : []
});

// 🛠️ 辅助函数：把前端的驼峰字段转为数据库下划线字段
const mapProfileToDb = (profile: UserProfile, userId: string) => ({
  // id: profile.id, // 让 Supabase 自动生成 ID，或者如果必须保留前端 ID，确保它是 UUID 格式
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
});

/**
 * 获取所有档案 (异步)
 */
export const getArchives = async (): Promise<UserProfile[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 联表查询：同时获取档案和关联的报告
  const { data, error } = await supabase
    .from('archives')
    .select('*, reports(*)') 
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取档案失败:', error);
    return [];
  }

  return data.map(mapDbToProfile);
};

/**
 * 保存或更新档案 (异步)
 */
export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
     // 如果没登录，暂时返回空或抛错，App 端会处理
     console.warn("未登录，无法保存到云端");
     return [];
  }

  const dbData = mapProfileToDb(profile, user.id);

  // 这里的逻辑是：如果是新档案(id可能是时间戳字符串)，我们插入新纪录
  // 如果是旧档案(id是UUID)，我们更新
  // 为了简单，我们假设如果 profile.id 看起来像 UUID 就更新，否则插入
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile.id);

  let error;
  if (isUUID) {
      const { error: updateErr } = await supabase.from('archives').update(dbData).eq('id', profile.id);
      error = updateErr;
  } else {
      // 插入新记录，不需要传 id (由数据库生成)
      const { error: insertErr } = await supabase.from('archives').insert(dbData);
      error = insertErr;
  }

  if (error) {
    console.error('保存档案失败:', error);
    throw error;
  }

  return getArchives();
};

/**
 * 更新档案字段 (异步)
 */
export const updateArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  return saveArchive(profile);
};

/**
 * 删除档案 (异步)
 */
export const deleteArchive = async (id: string): Promise<UserProfile[]> => {
  const { error } = await supabase
    .from('archives')
    .delete()
    .eq('id', id);

  if (error) console.error('删除失败:', error);
  return getArchives();
};

/**
 * 保存报告 (异步，存入 reports 表)
 */
export const saveAiReportToArchive = async (
  profileId: string, 
  reportContent: string, 
  type: 'bazi' | 'ziwei' = 'bazi'
): Promise<UserProfile[]> => {
  
  const { error } = await supabase
    .from('reports')
    .insert({
      archive_id: profileId,
      content: reportContent,
      report_type: type,
      created_at: new Date().toISOString()
    });

  if (error) console.error('保存报告失败:', error);
  
  return getArchives();
};