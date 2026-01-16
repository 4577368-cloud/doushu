import { BaziChart, UserProfile, ChatMode } from "../types";

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ... (getBaziSystemPrompt 等辅助函数保持不变，省略) ...

export const sendChatMessage = async (
  history: ChatMessage[],
  profile: UserProfile,
  baziChart: BaziChart,
  ziweiChartString: string, 
  mode: ChatMode,
  onStream: (chunk: string) => void,
  isVip: boolean // 🔥 必须接收这个参数
) => {
  
  // 1. 获取本地 Key
  const userKey = sessionStorage.getItem('ai_api_key');
  
  // 🔥🔥🔥 关键修复在这里 🔥🔥🔥
  // 旧代码是：if (!userKey) throw new Error("API Key missing");
  // 新代码意思：如果你不是 VIP，且你还没填 Key，那才报错。
  if (!isVip && !userKey) {
    throw new Error("API Key missing - 请在设置中输入 Key，或升级 VIP 免 Key 使用");
  }

  // 2. 构造 System Prompt (你的原逻辑)
  // 假设你已经在文件上方定义了 getBaziSystemPrompt 和 getZiweiSystemPrompt
  // 这里为了代码简洁，我用伪代码代替，请保留你原来的 Prompt 生成逻辑
  const systemInstruction = mode === 'bazi' 
    ? `(这里是你原来的八字 Prompt 生成逻辑)` 
    : `(这里是你原来的紫微 Prompt 生成逻辑)`; 

  // 3. 发送请求给后端 (Next.js / Vercel API)
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [
            { role: "system", content: systemInstruction },
            // 过滤掉历史中的 system 消息，防止重复
            ...history.filter(m => m.role !== 'system').slice(-20)
        ],
        // 🔥 如果是 VIP，这里传 undefined，后端就会去读环境变量
        apiKey: userKey || undefined 
      }),
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `请求失败: ${response.statusText}`);
    }
    
    if (!response.body) throw new Error("No response body");

    // 4. 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      onStream(text);
    }

  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};