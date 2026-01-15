import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, model, response_format, apiKey: userApiKey } = req.body;

    // 2. 确定使用哪个 Key
    // 如果前端传了 Key，就用前端的；否则用服务器环境变量的 (VIP)
    const finalApiKey = userApiKey || process.env.DEEPSEEK_API_KEY;

    if (!finalApiKey) {
      return res.status(401).json({ error: '未提供 API Key，且未检测到 VIP 权限' });
    }

    // 3. 调用 DeepSeek (或其他兼容 OpenAI 格式的 API)
    // 注意：如果你还要兼容阿里 DashScope，这里可能需要根据 Key 格式判断 URL，但 DeepSeek 是目前的主力
    const baseURL = 'https://api.deepseek.com/chat/completions';

    const response = await fetch(baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalApiKey.trim()}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        response_format: response_format // 支持 JSON 模式
      })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('Analyze Error:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误' });
  }
}