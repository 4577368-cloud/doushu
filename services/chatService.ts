import { BaziChart, UserProfile } from "../types";

// 定义聊天模式
export type ChatMode = 'bazi' | 'ziwei';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * 构造八字系统提示词
 * 🔥 优化：加入了“禁止动作描写”的指令
 */
const getBaziSystemPrompt = (chart: BaziChart): string => {
  return `
你是一位精通《子平真诠》、《滴天髓》的八字命理大师。
当前命盘信息：
- 日主：${chart.dayMaster} (${chart.dayMasterElement || '未知'})
- 格局：${chart.pattern.name}
- 五行分布：${JSON.stringify(chart.wuxingCounts)}
- 喜用神：${chart.balance.yongShen.join(', ')}

请遵循以下规则：
1. 用八字理论（五行生克、十神、刑冲合害）分析用户问题。
2. **禁止进行动作描写**：严禁输出如“（指尖轻点...）”、“（目光深邃...）”之类的括号内容或旁白。请直接以命理师的口吻回答。
3. 语气专业、温暖、客观。
4. 回答结尾必须提供3个相关的追问建议，格式必须严格如下：
|||问题1;问题2;问题3
`;
};

/**
 * 构造紫微系统提示词
 * 🔥 优化：加入了“禁止动作描写”的指令
 */
const getZiweiSystemPrompt = (profile: UserProfile, chartStr: string): string => {
  return `
你是一位精通“紫微斗数”的命理大师（三合派/飞星派兼修）。
当前命主信息：${profile.name} (${profile.gender === 'male' ? '乾造' : '坤造'})
紫微命盘数据如下：
${chartStr}

请遵循以下规则：
1. **必须**使用紫微斗数理论（宫位、主星、四化、吉凶星组合）进行分析，不要提及八字术语。
2. **禁止进行动作描写**：严禁输出任何括号内的动作、神态描写。直接输出分析结论。
3. 重点分析相关的宫位（如问财运看财帛宫，问事业看官禄宫）。
4. 回答结尾必须提供3个相关的追问建议，格式必须严格如下：
|||问题1;问题2;问题3
`;
};

/**
 * 发送对话请求 (核心服务函数)
 */
export const sendChatMessage = async (
  history: ChatMessage[],
  profile: UserProfile,
  baziChart: BaziChart,
  ziweiChartString: string, 
  mode: ChatMode,
  onStream: (chunk: string) => void,
  isVip: boolean = false // 默认 false，防止未传参时报错
) => {
  // 1. 获取本地 Key
  const apiKey = sessionStorage.getItem('ai_api_key');
  
  // 🔥🔥🔥 核心修复点 🔥🔥🔥
  // 逻辑翻译：如果你 "既不是 VIP" 并且 "也没填 Key"，我才报错。
  // 如果 isVip 为 true，这一行会直接跳过，不会报错。
  if (!isVip && !apiKey) {
    throw new Error("请升级 VIP 免 Key 使用");
  }

  // 2. 准备系统提示词
  const systemInstruction = mode === 'bazi' 
    ? getBaziSystemPrompt(baziChart)
    : getZiweiSystemPrompt(profile, ziweiChartString);

  // 3. 构造消息列表 (过滤掉历史中的旧 system 消息)
  const cleanHistory = history.filter(msg => msg.role !== 'system');
  
  const messagesForAi = [
    { role: "system", content: systemInstruction },
    ...cleanHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  try {
    // 4. 请求后端代理
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // 🔥 关键：VIP 用户传 undefined，后端会自动去读 Vercel 环境变量
        apiKey: apiKey || undefined, 
        messages: messagesForAi
      })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    if (!reader) throw new Error('无法读取响应流');

    // 🔥🔥🔥 核心修复点：Buffer 缓冲区 (解决乱码/JSON问题) 🔥🔥🔥
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一行残缺数据

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const json = JSON.parse(jsonStr);
            const content = json.choices[0]?.delta?.content || '';
            if (content) onStream(content);
          } catch (e) {
            // 忽略解析失败的帧，等待 Buffer 拼接
          }
        }
      }
    }
  } catch (error) {
    console.error('DeepSeek Chat Error:', error);
    throw error;
  }
};