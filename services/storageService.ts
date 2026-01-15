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

/**
 * 获取档案
 */
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

/**
 * 保存档案
 */
export const saveArchive = async (profile: UserProfile): Promise<UserProfile[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
      alert("请先登录再保存");
      throw new Error("未登录");
  }

  const dbData = mapProfileToDb(profile, user.id);
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile.id);

  let error;
  if (isUUID) {
      const { error: updateErr } = await supabase.from('archives').update(dbData).eq('id', profile.id);
      error = updateErr;
  } else {
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

// --- 🔥 新增：VIP 云端同步功能 ---

/**
 * 获取当前用户的 VIP 状态
 */
export const getVipStatus = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 查询 profiles 表
    const { data, error } = await supabase
        .from('profiles')
        .select('is_vip')
        .eq('id', user.id)
        .maybeSingle(); // 使用 maybeSingle 防止数据不存在时报错

    if (error) {
        console.error("查询 VIP 状态失败:", error);
        return false;
    }
    
    return data?.is_vip || false;
};

/**
 * 在云端激活 VIP
 */
export const activateVipOnCloud = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 更新或插入 profile
    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            email: user.email,
            is_vip: true,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error("激活 VIP 失败:", error);
        alert(`激活失败: ${error.message}`);
        return false;
    }
    return true;
};