
import { BaziChart, GanZhi, LuckPillar, Pillar, UserProfile, HiddenStem, GodStrength, TrendActivation, ShenShaInteraction, BalanceAnalysis, AnnualFortune, PatternAnalysis, InterpretationResult, ModalData, XiaoYun, PillarInterpretation } from '../types';
import { Solar, Lunar } from 'lunar-javascript';
import { 
  EARTHLY_BRANCHES, 
  FIVE_ELEMENTS, 
  HEAVENLY_STEMS, 
  HIDDEN_STEMS_DATA, 
  LIFE_STAGES_TABLE, 
  NA_YIN, 
  TEN_GODS_MAP, 
  BRANCH_CLASHES,
  LU_SHEN_MAP,
  YANG_REN_MAP,
  TIAN_YI_MAP,
  TIAN_DE_MAP,
  YUE_DE_MAP,
  WEN_CHANG_MAP,
  JIN_YU_MAP,
  HONG_YAN_MAP,
  XUE_TANG_MAP,
  CI_GUAN_MAP,
  TIAN_CHU_MAP,
  GU_CHEN_MAP,
  GUA_SU_MAP,
  HONG_LUAN_MAP,
  JIE_SHA_MAP,
  ZAI_SHA_MAP,
  WANG_SHEN_MAP,
  XIAN_CHI_MAP,
  YI_MA_MAP,
  HUA_GAI_MAP,
  JIANG_XING_MAP,
  LIU_XIA_MAP,
  CHAR_MEANINGS,
  NA_YIN_DESCRIPTIONS,
  // 🔥 新增引入
  ANNUAL_TEN_GODS_READING,
  BRANCH_XING,
  BRANCH_HAI
} from './constants';

// --- 1. 基础常量定义 ---
const BRANCH_COMBINATIONS: Record<string, string> = {
  '子': '丑', '丑': '子',
  '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳',
  '午': '未', '未': '午'
};

// --- 2. 基础辅助函数 ---
const getElement = (char: string): string => FIVE_ELEMENTS[char] || '土';
const getStemIndex = (stem: string) => Math.max(0, HEAVENLY_STEMS.indexOf(stem));

const getRelation = (origin: string, target: string): '生' | '克' | '同' | '泄' | '耗' => {
  const map: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  const ke: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
  if (origin === target) return '同';
  if (map[origin] === target) return '泄';
  if (map[target] === origin) return '生';
  if (ke[origin] === target) return '克';
  return '耗';
};

const getNaYinElement = (naYin: string): string => naYin.charAt(2);

const getShiShen = (dayMasterIdx: number, targetStemIdx: number): string => {
  if (dayMasterIdx < 0 || dayMasterIdx >= 10 || targetStemIdx < 0 || targetStemIdx >= 10) return '';
  return TEN_GODS_MAP[dayMasterIdx][targetStemIdx];
};

const getGanSymbolism = (gan: string) => CHAR_MEANINGS[gan] || '';
const getNaYinSymbolism = (naYin: string) => NA_YIN_DESCRIPTIONS[naYin] || '';
const getShiShenBrief = (ss: string) => {
    const map: Record<string, string> = {
        '比肩': '竞争、合作、自我', '劫财': '破财、冲动、义气', '食神': '才华、享受、口福',
        '伤官': '傲慢、叛逆、名声', '正财': '勤勉、稳定、妻子', '偏财': '投机、横财、父亲',
        '正官': '地位、自律、丈夫', '七杀': '压力、霸气、权威', '正印': '贵人、仁慈、学问',
        '偏印': '领悟、孤独、偏门'
    };
    return map[ss] || '';
};

// Fixed type compatibility for HiddenStem
const isSignificantHidden = (h: { stem: string; type: string }, revealed: string[]) => h.type === '主气' || revealed.includes(h.stem);

