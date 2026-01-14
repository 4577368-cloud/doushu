
import { Palace, ChartData, Star } from '../types';
import { 
    STAR_INFO, 
    STAR_EXTENDED_INFO, 
    LUCKY_STARS, 
    BAD_STARS, 
    PALACE_THEMES, 
    SHEN_SHA_DB,
    SI_HUA_RULES,
    RISK_CATEGORIES,
    INTERPRETATION_TEMPLATES, 
    AGE_CONTEXT_RULES,
    STAR_TRANSFORM_MEANINGS,
    HEAVENLY_STEMS,
    DA_XIAN_STRATEGIES,
    SI_HUA_TABLE,
    LIU_NIAN_STAR_MEANINGS
} from '../constants';

type AgeStage = 'YOUTH' | 'ESTABLISH' | 'MATURE' | 'SENIOR';

const getAgeStage = (age: number): AgeStage => {
    if (age <= 28) return 'YOUTH';
    if (age <= 38) return 'ESTABLISH';
    if (age <= 48) return 'MATURE';
    return 'SENIOR';
};

const getOppositePalace = (palaces: Palace[], currentIdx: number): Palace => {
    return palaces[(currentIdx + 6) % 12];
};

const getSanFangPalaces = (palaces: Palace[], currentIdx: number): Palace[] => {
    return [
        palaces[(currentIdx + 4) % 12],
        palaces[(currentIdx + 8) % 12]
    ];
};

const getStarNames = (palace: Palace): string[] => {
    return [...palace.stars.major, ...palace.stars.minor].map(s => s.name);
};

const formatStarList = (stars: Star[]): string => {
    return stars.map(s => s.name).join('、');
};

const calculatePalaceScore = (palace: Palace, chart: ChartData): { score: number, reason: string } => {
    let score = 3;
    let reasons = [];
    const sanFang = [...getSanFangPalaces(chart.palaces, palace.zhiIndex), palace, getOppositePalace(chart.palaces, palace.zhiIndex)];
    let luckyCount = 0;
    let badCount = 0;
    let brightCount = 0;

    sanFang.forEach(p => {
        [...p.stars.major, ...p.stars.minor].forEach(s => {
            if (['庙', '旺'].includes(s.brightness || '')) brightCount++;
            if (['陷'].includes(s.brightness || '')) score -= 0.2;
            if (['左辅', '右弼', '天魁', '天钺', '文昌', '文曲', '禄存'].includes(s.name)) luckyCount++;
            if (['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'].includes(s.name)) badCount++;
        });
    });

    score += (luckyCount * 0.5);
    score -= (badCount * 0.5);
    score += (brightCount * 0.2);

    if (luckyCount > badCount + 2) reasons.push("吉星拱照");
    else if (badCount > luckyCount + 1) reasons.push("煞星冲破");
    else reasons.push("吉凶参半");

    if (brightCount > 5) reasons.push("星曜得地");
    return { score: Math.max(1, Math.min(5, Math.round(score * 2) / 2)), reason: reasons.join('，') };
};

const PATTERN_META: Record<string, any> = {
    '紫府同宫格': { quote: "帝星入庙，食禄万钟", mechanism: "紫微与天府同宫，一守一攻，动静皆宜", domain: "公职、大型企业、管理", benefit: "名望与权力", period: "中年或大限行经之时" },
    '紫微七杀格': { quote: "紫微七杀化权，反作祯祥", mechanism: "紫微帝星驾驭七杀将星，化杀为权", domain: "军警、司法、实业", benefit: "威信与实权" },
    '机月同梁格': { quote: "机月同梁作吏人", mechanism: "天机智谋、太阴积富、天同享福、天梁荫庇，四星汇聚，局势稳健", domain: "公职、大型机构、教育法律", benefit: "安稳与清贵" },
    '日照雷门格': { quote: "日照雷门，富贵荣华", mechanism: "太阳在卯宫入庙，旭日东升，光芒万丈", domain: "政治、公众事务、传播", benefit: "极大的名声" },
    '禄马交驰格': { quote: "禄马交驰，发财远郡", mechanism: "禄存（财）与天马（动）同宫或冲照，动中生财", domain: "贸易、物流、跨境业务", benefit: "巨额流动资产" },
    '火贪格': { quote: "火贪一举，威震边疆", mechanism: "贪狼欲望之星遇火星爆发之力，主爆发性成就", domain: "投机、冒险、新兴行业", benefit: "横发致富" },
    '杀破狼格': { quote: "乱世英雄，开创基业", mechanism: "七杀、破军、贪狼三方会照，动荡中求发展", domain: "创业、军警、销售", benefit: "开天辟地" },
    '羊陀夹命格': { quote: "羊陀夹命，刑克甚重", mechanism: "擎羊陀罗夹命宫，如身处荆棘", cause: "煞星夹攻", negativeEffect: "环境逼迫，进退维谷", risk: "贫困或带疾延年" },
    '空劫夹命格': { quote: "空劫夹命，半生漂泊", mechanism: "地空地劫夹命宫，财来财去", cause: "空亡夹攻", negativeEffect: "六亲缘薄，物质匮乏", risk: "理想落空" },
};

