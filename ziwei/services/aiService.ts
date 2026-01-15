
// 类型定义
interface ZiweiPalace {
  name: string;
  ganZhi: string;
  majorStars: any[];
  minorStars: any[];
  adjectiveStars: any[];
  decadal?: {
    range: [number, number];
  };
}

// Updated to match actual ChartData structure from types.ts and unify with sanitizeChartData expectations
interface ZiweiChartData {
  palaces: any[]; // Palace[] from types.ts
  bureau: { name: string; num: number; type: string };
  yearGan: string;
  gender?: string;
  birthYear?: number;
}

// ---------------------- 核心清洗与增强逻辑 ----------------------

// 辅助函数：清洗数据并增强
const sanitizeChartData = (chartData: any, age: number, currentYear: number) => {
  if (!chartData || !chartData.palaces) return null;

  const lunarYear = currentYear;
  // Use currentYear - age as an approximation if birthYear isn't explicit
  const birthYear = chartData.solar?.getYear() || (currentYear - age + 1);
  const liuNianGanZhi = calculateLiuNianGanZhi(birthYear, lunarYear);
  
  // 找出关键宫位 (容错处理)
  const keyPalaces = {
    ming: chartData.palaces.find((p: any) => p.name === '命宫'),
    caiBo: chartData.palaces.find((p: any) => p.name === '财帛'),
    guanLu: chartData.palaces.find((p: any) => p.name === '官禄'),
    fuQi: chartData.palaces.find((p: any) => p.name === '夫妻'),
  };

  const simplifiedPalaces = chartData.palaces.map((p: any) => ({
    name: p.name,
    ganZhi: `${p.stem}${p.zhi}`,
    majorStars: (p.stars.major || []).map((s: any) => ({
      name: s.name,
      type: s.type,
      isGood: ['major', 'lucky'].includes(s.type)
    })),
    minorStars: (p.stars.minor || []).map((s: any) => s.name).join(','),
    decadal: p.daXian || '',
    // 添加四化星信息
    siHua: (p.siHuaTexts || []).map((s: any) => `${s.star}${s.hua}`).join(',')
  }));

  return {
    user: {
      wuxing: chartData.bureau?.name || '',
      gender: chartData.gender || 'M',
      age,
      lunarYear: currentYear
    },
    // 流年分析相关
    liuNian: {
      ganZhi: liuNianGanZhi,
      palace: findLiuNianPalace(chartData.palaces, liuNianGanZhi),
      stars: analyzeLiuNianStars(keyPalaces.ming, lunarYear)
    },
    // 大限分析
    daXian: {
      current: `${age}岁`,
      palace: chartData.palaces.find((p: any) => {
          const range = p.daXian?.split('-').map(Number);
          return range && age >= range[0] && age <= range[1];
      })?.name || '未知',
      influence: analyzeDaXianInfluence(Math.floor(age/10))
    },
    // 关键宫位深度分析
    keyPalaces: {
      ming: analyzePalaceDeeply(keyPalaces.ming, '命宫'),
      caiBo: analyzePalaceDeeply(keyPalaces.caiBo, '财帛'),
      guanLu: analyzePalaceDeeply(keyPalaces.guanLu, '官禄'),
      fuQi: analyzePalaceDeeply(keyPalaces.fuQi, '夫妻')
    },
    palaces: simplifiedPalaces
  };
};

// ---------------------- 辅助计算函数 (补全) ----------------------

// 查找流年宫位 (根据地支)
const findLiuNianPalace = (palaces: any[], liuNianGanZhi: string) => {
    const liuZhi = liuNianGanZhi.slice(1); 
    const palace = palaces.find(p => p.zhi === liuZhi);
    return palace ? palace.name : "未知";
};

// 分析流年星曜 (简化版)
const analyzeLiuNianStars = (mingPalace: any | undefined, year: number) => {
    if (!mingPalace) return "平稳";
    const luckyStars = ['天魁','天钺','左辅','右弼','文昌','文曲'];
    const hasLucky = mingPalace.stars?.minor?.some((s: any) => luckyStars.includes(s.name));
    return hasLucky ? "吉星高照" : "需谨慎";
};

// 分析大限影响
const analyzeDaXianInfluence = (daXianIndex: number) => {
    if (daXianIndex >= 3 && daXianIndex <= 5) return "事业冲刺期";
    if (daXianIndex >= 6) return "退休规划期";
    return "基础积累期";
};

