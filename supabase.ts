import { createClient } from '@supabase/supabase-js';

// 1. 读取环境变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. 调试检查 (如果还报错，这行会告诉你读到了什么)
console.log("Supabase Config Check:", {
    URL_Length: supabaseUrl?.length || 0,
    Key_Length: supabaseAnonKey?.length || 0,
    Has_URL: !!supabaseUrl,
    Has_Key: !!supabaseAnonKey
});

// 3. 抛出错误阻断运行，防止后续莫名其妙的 Bug
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("❌ [严重错误] 环境变量缺失！请检查 .env 文件。");
}

// 4. 创建客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);