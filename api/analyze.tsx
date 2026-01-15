import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, model, response_format, apiKey: userApiKey } = req.body;

    // 2. 关键逻辑：优先用前端传的 Key；如果没传，就去读服务器环境变量 (VIP)
    // 这里的 process.env.DEEPSEEK_API_KEY 就是你在 Vercel 设置的那个
    const finalApiKey = userApiKey || process.env.DEEPSEEK_API_KEY;

    if (!finalApiKey) {
      console.error("服务端错误：未找到任何可用的 API Key");
      return res.status(401).json({ error: '未提供 API Key，且未检测到 VIP 权限' });
    }

    // 3. 转发请求给 DeepSeek
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalApiKey.trim()}` // 这里的 trim() 是防止复制时带空格
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        response_format: response_format // 支持 JSON 模式（八字报告需要）
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("DeepSeek API Error:", errorData);
        // 把上游的错误透传给前端，方便调试
        throw new Error(errorData.error?.message || `DeepSeek API returned ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('Analyze Route Error:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误' });
  }
}