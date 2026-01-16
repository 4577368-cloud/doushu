import { supabase } from './supabase';
import { UserProfile } from '../types';

// 数据库字段 -> 前端字段
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
  isSelf: row.is_self, // 🔥 新增：读取是否为本人标记
  aiReports: row.reports ? row.reports.map((r: any) => ({
      id: r.id,
      date: new Date(r.created_at).getTime(),
      content: r.content,
      type: r.report_type
  })) : []
});

// 前端字段 -> 数据库字段
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
  is_self: profile.isSelf || false, // 🔥 新增：写入是否为本人标记
  updated_at: new Date().toISOString()
});

/**
 * 获取所有档案
 * 排序逻辑：本人档案置顶，其他档案按创建时间倒序
 */
export const getArchives = async (): Promise<UserProfile[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('archives')
    .select('*, reports(*)') 
    .order('is_self', { ascending: false }) // 🔥 关键修改：让"我"排在最前
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取档案失败:', error);
    return [];
  }
  return data?.map(mapDbToProfile) || [];
};

/**
 * 保存档案 (新建或更新)
 */
export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
      alert("请先登录再保存");
      throw new Error("未登录");
  }

  const dbData = mapProfileToDb(profile, user.id);
  
  // 检查是否为有效的 UUID (判断是新建还是更新)
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

// --- VIP 相关逻辑 ---

/**
 * 从云端获取 VIP 状态
 */
export const getVipStatus = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('is_vip')
    .eq('id', user.id)
    .single();

  if (error || !data) return false;
  return data.is_vip || false;
};

/**
 * 激活 VIP 并同步到云端
 */
export const activateVipOnCloud = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
      alert("请先登录账号，VIP 将绑定至您的邮箱！");
      return false;
  }

  // 使用 upsert：如果存在就更新，不存在就插入
  const { error } = await supabase
    .from('profiles')
    .upsert({ 
        id: user.id, 
        email: user.email,
        is_vip: true,
        updated_at: new Date().toISOString()
    });

  if (error) {
      console.error("激活失败:", error);
      alert("云端同步失败，请联系客服");
      return false;
  }
  return true;
};