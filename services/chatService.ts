import { BaziChart } from "../types";

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const sendChatMessage = async (messages: ChatMessage[], chart: BaziChart): Promise<string> => {
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
            // 精简传输数据，避免 token 超限，只传核心
        } 
      }),
    });

    if (!response.ok) {
      throw new Error('网络请求失败');
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error("Chat Service Error:", error);
    throw error;
  }
};