// --- 🔥 关键辅助函数：宫位+十神断语 ---
const getPositionTenGodReading = (pillar: '年' | '月' | '日' | '时', tenGod: string): string => {
  const readings: Record<string, Record<string, string>> = {
    '年': { 
      '比肩': '【年干比肩】出身一般，早年家境可能拮据，上有兄姐或为养子，与父亲缘分稍淡。',
      '劫财': '【年干劫财】祖业耗散，早年家境贫寒，父亲可能早衰或离家发展，早年生活波动大。',
      '食神': '【年干食神】祖上富裕或父母慈祥，早年平安福气，这种人一般很难吃苦，童年幸福。',
      '伤官': '【年干伤官】祖业飘零，或者父母缘分薄，小时候容易受伤或过继他人，早年内心叛逆。',
      '正财': '【年干正财】出身富贵或书香门第，也是长子长孙的象征，早年物质优渥，得祖辈疼爱。',
      '偏财': '【年干偏财】必生于商贾之家或父亲能干，若是独子，早年即能继承家业，有些早恋倾向。',
      '正官': '【年干正官】世代书香或父母有公职，学业优秀，从小就是“别人家的孩子”，家教甚严。',
      '七杀': '【年干七杀】出身寒微，或者小时候身体不好、多灾多难，父母管教极严，早年压力大。',
      '正印': '【年干正印】母亲掌权或出身书香，非常有面子，学业顺遂，也是长子之象。',
      '偏印': '【年干偏印】可能是庶出，或者小时候由继母、祖辈带大，家境变迁大，性格较为孤僻。'
    },
    '月': { 
      '比肩': '【月干比肩】兄弟姐妹多或朋友多，性格独立，好胜心强，30岁前钱财难聚。',
      '劫财': '【月干劫财】容易被朋友拖累破财，性格冲动，感情容易被横刀夺爱，合作需谨慎。',
      '食神': '【月干食神】心宽体胖，人缘极佳，适合从事服务、艺术行业，青年时期运势平顺。',
      '伤官': '【月干伤官】才华横溢但恃才傲物，容易频繁跳槽或创业，青年时期变动极大，不喜受管束。',
      '正财': '【月干正财】勤俭持家，做事保守，青年时期就能有稳定收入，适合上班族。',
      '偏财': '【月干偏财】为人豪爽，轻财重义，青年时期容易赚快钱也容易花光，不甘于死工资。',
      '正官': '【月干正官】也是“正气官星”，为人正直，青年时期易得长辈提拔，有官运或管理才能。',
      '七杀': '【月干七杀】青年时期压力巨大，或者出身贫寒靠自己打拼，有魄力但脾气暴躁。',
      '正印': '【月干正印】仁慈宽厚，但依赖心重，青年时期贵人运强，适合从事文职或教育。',
      '偏印': '【月干偏印】思维独特，有一技之长，但青年时期容易感到孤独，适合钻研冷门技术。'
    },
    '日': { 
      '比肩': '【日坐比肩】配偶性格刚毅，与你互不相让，夫妻关系像朋友也像竞争对手，易有口角。',
      '劫财': '【日坐劫财】配偶奢侈浪费或身体不佳，婚姻易有第三者介入，或者因配偶破财。',
      '食神': '【日坐食神】配偶温和体贴，有福气且身材丰满，婚姻生活和谐，你能得配偶照顾。',
      '伤官': '【日坐伤官】配偶才华高但嘴巴毒，容易看不起你，婚姻多争吵，女命尤忌（克夫）。',
      '正财': '【日坐正财】配偶勤俭持家，是标准的贤内助（或好丈夫），婚姻稳定，重视经济基础。',
      '偏财': '【日坐偏财】配偶精明能干，慷慨大方，但可能桃花较旺，或者配偶比你有钱。',
      '正官': '【日坐正官】配偶相貌端庄，为人正直，家庭责任感强，你在家里地位较高。',
      '七杀': '【日坐七杀】配偶性格暴躁，对你管束极严，或者配偶身体不好，婚姻压力较大。',
      '正印': '【日坐正印】配偶仁慈，像长辈一样照顾你，虽然缺乏浪漫，但给你极大的安全感。',
      '偏印': '【日坐偏印】配偶性格古怪，不易沟通，两人虽然在一起但内心有距离感，易晚婚。'
    },
    '时': { 
      '比肩': '【时干比肩】晚年如果不存钱，容易被子女或朋友分光家产，也代表与子女像朋友，无代沟。',
      '劫财': '【时干劫财】晚年破财之象，或者子女挥霍，也就是俗称的“败家子”风险，晚景需防穷困。',
      '食神': '【时干食神】晚年享福，子女孝顺且肥胖（有福气），长寿之象，晚年不愁吃穿。',
      '伤官': '【时干伤官】子女才华横溢但叛逆难管，或者晚年依然奔波，闲不住，易惹是非。',
      '正财': '【时干正财】子女勤俭持家，晚年经济独立，无需担忧养老金，也是老来富之象。',
      '偏财': '【时干偏财】老来富，或者晚年还有意外之财（如拆迁、投资获利），子女经商能干。',
      '正官': '【时干正官】子女敦厚正直，晚年有名望，甚至子女能当官光耀门楣，晚年受人尊敬。',
      '七杀': '【时干七杀】子女虽有出息但性情暴躁，或者晚年身体多病痛，压力大，子女不在身边。',
      '正印': '【时干正印】晚年受人尊敬，思想精神富足，子女孝顺贴心，适合修身养性。',
      '偏印': '【时干偏印】晚年孤独，或者沉迷宗教玄学，与子女缘分较淡，适合独处。'
    }
  };
  return readings[pillar]?.[tenGod] || '';
};

// --- 3. 核心计算函数 ---

const calculateTrueSolarTime = (date: Date, longitude: number): Date => {
    const standardMeridian = 120;
    const longitudeOffsetMinutes = (longitude - standardMeridian) * 4;
    const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
    const diff = date.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay) + 1;
    const b = 2 * Math.PI * (dayOfYear - 81) / 365;
    const eotMinutes = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    return new Date(date.getTime() + (longitudeOffsetMinutes + eotMinutes) * 60000);
};

const createGanZhi = (gan: string, zhi: string, dayMasterGanIndex: number): GanZhi => {
  const ganIndex = getStemIndex(gan);
  const zhiIndex = EARTHLY_BRANCHES.indexOf(zhi);
  const hiddenData = HIDDEN_STEMS_DATA[zhi] || [];
  return {
    gan, zhi,
    ganElement: getElement(gan),
    zhiElement: getElement(zhi),
    hiddenStems: hiddenData.map(item => ({
      stem: item[0], type: item[1], powerPercentage: item[2],
      shiShen: getShiShen(dayMasterGanIndex, getStemIndex(item[0]))
    })),
    naYin: NA_YIN[gan+zhi] || '未知',
    shiShenGan: getShiShen(dayMasterGanIndex, ganIndex),
    lifeStage: LIFE_STAGES_TABLE[dayMasterGanIndex][zhiIndex],
    selfLifeStage: LIFE_STAGES_TABLE[ganIndex][zhiIndex]
  };
};

