import OpenAI from "openai";
import { BaziChart } from "../types";

// 定义报告结构接口
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

/**
 * 使用 DeepSeek 生成结构化八字财富报告
 * 包含：详细提示词构建、JSON 模式请求、错误处理
 */
export const analyzeBaziStructured = async (
  chart: BaziChart,
  apiKey?: string
): Promise<BaziReport> => {
  
  // 1. 校验 Key
  const key = apiKey || sessionStorage.getItem('ai_api_key');
  if (!key) throw new Error("API Key 未设置，请先在设置中输入 DeepSeek API Key");

  // 2. 初始化 OpenAI 客户端 (连接 DeepSeek)
  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com', // DeepSeek 官方接口
    apiKey: key,
    dangerouslyAllowBrowser: true // 允许在前端直接调用
  });

  // 3. 构建动态上下文数据
  const analysisYear = new Date().getFullYear();
  
  // 构建详细的命盘描述 (保留了你原始代码的丰富度)
  const chartDescription = `
【核心命盘参数】
推演基准年份：${analysisYear}年
四柱八字：${chart.pillars.year.ganZhi.gan}${chart.pillars.year.ganZhi.zhi} ${chart.pillars.month.ganZhi.gan}${chart.pillars.month.ganZhi.zhi} ${chart.pillars.day.ganZhi.gan}${chart.pillars.day.ganZhi.zhi} ${chart.pillars.hour.ganZhi.gan}${chart.pillars.hour.ganZhi.zhi}
日主：${chart.dayMaster} (${chart.dayMasterElement}), 身强弱: ${chart.balance.dayMasterStrength.level}
格局：${chart.pattern.name}
喜用神：${chart.balance.yongShen.join('、')}
忌神：${chart.balance.jiShen.join('、')}
五行分布：${JSON.stringify(chart.wuxingCounts)}
`;

  // 4. 构建系统提示词 (System Prompt) - 核心业务逻辑
  const systemPrompt = `你是一位精通子平八字命理分析与现代财富管理的顾问。
请基于提供的命盘信息，量身定制一份跨市场（美股、港股、A股）财富与投资策略报告。
输出必须严格遵循以下 JSON 格式。

JSON 结构规范：
{
  "sections": [
    { "id": "traits", "title": "1. 命主特质识别", "content": "详细分析命主的性格优势与理财盲点..." },
    { "id": "wealth", "title": "2. 财运格局深度解读", "content": "分析正财/偏财分布，一生财运起伏..." },
    { "id": "career", "title": "3. 事业运势与财官联动", "content": "适合的行业方向，职场晋升或创业机会..." },
    { "id": "cycle", "title": "4. 当前运势周期分析", "content": "结合${analysisYear}流年，分析今年的财富机遇..." },
    { "id": "strategy", "title": "5. 财富与投资策略", "content": "稳健/激进策略建议，资产配置比例..." },
    { "id": "markets", "title": "6. 行业与市场适配度", "content": "五行喜用对应的现代行业（如喜火看科技/能源）..." },
    { "id": "picks", "title": "7. 个股/ETF精选及择时", "content": "具体的标的类型建议（仅供参考）..." },
    { "id": "monthly", "title": "8. 未来流月投资详表", "content": "未来几家个月的月度操作建议..." }
  ]
}

要求：
1. 所有的分析必须严格基于 **${analysisYear}年** 及命盘喜忌。
2. content 字段必须为纯文本字符串，使用 \\n 换行，严禁嵌套任何 JSON 对象或数组。
3. 语气专业、客观、富有洞察力。
`;

  const userPrompt = `请基于以下命盘生成深度财富分析报告：\n${chartDescription}`;

  try {
    // 5. 发起 DeepSeek 请求
    // 注意：这里我们使用 non-streaming (非流式)，因为我们需要等待完整的 JSON 生成才能解析
    // DeepSeek 的生成速度通常很快，直接 await 体验尚可，且 JSON 解析更安全
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "deepseek-chat", // 使用 V3 模型
      temperature: 1.1, // 稍微提高创造性
      response_format: { type: "json_object" }, // 🔥 强制 JSON 输出，这是关键
      max_tokens: 4000 // 保证报告足够长
    });

    const rawContent = completion.choices[0].message.content || "";

    // 6. 解析 JSON 结果
    let parsed;
    try {
        parsed = JSON.parse(rawContent);
    } catch (e) {
        console.error("JSON Parse Error:", e, rawContent);
        throw new Error("报告生成格式异常，请重试");
    }

    // 7. 数据标准化 (防止 AI 漏字段)
    const processedSections = (parsed.sections || []).map((s: any) => ({
      id: s.id || String(Math.random()),
      title: s.title || "分析项",
      content: typeof s.content === 'string' ? s.content : JSON.stringify(s.content, null, 2),
      type: 'text' as const
    }));

    // 生成纯文本副本 (用于复制功能)
    const copyText = processedSections.map((s: any) => `【${s.title}】\n${s.content}`).join('\n\n');

    return {
      title: `${chart.dayMaster}日主·${analysisYear}年财富报告`,
      copyText,
      sections: processedSections
    };

  } catch (e: any) {
    console.error("DeepSeek Request Failed:", e);
    // 友好的错误提示
    let msg = "生成失败";
    if (e.status === 401) msg = "API Key 无效或过期";
    if (e.status === 429) msg = "余额不足或请求过于频繁";
    if (e.status === 500) msg = "DeepSeek 服务器繁忙";
    throw new Error(`${msg}: ${e.message}`);
  }
};