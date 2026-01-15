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

export const analyzeBaziStructured = async (
  chart: BaziChart,
  apiKey?: string // 这里的 apiKey 可能是空 (VIP)
): Promise<BaziReport> => {
  
  // 1. 构建提示词 (Prompt)
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
    { "id": "traits", "title": "1. 命主特质识别", "content": "详细分析命局所展现的性格特征、行事风格及天赋优势。" },
    { "id": "wealth", "title": "2. 财运格局深度解读", "content": "解读理财风格、赚钱模式（正财/偏财/投机），以及辅星对财运的加强或制约作用。" },
    { "id": "career", "title": "3. 事业运势与财官联动", "content": "分析工作执行力、领导力，给出适合深耕的行业方向，分析是因官得财还是因财生官。" },
    { "id": "cycle", "title": "4. 当前运势周期分析", "content": "重点分析流年时机把握、近期财运机会点、谨慎期以及命理风险预警（煞星冲克、化忌影响、破财风险）。" },
    { "id": "strategy", "title": "5. 财富与投资策略", "content": "定位投资风格，列出适合的投资类型与命理依据，明确应规避的投资类型。" },
    { "id": "markets", "title": "6. 行业与市场适配度", "content": "针对A股、美股、港股分别推荐的核心行业及其五行属性。" },
    { "id": "picks", "title": "7. 个股/ETF精选及择时", "content": "推荐不超过10个标的（含代码），简述理由，并给出${analysisYear}年内的买入/卖出时机建议。" },
    { "id": "monthly", "title": "8. 未来流月投资详表", "content": "从${analysisYear}年${currentMonth}月开始，列出连续6个月的运势评级与操作建议。" }
  ]
}

要求：
1. 所有的分析必须严格基于 **${analysisYear}年**。
2. content 字段必须为纯文本字符串，使用 \\n 换行，严禁嵌套任何 JSON 对象或数组。
3. 语言风格：将命理术语与金融术语无缝衔接，专业且极具穿透力。`;

  const userPrompt = `请基于以下命盘生成深度财富分析报告：\n${chartDescription}`;

  try {
    // 2. 发送请求给后端代理
    // 无论有没有 Key，都发给后端。如果没有 Key，后端会尝试用 VIP 环境变量。
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: apiKey || '', // 传给后端，如果是空字符串，后端会处理
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: 'deepseek-chat',
        response_format: { type: "json_object" } // 强制 JSON
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    
    // 3. 解析结果
    const rawContent = data.choices[0].message.content;
    const parsed = JSON.parse(rawContent);

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

  } catch (e) {
    console.error("AI Request Failed:", e);
    throw e;
  }
};