import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. 获取 API Key
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务端配置错误：未找到 API Key' });
  }

  try {
    const { messages, chartContext } = req.body;

    // 3. 构建系统提示词 (加入建议生成指令)
    const systemMessage = {
      role: 'system',
      content: `你是一位专业的八字与紫微斗数命理大师。
      
      【当前用户的命盘信息】：
      ${JSON.stringify(chartContext)}
      
      请根据以上命盘信息，回答用户的问题。
      
      【重要输出规则】：
      1. **回答内容**：亲切、专业、客观，结合命盘参数（十神、神煞、大运等）。
      2. **流式输出**：单次回答控制在 400 字以内，不要长篇大论。
      3. **生成追问建议（关键）**：在回答结束后，**必须**另起一行输出字符串 "|||" (三个竖线)，然后紧接着列出 3 个与刚才回答相关的、用户可能感兴趣的简短追问问题。
      4. **建议格式**：问题之间用 ";" (英文分号) 分隔。
      
      【输出示例】：
      你的财运在今年会有所好转，特别是在下半年...（这是回答内容）
      |||
      下半年哪个月财运最好？;适合投资什么行业？;要注意哪些破财风险？`
    };

    const fullMessages = [systemMessage, ...messages];

    // 4. 请求 DeepSeek
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
        max_tokens: 1000, // 稍微调大一点，给建议留出空间
        stream: true
      })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'DeepSeek API Error');
    }

    // 5. 设置流式响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (response.body) {
        // @ts-ignore
        for await (const chunk of response.body) {
            res.write(chunk);
        }
    }
    
    res.end();

  } catch (error: any) {
    console.error('Chat Error:', error);
    if (!res.headersSent) {
        res.status(500).json({ error: error.message || '对话服务出错' });
    } else {
        res.end();
    }
  }
}