const calculateBalance = (dm: string, pillars: any, counts: Record<string, number>): BalanceAnalysis => {
  const dmEl = FIVE_ELEMENTS[dm];
  const monthZhi = pillars.month.ganZhi.zhi;
  const monthEl = pillars.month.ganZhi.zhiElement;
  let score = 0;
  
  const monthRelation = getRelation(monthEl, dmEl);
  if (monthRelation === '同') score += 40;
  else if (monthRelation === '生') score += 35;
  else if (monthRelation === '泄') score += 10;
  
  let supportiveScore = 0;
  const branches = [pillars.year.ganZhi.zhi, pillars.month.ganZhi.zhi, pillars.day.ganZhi.zhi, pillars.hour.ganZhi.zhi];
  branches.forEach((zhi) => {
    const hidden = HIDDEN_STEMS_DATA[zhi] || [];
    hidden.forEach(([stem, type]) => {
      const stemEl = getElement(stem);
      const rel = getRelation(stemEl, dmEl);
      if (rel === '同' || rel === '生') {
        let power = (type === '主气') ? 8 : 3;
        const isClashed = branches.some(other => BRANCH_CLASHES[zhi] === other);
        if (isClashed) power *= 0.3; 
        supportiveScore += power;
      }
    });
  });
  score += Math.min(35, supportiveScore);
  
  let stemScore = 0;
  [pillars.year.ganZhi.gan, pillars.month.ganZhi.gan, pillars.hour.ganZhi.gan].forEach(gan => {
    const rel = getRelation(getElement(gan), dmEl);
    if (rel === '同') stemScore += 8;
    if (rel === '生') stemScore += 7; 
  });
  score += Math.min(25, stemScore);
  
  const level = score >= 55 ? '身强' : (score <= 42 ? '身弱' : '中和');
  
  const order = ['木', '火', '土', '金', '水'];
  const dmPos = order.indexOf(dmEl);
  const sheng = order[(dmPos + 1) % 5];
  const ke = order[(dmPos + 2) % 5];
  const beiKe = order[(dmPos + 3) % 5];
  const shengWo = order[(dmPos + 4) % 5];

  let yongShen: string[] = [];
  let xiShen: string[] = [];
  let jiShen: string[] = [];

  if (level === '身强') {
    yongShen = [sheng, ke, beiKe];
    xiShen = [ke, beiKe];
    jiShen = [shengWo, dmEl];
  } else if (level === '身弱') {
    yongShen = [shengWo, dmEl];
    xiShen = [shengWo];
    jiShen = [beiKe, ke, sheng];
  } else {
    yongShen = [dmEl];
    xiShen = [shengWo];
    jiShen = [beiKe];
  }

  const tiaoHouMap: Record<string, { yong: string[], advice: string }> = { 
    '亥': { yong: ['丙'], advice: '冬令水冷，急需丙火调候。' },
    '子': { yong: ['丙'], advice: '冬令水冷，急需丙火调候。' },
    '丑': { yong: ['丙'], advice: '冬令水冷，急需丙火调候。' },
    '巳': { yong: ['癸', '壬'], advice: '夏令火燥，急需水气调候。' },
    '午': { yong: ['癸', '壬'], advice: '夏令火燥，急需水气调候。' },
    '未': { yong: ['癸', '壬'], advice: '夏令火燥，急需水气调候。' }
  };
  
  let method: '扶抑' | '调候' | '通关' = '扶抑';
  let advice = level === '身强' ? "身强宜泄，忌印比。" : "身弱宜扶，喜印比。";

  if (tiaoHouMap[monthZhi]) {
    method = '调候';
    const th = tiaoHouMap[monthZhi];
    th.yong.forEach(el => { if (!yongShen.includes(el)) yongShen.unshift(el); });
    advice = th.advice + " " + advice;
  }

  return {
    dayMasterStrength: { score, level, description: `得分:${score.toFixed(1)} (${level})` },
    yongShen, xiShen, jiShen, method, advice
  };
};

const calculatePattern = (dm: string, pillars: any, balance: BalanceAnalysis, counts: Record<string, number>): PatternAnalysis => {
  const monthZhi = pillars.month.ganZhi.zhi;
  const dmIdx = getStemIndex(dm);
  const revealedStems = [pillars.year.ganZhi.gan, pillars.month.ganZhi.gan, pillars.hour.ganZhi.gan];
  const hidden = pillars.month.ganZhi.hiddenStems;
  const dmEl = FIVE_ELEMENTS[dm];
  if (counts[dmEl] >= 6 && balance.dayMasterStrength.score > 65) {
    return { name: `从旺格(${dmEl})`, type: '外格', isEstablished: true, level: '上等', keyFactors: { beneficial: ['气势纯粹'], destructive: ['逢冲'] }, description: "全局五行气势极强。" };
  }
  if (monthZhi === LU_SHEN_MAP[dm]) return { name: "建禄格", type: '正格', isEstablished: true, level: '中等', keyFactors: { beneficial: ['财官透达'], destructive: ['比劫夺财'] }, description: "月令建禄。" };
  
  const benQi = hidden.find(h => h.type === '主气');
  const zhongYuStems = hidden.filter(h => h.type !== '主气').filter(h => revealedStems.includes(h.stem));
  let finalStem = (benQi && revealedStems.includes(benQi.stem)) ? benQi.stem : (zhongYuStems[0]?.stem || benQi?.stem || '');
  const god = getShiShen(dmIdx, getStemIndex(finalStem)) || "偏官";
  return {
    name: (['比肩', '劫财'].includes(god) ? '月劫' : god) + "格",
    type: '正格', isEstablished: true, level: '中等',
    keyFactors: { beneficial: ['用神有力'], destructive: ['忌神干扰'] },
    description: `以月令${monthZhi}定格。`
  };
};

