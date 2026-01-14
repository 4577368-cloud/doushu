import { Solar, Lunar } from 'lunar-javascript';
import { 
    EARTHLY_BRANCHES, HEAVENLY_STEMS, PALACE_NAMES, 
    SI_HUA_TABLE, STAR_BRIGHTNESS, CHANG_SHENG,
    STAR_TRANSFORM_MEANINGS, SI_HUA_PALACE_MEANINGS
} from '../constants';
import { Palace, Star, Bureau, ChartData, DaXianResult, DaXianAnalysisItem, Pattern } from '../types';

// Extended brightness for all stars including new ones
const EXTENDED_STAR_BRIGHTNESS: Record<string, string[]> = {
    ...STAR_BRIGHTNESS,
    '天刑': ['平', '庙', '庙', '平', '庙', '平', '平', '庙', '庙', '平', '庙', '平'],
    '天姚': ['平', '旺', '旺', '平', '平', '旺', '平', '旺', '旺', '平', '平', '旺'],
    '红鸾': ['平', '庙', '平', '庙', '平', '平', '平', '庙', '平', '庙', '平', '平'],
    '天喜': ['平', '庙', '平', '庙', '平', '平', '平', '庙', '平', '庙', '平', '平'],
};

const getBureau = (ganIndex: number, zhiIndex: number): Bureau => {
    const heavenlyNum = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5][ganIndex] || 1;
    const earthlyNum = [0, 0, 1, 1, 2, 2][Math.floor(zhiIndex % 6)] || 0; 
    let sum = heavenlyNum + earthlyNum; 
    if (sum > 5) sum -= 5;
    const bureaus: Record<number, Bureau> = { 
        1: { name: '金四局', num: 4, type: 'Gold' }, 
        2: { name: '水二局', num: 2, type: 'Water' }, 
        3: { name: '火六局', num: 6, type: 'Fire' }, 
        4: { name: '土五局', num: 5, type: 'Earth' }, 
        5: { name: '木三局', num: 3, type: 'Wood' } 
    };
    return bureaus[sum] || bureaus[2];
};