const analyzeCoreTraits = (palace: Palace, oppositePalace: Palace): string => {
    let html = `<div class="space-y-3">`;
    if (palace.stars.major.length > 0) {
        const starCards = palace.stars.major.map(star => {
            const extInfo = STAR_EXTENDED_INFO[star.name];
            const starInfo = STAR_INFO[star.name] || "暂无详解";
            const brightness = star.brightness ? `(${star.brightness})` : '';
            let card = `<div class="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">`;
            card += `<div class="flex items-center gap-2 mb-1.5">
                        <span class="text-base font-black text-indigo-900">${star.name}</span>
                        <span class="text-[10px] px-1 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">${brightness || '平'}</span>
                        ${extInfo ? `<span class="text-[10px] text-slate-500">${extInfo.yinYang}${extInfo.element} · ${extInfo.nature}</span>` : ''}
                     </div>`;
            if (extInfo) {
                card += `<div class="text-xs text-slate-800 leading-relaxed mb-1.5">
                            <span class="font-bold text-indigo-900">核心特质：</span>${extInfo.domain}
                         </div>`;
            }
            card += `<div class="text-xs text-slate-600 leading-relaxed text-justify">${starInfo}</div>`;
            card += `</div>`;
            return card;
        }).join('');
        html += `<div class="grid grid-cols-1 gap-2.5">${starCards}</div>`;

        const minorStars = palace.stars.minor.map(s => s.name);
        const hasLucky = minorStars.some(s => LUCKY_STARS.includes(s));
        const hasBad = minorStars.some(s => BAD_STARS.includes(s));
        let interactionText = palace.stars.major.length > 1 ? "双星同宫，性质相互激荡。" : "独坐本宫，特质鲜明。";
        let interactionColor = "bg-slate-50 border-slate-200 text-slate-800";
        if (hasLucky && hasBad) interactionText += "吉煞混杂，运势起伏较大，虽有助力但亦多阻碍。";
        else if (hasLucky) { interactionText += "幸得吉星辅佐，格局宏大，行事得力。"; interactionColor = "bg-emerald-50 border-emerald-100 text-emerald-900"; }
        else if (hasBad) { interactionText += "受煞星干扰，需防性格冲突或运势波折。"; interactionColor = "bg-amber-50 border-amber-100 text-amber-900"; }
        html += `<div class="${interactionColor} p-2.5 rounded-lg border text-xs leading-relaxed mt-2"><span class="font-bold">命盘表现：</span>${interactionText}</div>`;
    } else {
        const oppStars = formatStarList(oppositePalace.stars.major);
        const oppSha = oppositePalace.stars.minor.map(s => s.name).filter(s => BAD_STARS.includes(s)).join('、');
        html += `<div class="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <div class="text-sm font-bold text-slate-500 mb-1.5">本宫无主星 (空宫)</div>
                    <div class="text-xs text-slate-700 leading-relaxed text-justify mb-2">能量如镜，全赖对宫【${oppositePalace.name}】星曜 <strong>${oppStars || '亦无主星'}</strong> 借入。缺乏主动驱动力，但具备极强适应力。</div>
                    ${oppSha ? `<div class="text-[10px] bg-red-50 text-red-800 p-1.5 rounded border border-red-100 mb-1.5">风险：对宫见煞（${oppSha}），易被动卷入是非。</div>` : ''}
                 </div>`;
    }
    const shenSha = [...palace.stars.minor].filter(s => SHEN_SHA_DB[s.name]);
    if (shenSha.length > 0) {
        html += `<div class="mt-3 border-t border-slate-100 pt-2.5">
                    <h5 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">杂曜 / 神煞影响</h5>
                    <div class="grid grid-cols-1 gap-2">`;
        shenSha.forEach(s => {
            const dbInfo = SHEN_SHA_DB[s.name];
            const isGood = dbInfo.type === '吉';
            html += `<div class="flex items-start gap-2 p-1.5 rounded ${isGood ? 'bg-emerald-50/50' : 'bg-rose-50/50'}">
                        <span class="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${isGood ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${s.name}</span>
                        <div class="text-[10px] text-slate-600 leading-relaxed"><span class="font-bold text-slate-800">[${dbInfo.field}]</span> ${dbInfo.rule}</div>
                     </div>`;
        });
        html += `</div></div>`;
    }
    html += `</div>`;
    return `<h4>核心特质</h4>${html}`;
};

