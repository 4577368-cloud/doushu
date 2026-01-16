import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. 跨域处理 (CORS) - 关键！防止前端报 CORS 错误
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // 生产环境建议把 * 换成你的具体域名
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 处理预检请求 (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. 解析请求体
    // 注意：这里解构 apiKey (前端传来的用户Key) 和 messages (完整的对话历史)
    const { messages, apiKey: userProvidedKey } = req.body;

    // 3. 确定最终使用的 API Key (核心修复点)
    // 逻辑：如果前端传了 Key (普通用户)，就用前端的；
    // 如果前端没传 (VIP用户)，就用 Vercel 环境变量里的 Key。
    const finalApiKey = userProvidedKey || process.env.DEEPSEEK_API_KEY;

    if (!finalApiKey) {
      console.error("服务端错误: 既无用户 Key 也无环境变量 Key");
      return res.status(401).json({ 
        error: '未配置 API Key。请在设置中输入 Key，或联系管理员升级 VIP。' 
      });
    }

    // 4. 请求 DeepSeek
    // 注意：直接透传 messages，不要在后端再次构建 System Prompt，防止双重 Prompt 冲突
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages, // 🔥 直接使用前端传来的完整上下文
        temperature: 0.7,
        max_tokens: 2000,   // 保证回答够长
        stream: true        // 开启流式
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("DeepSeek API Error:", errorText);
        try {
            const errJson = JSON.parse(errorText);
            throw new Error(errJson.error?.message || 'DeepSeek API 调用失败');
        } catch (e) {
            throw new Error(`DeepSeek API Error: ${response.status} ${response.statusText}`);
        }
    }

    // 5. 设置流式响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Content-Encoding', 'none');

    // 6. 转发流数据
    if (response.body) {
        // @ts-ignore: node-fetch 的 body 类型在 TS 中有时候推断不完全
        for await (const chunk of response.body) {
            res.write(chunk);
        }
    }
    
    res.end();

  } catch (error: any) {
    console.error('Chat Error:', error);
    if (!res.headersSent) {
        res.status(500).json({ error: error.message || '服务器内部错误' });
    } else {
        res.end();
    }
  }
}