const arrangeMainStarsComplete = (lunarDay: number, bureauNum: number, palaces: Palace[]) => {
    const D = lunarDay;
    const B = bureauNum;
    let X = 0;
    if (D % B === 0) { X = 0; } else { X = B - (D % B); }
    const quotient = (D + X) / B;
    let basePos = (2 + quotient - 1) % 12;
    let zwPos = 0;
    if (X === 0) { zwPos = basePos; } else { if (X % 2 !== 0) { zwPos = (basePos - X + 12) % 12; } else { zwPos = (basePos + X) % 12; } }
    
    const zwOffsets = [0, -1, -3, -4, -5, -8];
    const zwStars = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞'];
    
    zwStars.forEach((star, idx) => {
        const pos = (zwPos + zwOffsets[idx] + 24) % 12;
        const palace = palaces[pos];
        if (palace) {
            const brightness = EXTENDED_STAR_BRIGHTNESS[star] ? EXTENDED_STAR_BRIGHTNESS[star][pos] : undefined;
            palace.stars.major.push({ name: star, hua: null, brightness, type: 'major' });
        }
    });
    
    const tfZhiIndex = (4 - zwPos + 12) % 12;
    const tfOffsets = [0, 1, 2, 3, 4, 5, 6, 10];
    const tfStars = ['天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];
    
    tfStars.forEach((star, idx) => {
        const pos = (tfZhiIndex + tfOffsets[idx] + 12) % 12;
        const palace = palaces[pos];
        if (palace) {
            const brightness = EXTENDED_STAR_BRIGHTNESS[star] ? EXTENDED_STAR_BRIGHTNESS[star][pos] : undefined;
            palace.stars.major.push({ name: star, hua: null, brightness, type: 'major' });
        }
    });
    return palaces;
};

const arrangeGanStars = (yearGan: string, yearGanIndex: number, palaces: Palace[]) => {
    const results = [];
    const luCunMap: Record<string, number> = { '甲': 2, '乙': 3, '丙': 5, '丁': 6, '戊': 5, '己': 6, '庚': 8, '辛': 9, '壬': 11, '癸': 0 };
    const luCunZhi = luCunMap[yearGan];
    if (luCunZhi !== undefined) {
        results.push({ palace: palaces[luCunZhi], star: '禄存', type: 'lucky' });
        results.push({ palace: palaces[(luCunZhi + 1) % 12], star: '擎羊', type: 'bad' });
        results.push({ palace: palaces[(luCunZhi - 1 + 12) % 12], star: '陀罗', type: 'bad' });
    }
    const kuiYueMap: Record<string, number[]> = { 
        '甲': [1,7], '乙': [0,8], '丙': [11,9], '丁': [11,9], 
        '戊': [1,7], '己': [0,8], '庚': [1,7], '辛': [6,2], 
        '壬': [3,5], '癸': [3,5] 
    };
    const [kuiZhi, yueZhi] = kuiYueMap[yearGan] || [0,0];
    results.push({ palace: palaces[kuiZhi], star: '天魁', type: 'lucky' });
    results.push({ palace: palaces[yueZhi], star: '天钺', type: 'lucky' });
    return results.filter(r => r.palace);
};

const arrangeYearBranchStars = (yearZhiIndex: number, hourIndex: number, palaces: Palace[]) => {
    const results = [];
    let maPos = 0;
    if ([8, 0, 4].includes(yearZhiIndex)) maPos = 2; 
    else if ([2, 6, 10].includes(yearZhiIndex)) maPos = 8; 
    else if ([11, 3, 7].includes(yearZhiIndex)) maPos = 5; 
    else if ([5, 9, 1].includes(yearZhiIndex)) maPos = 11; 
    results.push({ palace: palaces[maPos], star: '天马', type: 'movement' });
    
    let huoStart = 0; let lingStart = 0;
    if ([2, 6, 10].includes(yearZhiIndex)) { huoStart = 1; lingStart = 3; } 
    else if ([8, 0, 4].includes(yearZhiIndex)) { huoStart = 2; lingStart = 10; } 
    else if ([5, 9, 1].includes(yearZhiIndex)) { huoStart = 3; lingStart = 10; } 
    else if ([11, 3, 7].includes(yearZhiIndex)) { huoStart = 9; lingStart = 10; } 
    results.push({ palace: palaces[(huoStart + hourIndex) % 12], star: '火星', type: 'tough' });
    results.push({ palace: palaces[(lingStart + hourIndex) % 12], star: '铃星', type: 'tough' });

    const hongPos = (3 - yearZhiIndex + 12) % 12; 
    const xiPos = (hongPos + 6) % 12; 
    results.push({ palace: palaces[hongPos], star: '红鸾', type: 'peach' });
    results.push({ palace: palaces[xiPos], star: '天喜', type: 'peach' });

    let guPos = 0, guaPos = 0;
    if ([11, 0, 1].includes(yearZhiIndex)) { guPos = 2; guaPos = 10; } 
    else if ([2, 3, 4].includes(yearZhiIndex)) { guPos = 5; guaPos = 1; } 
    else if ([5, 6, 7].includes(yearZhiIndex)) { guPos = 8; guaPos = 4; } 
    else if ([8, 9, 10].includes(yearZhiIndex)) { guPos = 11; guaPos = 7; } 
    results.push({ palace: palaces[guPos], star: '孤辰', type: 'bad' });
    results.push({ palace: palaces[guaPos], star: '寡宿', type: 'bad' });
    return results.filter(r => r.palace);
};

const arrangeMonthStars = (monthIndex: number, palaces: Palace[]) => {
    const results = [];
    const zfPos = (4 + monthIndex) % 12;
    results.push({ palace: palaces[zfPos], star: '左辅', type: 'soft' });
    const ybPos = (10 - monthIndex + 12) % 12;
    results.push({ palace: palaces[ybPos], star: '右弼', type: 'soft' });
    const txPos = (9 + monthIndex) % 12;
    results.push({ palace: palaces[txPos], star: '天刑', type: 'tough' });
    const tyPos = (1 + monthIndex) % 12;
    results.push({ palace: palaces[tyPos], star: '天姚', type: 'bad' });
    const tianYueMonthMap = [10, 5, 4, 2, 7, 3, 11, 7, 2, 6, 10, 2]; 
    if (tianYueMonthMap[monthIndex] !== undefined) {
         results.push({ palace: palaces[tianYueMonthMap[monthIndex]], star: '天月', type: 'bad' });
    }
    const jieShenPos = (8 + Math.floor(monthIndex / 2) * 2) % 12;
    results.push({ palace: palaces[jieShenPos], star: '解神', type: 'lucky' });
    return results.filter(r => r.palace);
};

const arrangeDayStars = (dayIndex: number, palaces: Palace[]) => {
    const zfIndex = palaces.findIndex(p => p.stars.minor.some(s => s.name === '左辅'));
    const ybIndex = palaces.findIndex(p => p.stars.minor.some(s => s.name === '右弼'));
    const wcIndex = palaces.findIndex(p => p.stars.minor.some(s => s.name === '文昌'));
    const wqIndex = palaces.findIndex(p => p.stars.minor.some(s => s.name === '文曲'));
    const results = [];
    const D = dayIndex + 1; 
    if (zfIndex !== -1) {
        const pos = (zfIndex + D - 1) % 12;
        results.push({ palace: palaces[pos], star: '三台', type: 'soft' });
    }
    if (ybIndex !== -1) {
        const pos = (ybIndex - (D - 1) + 24) % 12;
        results.push({ palace: palaces[pos], star: '八座', type: 'soft' });
    }
    if (wcIndex !== -1) {
        const finalPos = (wcIndex + D - 1) % 12;
        results.push({ palace: palaces[finalPos], star: '恩光', type: 'lucky' });
    }
    if (wqIndex !== -1) {
        const finalPos = (wqIndex + D - 1) % 12;
        results.push({ palace: palaces[finalPos], star: '天贵', type: 'lucky' });
    }
    return results.filter(r => r.palace);
};

const arrangeHourStars = (hourIndex: number, palaces: Palace[]) => {
    const results = [];
    const wcPos = (10 - hourIndex + 12) % 12;
    results.push({ palace: palaces[wcPos], star: '文昌', type: 'soft' });
    const wqPos = (4 + hourIndex) % 12;
    results.push({ palace: palaces[wqPos], star: '文曲', type: 'soft' });
    const dkPos = (11 - hourIndex + 12) % 12;
    results.push({ palace: palaces[dkPos], star: '地空', type: 'tough' });
    const djPos = (11 + hourIndex) % 12;
    results.push({ palace: palaces[djPos], star: '地劫', type: 'tough' });
    const jkPos = (hourIndex + 6) % 12;
    results.push({ palace: palaces[jkPos], star: '截空', type: 'bad' });
    return results.filter(r => r.palace);
};

const arrangeAdditionalStars = (yearZhiIndex: number, palaces: Palace[]) => {
    const results = [];
    const sanHeGroup = yearZhiIndex % 4; // 0: 申子辰, 1: 巳酉丑, 2: 寅午戌, 3: 亥卯未

    // 华盖 (Tomb of the group)
    const huaGaiPos = [4, 1, 10, 7][sanHeGroup];
    results.push({ palace: palaces[huaGaiPos], star: '华盖', type: 'special' });

    // 劫煞
    const jieShaPos = [5, 2, 11, 8][sanHeGroup];
    results.push({ palace: palaces[jieShaPos], star: '劫煞', type: 'bad' });

    // 灾煞
    const zaiShaPos = [6, 3, 0, 9][sanHeGroup];
    results.push({ palace: palaces[zaiShaPos], star: '灾煞', type: 'bad' });

    // 咸池 (Peach Blossom)
    const xianChiPos = [9, 6, 3, 0][sanHeGroup];
    results.push({ palace: palaces[xianChiPos], star: '咸池', type: 'peach' });

    // 将星 (Cardinal point of the group)
    const jiangXingPos = [0, 9, 6, 3][sanHeGroup];
    results.push({ palace: palaces[jiangXingPos], star: '将星', type: 'lucky' });

    // 攀鞍 (Tomb + 1)
    const panAnPos = [5, 2, 11, 8][sanHeGroup]; 
    results.push({ palace: palaces[panAnPos], star: '攀鞍', type: 'lucky' });
    
    // 龙池 & 凤阁
    results.push({ palace: palaces[(4 + yearZhiIndex) % 12], star: '龙池', type: 'soft' });
    results.push({ palace: palaces[(10 - yearZhiIndex + 12) % 12], star: '凤阁', type: 'soft' });

    // 破碎
    const poSuiPos = [3, 5, -1, 9, -1, 1, -1, 7, -1, 11, -1, 1][yearZhiIndex]; // Based on month, more complex, simplified here
    if (poSuiPos !== -1) results.push({ palace: palaces[poSuiPos], star: '破碎', type: 'bad' });
    
    // 蜚廉
    const feiLianPos = [8, 5, 2, 11, 8, 5, 2, 11, 8, 5, 2, 11][yearZhiIndex];
    results.push({ palace: palaces[feiLianPos], star: '蜚廉', type: 'bad' });

    return results.filter(r => r.palace);
};


const arrangeFixedStars = (mingIndex: number, palaces: Palace[]) => {
    const results = [];
    const friendsPos = (mingIndex - 7 + 12) % 12;
    const healthPos = (mingIndex - 5 + 12) % 12;
    results.push({ palace: palaces[friendsPos], star: '天伤', type: 'bad' });
    results.push({ palace: palaces[healthPos], star: '天使', type: 'bad' });
    return results.filter(r => r.palace);
};

const applyFourTransformationsComplete = (palaces: Palace[], yearGan: string) => {
    const siHuaMap = SI_HUA_TABLE[yearGan] || {};
    palaces.forEach(palace => {
        palace.stars.major.forEach(star => { if (siHuaMap[star.name]) { star.hua = siHuaMap[star.name] as any; } });
        palace.stars.minor.forEach(star => { if (siHuaMap[star.name]) { star.hua = siHuaMap[star.name] as any; } });
    });

    // Generate Si Hua Texts
    palaces.forEach(p => {
        p.siHuaTexts = [];
        [...p.stars.major, ...p.stars.minor].forEach(star => {
            if (star.hua) {
                 const starMeaning = STAR_TRANSFORM_MEANINGS[`${star.name}化${star.hua}`] || '';
                 const palaceMeaning = SI_HUA_PALACE_MEANINGS[p.name]?.[star.hua] || '';
                 p.siHuaTexts.push({
                     star: star.name,
                     hua: star.hua,
                     starDesc: starMeaning,
                     palaceDesc: palaceMeaning
                 });
            }
        });
    });
};

// --- Helpers ---
const getStarNames = (palace: Palace): Set<string> => {
    return new Set([...palace.stars.major, ...palace.stars.minor].map(s => s.name));
};

const isMiaoWang = (starName: string, zhiIndex: number): boolean => {
    const levels = EXTENDED_STAR_BRIGHTNESS[starName];
    if (!levels) return false;
    const brightness = levels[zhiIndex];
    return brightness === '庙' || brightness === '旺';
};

const getSanFangSiZheng = (palaces: Palace[], mingIndex: number): Palace[] => {
    const idx = (offset: number) => (mingIndex + offset + 12) % 12;
    return [
        palaces[mingIndex],
        palaces[idx(4)],  // Career
        palaces[idx(8)], // Wealth (Corrected from -4 to 8)
        palaces[idx(6)]   // Travel
    ];
};

const hasSiHua = (palace: Palace, type: '禄' | '权' | '科' | '忌') => {
    return [...palace.stars.major, ...palace.stars.minor].some(s => s.hua === type);
};

// --- Pattern Data & Logic ---

interface SimplePatternDef {
    id: string;
    name: string;
    type: string;
    level: number;
    stars: string[];
    desc: string;
    condition?: (ctx: any) => boolean;
}

interface ComplexPatternDef extends SimplePatternDef {
    check: (context: any) => boolean;
}

// Full List from knowledge base
const SIMPLE_PATTERNS: SimplePatternDef[] = [
  {id:"GE028", name:"紫府同宫格", type:"吉", level:4, stars:["紫微","天府"], desc:"尊贵稳重，掌权理财，宜公职或企业管理。格局清纯无煞，可致大富大贵。"},
  {id:"GE029", name:"紫微七杀格", type:"吉", level:4, stars:["紫微","七杀"], desc:"权威果断，具军警司法之才，早年辛苦磨砺，中年后掌实权而发迹。"},
  {id:"GE030", name:"紫微破军格", type:"特殊", level:3, stars:["紫微","破军"], desc:"为开创变革型领袖，宜创业或改革岗位，但感情婚姻多波动，需注意家庭平衡。"},
  {id:"GE031", name:"贪狼独坐格", type:"吉", level:3, stars:["贪狼"], desc:"才艺出众，桃花旺盛，交际手腕高超，宜娱乐、销售、公关行业。若会煞星，则流于浮华。", condition: (c) => c.mingStars.has('贪狼') && c.ming.stars.major.length === 1 },
  {id:"GE032", name:"天同福星格", type:"吉", level:3, stars:["天同"], desc:"性情温和享乐，人缘极佳，宜服务、休闲、餐饮行业。若陷地或见煞，则福减而懒散。", condition: (c) => c.mingStars.has('天同') && isMiaoWang('天同', c.ming.zhiIndex)},
  {id:"GE033", name:"武曲财星格", type:"吉", level:3, stars:["武曲"], desc:"理财能力卓越，精于实业与资本运作，宜金融、会计、制造业。庙旺无煞，富甲一方。", condition: (c) => { 
      const wealth = c.palaces.find((p:Palace) => p.name === '财帛'); 
      return wealth && getStarNames(wealth).has('武曲') && isMiaoWang('武曲', wealth.zhiIndex); 
  }},
  {id:"GE034", name:"廉贞次桃花格", type:"特殊", level:2, stars:["廉贞"], desc:"性格自律却情感复杂，易陷感情纠葛，宜技术、管理或纪律部队。若化忌，是非增多。"},
  {id:"GE035", name:"天府库星格", type:"吉", level:3, stars:["天府"], desc:"稳重包容，具管理与统筹才能，宜行政、仓储、地产。庙旺之地，财库丰盈。", condition: (c) => c.mingStars.has('天府') && isMiaoWang('天府', c.ming.zhiIndex)},
  {id:"GE036", name:"太阴母星格", type:"吉", level:3, stars:["太阴"], desc:"内敛含蓄，财富积累于无形，女性尤吉。宜地产、家政、金融理财。庙旺则福厚。", condition: (c) => c.mingStars.has('太阴') && isMiaoWang('太阴', c.ming.zhiIndex)},
  {id:"GE037", name:"巨门暗星格", type:"特殊", level:2, stars:["巨门"], desc:"口才犀利，思辨力强，但也易惹是非，宜法律、咨询、传媒。化禄科可转暗为明。"},
  {id:"GE038", name:"天相印星格", type:"吉", level:3, stars:["天相"], desc:"公正守信，协调能力佳，宜公关、人事、秘书工作。辅佐之才，不宜独断专行。"},
  {id:"GE039", name:"七杀将星格", type:"特殊", level:3, stars:["七杀"], desc:"果断冒险，开创力强，宜军警、创业或高风险行业。庙旺无煞，可掌兵权或企业。", condition: (c) => c.mingStars.has('七杀') && isMiaoWang('七杀', c.ming.zhiIndex)},
  {id:"GE040", name:"破军变星格", type:"特殊", level:3, stars:["破军"], desc:"具破坏与革新之力，宜科技、改革、颠覆性行业。动荡中求突破，安定则失其能。", condition: (c) => c.mingStars.has('破军') && isMiaoWang('破军', c.ming.zhiIndex)},
  {id:"GE045", name:"恩光天贵格", type:"吉", level:2, stars:["恩光","天贵"], desc:"学术荣誉加身，职称晋升顺利，易获官方认可。宜教育、研究或体制内发展。", condition: (c) => (c.mingStars.has('恩光') && c.mingStars.has('天贵')) || (getStarNames(c.career).has('恩光') && getStarNames(c.career).has('天贵'))},
  {id:"GE046", name:"三台八座格", type:"吉", level:2, stars:["三台","八座"], desc:"社会地位崇高，受人尊敬，具组织与领导象征。多见于公职或社团领袖。", condition: (c) => (c.mingStars.has('三台') && c.mingStars.has('八座')) || (getStarNames(c.career).has('三台') && getStarNames(c.career).has('八座'))},
  {id:"GE047", name:"台辅封诰格", type:"吉", level:2, stars:["台辅","封诰"], desc:"得官印辅助，易获封赏、证书或名誉头衔。文书运佳，宜考取资质认证。"},
  {id:"GE048", name:"解神救厄格", type:"吉", level:2, stars:["解神"], desc:"逢凶化吉，大难不死，具天然避险能力。尤其在疾厄或父母宫见之，可解重灾。", condition: (c) => {
      const health = c.palaces.find((p:Palace) => p.name === '疾厄');
      const parents = c.palaces.find((p:Palace) => p.name === '父母');
      return (health && getStarNames(health).has('解神')) || (parents && getStarNames(parents).has('解神'));
  }},
  {id:"GE049", name:"天月天伤格", type:"凶", level:-2, stars:["天月","天伤"], desc:"易因朋友带来情绪困扰或财务损失，交友需谨慎。多见于交友宫受冲。", condition: (c) => {
      const friends = c.palaces.find((p:Palace) => p.name === '交友');
      return friends && getStarNames(friends).has('天月') && getStarNames(friends).has('天伤');
  }},
  {id:"GE057", name:"红鸾天喜格", type:"吉", level:2, stars:["红鸾","天喜"], desc:"婚恋喜庆连连，生育顺利，感情生活丰富。夫妻宫见之，婚姻和谐美满。", condition: (c) => {
      const spouse = c.palaces.find((p:Palace) => p.name === '夫妻');
      if(!spouse) return false;
      const s = getStarNames(spouse);
      return s.has('红鸾') && s.has('天喜');
  }},
  {id:"GE058", name:"咸池沐浴格", type:"凶", level:-2, stars:["咸池"], desc:"桃花泛滥，易陷感情纠纷或名誉受损。男女皆忌，宜修身自律以避灾。", condition: (c) => {
      const spouse = c.palaces.find((p:Palace) => p.name === '夫妻');
      return (c.mingStars.has('咸池') || (spouse && getStarNames(spouse).has('咸池')));
  }},
  {id:"GE059", name:"天刑官符格", type:"凶", level:-3, stars:["天刑","官符"], desc:"易涉官司诉讼、纪律处分或法律纠纷。行事须守法合规，避免冲突。"},
  {id:"GE060", name:"天姚天哭格", type:"凶", level:-2, stars:["天姚","天哭"], desc:"情绪抑郁低落，常暗中哭泣，精神压力大。宜心理疏导，避免孤处。"},
  {id:"GE061", name:"龙池凤阁格", type:"吉", level:2, stars:["龙池","凤阁"], desc:"具艺术审美与装饰才华，宜设计、建筑、时尚行业。气质优雅，品味出众。"},
  {id:"GE062", name:"天福天寿格", type:"吉", level:2, stars:["天福","天寿"], desc:"福寿绵长，晚年安逸无忧。福德宫见之，身心康泰，少病少灾。", condition: (c) => {
      const fortune = c.palaces.find((p:Palace) => p.name === '福德');
      return fortune && getStarNames(fortune).has('天福') && getStarNames(fortune).has('天寿');
  }},
  {id:"GE063", name:"天厨天巫格", type:"吉", level:1, stars:["天厨","天巫"], desc:"饮食之福深厚，常得意外小财或馈赠。生活安逸，口福不浅。"},
  {id:"GE064", name:"蜚廉破碎格", type:"凶", level:-2, stars:["蜚廉","破碎"], desc:"易遭谣言是非，物品破损或计划中断。宜谨言慎行，保护财物。"},
  {id:"GE065", name:"华盖孤辰格", type:"特殊", level:1, stars:["华盖","孤辰"], desc:"具宗教、玄学或哲学天赋，但性格孤僻，不喜世俗纷扰。宜修行或学术研究。"},
  {id:"GE066", name:"天德月德格", type:"吉", level:2, stars:["天德","月德"], desc:"德行深厚，常得天地庇佑，逢凶化吉。为人正直，自然招福。"},
  {id:"GE067", name:"天官天福格", type:"吉", level:2, stars:["天官","天福"], desc:"官禄与福气兼具，职位安稳，少有失业之忧。宜公职或稳定行业。"},
  {id:"GE068", name:"天虚天空格", type:"凶", level:-2, stars:["天虚","天空"], desc:"精神空虚，计划常落空，努力难见成效。宜脚踏实地，避免幻想。"},
  {id:"GE069", name:"寡宿孤辰格", type:"凶", level:-2, stars:["寡宿","孤辰"], desc:"性格孤僻，婚姻迟滞或终身孤独。晚年清冷，宜培养兴趣以慰寂寥。"},
  {id:"GE070", name:"天煞地煞格", type:"凶", level:-3, stars:["天煞","地煞"], desc:"易遭意外灾祸或小人暗害。出行需谨慎，居家宜安防。"},
  {id:"GE071", name:"劫煞灾煞格", type:"凶", level:-3, stars:["劫煞","灾煞"], desc:"财物易损，突发灾难频发。宜购买保险，分散风险。"},
  {id:"GE072", name:"将星攀鞍格", type:"吉", level:2, stars:["将星","攀鞍"], desc:"具领导才能，得部属拥护，宜带团队或管理岗位。行动力强，贵人相助。"},
  {id:"GE076", name:"天德贵人格", type:"吉", level:2, stars:["天德","贵人"], desc:"德行感召贵人，危难时得人援手。宜积德行善，以增福缘。"},
  {id:"GE077", name:"天赦解神格", type:"吉", level:2, stars:["天赦","解神"], desc:"罪过易得赦免，灾厄自然化解。逢大难常有转机，为救命之格。"},
  {id:"GE078", name:"天刑大耗格", type:"凶", level:-3, stars:["天刑","大耗"], desc:"官司与破财双重打击，损失惨重。须极度谨慎法律与财务事务。"},
  {id:"GE079", name:"天喜红艳格", type:"吉", level:2, stars:["天喜","红艳"], desc:"感情喜庆，魅力增强，异性缘佳。宜把握良缘，但防桃花过盛。"},
  {id:"GE080", name:"天哭天虚格", type:"凶", level:-2, stars:["天哭","天虚"], desc:"常陷悲伤空想，付出无回报，难有实际收获。宜务实行动，减少幻想。"},
  {id:"GE081", name:"天福天厨格", type:"吉", level:1, stars:["天福","天厨"], desc:"饮食享福，生活安逸，常得口腹之乐。体质佳，少饥馑之忧。"},
  {id:"GE082", name:"天寿天德格", type:"吉", level:2, stars:["天寿","天德"], desc:"长寿有德，晚年吉祥安康。德行深厚，子孙敬重。"},
  {id:"GE083", name:"天巫天月格", type:"特殊", level:1, stars:["天巫","天月"], desc:"具医药缘分，易得女性贵人相助。宜医疗、护理或女性相关行业。"},
  {id:"GE084", name:"天伤天使格", type:"凶", level:-1, stars:["天伤","天使"], desc:"付出常无回报，且有健康警示信号。宜定期体检，量力而行。"},
  {id:"GE085", name:"截空旬空格", type:"凶", level:-2, stars:["截空","旬空"], desc:"能量中断，计划失败，努力如打空拳。宜等待时机，不可强求。"},
  {id:"GE086", name:"地空地劫格", type:"凶", level:-3, stars:["地空","地劫"], desc:"理想破灭，突发破财，精神易崩溃。宜修心养性，降低欲望。"},
  {id:"GE087", name:"火星铃星格", type:"凶", level:-3, stars:["火星","铃星"], desc:"内外冲突不断，身心俱疲，易怒易躁。宜静修、运动以泄火气。"},
  {id:"GE088", name:"擎羊陀罗格", type:"凶", level:-3, stars:["擎羊","陀罗"], desc:"刑伤拖延，进退两难，常陷僵局。宜耐心等待，避免冲动决策。"},
  {id:"GE089", name:"文昌文曲格", type:"吉", level:3, stars:["文昌","文曲"], desc:"文才双全，考试必中，学术艺术成就高。气质儒雅，名望远播。"},
  {id:"GE090", name:"左辅右弼格", type:"吉", level:3, stars:["左辅","右弼"], desc:"助力强大，合作顺利，事业多得贵人扶持。团队运佳，不宜单打独斗。"},
  {id:"GE091", name:"天魁天钺格", type:"吉", level:3, stars:["天魁","天钺"], desc:"贵人双至，机遇连连，尤得异性或上级提携。顺风顺水，少走弯路。"},
  {id:"GE092", name:"禄存天马格", type:"吉", level:4, stars:["禄存","天马"], desc:"动中得财，宜贸易、物流、跨境业务。奔波劳碌而致富，静守反不利。"},
  {id:"GE093", name:"化禄化权格", type:"吉", level:3, stars:["化禄","化权"], desc:"财权双收，名利兼得，事业掌控力强。宜创业或掌部门实权。", condition: (c) => hasSiHua(c.ming, '禄') && hasSiHua(c.ming, '权')},
  {id:"GE094", name:"化科化忌格", type:"特殊", level:-1, stars:["化科","化忌"], desc:"虽有名声却遭非议，贵人无力相助。宜低调行事，避免高调曝光。", condition: (c) => hasSiHua(c.ming, '科') && hasSiHua(c.ming, '忌')},
  {id:"GE095", name:"太阳太阴格", type:"吉", level:3, stars:["太阳","太阴"], desc:"阴阳调和，福寿双全，家庭和睦，男女皆吉。父母缘深，家宅兴旺。"},
  {id:"GE096", name:"天机天梁格", type:"吉", level:3, stars:["天机","天梁"], desc:"智谋清高，具宗教、哲学或策划天赋。宜顾问、智库或公益事业。"},
  {id:"GE097", name:"天同巨门格", type:"特殊", level:2, stars:["天同","巨门"], desc:"口福与是非并存，享受中带口舌。宜餐饮、调解或娱乐行业。"},
  {id:"GE098", name:"武曲贪狼格", type:"特殊", level:3, stars:["武曲","贪狼"], desc:"财欲交织，精于金融投机或高风险理财。需节制欲望，以防破败。"},
  {id:"GE099", name:"廉贞破军格", type:"特殊", level:3, stars:["廉贞","破军"], desc:"感情与事业皆动荡，具复杂变革之力。宜改革、军警或危机处理岗位。"},
  {id:"GE100", name:"七杀破军格", type:"特殊", level:3, stars:["七杀","破军"], desc:"具极端开创力，敢于冒险破局。宜特种行业、创业或颠覆性项目。"},
  {id:"GE101", name:"紫微天相格", type:"吉", level:3, stars:["紫微","天相"], desc:"尊贵协调，管理公正，宜高层行政或监察岗位。具辅佐帝王之才。"},
  {id:"GE102", name:"天府天相格", type:"吉", level:3, stars:["天府","天相"], desc:"稳重服务，库印相随，宜财政、人事或后勤管理。守成之才，不宜激进。"},
  {id:"GE103", name:"天梁七杀格", type:"特殊", level:2, stars:["天梁","七杀"], desc:"清高果断，具执法或纪律部队天赋。刚柔并济，可掌刑罚之权。"},
  {id:"GE104", name:"天同天梁格", type:"吉", level:3, stars:["天同","天梁"], desc:"福荫清高，享乐中带慈悲心。宜慈善、教育或福利事业。"},
  {id:"GE105", name:"太阳巨门格", type:"特殊", level:3, stars:["太阳","巨门"], desc:"口才名望兼具，也主是非争议。宜主播、律师或外交，以光明化暗昧。"},
  {id:"GE106", name:"太阴贪狼格", type:"特殊", level:2, stars:["太阴","贪狼"], desc:"内敛欲望，女性魅力极强。宜演艺、美容或隐秘交际行业。"},
  {id:"GE107", name:"武曲七杀格", type:"吉", level:3, stars:["武曲","七杀"], desc:"财权果断，具军警或金融风控之才。执行力强，可掌财兵大权。"},
  {id:"GE108", name:"破军贪狼格", type:"特殊", level:3, stars:["破军","贪狼"], desc:"欲望与破坏力结合，彻底革新旧局。宜革命性创业或高风险投机。"},
  {id:"GE109", name:"廉贞七杀格", type:"特殊", level:3, stars:["廉贞","七杀"], desc:"自律果断，具军警司法之才。刚正不阿，可掌刑狱或纪律大权。"},
  {id:"GE110", name:"天机巨门格", type:"特殊", level:2, stars:["天机","巨门"], desc:"智谋与口才兼备，宜策划、宣传或情报分析。思维敏捷，善察人心。"},
  {id:"GE111", name:"天同太阳格", type:"吉", level:2, stars:["天同","太阳"], desc:"温和光明，人缘极佳，具亲和力与号召力。宜公共关系或社区服务。"},
  {id:"GE112", name:"太阴天同格", type:"吉", level:2, stars:["太阴","天同"], desc:"福气与财富兼具，女性尤吉。宜家庭、地产或休闲产业，生活安逸。"},
  {id:"GE113", name:"天梁太阳格", type:"吉", level:2, stars:["天梁","太阳"], desc:"清高光明，具公益心与教育热忱。宜非营利组织、学校或宗教团体。"},
  {id:"GE114", name:"天梁太阴格", type:"吉", level:2, stars:["天梁","太阴"], desc:"清高而富足，具医药、地产或慈善天赋。宜稳健投资，晚年福厚。"},
  {id:"GE115", name:"七杀贪狼格", type:"特殊", level:3, stars:["七杀","贪狼"], desc:"冒险与欲望交织，开创力强，交际手段高超。宜特种销售或高风险创业。"},
  {id:"GE116", name:"破军七杀格", type:"特殊", level:3, stars:["破军","七杀"], desc:"破坏与果断结合，彻底改革旧秩序。宜军事、拆迁或颠覆性科技行业。"},
  {id:"GE117", name:"廉贞贪狼格", type:"特殊", level:3, stars:["廉贞","贪狼"], desc:"欲望与自律并存，交际手段高明。宜公关、谈判或灰色地带行业。"},
  {id:"GE118", name:"天机天同格", type:"吉", level:2, stars:["天机","天同"], desc:"智谋与享乐兼具，宜策划休闲、旅游或创意产业。生活轻松，少大忧患。"},
  {id:"GE119", name:"天机太阳格", type:"吉", level:2, stars:["天机","太阳"], desc:"智谋光明，具策划与公职天赋。宜政府智库、战略规划或媒体行业。"},
  {id:"GE120", name:"天机太阴格", type:"吉", level:2, stars:["天机","太阴"], desc:"智谋与财富结合，精于理财策划。宜金融分析、投资顾问或幕后操盘。"},
  {id:"GE121", name:"武曲天相格", type:"吉", level:2, stars:["武曲","天相"], desc:"财权协调，具金融与人事双重才能。宜银行、HR或风控管理岗位。"},
  {id:"GE122", name:"武曲天府格", type:"吉", level:3, stars:["武曲","天府"], desc:"财库管理能力卓越，宜金融、地产或大型企业财务。稳中求富，积少成多。"},
  {id:"GE123", name:"太阳天梁格", type:"吉", level:2, stars:["太阳","天梁"], desc:"光明清高，具公益与教育热忱。宜学校、NGO或宗教慈善事业。"},
  {id:"GE124", name:"太阴天梁格", type:"吉", level:2, stars:["太阴","天梁"], desc:"财富与清高并存，具医药、地产或慈善天赋。宜稳健经营，福泽绵长。"},
  {id:"GE125", name:"贪狼天梁格", type:"特殊", level:2, stars:["贪狼","天梁"], desc:"欲望与清高矛盾，具交际与宗教双重倾向。宜宗教营销或高端公关。"},
  {id:"GE126", name:"巨门天相格", type:"特殊", level:2, stars:["巨门","天相"], desc:"口才与协调力兼备，宜法律、公关或调解工作。以理服人，化解纷争。"},
  {id:"GE127", name:"巨门天府格", type:"特殊", level:2, stars:["巨门","天府"], desc:"口才与管理结合，宜法律行政或大型机构文秘。言出有据，稳重可信。"},
  {id:"GE128", name:"巨门天梁格", type:"吉", level:2, stars:["巨门","天梁"], desc:"口才清高，具法律、宗教或学术天赋。宜法官、教授或神职人员。"},
];
const COMPLEX_PATTERNS: ComplexPatternDef[] = [
  {
    id: "GE001", name: "火贪格", type: "吉", level: 4, stars: ["火星", "贪狼"],
    desc: "突发横财，宜从事高风险高回报行业；性格冒险冲动，婚姻易波动。最喜在命、财、官、迁宫成格，逢吉星则暴发。",
    check: (c: any) => c.sanFangSiZheng.some((p: Palace) => {
      const s = getStarNames(p);
      return s.has('火星') && s.has('贪狼') && isMiaoWang('贪狼', p.zhiIndex);
    })
  },
  {
    id: "GE002", name: "铃贪格", type: "吉", level: 3, stars: ["铃星", "贪狼"],
    desc: "暗中得财，善用智谋与策略获利；适合金融、幕后策划、情报分析等工作。性格沉稳内敛，不喜张扬，宜静中取利。",
    check: (c: any) => c.sanFangSiZheng.some((p: Palace) => {
      const s = getStarNames(p);
      return s.has('铃星') && s.has('贪狼') && isMiaoWang('贪狼', p.zhiIndex);
    })
  },
  {
    id: "GE003", name: "禄马交驰格", type: "吉", level: 4, stars: ["禄存", "天马"],
    desc: "多发财于异乡或获取远方之财，环境变化大，多外出、旅行，事业上主奔波劳碌而招财。会吉星众，多为大富之人。",
    check: (c: any) => {
      const hasLu = c.sanFangSiZheng.some((p: Palace) => {
        const s = getStarNames(p);
        return s.has('禄存') || hasSiHua(p, '禄');
      });
      const hasMa = c.sanFangSiZheng.some((p: Palace) => getStarNames(p).has('天马'));
      return hasLu && hasMa;
    }
  },
  {
    id: "GE004", name: "君臣庆会格", type: "大吉", level: 5, stars: ["紫微", "左辅", "右弼"],
    desc: "具帝王将相之资，掌大权、统全局，贵人拥戴，事业登峰造极。若会齐六吉星，可致大富大贵，为上上之格。",
    check: (c: any) => {
      if (!c.mingStars.has('紫微')) return false;
      const luckies = ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺'];
      let count = 0;
      c.sanFangSiZheng.forEach((p: Palace) => {
        const s = getStarNames(p);
        count += luckies.filter(l => s.has(l)).length;
      });
      return count >= 3;
    }
  },
  {
    id: "GE005", name: "杀破狼格", type: "特殊", level: 4, stars: ["七杀", "破军", "贪狼"],
    desc: "一生多转折变革，开创力强，宜从事新兴、变动性行业。逢吉化（禄权科）则大成，见煞忌则破败动荡，成败皆速。",
    check: (c: any) => {
      const hasSha = c.sanFangSiZheng.some((p: Palace) => getStarNames(p).has('七杀'));
      const hasPo = c.sanFangSiZheng.some((p: Palace) => getStarNames(p).has('破军'));
      const hasLang = c.sanFangSiZheng.some((p: Palace) => getStarNames(p).has('贪狼'));
      return hasSha && hasPo && hasLang;
    }
  },
  {
    id: "GE006", name: "昌曲夹命格", type: "吉", level: 4, stars: ["文昌", "文曲"],
    desc: "才华横溢，文采出众，考试必中，学术、艺术、教育领域成就极高。气质清雅，名望远播，为文人贵格。",
    check: (c: any) => ['子','午','卯','酉'].includes(c.ming.zhi) && ((c.prevStars.has('文昌') && c.nextStars.has('文曲')) || (c.prevStars.has('文曲') && c.nextStars.has('文昌')))
  },
  {
    id: "GE007", name: "左右夹命格", type: "吉", level: 3, stars: ["左辅", "右弼"],
    desc: "贵人扶持力强，合作顺利，团队运佳，事业多得他人助力而成。性格谦和，善协调，宜从事管理或协作型工作。",
    check: (c: any) => ['子','午','卯','酉'].includes(c.ming.zhi) && ((c.prevStars.has('左辅') && c.nextStars.has('右弼')) || (c.prevStars.has('右弼') && c.nextStars.has('左辅')))
  },
  {
    id: "GE008", name: "魁钺夹命格", type: "吉", level: 3, stars: ["天魁", "天钺"],
    desc: "一生常遇贵人，尤得异性、上司或权威人士提携。机遇自来，少走弯路，事业顺遂，为福厚之格。",
    check: (c: any) => ['子','午','卯','酉'].includes(c.ming.zhi) && ((c.prevStars.has('天魁') && c.nextStars.has('天钺')) || (c.prevStars.has('天钺') && c.nextStars.has('天魁')))
  },
  {
    id: "GE009", name: "日月并明格", type: "吉", level: 4, stars: ["太阳", "太阴"],
    desc: "阴阳调和，福寿双全，家庭和睦，父母缘深，家宅兴旺，一生少大灾厄，为安稳富贵之格。",
    check: (c: any) => (c.mingStars.has('太阳') && c.mingStars.has('太阴')) && (c.ming.zhi === '丑' || c.ming.zhi === '未')
  },
  {
    id: "GE010", name: "日照雷门格", type: "吉", level: 4, stars: ["太阳"],
    desc: "日丽中天，权势显赫，名扬四海，宜从政、公职或大型机构领导。光明磊落，受人敬重，为阳刚贵格。",
    check: (c: any) => c.mingStars.has('太阳') && c.ming.zhi === '午'
  },
  {
    id: "GE011", name: "明珠出海格", type: "吉", level: 3, stars: ["太阳"],
    desc: "日升扶桑，少年得志，光明磊落，才德早显。宜公职、教育或公益事业，一生清贵，少有污点。",
    check: (c: any) => c.mingStars.has('太阳') && c.ming.zhi === '卯'
  },
  {
    id: "GE012", name: "月朗天门格", type: "吉", level: 3, stars: ["太阴"],
    desc: "月满西楼，财富丰盈，心思细腻，女性尤吉。宜理财、文艺、地产，家宅兴旺，晚年福厚。",
    check: (c: any) => c.mingStars.has('太阴') && c.ming.zhi === '亥'
  },
  {
    id: "GE013", name: "极向离明格", type: "大吉", level: 5, stars: ["紫微"],
    desc: "帝星居南离之位，至尊格局，掌大权、统万民，为帝王将相之命。若无煞破，可致极贵极富。",
    check: (c: any) => c.mingStars.has('紫微') && c.ming.zhi === '午'
  },
  {
    id: "GE014", name: "石中隐玉格", type: "吉", level: 3, stars: ["紫微", "天府"],
    desc: "外柔内刚，潜力深厚，早年不显，中年后发迹。宜守不宜攻，厚积薄发，晚运昌隆。",
    check: (c: any) => c.ming.stars.major.length === 0 && getStarNames(c.travel).has('紫微') && getStarNames(c.travel).has('天府')
  },
  {
    id: "GE015", name: "机月同梁格", type: "吉", level: 3, stars: ["天机", "太阴", "天同", "天梁"],
    desc: "多在公家机构、大规模企业中任职，从事管理工作、外务工作、案牍工作、文秘工作、设计策划工作等，一般事业稳定少风险。格局佳者，富贵不小。见煞星则破格。亦有从事自由职业者，但仍以其专长技艺而成名。于他宫守命会齐四星亦算此格。",
    check: (c: any) => {
      const targets = ['天机', '太阴', '天同', '天梁'];
      let count = 0;
      c.sanFangSiZheng.forEach((p: Palace) => {
        const s = getStarNames(p);
        targets.forEach(t => { if (s.has(t)) count++; });
      });
      return count >= 3;
    }
  },
  {
    id: "GE016", name: "雄宿朝元格", type: "吉", level: 4, stars: ["廉贞", "贪狼"],
    desc: "文武双全，具领导魄力，宜掌兵权、执法或企业高管。性格刚毅果断，名利双收，为将帅之格。",
    check: (c: any) => c.mingStars.has('廉贞') && c.mingStars.has('贪狼') && (c.ming.zhi === '寅' || c.ming.zhi === '申')
  },
  {
    id: "GE017", name: "巨日格", type: "吉", level: 3, stars: ["巨门", "太阳"],
    desc: "口才出众，逻辑缜密，宜律师、主播、外交、教师等言说类职业。名声大于实利，以理服人而立身。",
    check: (c: any) => c.mingStars.has('巨门') && c.mingStars.has('太阳') && c.ming.zhi === '寅'
  },
  {
    id: "GE018", name: "天梁荫星格", type: "吉", level: 3, stars: ["天梁", "天魁"],
    desc: "具医药、慈善、宗教天赋，得长辈或贵人庇荫。宜从事公益、医疗、教育，一生少灾，福泽绵长。",
    check: (c: any) => (c.mingStars.has('天梁') || getStarNames(c.travel).has('天梁')) && (c.mingStars.has('天魁') || c.mingStars.has('天钺'))
  },
  {
    id: "GE019", name: "刑囚夹印格", type: "凶", level: -4, stars: ["天相", "廉贞", "擎羊"],
    desc: "易陷官非、牢狱、合同纠纷，法律事务多波折。若再见化忌，灾祸加重，须极度谨慎文书与契约。",
    check: (c: any) => {
      if (!c.mingStars.has('天相')) return false;
      const prevStars = c.prevStars;
      const nextStars = c.nextStars;
      const prevHasJi = hasSiHua(c.prev, '忌');
      const nextHasJi = hasSiHua(c.next, '忌');
      const lianJiaYang = (prevStars.has('廉贞') && nextStars.has('擎羊')) || (prevStars.has('擎羊') && nextStars.has('廉贞'));
      const xingJiJiaYin = (prevStars.has('擎羊') && nextHasJi) || (nextStars.has('擎羊') && prevHasJi);
      return lianJiaYang || xingJiJiaYin;
    }
  },
  {
    id: "GE020", name: "羊陀夹命格", type: "凶", level: -3, stars: ["擎羊", "陀罗"],
    desc: "一生阻力重重，易受伤、手术或意外灾厄。性格孤傲倔强，需靠自身奋斗解厄，早年多磨，晚运稍安。",
    check: (c: any) => ['子','午','卯','酉'].includes(c.ming.zhi) && ((c.prevStars.has('擎羊') && c.nextStars.has('陀罗')) || (c.prevStars.has('陀罗') && c.nextStars.has('擎羊')))
  },
  {
    id: "GE021", name: "火铃夹命格", type: "凶", level: -3, stars: ["火星", "铃星"],
    desc: "性急冲动，意外血光、火灾、争斗频发。宜静守不宜冒进，从事军警、消防等武职能化解凶性。",
    check: (c: any) => ['子','午','卯','酉'].includes(c.ming.zhi) && ((c.prevStars.has('火星') && c.nextStars.has('铃星')) || (c.prevStars.has('铃星') && c.nextStars.has('火星')))
  },
  {
    id: "GE022", name: "空劫夹命格", type: "凶", level: -3, stars: ["地空", "地劫"],
    desc: "理想高远但现实落空，财运虚浮，易破财或信仰危机。宜脚踏实地，避免投机，修心养性可减凶。",
    check: (c: any) => ['子','午','卯','酉'].includes(c.ming.zhi) && ((c.prevStars.has('地空') && c.nextStars.has('地劫')) || (c.prevStars.has('地劫') && c.nextStars.has('地空')))
  },
  {
    id: "GE023", name: "孤辰寡宿格", type: "凶", level: -2, stars: ["孤辰", "寡宿"],
    desc: "性格孤僻，不喜群居，婚姻迟滞或孤独终老。晚年清冷，宜修道、艺术或独居职业以安其心。",
    check: (c: any) => c.mingStars.has('孤辰') && c.mingStars.has('寡宿')
  },
  {
    id: "GE024", name: "截空旬空格", type: "凶", level: -2, stars: ["截空", "旬空"],
    desc: "计划常落空，努力难见果，财运虚浮不实。宜务实守成，避免扩张，专注一技可保平安。",
    check: (c: any) => (c.mingStars.has('截空') && c.mingStars.has('旬空')) || (getStarNames(c.palaces.find((p:Palace)=>p.name==='财帛')).has('截空') && getStarNames(c.palaces.find((p:Palace)=>p.name==='财帛')).has('旬空'))
  },
  {
    id: "GE025", name: "马头带剑格", type: "凶", level: -3, stars: ["擎羊"],
    desc: "冲动暴烈，易惹血光、争斗或意外伤害。若从事军警、外科、武术等武职能化凶为权。",
    check: (c: any) => c.mingStars.has('擎羊') && c.ming.zhi === '午'
  },
  {
    id: "GE026", name: "水火既济格", type: "凶", level: -2, stars: ["太阳", "太阴", "火星"],
    desc: "家宅不宁，父母不和，房产易损或频繁搬迁。田宅宫受冲，宜租房或简化不动产配置。",
    check: (c: any) => {
      const prop = c.palaces.find((p: Palace) => p.name === '田宅');
      if (!prop) return false;
      const s = getStarNames(prop);
      return s.has('太阳') && s.has('太阴') && (s.has('火星') || s.has('铃星'));
    }
  },
  {
    id: "GE027", name: "六极逢凶格", type: "大凶", level: -5, stars: ["擎羊", "陀罗", "火星", "铃星"],
    desc: "一生坎坷，贫病交加，灾厄连连。若无大运救应或修行积德，难有翻身之机，为极凶之格。",
    check: (c: any) => {
      const main = c.ming.stars.major[0];
      if (!main || main.brightness !== '陷') return false;
      const killers = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];
      const count = killers.filter(k => c.mingStars.has(k)).length;
      return count >= 4;
    }
  },
  {
    id: "GE041", name: "三奇嘉会格", type: "大吉", level: 5, stars: ["化禄", "化权", "化科"],
    desc: "化禄、化权、化科齐聚三方四正，才华、财富、机遇兼备，一生顺遂少阻，为上等命格，富贵双全。",
    check: (c: any) => {
       let lu=false, quan=false, ke=false;
       c.sanFangSiZheng.forEach((p: Palace) => {
           if (hasSiHua(p, '禄')) lu=true;
           if (hasSiHua(p, '权')) quan=true;
           if (hasSiHua(p, '科')) ke=true;
       });
       return lu && quan && ke;
    }
  },
  {
    id: "GE042", name: "百官朝拱格", type: "大吉", level: 5, stars: ["紫微"],
    desc: "紫微坐命，六吉星（辅弼昌曲魁钺）朝拱，百官拥戴，掌实权，影响力卓著，为大富大贵之格。",
    check: (c: any) => {
      if (!c.mingStars.has('紫微')) return false;
      const sixJi = ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺'];
      let count = 0;
      c.sanFangSiZheng.forEach((p: Palace) => {
        const s = getStarNames(p);
        sixJi.forEach(ji => { if (s.has(ji)) count++; });
      });
      return count >= 4;
    }
  },
  {
    id: "GE043", name: "无正曜格", type: "平", level: 2, stars: [],
    desc: "命宫无主星，早年依赖他人，性格随和但缺乏主见。中年后借迁移宫之星发力，可自立成事。",
    check: (c: any) => c.ming.stars.major.length === 0
  },
  {
    id: "GE044", name: "阴阳反背格", type: "特殊", level: -1, stars: ["太阳", "太阴"],
    desc: "父母缘薄，早离家乡，宜异地发展方有成就。本地发展多阻，外出反得机遇，为背井离乡之格。",
    check: (c: any) => c.mingStars.has('太阳') && c.mingStars.has('太阴') && (c.ming.zhi === '辰' || c.ming.zhi === '戌') 
  },
  {
    id: "GE051", name: "禄照财帛格", type: "吉", level: 3, stars: ["化禄"],
    desc: "财帛宫见化禄，财源广进，赚钱轻松，收入稳定且机会多。宜把握投资与合作，但防过度消费。",
    check: (c: any) => {
         const w = c.palaces.find((p:Palace) => p.name === '财帛');
         return w && hasSiHua(w, '禄');
    }
  },
  {
    id: "GE052", name: "权守官禄格", type: "吉", level: 3, stars: ["化权"],
    desc: "官禄宫见化权，事业掌权，具管理职位与决策力。执行力强，宜创业或担任主管，权威显著。",
    check: (c: any) => {
        const car = c.palaces.find((p:Palace) => p.name === '官禄');
        return car && hasSiHua(car, '权');
    }
  },
  {
    id: "GE053", name: "科星护命格", type: "吉", level: 3, stars: ["化科"],
    desc: "命或迁移宫见化科，名声清贵，贵人解厄，考试面试易成功。宜学术、公关、品牌建设，以名求利。",
    check: (c: any) => hasSiHua(c.ming, '科') || hasSiHua(c.travel, '科')
  },
  {
    id: "GE054", name: "忌入夫妻格", type: "凶", level: -3, stars: ["化忌"],
    desc: "夫妻宫见化忌，婚姻不顺，配偶健康或感情易出问题。宜晚婚，或选择性格包容之伴侣以减凶。",
    check: (c: any) => {
        const s = c.palaces.find((p:Palace) => p.name === '夫妻');
        return s && hasSiHua(s, '忌');
    }
  },
  {
    id: "GE055", name: "双忌冲格", type: "大凶", level: -4, stars: ["化忌"],
    desc: "命与迁移宫双化忌，主重大挫折，如财帛双忌恐致破产，事业双忌则彻底失败，需大运救应。",
    check: (c: any) => {
         return hasSiHua(c.ming, '忌') && hasSiHua(c.travel, '忌');
    }
  },
  {
    id: "GE056", name: "禄忌交战格", type: "凶", level: -2, stars: ["化禄", "化忌"],
    desc: "命宫禄忌同宫，表面得利，实则损耗；赚得多花得快，难积蓄。宜财务隔离，避免情绪化消费。",
    check: (c: any) => hasSiHua(c.ming, '禄') && hasSiHua(c.ming, '忌')
  },
];

