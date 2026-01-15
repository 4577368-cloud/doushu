import { createClient } from '@supabase/supabase-js';

// 🛡️ 辅助函数：安全获取环境变量
const getEnv = (key: string) => {
  // @ts-ignore: 防止某些环境类型检查报错
  return import.meta.env?.[key] || '';
};

const rawUrl = getEnv('VITE_SUPABASE_URL');
const rawKey = getEnv('VITE_SUPABASE_ANON_KEY');

// 🔍 调试日志：让你在控制台清楚看到到底读到了什么
console.log('Supabase Config Check:', {
  URL_Length: rawUrl ? rawUrl.length : 0,
  Key_Length: rawKey ? rawKey.length : 0,
  Has_URL: !!rawUrl,
  Has_Key: !!rawKey
});

if (!rawUrl || !rawKey) {
  console.error(
    "❌ [严重错误] 环境变量缺失！应用将无法连接数据库。\n" +
    "请确保根目录有 .env 文件，且包含 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。\n" +
    "修改 .env 后请务必重启终端 (npm run dev)！"
  );
}

// 🛡️ 防崩溃处理：
// 如果没有 URL，我们提供一个假的 URL，防止 createClient 直接报错导致白屏。
// 这样你至少能看到页面，虽然数据加载会失败。
const supabaseUrl = rawUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);