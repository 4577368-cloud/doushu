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
      
      【重要输出规则】：
      1. 回答内容：结合命盘参数（十神、神煞、流年等）分析，语气亲切专业。
      2. **回答结束后，必须换行，然后输入分隔符 "|||"，紧接着生成 3 个与当前话题紧密相关的简短追问建议，用分号 ";" 隔开。**
      
      例如：
      ......(你的回答内容)......
      |||
      我的财运何时好转？;今年要注意什么健康问题？;我和另一半的关系如何化解？`
    };

    const fullMessages = [systemMessage, ...messages];

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
        max_tokens: 2000
      })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'DeepSeek API Error');
    }

    const data = await response.json();
    return res.status(200).json({ content: data.choices[0].message.content });

  } catch (error: any) {
    console.error('Chat Error:', error);
    return res.status(500).json({ error: error.message || '对话服务出错' });
  }
}