import { BaziChart, UserProfile } from "../types";

// 定义聊天模式
export type ChatMode = 'bazi' | 'ziwei';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * 获取用户称呼
 */
const getUserName = (profile: UserProfile): string => {
  return (profile.name && profile.name.trim() && profile.name !== '某某') 
    ? profile.name 
    : '命主';
};

/**
 * 构造八字系统提示词
 * 🔥 优化：注入动态称呼 + 当前时间 + 锁定命盘 + 禁止动作描写
 */
const getBaziSystemPrompt = (chart: BaziChart, currentGanZhi: string, profile: UserProfile): string => {
  const userName = getUserName(profile);
  
  return `
你是一位精通《子平真诠》、《滴天髓》的八字命理大师。

【关键上下文信息】
1. **当前对话用户**：${userName} (请在回答中自然地称呼用户为“${userName}”，而不是“用户”或“您”)
2. **当前实际时间（流年参考）**：${currentGanZhi}
   (注意：在分析流年/流月运势，或进行时家奇门/八字占卜时，必须以此时间为准)
3. **当前已排盘信息**（这是${userName}的命盘，**直接基于此盘分析，不要再索要生辰**）：
   - 日主：${chart.dayMaster} (${chart.dayMasterElement || '未知'})
   - 格局：${chart.pattern.name}
   - 五行分布：${JSON.stringify(chart.wuxingCounts)}
   - 喜用神：${chart.balance.yongShen.join(', ')}

请遵循以下规则：
1. 用八字理论（五行生克、十神、刑冲合害）分析${userName}的问题。
2. 如果${userName}问“以当前时间起盘”或“测当下之事”，请结合【当前已排盘信息】与【当前实际时间】进行时空能量推演。
3. **禁止进行动作描写**：严禁输出如“（指尖轻点...）”、“（目光深邃...）”之类的括号内容或旁白。请直接以命理师的口吻回答。
4. 语气专业、温暖、客观。
5. 回答结尾必须提供3个相关的追问建议，格式必须严格如下：
|||问题1;问题2;问题3
`;
};

/**
 * 构造紫微系统提示词
 * 🔥 优化：注入动态称呼 + 当前时间 + 锁定命盘 + 禁止动作描写
 */
const getZiweiSystemPrompt = (profile: UserProfile, chartStr: string, currentGanZhi: string): string => {
  const userName = getUserName(profile);

  return `
你是一位精通“紫微斗数”的命理大师（三合派/飞星派兼修）。

【关键上下文信息】
1. **当前对话用户**：${userName} (请在回答中自然地称呼用户为“${userName}”)
2. **当前实际时间（流年参考）**：${currentGanZhi}
3. **紫微命盘数据**（**已为${userName}排盘，直接分析此盘**）：
${chartStr}

请遵循以下规则：
1. **必须**使用紫微斗数理论（宫位、主星、四化、吉凶星组合）进行分析，不要提及八字术语。
2. 如果${userName}问“测此时运势”，请重点参考流年/流月四化对本命盘的引动。
3. **禁止进行动作描写**：严禁输出任何括号内的动作、神态描写。直接输出分析结论。
4. 重点分析相关的宫位（如问财运看财帛宫，问事业看官禄宫）。
5. 回答结尾必须提供3个相关的追问建议，格式必须严格如下：
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
  isVip: boolean = false,
  currentGanZhi: string = ''
) => {
  const apiKey = sessionStorage.getItem('ai_api_key');
  
  if (!isVip && !apiKey) {
    throw new Error("API Key missing - 请在设置中输入 Key，或升级 VIP 免 Key 使用");
  }

  // 🔥 将 profile 传入 Prompt 生成器，以便生成正确的称呼
  const systemInstruction = mode === 'bazi' 
    ? getBaziSystemPrompt(baziChart, currentGanZhi, profile)
    : getZiweiSystemPrompt(profile, ziweiChartString, currentGanZhi);

  const cleanHistory = history.filter(msg => msg.role !== 'system');
  
  const messagesForAi = [
    { role: "system", content: systemInstruction },
    ...cleanHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; 

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
            // ignore
          }
        }
      }
    }
  } catch (error) {
    console.error('DeepSeek Chat Error:', error);
    throw error;
  }
};