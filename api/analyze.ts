import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, model, response_format, apiKey: userApiKey } = req.body;
    const finalApiKey = userApiKey || process.env.DEEPSEEK_API_KEY;

    if (!finalApiKey) {
      return res.status(401).json({ error: '未配置 API Key' });
    }

    // 🔥 关键修改：强制开启 stream: true，防止 Vercel 504 超时
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalApiKey.trim()}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        stream: true, // 强制流式
        response_format: response_format
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API Error: ${response.status} - ${errorText}`);
    }

    // 设置流式响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 直接转发流
    if (response.body) {
        // @ts-ignore
        for await (const chunk of response.body) {
            res.write(chunk);
        }
    }
    res.end();

  } catch (error: any) {
    console.error('Analyze Error:', error);
    // 如果已经开始发流了，就不能再发 JSON 错误了，只能结束
    if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Server Error' });
    } else {
        res.end();
    }
  }
}