// --- 4. 神煞计算函数 ---
const calculateShenShaForPillar = (
  pillarType: 'year' | 'month' | 'day' | 'hour',
  gan: string,
  zhi: string,
  dayMaster: string,
  yearZhi: string,
  monthZhi: string,
  hourZhi: string
): string[] => {
  const shenSha: string[] = [];

  if (TIAN_YI_MAP[dayMaster]?.includes(zhi)) shenSha.push('天乙贵人');
  if (WEN_CHANG_MAP[dayMaster]?.includes(zhi)) shenSha.push('文昌贵人');
  if (LU_SHEN_MAP[dayMaster] === zhi) shenSha.push('禄神');
  if (YANG_REN_MAP[dayMaster] === zhi && pillarType === 'day') shenSha.push('羊刃');
  if (TIAN_DE_MAP[monthZhi] === gan) shenSha.push('天德贵人');
  if (YUE_DE_MAP[monthZhi] === gan) shenSha.push('月德贵人');
  if (JIN_YU_MAP[gan] === zhi) shenSha.push('金舆');
  if (HONG_YAN_MAP[dayMaster] === zhi) shenSha.push('红艳');
  if (XUE_TANG_MAP[yearZhi] === zhi) shenSha.push('血刃');
  if (CI_GUAN_MAP[gan] === zhi) shenSha.push('词馆');
  if (TIAN_CHU_MAP[gan] === zhi) shenSha.push('天厨');
  if (GU_CHEN_MAP[yearZhi] === zhi) shenSha.push('孤辰');
  if (GUA_SU_MAP[yearZhi] === zhi) shenSha.push('寡宿');
  if (HONG_LUAN_MAP[yearZhi] === zhi) shenSha.push('红鸾');
  if (JIE_SHA_MAP[yearZhi] === zhi) shenSha.push('劫煞');
  if (ZAI_SHA_MAP[yearZhi] === zhi) shenSha.push('灾煞');
  if (WANG_SHEN_MAP[yearZhi] === zhi) shenSha.push('亡神');
  if (XIAN_CHI_MAP[dayMaster] === zhi) shenSha.push('咸池（桃花）');
  if (YI_MA_MAP[yearZhi] === zhi || YI_MA_MAP[dayMaster] === zhi) shenSha.push('驿马');
  if (HUA_GAI_MAP[dayMaster] === zhi) shenSha.push('华盖');
  if (JIANG_XING_MAP[zhi]) shenSha.push('将星');
  if (LIU_XIA_MAP[monthZhi]?.includes(zhi)) shenSha.push('六秀');

  return shenSha;
};

// 🔥 导出此函数供 App.tsx 使用
export const getShenShaForDynamicPillar = (gan: string, zhi: string, chart: BaziChart): string[] => {
  return calculateShenShaForPillar(
    'year', gan, zhi, chart.dayMaster, 
    chart.pillars.year.ganZhi.zhi, 
    chart.pillars.month.ganZhi.zhi, 
    chart.pillars.hour.ganZhi.zhi
  );
};

// --- 5. 核心：排盘函数 ---
export const calculateBazi = (profile: UserProfile): BaziChart => {
  const d = profile.birthDate.split('-').map(Number);
  const t = profile.birthTime.split(':').map(Number);
  let solar = Solar.fromYmdHms(d[0], d[1], d[2], t[0], t[1], 0);
  if (profile.isSolarTime && profile.longitude) {
      const std = new Date(Date.UTC(d[0], d[1]-1, d[2], t[0], t[1]));
      const tst = calculateTrueSolarTime(std, profile.longitude);
      solar = Solar.fromYmdHms(tst.getUTCFullYear(), tst.getUTCMonth() + 1, tst.getUTCDate(), tst.getUTCHours(), tst.getUTCMinutes(), 0);
  }
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(1);
  const dm = eightChar.getDayGan();
  const dmIdx = getStemIndex(dm);
  
  const getKW = (gan: string, zhi: string) => {
    const kwIdx = (EARTHLY_BRANCHES.indexOf(zhi) - getStemIndex(gan) + 12) % 12;
    const kwMap: Record<number, string[]> = { 0: ['戌', '亥'], 10: ['申', '酉'], 8: ['午', '未'], 6: ['辰', '巳'], 4: ['寅', '卯'], 2: ['子', '丑'] };
    return kwMap[kwIdx] || [];
  };
  const dayKW = getKW(eightChar.getDayGan(), eightChar.getDayZhi());
  const yearKW = getKW(eightChar.getYearGan(), eightChar.getYearZhi());

  const pillarsRaw = {
    year: { name: '年柱', ganZhi: createGanZhi(eightChar.getYearGan(), eightChar.getYearZhi(), dmIdx) },
    month: { name: '月柱', ganZhi: createGanZhi(eightChar.getMonthGan(), eightChar.getMonthZhi(), dmIdx) },
    day: { name: '日柱', ganZhi: createGanZhi(eightChar.getDayGan(), eightChar.getDayZhi(), dmIdx) },
    hour: { name: '时柱', ganZhi: createGanZhi(eightChar.getTimeGan(), eightChar.getTimeZhi(), dmIdx) }
  };

  const pillars: any = {};
  const yearZhi = eightChar.getYearZhi();
  const monthZhi = eightChar.getMonthZhi();
  const dayZhi = eightChar.getDayZhi();
  const hourZhi = eightChar.getTimeZhi();

  Object.entries(pillarsRaw).forEach(([key, p]) => {
    const type = key as 'year' | 'month' | 'day' | 'hour';
    const gan = p.ganZhi.gan;
    const zhi = p.ganZhi.zhi;
    const shenSha = calculateShenShaForPillar(type, gan, zhi, dm, yearZhi, monthZhi, hourZhi);
    const kw = dayKW.includes(zhi) || yearKW.includes(zhi);
    pillars[key] = { ...p, shenSha, kongWang: kw };
  });

  const counts: Record<string, number> = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
  Object.values(pillars).forEach((p: any) => { counts[p.ganZhi.ganElement]++; counts[p.ganZhi.zhiElement]++; });
  const balance = calculateBalance(dm, pillars, counts);
  
  const yun = eightChar.getYun(profile.gender === 'male' ? 1 : 0);
  const luckPillars: LuckPillar[] = yun.getDaYun().map((dy, i) => {
    if (i === 0) return null;
    const gz = dy.getGanZhi();
    return { index: i, startAge: dy.getStartAge(), startYear: dy.getStartYear(), endYear: dy.getEndYear(), ganZhi: createGanZhi(gz.charAt(0), gz.charAt(1), dmIdx) };
  }).filter(Boolean) as LuckPillar[];

  const xiaoYun: XiaoYun[] = [];
  const startAge = 1;
  const startYear = d[0];
  const isForward = (getStemIndex(eightChar.getYearGan()) % 2 === 0) === (profile.gender === 'male');
  let currentGanIdx = getStemIndex(eightChar.getTimeGan());
  let currentZhiIdx = EARTHLY_BRANCHES.indexOf(eightChar.getTimeZhi());

  for (let age = startAge; age <= (luckPillars[0]?.startAge || 10); age++) {
    const step = isForward ? 1 : -1;
    currentGanIdx = (currentGanIdx + step + 10) % 10;
    currentZhiIdx = (currentZhiIdx + step + 12) % 12;
    xiaoYun.push({
      age,
      year: startYear + age - 1,
      ganZhi: createGanZhi(HEAVENLY_STEMS[currentGanIdx], EARTHLY_BRANCHES[currentZhiIdx], dmIdx)
    });
  }

  return {
    profileId: profile.id, gender: profile.gender, dayMaster: dm, dayMasterElement: FIVE_ELEMENTS[dm],
    pillars: pillars as any, mingGong: eightChar.getMingGong(), shenGong: eightChar.getShenGong(),
    taiYuan: eightChar.getTaiYuan(), taiXi: '暂缺', wuxingCounts: counts,
    luckPillars, xiaoYun, startLuckText: `起运：${yun.getStartYear()}岁${yun.getStartMonth()}月`,
    godStrength: [], shenShaInteractions: [], balance, pattern: calculatePattern(dm, pillars, balance, counts),
    originalTime: solar.toYmdHms(), mangPai: []
  };
};

