import { BaziChart, UserProfile } from "../types";

// 定义聊天模式
export type ChatMode = 'bazi' | 'ziwei';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * 1. 智能获取用户称呼
 */
const getUserName = (profile: UserProfile): string => {
  const rawName = profile.name ? profile.name.trim() : '';
  if (!rawName || rawName === '访客' || rawName === '某某') {
    return '命主';
  }
  return rawName;
};

/**
 * 2. 深度格式化八字排盘数据
 */
const formatFullChartDetails = (chart: BaziChart): string => {
    const p = chart.pillars;
    
    const formatPillar = (name: string, pillar: any) => {
        const gz = pillar.ganZhi;
        const hiddenInfo = gz.hiddenStems
            .map((h: any) => `${h.stem}(${h.shiShen})`)
            .join(' ');
        const shenshaStr = pillar.shenSha.length > 0 ? pillar.shenSha.join('、') : '无';
        
        return `   - **${name}**：${gz.gan}${gz.zhi} 
     [纳音] ${gz.naYin}  [星运] ${gz.lifeStage} 
     [十神] 天干:${gz.shiShenGan}  地支藏干:[${hiddenInfo}]
     [神煞] ${shenshaStr}`;
    };

    const luckStr = chart.luckPillars.slice(0, 8).map(l => 
        `${l.ganZhi.gan}${l.ganZhi.zhi}(${l.startAge}岁)`
    ).join(' → ');

    return `
【四柱八字深度排盘】
${formatPillar('年柱', p.year)}
${formatPillar('月柱', p.month)}
${formatPillar('日柱', p.day)}
${formatPillar('时柱', p.hour)}

【大运排盘】
   - 起运时间：${chart.startLuckText}
   - 大运顺排：${luckStr}

【核心局势】
   - 日主：${chart.dayMaster} (五行${chart.dayMasterElement})
   - 格局：${chart.pattern.name}
   - 强弱判定：${chart.balance.dayMasterStrength.level} (得分:${chart.balance.dayMasterStrength.score.toFixed(1)})
   - 喜用神：${chart.balance.yongShen.join('、')}
   - 忌神：${chart.balance.jiShen.join('、')}
    `.trim();
};

/**
 * 3. 构造八字 System Prompt
 * 🔥 重点优化：增加 "IGNORE PREVIOUS NAMES" 指令
 */
const getBaziSystemPrompt = (chart: BaziChart, currentGanZhi: string, profile: UserProfile): string => {
  const userName = getUserName(profile);
  const chartDetails = formatFullChartDetails(chart);
  
  return `
你是一位精通《子平真诠》、《滴天髓》、《三命通会》的八字命理大师。

【SECTION 1: 交互对象 (最高优先级)】
- 你的客户当前称呼是：**${userName}**。
- ⚠️ **重要指令**：即使在历史聊天记录中我使用了其他名字（如张三、李四等），请**完全忽略**那些旧称呼。从现在开始，**只称呼我为"${userName}"**。
- **禁止**称呼对方为"访客"或"用户"。

【SECTION 2: 命主原始档案 (绝对事实)】
*当${userName}询问生日或八字时，以此为准*
- 性别：${profile.gender === 'male' ? '男 (乾造)' : '女 (坤造)'}
- 公历：${profile.birthDate} ${profile.birthTime}
- 真太阳时：${profile.isSolarTime ? '已校正' : '未校正'}

【SECTION 3: 命盘全量数据 (分析依据)】
${chartDetails}

【SECTION 4: 当前时空 (流年参考)】
- 当前时间(流年)：${currentGanZhi}
- 说明：如果${userName}问"今年运势"或"测当下"，请以"${currentGanZhi}"中的干支与命盘进行**流年引动分析**。

【回答规则】
1. **专业深度**：利用提供的藏干、纳音、神煞信息进行细节分析。
2. **禁止动作描写**：不要输出 "(微笑)" 等旁白。
3. **强制建议生成**：
   无论用户说什么，必须在回答结尾提供3个新的追问建议。
   
   格式必须严格如下：
   |||建议1;建议2;建议3
`;
};

/**
 * 4. 构造紫微 System Prompt
 */
const getZiweiSystemPrompt = (profile: UserProfile, chartStr: string, currentGanZhi: string): string => {
  const userName = getUserName(profile);

  return `
你是一位精通“紫微斗数”的命理大师。

【SECTION 1: 交互对象 (最高优先级)】
- 你的客户当前称呼是：**${userName}**。
- ⚠️ **重要指令**：请忽略历史记录中的任何旧名字，**只称呼我为"${userName}"**。
- 禁止称呼"访客"。

【SECTION 2: 命主档案】
- 性别：${profile.gender === 'male' ? '男 (乾造)' : '女 (坤造)'}
- 公历：${profile.birthDate} ${profile.birthTime}

【SECTION 3: 紫微命盘数据】
${chartStr}

【SECTION 4: 当前时空】
- 当前时间：${currentGanZhi}

【回答规则】
1. 必须使用紫微斗数理论分析。
2. **禁止动作描写**。
3. **强制建议生成**：
   回答结尾必须提供3个建议，格式：
   |||建议1;建议2;建议3
`;
};

/**
 * 5. 发送对话请求
 */
export const sendChatMessage = async (
  history: ChatMessage[],
  profile: UserProfile,
  baziChart: BaziChart,
  ziweiChartString: string, 
  mode: ChatMode,
  onStream: (chunk: string) => void,
  isVip: boolean = false,
  currentGanZhi: string = ''
) => {
  const apiKey = sessionStorage.getItem('ai_api_key');
  
  if (!isVip && !apiKey) {
    throw new Error("API Key missing - 请在设置中输入 Key，或升级 VIP 免 Key 使用");
  }

  const systemInstruction = mode === 'bazi' 
    ? getBaziSystemPrompt(baziChart, currentGanZhi, profile)
    : getZiweiSystemPrompt(profile, ziweiChartString, currentGanZhi);

  const cleanHistory = history.filter(msg => msg.role !== 'system');
  
  const messagesForAi = [
    { role: "system", content: systemInstruction },
    ...cleanHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: apiKey || undefined, 
        messages: messagesForAi
      })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    if (!reader) throw new Error('无法读取响应流');

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; 

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const json = JSON.parse(jsonStr);
            const content = json.choices[0]?.delta?.content || '';
            if (content) onStream(content);
          } catch (e) {
            // ignore
          }
        }
      }
    }
  } catch (error) {
    console.error('DeepSeek Chat Error:', error);
    throw error;
  }
};