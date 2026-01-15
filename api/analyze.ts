import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel Serverless Function 配置
export const config = {
  maxDuration: 60, // 尝试申请更长的执行时间（部分账号有效）
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. 允许 CORS (防止跨域问题)
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, model, response_format, apiKey: userApiKey } = req.body;

    // 2. 鉴权逻辑：优先前端Key，否则用环境变量(VIP)
    const finalApiKey = userApiKey || process.env.DEEPSEEK_API_KEY;

    if (!finalApiKey) {
      console.error("【服务端】未找到 API Key");
      return res.status(401).json({ error: '未提供 API Key，且未检测到 VIP 权限' });
    }

    console.log("【服务端】开始请求 DeepSeek...");

    // 3. 调用 DeepSeek
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
        // 如果是生成报告，这里通常不开启 stream，等待完整 JSON
        stream: false, 
        response_format: response_format
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("【DeepSeek Error】:", response.status, errorText);
        throw new Error(`DeepSeek API 报错: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('【Analyze API Critical Error】:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误' });
  }
}