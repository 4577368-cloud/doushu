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
- 日主：${chart.dayMaster} (${chart.dayMasterElement || '未知'})
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
1. **必须**使用紫微斗数理论进行分析。
2. **回答风格：** 直接、干练、专业。**严禁**使用括号内的动作描写（如“指尖轻点”、“目光微动”等），不要进行角色扮演式的旁白，直接输出分析结果。
3. 语气专业、温暖、客观。
4. 回答结尾必须提供3个相关的追问建议，格式必须严格如下：
|||问题1;问题2;问题3
`;
};

/**
 * 发送对话请求 (支持流式响应 + VIP免Key)
 */
export const sendChatMessage = async (
  history: ChatMessage[],
  profile: UserProfile,
  baziChart: BaziChart,
  ziweiChartString: string, 
  mode: ChatMode,
  onStream: (chunk: string) => void,
  isVip: boolean = false
) => {
  // 1. 获取本地 Key
  const apiKey = sessionStorage.getItem('ai_api_key');
  
  // 校验：如果不是 VIP 且没有 Key，拦截请求
  if (!isVip && !apiKey) {
    throw new Error("API Key missing - 请在设置中输入 Key，或升级 VIP 免 Key 使用");
  }

  // 2. 准备系统提示词
  const systemInstruction = mode === 'bazi' 
    ? getBaziSystemPrompt(baziChart)
    : getZiweiSystemPrompt(profile, ziweiChartString);

  // 3. 构造消息列表 (过滤掉历史中的 system 消息，防止重复)
  const cleanHistory = history.filter(msg => msg.role !== 'system');
  
  const messagesForAi = [
    { role: "system", content: systemInstruction },
    ...cleanHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  try {
    // 4. 请求后端
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: apiKey || undefined, // VIP 传 undefined，后端会自动读取环境变量
        messages: messagesForAi
      })
    });

    if (!response.ok) {
        // 尝试读取后端返回的 JSON 错误信息
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    if (!reader) throw new Error('无法读取响应流');

    // 🔥🔥🔥 核心：流式解析缓冲区 (Buffer) 🔥🔥🔥
    // 这个 buffer 专门用来处理因为网络分包而被截断的 JSON 字符串
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // 1. 解码当前数据包并拼接到缓冲区
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // 2. 按换行符分割数据
      const lines = buffer.split('\n');
      
      // 3. 核心技巧：保留最后一行到下一次循环
      // 因为最后一行数据可能是不完整的（例如只传输了一半的 JSON），不能现在解析
      buffer = lines.pop() || ''; 

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue; // 跳过空行
        if (trimmedLine === 'data: [DONE]') continue; // 结束标志
        
        // 4. 解析 SSE 数据行
        if (trimmedLine.startsWith('data: ')) {
          const jsonStr = trimmedLine.slice(6); // 去掉 "data: " 前缀
          try {
            const json = JSON.parse(jsonStr);
            // 提取 AI 生成的文本片段
            const content = json.choices[0]?.delta?.content || '';
            if (content) {
                onStream(content);
            }
          } catch (e) {
            // 解析失败通常是因为数据包还没传完，忽略这次错误，等待下个数据包拼接
            console.warn("解析流式 JSON 失败 (可忽略):", jsonStr);
          }
        }
      }
    }
  } catch (error) {
    console.error('DeepSeek Chat Error:', error);
    throw error;
  }
};