export const getGanZhiForYear = (year: number, dayMaster: string): GanZhi => {
  const bazi = Solar.fromYmdHms(year, 6, 1, 12, 0, 0).getLunar().getEightChar();
  return createGanZhi(bazi.getYearGan(), bazi.getYearZhi(), getStemIndex(dayMaster));
};

export const calculateAnnualFortune = (chart: BaziChart, year: number): AnnualFortune => {
  const annualGz = getGanZhiForYear(year, chart.dayMaster);
  const reasons: string[] = [];
  let score = 50;
  
  const yearZhi = chart.pillars.year.ganZhi.zhi;
  const dayZhi = chart.pillars.day.ganZhi.zhi;
  const currentLuck = chart.luckPillars.find(l => year >= l.startYear && year <= l.endYear);

  if (currentLuck && annualGz.gan === currentLuck.ganZhi.gan && annualGz.zhi === currentLuck.ganZhi.zhi) {
    reasons.push("流年与大运岁运并临，所谓“不死自己死他人”，多主大起大落，需谨慎。");
    score = score < 50 ? score - 20 : score + 10;
  }

  if (currentLuck) {
    const luckEl = currentLuck.ganZhi.ganElement;
    if (chart.balance.yongShen.includes(luckEl)) {
      reasons.push(`当前大运处于${luckEl}喜用运中，增强了流年的正面能量。`);
      score += 10;
    } else if (chart.balance.jiShen.includes(luckEl)) {
      reasons.push(`当前大运处于${luckEl}忌神运中，放大了流年的负面压力。`);
      score -= 10;
    }
  }

  if (annualGz.zhi === yearZhi) {
    reasons.push(`流年值太岁（${annualGz.zhi}），本命年运势起伏，宜守不宜进。`);
    score -= 10;
  }
  if (BRANCH_CLASHES[annualGz.zhi] === yearZhi) {
    reasons.push(`流年冲太岁（${annualGz.zhi}冲${yearZhi}），凡事多变，防意外。`);
    score -= 15;
  }
  if (BRANCH_CLASHES[annualGz.zhi] === dayZhi) {
    reasons.push(`流年冲日支（婚姻宫），感情生活或个人健康易生变数。`);
    score -= 10;
  }
  
  if (chart.balance.yongShen.includes(annualGz.ganElement)) {
    reasons.push(`流年天干${annualGz.gan}为喜用神，诸事顺遂，多有贵人助。`);
    score += 20;
  } else if (chart.balance.jiShen.includes(annualGz.ganElement)) {
    reasons.push(`流年天干${annualGz.gan}为忌神，需防财损、口舌或身体微恙。`);
    score -= 15;
  }

  if (HONG_LUAN_MAP[yearZhi] === annualGz.zhi) {
    reasons.push("流年逢红鸾，异性缘佳，适合社交与感情发展。");
    score += 5;
  }
  if (YI_MA_MAP[yearZhi] === annualGz.zhi) {
    reasons.push("流年逢驿马，主变动、出差或远行。");
    score += 3;
  }

  const rating = score >= 65 ? '吉' : (score <= 42 ? '凶' : '平');
  return { year, ganZhi: annualGz, rating, reasons, score };
};

// --- 6. 解读函数 (Interpretations) ---

export const interpretYearPillar = (chart: BaziChart): PillarInterpretation => {
  const pillar = chart.pillars.year;
  const gz = pillar.ganZhi;
  const coreSymbolism = getGanSymbolism(gz.gan);
  const naYinInfluence = getNaYinSymbolism(gz.naYin);
  const roleInDestiny = '年柱代表祖业、父母、童年环境及社会背景，影响人生起点与根基。';
  
  const positionInsight = getPositionTenGodReading('年', gz.shiShenGan);
  const lifeStageEffect = `年柱处${gz.lifeStage}，反映家族气运传承。`;
  const shenShaEffects = pillar.shenSha.map(s => `${s}：年柱见${s}，主祖上或早年影响`);

  const integratedSummary = [`年柱${gz.gan}${gz.zhi}（${gz.naYin}）`, coreSymbolism, positionInsight, naYinInfluence, lifeStageEffect].filter(Boolean).join(' ');
  return { pillarName: '年柱', coreSymbolism, hiddenDynamics: '', naYinInfluence, lifeStageEffect, shenShaEffects, roleInDestiny, integratedSummary };
};

