import OpenAI from "openai";
import { BaziChart, UserProfile } from "../types";

// 定义聊天模式
export type ChatMode = 'bazi' | 'ziwei';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * 构造八字系统提示词
 */
const getBaziSystemPrompt = (chart: BaziChart): string => {
  return `
你是一位精通《子平真诠》、《滴天髓》的八字命理大师。
当前命盘信息：
- 日主：${chart.dayMaster}
- 格局：${chart.pattern.name}
- 五行分布：${JSON.stringify(chart.wuxingCounts)}
- 喜用神：${chart.balance.yongShen.join(', ')}

请遵循以下规则：
1.用八字理论（五行生克、十神、刑冲合害）分析用户问题。
2.语气专业、温暖、客观。
3.回答结尾必须提供3个相关的追问建议，格式必须严格如下：
|||问题1;问题2;问题3
`;
};

/**
 * 构造紫微系统提示词
 */
const getZiweiSystemPrompt = (profile: UserProfile, chartStr: string): string => {
  return `
你是一位精通“紫微斗数”的命理大师（三合派/飞星派兼修）。
当前命主信息：${profile.name} (${profile.gender === 'male' ? '乾造' : '坤造'})
紫微命盘数据如下：
${chartStr}

请遵循以下规则：
1. **必须**使用紫微斗数理论（宫位、主星、四化、吉凶星组合）进行分析，不要提及八字术语。
2. 重点分析相关的宫位（如问财运看财帛宫，问事业看官禄宫）。
3. 回答结尾必须提供3个相关的追问建议，格式必须严格如下：
|||问题1;问题2;问题3
`;
};

export const sendChatMessage = async (
  history: ChatMessage[],
  profile: UserProfile,
  baziChart: BaziChart,
  ziweiChartString: string, 
  mode: ChatMode,
  onStream: (chunk: string) => void
) => {
  // 1. 获取 Key (DeepSeek 的 Key)
  const apiKey = sessionStorage.getItem('ai_api_key');
  if (!apiKey) throw new Error("API Key missing");

  // 2. 初始化 OpenAI 客户端 (DeepSeek 兼容)
  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com', // 🔥 DeepSeek 官方地址
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // 允许前端直接调用
  });

  // 3. 准备系统提示词
  const systemInstruction = mode === 'bazi' 
    ? getBaziSystemPrompt(baziChart)
    : getZiweiSystemPrompt(profile, ziweiChartString);

  // 4. 构造消息列表 (System + History)
  const messagesForAi = [
    { role: "system", content: systemInstruction },
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  try {
    // 5. 发起流式请求
    const stream = await client.chat.completions.create({
      messages: messagesForAi as any,
      model: "deepseek-chat", // 🔥 使用 DeepSeek 模型
      stream: true,
      temperature: 0.7,
      max_tokens: 2000
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        onStream(content);
      }
    }
  } catch (error) {
    console.error("DeepSeek Chat Error:", error);
    throw error;
  }
};