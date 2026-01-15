import { BaziChart } from "../types";

export interface BaziReport {
  title: string;
  copyText: string;
  sections: {
    id: string;
    title: string;
    content: string;
    type: 'text';
  }[];
}

// 复制流式读取器 (为了不跨文件引用导致依赖混乱，这里在内部再定义一次)
const readStreamResponse = async (response: Response): Promise<string> => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";

  if (!reader) throw new Error("无法读取响应流");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6);
        if (jsonStr.trim() === '[DONE]') continue;
        try {
          const json = JSON.parse(jsonStr);
          const content = json.choices[0]?.delta?.content || '';
          fullText += content;
        } catch (e) { }
      }
    }
  }
  return fullText;
};

export const analyzeBaziStructured = async (
  chart: BaziChart,
  apiKey?: string
): Promise<BaziReport> => {
  
  const analysisYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const chartDescription = `
【核心命盘参数】
推演基准年份：${analysisYear}年
四柱八字：${chart.pillars.year.ganZhi.gan}${chart.pillars.year.ganZhi.zhi} ${chart.pillars.month.ganZhi.gan}${chart.pillars.month.ganZhi.zhi} ${chart.pillars.day.ganZhi.gan}${chart.pillars.day.ganZhi.zhi} ${chart.pillars.hour.ganZhi.gan}${chart.pillars.hour.ganZhi.zhi}
日主：${chart.dayMaster} (${chart.dayMasterElement}), 身强弱: ${chart.balance.dayMasterStrength.level}
格局：${chart.pattern.name}
喜用神：${chart.balance.yongShen.join('、')}
忌神：${chart.balance.jiShen.join('、')}
`;

  const systemPrompt = `你是一位精通子平八字命理分析与现代财富管理的顾问。
请基于提供的命盘信息，量身定制一份跨市场（美股、港股、A股）财富与投资策略报告。
输出必须严格遵循以下 JSON 格式。

JSON 结构规范：
{
  "sections": [
    { "id": "traits", "title": "1. 命主特质识别", "content": "详细分析..." },
    { "id": "wealth", "title": "2. 财运格局深度解读", "content": "..." },
    { "id": "career", "title": "3. 事业运势与财官联动", "content": "..." },
    { "id": "cycle", "title": "4. 当前运势周期分析", "content": "..." },
    { "id": "strategy", "title": "5. 财富与投资策略", "content": "..." },
    { "id": "markets", "title": "6. 行业与市场适配度", "content": "..." },
    { "id": "picks", "title": "7. 个股/ETF精选及择时", "content": "..." },
    { "id": "monthly", "title": "8. 未来流月投资详表", "content": "..." }
  ]
}

要求：
1. 所有的分析必须严格基于 **${analysisYear}年**。
2. content 字段必须为纯文本字符串，使用 \\n 换行，严禁嵌套任何 JSON 对象或数组。
`;

  const userPrompt = `请基于以下命盘生成深度财富分析报告：\n${chartDescription}`;

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: apiKey || '',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: 'deepseek-chat',
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
    }

    // 🔥 使用流式读取，绕过 504 超时
    const rawContent = await readStreamResponse(response);
    
    // 解析 JSON
    let parsed;
    try {
        parsed = JSON.parse(rawContent);
    } catch (e) {
        console.error("JSON Parse Error:", e, rawContent);
        throw new Error("报告生成不完整，请重试");
    }

    const processedSections = (parsed.sections || []).map((s: any) => ({
      id: s.id || String(Math.random()),
      title: s.title || "分析项",
      content: typeof s.content === 'string' ? s.content : JSON.stringify(s.content, null, 2),
      type: 'text' as const
    }));

    const copyText = processedSections.map((s: any) => `【${s.title}】\n${s.content}`).join('\n\n');

    return {
      title: "大师解盘报告",
      copyText,
      sections: processedSections
    };

  } catch (e: any) {
    console.error("AI Request Failed:", e);
    throw new Error(`生成失败: ${e.message || "未知错误"}`);
  }
};