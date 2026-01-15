
import { createClient } from "@supabase/supabase-js";

// 1. 获取环境变量，并提供默认值 '' 防止 undefined 报错
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 2. 检查并提示
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ 严重警告: Supabase 环境变量未设置！请检查 .env 文件或 Vercel 环境变量设置 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)");
}

// 3. 创建客户端
// 即使是空字符串，createClient 也不会立即崩，只有在真正发起请求时才会失败
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
