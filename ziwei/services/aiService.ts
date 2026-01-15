// 辅助函数：清洗数据，防止 undefined 报错和循环引用
const sanitizeChartData = (chartData: any) => {
  if (!chartData || !chartData.palaces) return "无数据";

  const simplifiedPalaces = chartData.palaces.map((p: any) => {
    return {
      name: p.name, 
      ganZhi: p.ganZhi,
      // 🔥 修复点：添加 || [] 防止 .map 报错
      majorStars: (p.majorStars || []).map((s: any) => s.name).join(','),
      minorStars: (p.minorStars || []).map((s: any) => s.name).join(','),
      adjectiveStars: (p.adjectiveStars || []).map((s: any) => s.name).join(','),
      decadal: p.decadal ? `${p.decadal.range[0]}-${p.decadal.range[1]}` : ''
    };
  });

  return {
    user: {
      wuxing: chartData.fiveElementClass,
      gender: chartData.gender
    },
    palaces: simplifiedPalaces
  };
};

// 流式响应读取器（通用工具）
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
        } catch (e) {
          // 忽略解析错误（可能是半截数据）
        }
      }
    }
  }
  return fullText;
};

export const callDeepSeekAPI = async (
  apiKey: string | undefined, 
  chartData: any, 
  age: number, 
  gender: string, 
  currentYear: number
): Promise<string> => {
  
  const cleanData = sanitizeChartData(chartData);

  const systemPrompt = `你是一位精通紫微斗数（钦天四化与三合流派）的命理大师。
请根据用户的紫微命盘数据，进行流年运势分析。

输出要求：
1. 返回格式必须是 **HTML** (不要包含 markdown 代码块标记如 \`\`\`html)。
2. 使用 <h3>, <p>, <ul>, <li>, <strong> 等标签排版。
3. 重点分析：命宫、财帛宫、官禄宫。
`;

  const userPrompt = `用户性别：${gender}
当前虚岁：${age}
流年：${currentYear}

【紫微命盘数据】：
${JSON.stringify(cleanData, null, 2)}

请分析今年的财运和事业。`;

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
        model: 'deepseek-chat'
      })
    });

    if (!response.ok) throw new Error(`请求失败: ${response.status}`);

    // 🔥 使用流式读取器拼接结果
    let content = await readStreamResponse(response);
    
    // 清理 markdown
    content = content.replace(/```html/g, '').replace(/```/g, '').trim();
    
    return content;

  } catch (error: any) {
    console.error("Ziwei AI Error:", error);
    throw new Error(error.message || "AI 分析服务连接中断");
  }
};