export const interpretMonthPillar = (chart: BaziChart): PillarInterpretation => {
  const pillar = chart.pillars.month;
  const gz = pillar.ganZhi;
  const coreSymbolism = getGanSymbolism(gz.gan);
  const naYinInfluence = getNaYinSymbolism(gz.naYin);
  const roleInDestiny = '月柱为提纲，主青年运势、事业方向、兄弟姐妹及社会环境，是格局成败的关键。';
  
  let patternInsight = '';
  if (chart.pattern.isEstablished) {
    patternInsight = `此柱构成${chart.pattern.name}，${chart.pattern.description}。`;
  } else if (chart.pattern.keyFactors.destructive.length > 0) {
    patternInsight = `本可成${chart.pattern.name}，但因${chart.pattern.keyFactors.destructive.join('、')}而破格。`;
  }

  const positionInsight = getPositionTenGodReading('月', gz.shiShenGan);
  const lifeStageEffect = `月令处${gz.lifeStage}，主导全局五行旺衰。`;
  const shenShaEffects = pillar.shenSha.map(s => `${s}：月柱见${s}，主青年时期相关影响`);
  
  const integratedSummary = [`月柱${gz.gan}${gz.zhi}（${gz.naYin}）`, coreSymbolism, patternInsight, positionInsight, naYinInfluence, lifeStageEffect].filter(Boolean).join(' ');
  return { pillarName: '月柱', coreSymbolism, hiddenDynamics: '', naYinInfluence, lifeStageEffect, shenShaEffects, roleInDestiny, integratedSummary };
};

export const interpretDayPillar = (chart: BaziChart): PillarInterpretation => {
  const pillar = chart.pillars.day;
  const gz = pillar.ganZhi;
  const revealedStems = [chart.pillars.year.ganZhi.gan, chart.pillars.month.ganZhi.gan, chart.pillars.hour.ganZhi.gan];
  const coreSymbolism = getGanSymbolism(gz.gan);
  
  let hiddenDynamics = '';
  const significantHiddens = gz.hiddenStems.filter(h => isSignificantHidden(h, revealedStems));
  if (significantHiddens.length > 0) {
    const parts = significantHiddens.map(h => `${h.stem}（${h.shiShen}，${getShiShenBrief(h.shiShen)}）`);
    hiddenDynamics = `地支藏干 ${parts.join('；')}，深刻影响内在性格与潜能。`;
  }
  
  const naYinInfluence = getNaYinSymbolism(gz.naYin);
  let lifeStageEffect = '';
  if (gz.lifeStage) {
    const baseDesc = gz.lifeStage;
    if (['死', '绝', '病'].includes(gz.lifeStage) && chart.balance.dayMasterStrength.level === '身弱') {
      lifeStageEffect = `日主处${baseDesc}地且身弱，能量内敛，需防行动力不足或思虑过重。`;
    } else {
      lifeStageEffect = `日主处${baseDesc}地，此为蓄势待发之象，非衰绝之兆。`;
    }
  }

  const descMap: Record<string, string> = {
    '天乙贵人': '一生多逢凶化吉，易得长辈或上级提携，遇难成祥',
    '文昌贵人': '气质文雅，聪明好学，利于求学、考试及从事文职工作',
    '禄神': '财官双美，一生衣食无忧，有创业或理财天赋',
    '天德贵人': '品行端正，仁慈重义，能化解凶煞，保平安',
    '月德贵人': '人缘极佳，遇事能逢凶化吉，福泽深厚',
    '金舆': '福气之象，出入有车，配偶条件较好，生活富足',
    '将星': '有组织领导才能，处事果断，在职场或群体中易掌权',
    '红艳': '异性缘极佳，且生性多情，艺术天分高，但需防感情风波',
    '咸池': '又名桃花，情感丰富，注重情调，易陷感情纠葛',
    '咸池（桃花）': '情感丰富，异性缘好，需防烂桃花干扰',
    '红鸾': '性情温和，异性缘佳，早年利婚恋，晚年利添丁',
    '羊刃': '性格刚毅，进取心强，但易冲动好胜，需防意外刑伤',
    '劫煞': '行事偏激，性格刚烈，易遭突发挫折或破财，宜修身养性',
    '灾煞': '需防意外血光、病痛或官非，行事宜低调谨慎',
    '亡神': '城府较深，喜怒不形于色，若无吉星引导易走极端',
    '华盖': '聪慧孤高，喜好艺术、哲学或玄学，内心世界丰富',
    '驿马': '生性好动，向往自由，适合奔波、外勤或远方求财',
    '孤辰': '性格略显孤僻，精神独立，六亲缘分稍淡',
    '寡宿': '内心常感孤独，不喜社交，晚年较为空寂',
    '血刃': '主身体易受损伤，或与手术、血液有关，需注意安全'
  };
  const shenShaEffects = pillar.shenSha.map(star => {
    const cleanName = star.replace(/（.*）|\(.*\)/, '');
    const desc = descMap[star] || descMap[cleanName] || '带来特殊机遇或挑战';
    return `${star}：${desc}`;
  });

  const dayZhi = gz.zhi;
  const monthZhi = chart.pillars.month.ganZhi.zhi;
  const hourZhi = chart.pillars.hour.ganZhi.zhi;
  const interactions: string[] = [];

  if (BRANCH_CLASHES[dayZhi] === monthZhi) interactions.push('【月日相冲】日支与月令相冲，寓意可能较早离家，或30岁前后人生有重大转折。');
  else if (BRANCH_COMBINATIONS[dayZhi] === monthZhi) interactions.push('【月日六合】日支与月令相合，代表与长辈上司关系融洽。');
  else if (dayZhi === monthZhi) interactions.push('【月日伏吟】日支与月令相同，易内心纠结，做事反复。');

  if (BRANCH_CLASHES[dayZhi] === hourZhi) interactions.push('【日时相冲】日支冲时支，中晚年可能较忙碌变动，或子女不在身边。');
  else if (BRANCH_COMBINATIONS[dayZhi] === hourZhi) interactions.push('【日时六合】日支合时支，晚年生活安稳，子女缘分深厚。');

  const mainHiddenStem = gz.hiddenStems.find(h => h.type === '主气');
  const dayZhiTenGod = mainHiddenStem ? mainHiddenStem.shiShen : '';
  const positionInsight = getPositionTenGodReading('日', dayZhiTenGod);

  const roleInDestiny = '日柱代表命主自身，是八字核心，反映性格、婚姻、健康及人生主线。';
  
  const summaryParts = [coreSymbolism, positionInsight, ...interactions, hiddenDynamics, naYinInfluence, lifeStageEffect, ...shenShaEffects].filter(Boolean);
  const integratedSummary = summaryParts.length ? `综合：${summaryParts.join(' ')}` : '信息不足，暂无法深度解读。';

  return { pillarName: '日柱', coreSymbolism, hiddenDynamics, naYinInfluence, lifeStageEffect, shenShaEffects, roleInDestiny, integratedSummary };
};

