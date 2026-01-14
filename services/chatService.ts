import { BaziChart } from "../types";

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 🔥 修改：增加 onUpdate 回调，用于流式更新 UI
export const sendChatMessage = async (
    messages: ChatMessage[], 
    chart: BaziChart,
    onUpdate: (chunk: string) => void // 新增回调函数
): Promise<void> => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        chartContext: {
            gender: chart.gender,
            dayMaster: chart.dayMaster,
            pillars: chart.pillars,
            balance: chart.balance,
            pattern: chart.pattern
        } 
      }),
    });

    if (!response.ok) {
      throw new Error('网络请求失败');
    }

    // 🔥 处理流式响应
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    
    if (!reader) throw new Error("无法读取流数据");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      
      // DeepSeek/OpenAI 返回的数据格式是 "data: {...}\n\n"
      // 我们需要解析这些行
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6); // 去掉 "data: "
          if (jsonStr.trim() === '[DONE]') continue; // 结束标志

          try {
            const json = JSON.parse(jsonStr);
            const content = json.choices[0]?.delta?.content || '';
            if (content) {
              onUpdate(content); // 🔥每收到一个字，立即通知 UI
            }
          } catch (e) {
            console.warn("Stream parse error", e);
          }
        }
      }
    }

  } catch (error) {
    console.error("Chat Service Error:", error);
    throw error;
  }
};