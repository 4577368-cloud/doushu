import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaziChart, UserProfile } from "../types";
import { getMetaphysicsPrompt } from "./geminiService"; 
// 假设你有一个紫微排盘的格式化工具，如果没有，我们在下面的代码里简单处理
// import { formatZiweiChart } from "./astrologyService"; 

const API_KEY = "你的API_KEY"; // 实际项目中请从环境变量或 SessionStorage 获取

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 定义聊天模式
export type ChatMode = 'bazi' | 'ziwei';

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
  ziweiChartString: string, // 传入格式化后的紫微盘字符串
  mode: ChatMode,
  onStream: (chunk: string) => void
) => {
  const apiKey = sessionStorage.getItem('ai_api_key');
  if (!apiKey) throw new Error("API Key missing");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  // 🔥 核心逻辑：根据当前模式，动态切换系统人设
  const systemInstruction = mode === 'bazi' 
    ? getBaziSystemPrompt(baziChart)
    : getZiweiSystemPrompt(profile, ziweiChartString);

  // 构造发送给 AI 的完整上下文
  // 注意：我们将历史记录保留，这样 AI 知道之前聊了什么
  // 但我们通过 System Message 告诉 AI：“现在请用 [新模式] 的视角来回答下一句”
  const chatHistoryForAi = [
    {
      role: 'user',
      parts: [{ text: `System Instruction: ${systemInstruction}` }]
    },
    ...history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
  ];

  try {
    const chat = model.startChat({
      history: chatHistoryForAi.slice(0, -1), // 历史记录
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      },
    });

    // 发送最后一条消息
    const lastMsg = chatHistoryForAi[chatHistoryForAi.length - 1];
    const result = await chat.sendMessageStream(lastMsg.parts[0].text);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      onStream(text);
    }
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};