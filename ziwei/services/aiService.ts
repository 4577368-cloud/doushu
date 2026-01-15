// 紫微 AI 服务 - 通过后端代理调用
export const callDeepSeekAPI = async (
  apiKey: string | undefined, 
  chartData: any, 
  age: number, 
  gender: string, 
  currentYear: number
): Promise<string> => {
  
  // 1. 构建提示词
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

【紫微命盘数据】：
${JSON.stringify(chartData, null, 2).slice(0, 3500)} (数据已截断，保留核心)

请重点分析今年的财运和事业机会。`;

  try {
    // 2. 发送请求给后端
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: apiKey || '', // 传给后端
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: 'deepseek-chat',
        // 紫微报告不需要强制 JSON，我们需要 HTML 文本
      })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // 3. 清理结果 (去掉可能存在的 markdown 标记)
    content = content.replace(/```html/g, '').replace(/```/g, '').trim();
    
    return content;

  } catch (error) {
    console.error("Ziwei AI Error:", error);
    throw error;
  }
};