// 星曜解释 (简化版知识库)
const getStarInterpretation = (starName: string, palaceName: string) => {
    const map: Record<string, string> = {
        '紫微': '帝王之星，主掌权、尊贵。',
        '天机': '智慧之星，主变动、思考。',
        '太阳': '光明之星，主博爱、付出。',
        '武曲': '财星，主刚毅、行动。',
        '天同': '福星，主享受、温和。',
        '廉贞': '次桃花，主复杂、变通。',
        '天府': '财库，主保守、积蓄。',
        '太阴': '富星，主温柔、内敛。',
        '贪狼': '欲望之星，主交际、多才。',
        '巨门': '暗星，主口舌、研究。',
        '天相': '印星，主辅助、公正。',
        '天梁': '荫星，主长寿、解厄。',
        '七杀': '将星，主肃杀、开创。',
        '破军': '耗星，主破坏、先破后立。'
    };
    return map[starName] || "具有独特的影响力。";
};

// 现代意义映射
const getModernImplication = (starName: string, palaceName: string) => {
    const map: Record<string, string> = {
        '紫微': '适合管理层、创业者。',
        '天机': '适合IT、策划、分析师。',
        '太阳': '适合公关、媒体、能源。',
        '武曲': '适合金融、军警、实业。',
        '天同': '适合服务业、艺术、心理。',
        '廉贞': '适合公关、电子、精密作业。',
        '天府': '适合银行、房地产、仓储。',
        '太阴': '适合护理、美容、财务。',
        '贪狼': '适合演艺、销售、教育。',
        '巨门': '适合律师、教师、讲师。',
        '天相': '适合秘书、公务员、HR。',
        '天梁': '适合医生、保险、慈善。',
        '七杀': '适合业务、外勤、技术。',
        '破军': '适合创意、爆破、运输。'
    };
    return map[starName] || "适合多元化发展。";
};

// 分析四化影响
const analyzeSiHuaEffects = (palace: any) => {
    if (!palace?.siHuaTexts?.length) return "局势平稳。";
    return palace.siHuaTexts.map((s: any) => `${s.star}化${s.hua}`).join('，') + "引动局势变化。";
};

// 获取三方四正
const getRelatedPalaces = (palaceName: string) => {
    return "受对宫及三合宫位星曜的共同影响。";
};

// 现代关联性
const getModernRelevance = (palaceName: string) => {
    const map: Record<string, string> = {
        '命宫': '个人性格与核心能力',
        '财帛': '现金流与理财观念',
        '官禄': '职业发展与职场地位',
        '夫妻': '情感关系与合作伙伴',
        '迁移': '外出运与社交圈'
    };
    return map[palaceName] || "生活领域的影响";
};

// 流年天干地支计算
const calculateLiuNianGanZhi = (birthYear: number, currentLunarYear: number) => {
  const tiangan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const dizhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
  const yearDiff = currentLunarYear - 1984; // 甲子年基准
  const ganIndex = (yearDiff % 10 + 10) % 10;
  const zhiIndex = (yearDiff % 12 + 12) % 12;
  
  return tiangan[ganIndex] + dizhi[zhiIndex];
};

// 宫位深度分析
const analyzePalaceDeeply = (palace: any | undefined, palaceName: string) => {
  if (!palace) return null;
  
  const analysis = {
    name: palaceName,
    ganZhi: `${palace.stem}${palace.zhi}`,
    // 主星分析
    majorStars: (palace.stars?.major || []).map((star: any) => ({
      name: star.name,
      interpretation: getStarInterpretation(star.name, palaceName),
      modernImplication: getModernImplication(star.name, palaceName)
    })),
    // 四化影响
    siHuaEffects: analyzeSiHuaEffects(palace),
    // 三方四正宫位的影响
    relatedPalaces: getRelatedPalaces(palaceName),
    // 现代意义
    modernRelevance: getModernRelevance(palaceName)
  };
  
  return analysis;
};

// ---------------------- 核心 AI 调用函数 ----------------------

