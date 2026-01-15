// 辅助函数：清洗紫微数据，只保留文本，防止 JSON 死循环
const sanitizeChartData = (chartData: any) => {
  if (!chartData || !chartData.palaces) return "无数据";

  // 我们只提取 AI 需要的核心信息：宫位名、干支、主星、辅星
  const simplifiedPalaces = chartData.palaces.map((p: any) => {
    return {
      name: p.name, // 比如 "命宫"
      ganZhi: p.ganZhi, // 比如 "丙午"
      // 提取星曜名称，过滤掉复杂的对象引用
      majorStars: p.majorStars.map((s: any) => s.name).join(','),
      minorStars: p.minorStars.map((s: any) => s.name).join(','),
      adjectiveStars: p.adjectiveStars.map((s: any) => s.name).join(','), // 四化等
      decadal: p.decadal ? `${p.decadal.range[0]}-${p.decadal.range[1]}` : '' // 大限
    };
  });

  return {
    user: {
      wuxing: chartData.fiveElementClass, // 五行局
      gender: chartData.gender
    },
    palaces: simplifiedPalaces
  };
};

// 紫微 AI 服务 - 通过后端代理调用
export const callDeepSeekAPI = async (
  apiKey: string | undefined, 
  chartData: any, 
  age: number, 
  gender: string, 
  currentYear: number
): Promise<string> => {
  
  // 1. 🔥 关键步骤：清洗数据，移除循环引用
  const cleanData = sanitizeChartData(chartData);

  const systemPrompt = `你是一位精通紫微斗数（钦天四化与三合流派）的命理大师。
请根据用户的紫微命盘数据，进行流年运势分析。

输出要求：
1. 返回格式必须是 **HTML** (不要包含 markdown 代码块标记如 \`\`\`html)。
2. 使用 <h3>, <p>, <ul>, <li>, <strong> 等标签进行排版，样式要美观易读。
3. 重点分析：命宫、财帛宫、官禄宫的星曜组合。
4. 结合当前年龄 (${age}岁) 和流年 (${currentYear}) 进行针对性建议。
`;

  const userPrompt = `用户性别：${gender}
当前虚岁：${age}
流年：${currentYear}

【紫微命盘数据 (已简化)】：
${JSON.stringify(cleanData, null, 2)}

请重点分析今年的财运和事业机会。`;

  try {
    // 2. 发送请求给后端
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: apiKey || '', 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: 'deepseek-chat'
      })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // 3. 清理结果
    content = content.replace(/```html/g, '').replace(/```/g, '').trim();
    
    return content;

  } catch (error: any) {
    console.error("Ziwei AI Error:", error);
    // 抛出更友好的错误信息
    throw new Error(error.message || "AI 服务连接失败");
  }
};