const calculatePatterns = (palaces: Palace[], mingIndex: number, yearGan: string): Pattern[] => {
    const ming = palaces[mingIndex];
    const prev = palaces[(mingIndex + 11) % 12];
    const next = palaces[(mingIndex + 1) % 12];
    const travel = palaces[(mingIndex + 6) % 12];
    const career = palaces[(mingIndex + 8) % 12];
    
    // Context object for rules
    const context = {
        ming,
        prev,
        next,
        travel,
        career,
        palaces,
        mingStars: getStarNames(ming),
        prevStars: getStarNames(prev),
        nextStars: getStarNames(next),
        sanFangSiZheng: getSanFangSiZheng(palaces, mingIndex)
    };
    
    const matched: Pattern[] = [];
    
    // Check Simple Patterns (Two stars in Ming)
    SIMPLE_PATTERNS.forEach(sp => {
        let isMatch = false;
        if (sp.condition) {
            isMatch = sp.condition(context);
        } else {
            // Default check: All listed stars in Ming
            isMatch = sp.stars.every(s => context.mingStars.has(s));
        }
        
        if (isMatch) {
            matched.push({
                id: sp.id,
                name: sp.name,
                type: sp.type,
                level: sp.level,
                description: sp.desc,
                stars: sp.stars
            });
        }
    });

    // Check Complex Patterns
    COMPLEX_PATTERNS.forEach(rule => {
        try {
            if (rule.check(context)) {
                matched.push({
                    id: rule.id,
                    name: rule.name,
                    type: rule.type,
                    level: rule.level,
                    description: rule.desc,
                    stars: rule.stars
                });
            }
        } catch (e) {
            console.warn(`Pattern check failed for ${rule.name}`, e);
        }
    });
    
    // Sort by Level (Magnitude descending)
    return matched.sort((a, b) => Math.abs(b.level) - Math.abs(a.level));
};