export const interpretHourPillar = (chart: BaziChart): PillarInterpretation => {
  const pillar = chart.pillars.hour;
  const gz = pillar.ganZhi;
  const coreSymbolism = getGanSymbolism(gz.gan);
  const naYinInfluence = getNaYinSymbolism(gz.naYin);
  const roleInDestiny = '时柱代表子女、晚年运势、技术才能及最终成就，又称“归宿宫”。';
  
  const positionInsight = getPositionTenGodReading('时', gz.shiShenGan);
  const lifeStageEffect = `时柱处${gz.lifeStage}，预示晚年状态与成果。`;
  const shenShaEffects = pillar.shenSha.map(s => `${s}：时柱见${s}，主晚年或子女相关影响`);
  
  const integratedSummary = [`时柱${gz.gan}${gz.zhi}（${gz.naYin}）`, coreSymbolism, positionInsight, naYinInfluence, lifeStageEffect].filter(Boolean).join(' ');
  return { pillarName: '时柱', coreSymbolism, hiddenDynamics: '', naYinInfluence, lifeStageEffect, shenShaEffects, roleInDestiny, integratedSummary };
};

export const interpretLuckPillar = (chart: BaziChart, luckGz: GanZhi): PillarInterpretation => {
  const tenGod = luckGz.shiShenGan;
  const element = luckGz.ganElement;
  const isYongShen = chart.balance.yongShen.includes(element);
  const isJiShen = chart.balance.jiShen.includes(element);
  
  let coreSymbolism = `大运天干${luckGz.gan}为${tenGod}，地支${luckGz.zhi}藏${luckGz.hiddenStems.map(h => h.stem).join('')}。`;
  let effect = isYongShen ? `此运五行(${element})为喜用，大运${tenGod}主吉。` : isJiShen ? `此运五行(${element})为忌神，大运${tenGod}压力较大。` : `此运五行(${element})为闲神，运势平稳。`;

  const dayZhi = chart.pillars.day.ganZhi.zhi;
  let clashInfo = '';
  if (BRANCH_CLASHES[luckGz.zhi] === dayZhi) clashInfo = `运支${luckGz.zhi}冲日支${dayZhi}，此十年家庭、感情或内心易有变动，奔波劳碌之象。`;

  // 🔥 计算神煞
  const shenShaList = getShenShaForDynamicPillar(luckGz.gan, luckGz.zhi, chart);
  const shenShaEffects = shenShaList.map(s => `${s}：大运逢之，主${s.includes('贵人') ? '遇难成祥' : '变动'}`);

  const roleInDestiny = '大运主管十年吉凶休咎，是人生的重要阶段背景。';
  const integratedSummary = `${coreSymbolism} ${effect} ${clashInfo} ${shenShaList.length > 0 ? '\n🌟 神煞：'+shenShaList.join('、') : ''} (纳音：${luckGz.naYin})`;

  return { pillarName: '大运', coreSymbolism, hiddenDynamics: '', naYinInfluence: getNaYinSymbolism(luckGz.naYin), lifeStageEffect: `大运处${luckGz.lifeStage}地。`, shenShaEffects, roleInDestiny, integratedSummary };
};

// ==========================================
// 🔥 核心升级：流年深度解读函数
// ==========================================

