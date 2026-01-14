import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务端未配置 API Key' });
  }

  try {
    const { messages, chartContext } = req.body;

    const systemMessage = {
      role: 'system',
      content: `你是一位专业的八字与紫微斗数命理大师。
      
      【当前用户的命盘信息】：
      ${JSON.stringify(chartContext)}
      
      请根据以上命盘信息，回答用户的问题。
      
      【重要要求】：
      1. **回答必须精简**：每次回答请严格控制在 400 字以内，切勿长篇大论。
      2. **流式输出**：请直接回答，不要有多余的客套话。
      3. **专业结合**：回答要结合命盘中的具体参数（如十神、神煞、大运流年等）进行分析。
      4. **语气**：亲切、专业、客观。`
    };

    const fullMessages = [systemMessage, ...messages];

    // 1. 请求 DeepSeek API (开启流式 stream: true)
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 600, // 限制 token 数，防止输出过长 (约等于400汉字)
        stream: true // 🔥 开启流式输出
      })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'DeepSeek API Error');
    }

    // 2. 设置流式响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 3. 将 DeepSeek 的流直接转发给前端
    if (response.body) {
        // @ts-ignore: Vercel/Node streams compatibility
        for await (const chunk of response.body) {
            res.write(chunk);
        }
    }
    
    res.end();

  } catch (error: any) {
    console.error('Chat Error:', error);
    // 如果是流式传输中途报错，可能无法单纯返回 JSON，这里做个兜底
    if (!res.headersSent) {
        res.status(500).json({ error: error.message || '对话服务出错' });
    } else {
        res.end();
    }
  }
}