export const calculateChart = (
    year: number, 
    month: number, 
    day: number, 
    hour: number, 
    gender: 'M' | 'F', 
    lng: number
): ChartData | null => {
    try {
        const offsetMinutes = (lng - 120) * 4;
        const baseDate = new Date(year, month - 1, day, hour, 0, 0);
        baseDate.setMinutes(baseDate.getMinutes() + offsetMinutes);
        
        const solar = Solar.fromDate(baseDate);
        const lunar = solar.getLunar();
        const baZiObj = lunar.getEightChar();
        const baZi = [baZiObj.getYear(), baZiObj.getMonth(), baZiObj.getDay(), baZiObj.getTime()];
        const monthNum = Math.abs(lunar.getMonth());
        
        const timeZhi = lunar.getTimeZhi() as typeof EARTHLY_BRANCHES[number];
        const timeZhiIndex = EARTHLY_BRANCHES.indexOf(timeZhi); 
        const yearGan = lunar.getYearGan() as typeof HEAVENLY_STEMS[number]; 
        const yearGanIndex = HEAVENLY_STEMS.indexOf(yearGan);
        const yearZhi = lunar.getYearZhi() as typeof EARTHLY_BRANCHES[number];
        const yearZhiIndex = EARTHLY_BRANCHES.indexOf(yearZhi);

        let mingIndex = ((2 + (monthNum - 1) - timeZhiIndex) % 12 + 12) % 12;
        let shenIndex = ((2 + (monthNum - 1) + timeZhiIndex) % 12 + 12) % 12;

        const palaces: Palace[] = Array(12).fill(null).map((_, i) => ({
            zhiIndex: i, 
            zhi: EARTHLY_BRANCHES[i], 
            stem: '', 
            name: '', 
            stars: { major: [], minor: [] },
            isMing: false, 
            isShen: false, 
            smallStars: [], 
            borrowed: false,
            changSheng: '',
            boShi: '',
            suiQian: '',
            daXian: '',
            siHuaTexts: []
        }));

        for (let i = 0; i < 12; i++) {
            const palaceIndex = (mingIndex - i + 12) % 12;
            palaces[palaceIndex].name = PALACE_NAMES[i];
            if (i === 0) palaces[palaceIndex].isMing = true;
        }
        palaces[shenIndex].isShen = true; 
        
        const tigerStemMap = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
        const startStem = (yearGanIndex >= 0 && yearGanIndex < tigerStemMap.length) ? tigerStemMap[yearGanIndex] : 0;
        for (let i = 0; i < 12; i++) {
            const currentZhi = (2 + i) % 12;
            const currentStem = (startStem + i) % 10;
            palaces[currentZhi].stem = HEAVENLY_STEMS[currentStem];
        }

        const mingPalace = palaces[mingIndex];
        const mingGanIndex = HEAVENLY_STEMS.indexOf(mingPalace.stem as any);
        const bureau = getBureau(mingGanIndex, mingPalace.zhiIndex);
        
        arrangeMainStarsComplete(lunar.getDay(), bureau.num, palaces);
        
        const placementSteps = [
            () => arrangeGanStars(yearGan, yearGanIndex, palaces),
            () => arrangeYearBranchStars(yearZhiIndex, timeZhiIndex, palaces),
            () => arrangeMonthStars(monthNum - 1, palaces),
            () => arrangeHourStars(timeZhiIndex, palaces),
            () => arrangeDayStars(lunar.getDay() - 1, palaces), 
            () => arrangeFixedStars(mingIndex, palaces),
            () => arrangeAdditionalStars(yearZhiIndex, palaces)
        ];

        placementSteps.forEach(step => {
            const newStars = step();
            newStars.forEach((item: any) => {
                if(!item.palace) return;
                const existing = [...item.palace.stars.major, ...item.palace.stars.minor].find(s => s.name === item.star);
                if(!existing) {
                    const brightness = EXTENDED_STAR_BRIGHTNESS[item.star] ? EXTENDED_STAR_BRIGHTNESS[item.star][item.palace.zhiIndex] : undefined;
                    item.palace.stars.minor.push({ name: item.star, type: item.type, brightness });
                }
            });
        });

        applyFourTransformationsComplete(palaces, yearGan);

        const isYangYear = yearGanIndex % 2 === 0; 
        const isMale = gender === 'M'; 
        const isClockwise = (isMale && isYangYear) || (!isMale && !isYangYear);
        let csStart = 8; 
        if (bureau.type === 'Wood') csStart = 11; 
        else if (bureau.type === 'Fire') csStart = 2; 
        else if (bureau.type === 'Gold') csStart = 5;
        
        for (let i = 0; i < 12; i++) {
            const offset = isClockwise ? i : -i; 
            const idx = (csStart + offset + 120) % 12; 
            const pIdx = palaces.findIndex(p => p.zhiIndex === idx); 
            if (pIdx !== -1) palaces[pIdx].changSheng = CHANG_SHENG[i];
        }

        let daXianStartAge = bureau.num;
        for (let i = 0; i < 12; i++) {
            const offset = isClockwise ? i : -i; 
            const idx = (mingIndex + offset + 120) % 12;
            const endAge = daXianStartAge + 9; 
            const pIdx = palaces.findIndex(p => p.zhiIndex === idx); 
            if (pIdx !== -1) palaces[pIdx].daXian = `${daXianStartAge}-${endAge}`; 
            daXianStartAge += 10;
        }

        const gridMapping = [ 5, 6, 7, 8, 4, null, null, 9, 3, null, null, 10, 2, 1, 0, 11 ];
        const finalGridMapping = gridMapping.map(zhiIdx => {
            if (zhiIdx === null) return null;
            return palaces.findIndex(p => p.zhiIndex === zhiIdx);
        });

        const currentSiHua = SI_HUA_TABLE[yearGan];
        const siHuaDisplay = [];
        if (currentSiHua) {
            const types = [ 
                { key: '禄', color: 'text-[#15803d]' }, 
                { key: '权', color: 'text-[#b91c1c]' }, 
                { key: '科', color: 'text-[#1d4ed8]' }, 
                { key: '忌', color: 'text-black' } 
            ];
            types.forEach(t => {
                const starName = Object.keys(currentSiHua).find(k => currentSiHua[k] === t.key);
                if (starName) { 
                    siHuaDisplay.push({ type: t.key, star: starName, color: t.color }); 
                }
            });
        }

        const patterns = calculatePatterns(palaces, mingIndex, yearGan);

        return { 
            palaces, 
            mingIndex, 
            shenIndex, 
            bureau, 
            solar, 
            lunar, 
            baZi, 
            gridMapping: finalGridMapping, 
            yearGan,
            siHuaDisplay,
            patterns 
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export const calculateDaXianAnalysis = (palaces: Palace[], currentYearGan: string, currentAge: number): DaXianResult | null => {
    const mingPalace = palaces.find(p => p.name === '命宫');
    if (!mingPalace) return null;
    
    const result: DaXianResult = { daXianAnalysis: [], currentDaXian: null };
    
    const parseDaXianRange = (rangeStr: string) => {
        if (!rangeStr) return { start: 0, end: 0 };
        const [start, end] = rangeStr.split('-').map(Number);
        return { start, end };
    };
    
    palaces.forEach(p => {
        const range = parseDaXianRange(p.daXian);
        if (currentAge >= range.start && currentAge <= range.end) {
            result.currentDaXian = { palace: p, range: p.daXian, ageRange: range };
        }
        
        if (p.daXian) {
            let analysis: DaXianAnalysisItem = { 
                range: p.daXian, 
                palace: p.name, 
                keyFeatures: [], 
                suggestions: [] 
            };
            if (p.stars.major.length > 0) {
                 analysis.keyFeatures.push(`主星：${p.stars.major.map(s => s.name).join('、')}`);
            }
            result.daXianAnalysis.push(analysis);
        }
    });
    
    return result;
};