export const interpretAnnualPillar = (chart: BaziChart, annualGz: GanZhi): PillarInterpretation => {
  const tenGod = annualGz.shiShenGan;
  const element = annualGz.ganElement;
  const annualZhi = annualGz.zhi;
  const annualGan = annualGz.gan;
  
  // 1. 基础喜忌判断
  // 简单逻辑：如果是喜用神，则取 Beneficial 建议；如果是忌神，则取 Destructive 建议。
  // 若不在喜忌列表中（闲神），通常倾向于中性，这里暂按 Beneficial 处理但语气可减弱，
  // 或者为了风险提示，若不是喜用均需谨慎。这里采用 "是忌神则凶，否则偏吉" 的策略。
  const isJiShen = chart.balance.jiShen.includes(element);
  
  let coreSymbolism = `流年${annualGz.gan}${annualGz.zhi}，天干${tenGod}主事。`;
  
  // 2. 结构化大师建议 (使用 constants.ts 中的新数据)
  // 获取十神对应的文案库，若未找到则默认使用"比肩"（防崩坏）
  const tenGodData = ANNUAL_TEN_GODS_READING[tenGod] || ANNUAL_TEN_GODS_READING['比肩'];
  const adviceData = isJiShen ? tenGodData.destructive : tenGodData.beneficial;

  const actionableAdvice = `
  🎯 **核心主题**：${adviceData.theme}
  💼 **事业**：${adviceData.career}
  💰 **财运**：${adviceData.wealth}
  💕 **情感**：${adviceData.love}
  `.trim();

  // ==========================================
  // 🔥 3. 核心升级：全盘引动雷达 (Scanning)
  // ==========================================
  const triggers: string[] = [];
  const pillars = {
    '年': chart.pillars.year,
    '月': chart.pillars.month,
    '日': chart.pillars.day,
    '时': chart.pillars.hour
  };

  // 定义天干克 (用于计算天克地冲)
  const isGanClash = (g1: string, g2: string) => {
    const map: Record<string, string> = {'甲':'戊','乙':'己','丙':'庚','丁':'辛','戊':'壬','己':'癸','庚':'甲','辛':'乙','壬':'丙','癸':'丁'};
    return map[g1] === g2 || map[g2] === g1;
  };

  // 扫描每一柱
  Object.entries(pillars).forEach(([name, p]) => {
    const pZhi = p.ganZhi.zhi;
    const pGan = p.ganZhi.gan;
    const pName = name + '柱';

    // 1. 天克地冲 (最重之动)
    if (isGanClash(annualGan, pGan) && BRANCH_CLASHES[annualZhi] === pZhi) {
      triggers.push(`🌪️ 【天克地冲·${pName}】：流年与${pName}天克地冲，这是极大的变动信号。${
        name === '年' ? '需重点关注家中长辈健康，或有远行搬迁。' :
        name === '月' ? '事业环境或家庭门户恐有剧烈变动，防父母不安。' :
        name === '日' ? '夫妻宫受冲击严重，需防婚变或自身病痛，凡事忍让。' :
        '子女宫受冲，需防子女意外或下属背叛，晚运不稳。'
      }`);
    }
    // 2. 六冲 (次重之动)
    else if (BRANCH_CLASHES[annualZhi] === pZhi) {
      triggers.push(`💥 【冲·${pName}】：流年冲动${pName}。${
        name === '年' ? '主离家在外，奔波劳碌，或长辈有恙。' :
        name === '月' ? '提纲被冲，十有九动。工作、居住环境或人际圈子易变。' :
        name === '日' ? '夫妻宫逢冲，感情易生口角波折，或身体腰腹不适。' :
        '子女宫逢冲，为子女操心忙碌，或想法多变难以落地。'
      }`);
    }
    // 3. 伏吟 (重叠)
    else if (annualZhi === pZhi) {
      triggers.push(`🛑 【伏吟·${pName}】：流年地支与${pName}相同。${
        name === '日' ? '所谓“反吟伏吟，泣哭淋淋”，日支伏吟常主内心纠结、进退两难，或伴侣身体违和。' : 
        '能量重叠，该柱代表的人事物容易出现停滞或重复的困扰。'
      }`);
    }
    // 4. 六合 (和谐)
    else if (BRANCH_COMBINATIONS[annualZhi] === pZhi) {
      triggers.push(`❤️ 【合·${pName}】：流年与${pName}六合。${
        name === '日' ? '天地鸳鸯合，利于婚恋嫁娶，人际关系和谐。' :
        name === '月' ? '利于合作，得长辈或上司提携，工作环境稳固。' :
        '多得贵人助力，人缘佳。'
      }`);
    }
    
    // 🔥 新增：5. 相刑 (纠结/折磨)
    if (BRANCH_XING[annualZhi]?.includes(pZhi)) {
         triggers.push(`🗡️ 【相刑·${pName}】：流年与${pName}形成相刑。${
            name === '日' ? '需防身体手术或夫妻互相折磨，内心煎熬。' : 
            name === '月' ? '人际关系易有摩擦，或内心纠结难以决断。' :
            '易有口舌或内心不顺。'
         }`);
    }

    // 🔥 新增：6. 六害 (小人/分离)
    if (BRANCH_HAI[annualZhi] === pZhi) {
        triggers.push(`❄️ 【六害·${pName}】：流年与${pName}相害。主犯小人或亲缘冷淡，${
            name === '月' ? '防同僚倾轧，或与兄弟不和' : 
            name === '日' ? '夫妻之间易生误会，或遭外人挑拨' :
            '易受身边人拖累，有苦难言'
        }。`);
    }
  });

  // ==========================================
  // 🔥 4. 流年神煞计算
  // ==========================================
  const shenShaList = getShenShaForDynamicPillar(annualGz.gan, annualGz.zhi, chart);
  
  // ==========================================
  // 🔥 5. 整合输出
  // ==========================================
  const integratedSummary = `
    ${coreSymbolism}
    
    ${actionableAdvice}
    
    ${triggers.length > 0 ? "⚡ **全盘引动（重点关注）**：\n" + triggers.join('\n\n') : "🌊 **运势总评**：\n流年与原局无显著冲刑，运势平稳。平运即是好运，宜按部就班，积蓄力量。"}
    
    ${shenShaList.length > 0 ? "\n🌟 **流年神煞**：\n" + shenShaList.join('、') : ""}
    
    (纳音：${annualGz.naYin})
  `.trim();

  return {
    pillarName: '流年',
    coreSymbolism: getGanSymbolism(annualGz.gan),
    // Fixed: Map and cast to HiddenStem implicitly to satisfy interpretation usage or logic if needed
    hiddenDynamics: `地支藏干：${annualGz.hiddenStems.map(h => h.stem).join('')}`,
    naYinInfluence: getNaYinSymbolism(annualGz.naYin),
    lifeStageEffect: `流年行至${annualGz.lifeStage}地。`,
    shenShaEffects: shenShaList.map(s => `${s}：流年逢之`), 
    roleInDestiny: '流年管一年之吉凶，是应期的关键。',
    integratedSummary
  };
};

// 7. 导出空函数（兼容性）
export const calculateAnnualTrend = (chart: BaziChart, year: number): TrendActivation[] => [];
export const getAdvancedInterpretation = (chart: BaziChart, data: ModalData): InterpretationResult[] => [];