// 流式响应读取器
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
          // 忽略解析错误
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
  
  // 1. 清洗并增强数据
  const enhancedData = sanitizeChartData(chartData, age, currentYear);

  if (!enhancedData) {
      throw new Error("排盘数据异常，无法分析");
  }

  const systemPrompt = `你是一位精通紫微斗数（钦天四化与三合流派）的命理大师，尤其擅长将传统命理与现代生活结合分析。
请根据用户的紫微命盘数据，进行全面的流年运势分析。

## 分析框架要求：
1. **现代应用导向**：将星曜特质映射到现代行业、职业发展、财富积累方式
2. **多层次分析**：包含大限趋势、流年重点、流月提醒
3. **实用性建议**：给出具体的行动建议和注意事项
4. **辩证分析**：分析优势和挑战，避免绝对化判断

## 输出要求：
1. 返回格式必须是 **HTML** (不要包含 markdown 代码块标记如 \`\`\`html)
2. 使用现代清晰的排版：
   - 使用 <div class="section"> 包裹每个部分
   - 使用 <h3>, <h4> 作为标题
   - 使用 <ul class="analysis-list"> 和 <li class="point-item"> 列表项
   - 使用 <strong class="highlight"> 强调重点
   - 使用 <p class="advice"> 存放建议
3. 结构必须包含以下部分：
   - 大限趋势总览
   - 流年核心主题
   - 财富深度分析
   - 事业职业发展
   - 重要流月提醒
   - 综合建议

## 现代分析要点：
1. 财富类型：区分稳定收入、投资理财、副业创业、被动收入
2. 事业适配：分析适合的行业、团队角色、发展时机
3. 风险提示：投资风险、职业转型风险、人际关系风险
4. 时机把握：最佳行动月份、重要决策时机`;

  const userPrompt = `## 用户基本信息
- 性别：${gender}
- 当前虚岁：${age}
- 流年：${currentYear}年（${enhancedData.liuNian.ganZhi}年）
- 五行局：${enhancedData.user.wuxing}

## 当前大限信息
- 大限阶段：${enhancedData.daXian.current}
- 大限宫位：${enhancedData.daXian.palace}
- 主要影响：${enhancedData.daXian.influence}

## 流年重点宫位
- 流年宫位：${enhancedData.liuNian.palace}
- 流年星曜：${enhancedData.liuNian.stars}

## 关键宫位深度分析
${JSON.stringify(enhancedData.keyPalaces, null, 2)}

## 请重点分析：
1. **财富层面**：
   - 今年的主要财富来源是什么？
   - 是否有投资机会？风险如何？
   - 哪些月份适合财务决策？

2. **事业层面**：
   - 适合发展的行业方向？
   - 是否需要职业转型？
   - 职场人际关系注意事项？

3. **流月重点**：
   - 重要决策时机
   - 需要避开的月份

4. **现代应用建议**：
   - 具体行动步骤
   - 资源利用建议
   - 风险防范措施`;

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Analysis-Type': 'ziwei-enhanced' 
      },
      body: JSON.stringify({
        apiKey: apiKey || '', 
        messages: [
          { 
            role: "system", 
            content: systemPrompt 
          },
          { 
            role: "user", 
            content: userPrompt 
          }
        ],
        model: 'deepseek-chat',
        temperature: 0.7, 
        stream: true // 强制开启流式，防止 504 超时
      })
    });

    if (!response.ok) throw new Error(`请求失败: ${response.status}`);

    let content = await readStreamResponse(response);
    
    // 清理和增强HTML
    content = content
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();
    
    // 添加CSS样式 (内联样式，确保在任何地方都能渲染)
    const styledContent = `
      <style>
        .ziwei-analysis {
          font-family: 'Microsoft YaHei', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
        }
        .section {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #4a6fa5;
        }
        h3 {
          color: #2c3e50;
          border-bottom: 2px solid #eee;
          padding-bottom: 10px;
          font-size: 18px;
          font-weight: 800;
        }
        h4 {
          color: #34495e;
          margin-top: 15px;
          font-size: 16px;
          font-weight: 700;
        }
        .analysis-list {
          padding-left: 20px;
        }
        .point-item {
          margin: 8px 0;
          padding: 5px;
          background: white;
          border-radius: 4px;
        }
        .highlight {
          color: #e74c3c;
          font-weight: bold;
        }
        .advice {
          background: #e8f4fc;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
          color: #2980b9;
          font-weight: 500;
        }
      </style>
      <div class="ziwei-analysis">
        ${content}
      </div>
    `;
    
    return styledContent;

  } catch (error: any) {
    console.error("Ziwei AI Error:", error);
    throw new Error(error.message || "AI 分析服务连接中断");
  }
};