const analyzePatterns = (chart: ChartData, palace: Palace): string => {
    const palaceStarNames = getStarNames(palace);
    const relevantPatterns = chart.patterns.filter(p => p.stars.some(s => palaceStarNames.includes(s)));
    let html = `<div class="space-y-3">`;
    if (relevantPatterns.length > 0) {
        relevantPatterns.forEach(p => {
            const isGood = p.type.includes('吉');
            const meta = PATTERN_META[p.name] || {};
            const styles = isGood ? { bg: 'bg-orange-50/50', border: 'border-orange-200', text: 'text-orange-900', badge: 'bg-orange-100 text-orange-800' }
                                  : { bg: 'bg-stone-50', border: 'border-stone-200', text: 'text-stone-900', badge: 'bg-stone-200 text-stone-700' };
            let template = isGood ? INTERPRETATION_TEMPLATES.PATTERN.GOOD : INTERPRETATION_TEMPLATES.PATTERN.BAD;
            const quote = meta.quote || (isGood ? "吉星高照，祥瑞临门" : "运途多舛，好事多磨");
            const mechanism = meta.mechanism || p.description;
            const domain = PALACE_THEMES[palace.name] ? PALACE_THEMES[palace.name].split('、')[0] : '人生';
            let filledTemplate = template.replace("${patternName}", p.name).replace("${classicalQuote}", quote).replace("${classicalWarning}", quote).replace("${formationReason}", mechanism).replace("${cause}", mechanism).replace("${structuralAdvantage}", "互相辉映，能量倍增").replace("${lifeDomain}", domain).replace("${benefit}", isGood ? "名望与财富" : "").replace("${negativeEffect}", "能量耗散，易生波折").replace("${risk}", "破财或是非").replace("${peakPeriod}", "黄金发展期").replace("${favorableContext}", "环境顺遂").replace("${triggerYearType}", "冲克").replace("${exampleYears}", "刑冲之年").replace("${preventiveAction}", "保守行事").replace("${avoidPeriod}", "低迷期");
            const lines = filledTemplate.split('\n').filter(l => l.trim() !== '');
            let contentHtml = lines.map(line => {
                const match = line.match(/^【(.*?)】(.*)/);
                return match ? `<div class="mb-1 last:mb-0"><span class="font-bold ${styles.text} text-[10px] mr-1">${match[1]}</span><span class="text-xs text-slate-700">${match[2]}</span></div>`
                             : `<div class="text-xs text-slate-700">${line}</div>`;
            }).join('');
            html += `<div class="${styles.bg} ${styles.border} border rounded-lg p-3 shadow-sm"><div class="flex items-center gap-2 mb-2 border-b ${styles.border} pb-1.5 border-opacity-50"><span class="text-[10px] font-black px-1.5 py-0.5 rounded ${styles.badge}">${p.type}</span><span class="font-bold text-xs ${styles.text}">${p.name}</span></div>${contentHtml}</div>`;
        });
    } else {
        const { score, reason } = calculatePalaceScore(palace, chart);
        html += `<div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600"><span class="font-bold text-slate-800">局势评分：${score}星</span><p class="mt-1">${reason}。属于稳健型结构。</p></div>`;
    }
    html += `</div>`;
    return `<h4>先天格局</h4>${html}`;
};

const analyzeSiHuaDeepDive = (palace: Palace): string => {
    const transformedStars = [...palace.stars.major, ...palace.stars.minor].filter(s => s.hua);
    if (transformedStars.length === 0) return "";
    let html = `<div class="grid grid-cols-1 gap-2.5">`;
    transformedStars.forEach(star => {
        const rule = SI_HUA_RULES[`${star.name}-${star.hua}-${palace.name}`];
        let styleClass = star.hua==='禄'?'bg-emerald-50 border-emerald-100':star.hua==='权'?'bg-rose-50 border-rose-100':star.hua==='科'?'bg-sky-50 border-sky-100':'bg-stone-50 border-stone-200';
        let titleColor = star.hua==='禄'?'text-emerald-900':star.hua==='权'?'text-rose-900':star.hua==='科'?'text-sky-900':'text-stone-900';
        if (rule) {
            html += `<div class="${styleClass} border rounded-lg p-3 space-y-2">
                <div class="flex items-center justify-between pb-1.5 border-b border-black/5">
                    <span class="font-black ${titleColor} text-xs">${star.name}化${star.hua}</span>
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/50">${rule.huaNature}</span>
                </div>
                <div class="text-xs text-slate-800 leading-relaxed">${rule.overallMeaning}</div>
                <div class="grid grid-cols-2 gap-2 text-[10px] pt-1">
                    <div className="text-emerald-700">宜：${rule.do}</div>
                    <div className="text-rose-700">忌：${rule.dont}</div>
                </div>
            </div>`;
        }
    });
    html += `</div>`;
    return `<h4>四化变幻</h4>${html}`;
};

const analyzeLiuNian = (chart: ChartData, palace: Palace, yearGan: string, year: number): string => {
    const liunianBranchIndex = (year - 4) % 12;
    const liunianPalace = chart.palaces.find(p => p.zhiIndex === liunianBranchIndex);
    if (!liunianPalace) return "";
    const originalPalaceName = liunianPalace.name;
    const theme = PALACE_THEMES[originalPalaceName] || "领域";
    return `<div class="bg-red-50/50 border border-red-100 rounded-lg p-3">
        <h4 class="font-black text-red-900 text-xs mb-2">流年运势 (${year})</h4>
        <p class="text-xs text-slate-700 leading-relaxed">${year}年流年命宫重叠本命【${originalPalaceName}】，核心议题将围绕“${theme}”展开。</p>
    </div>`;
};

const analyzeRisks = (palace: Palace): string => {
    const palaceStars = getStarNames(palace);
    let riskMsgs: string[] = [];
    Object.entries(RISK_CATEGORIES).forEach(([category, riskStars]) => {
        const found = riskStars.filter(s => palaceStars.includes(s));
        if (found.length > 0) {
            const label = category === 'FINANCIAL' ? '财务' : category === 'PHYSICAL' ? '健康' : category === 'EMOTIONAL' ? '情绪' : '是非';
            riskMsgs.push(`[${label}] 受${found.join('、')}影响，需防范潜在风险。`);
        }
    });
    if (riskMsgs.length === 0) return "";
    return `<div class="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
        <h4 class="font-black text-amber-900 text-xs mb-2">潜在风险</h4>
        <div class="space-y-1">${riskMsgs.map(m => `<p class="text-xs text-slate-700">${m}</p>`).join('')}</div>
    </div>`;
};

const analyzeInteractions = (chart: ChartData, palace: Palace): string => {
    const sanFang = [...getSanFangPalaces(chart.palaces, palace.zhiIndex), getOppositePalace(chart.palaces, palace.zhiIndex)];
    let luckyList: string[] = [];
    let badList: string[] = [];
    sanFang.forEach(p => {
        [...p.stars.major, ...p.stars.minor].forEach(s => {
             if (LUCKY_STARS.includes(s.name)) luckyList.push(s.name);
             if (BAD_STARS.includes(s.name)) badList.push(s.name);
        });
    });
    luckyList = [...new Set(luckyList)];
    badList = [...new Set(badList)];
    return `<div class="bg-indigo-50/30 border border-indigo-100 rounded-lg p-3">
        <h4 class="font-black text-indigo-900 text-xs mb-2">三方机缘</h4>
        <div class="grid grid-cols-2 gap-2 text-[10px]">
            <div><span class="text-emerald-700 font-bold">吉星：</span>${luckyList.slice(0,4).join('、')||'少'}</div>
            <div><span class="text-rose-700 font-bold">煞星：</span>${badList.slice(0,4).join('、')||'少'}</div>
        </div>
    </div>`;
};

const generateAdvice = (chart: ChartData, age: number, analysisYear: number): string => {
    let daXianPalace: Palace | undefined;
    for (const p of chart.palaces) {
        if (!p.daXian) continue;
        const [start, end] = p.daXian.split('-').map(Number);
        if (age >= start && age <= end) { daXianPalace = p; break; }
    }
    const strategy = daXianPalace ? DA_XIAN_STRATEGIES[daXianPalace.name] : null;
    if (!strategy) return "";
    return `<div class="bg-indigo-600 text-white p-3 rounded-lg">
        <h5 class="font-bold text-xs mb-1.5">大限策略 (${daXianPalace?.daXian}岁)</h5>
        <p class="text-xs opacity-90">${strategy.theme}</p>
    </div>`;
};

export const generateRuleBasedAnalysis = (chart: ChartData, palaceName: string, analysisYear: number, age: number): string => {
    const palace = chart.palaces.find(p => p.name === palaceName);
    if (!palace) return "数据解析中...";
    const opposite = getOppositePalace(chart.palaces, palace.zhiIndex);
    const stemIndex = (analysisYear - 4) % 10; 
    const yearGan = HEAVENLY_STEMS[stemIndex < 0 ? stemIndex + 10 : stemIndex];
    const htmlParts = [
        analyzeCoreTraits(palace, opposite),
        analyzePatterns(chart, palace),
        analyzeLiuNian(chart, palace, yearGan, analysisYear),
        analyzeSiHuaDeepDive(palace), 
        analyzeRisks(palace),
        analyzeInteractions(chart, palace),
        generateAdvice(chart, age, analysisYear)
    ];
    return htmlParts.filter(Boolean).join('<hr class="my-3 border-stone-100"/>');
};
