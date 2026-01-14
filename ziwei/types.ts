// ==========================================
// 核心数据结构 (Core Data Structures)
// ==========================================

export interface Star {
    name: string;
    hua?: '禄' | '权' | '科' | '忌' | null;
    brightness?: string;
    type?: string;
    isBorrowed?: boolean;
}

export interface SiHuaDetail {
    star: string;
    hua: string;
    starDesc: string;
    palaceDesc: string;
}

export interface Palace {
    zhiIndex: number;
    zhi: string;
    stem: string;
    name: string;
    stars: {
        major: Star[];
        minor: Star[];
    };
    isMing: boolean;
    isShen: boolean;
    smallStars: any[];
    borrowed: boolean;
    changSheng: string;
    boShi: string;
    suiQian: string;
    daXian: string;
    siHuaTexts: SiHuaDetail[];
}

export interface Bureau {
    name: string;
    num: number;
    type: string;
}

export interface Pattern {
    id: string;
    name: string;
    type: string; // '吉' | '大吉' | '凶' | '大凶' | '特殊' | '平'
    level: number;
    description: string;
    stars: string[];
}

export interface ChartData {
    palaces: Palace[];
    mingIndex: number;
    shenIndex: number;
    bureau: Bureau;
    solar: any; // from lunar-javascript
    lunar: any; // from lunar-javascript
    baZi: string[];
    gridMapping: (number | null)[];
    yearGan: string;
    siHuaDisplay: Array<{ type: string; star: string; color: string }>;
    patterns: Pattern[];
}

export interface DaXianAnalysisItem {
    range: string;
    palace: string;
    keyFeatures: string[];
    suggestions: string[];
}

export interface DaXianResult {
    daXianAnalysis: DaXianAnalysisItem[];
    currentDaXian: { palace: Palace; range: string; ageRange: { start: number; end: number } } | null;
}

export interface AiAnalysisData {
    palaces: Record<string, { content: string }>;
    siHua: Array<{ title: string; content: string; desc: string }>;
    daXian: Array<{ range: string; palace: string; note: string }>;
}

export interface HistoryItem {
  id: string;
  birthData: {
    year: number;
    month: number;
    day: number;
    hour: number;
    gender: 'M' | 'F';
    city: string;
    lng: number;
  };
  generatedAt: number;
  content: string;
}

// ==========================================
// 四化与策略规则 (新增部分)
// ==========================================

// 用于 src/data/sihua.ts
export interface SiHuaRule {
  starNature: string;       // 星曜类别
  starDomain: string;       // 星曜主司领域
  huaEffect: string;        // 四化带来的转变
  beforeHua: string;        // 化前状态
  afterHua: string;         // 化后状态
  palaceTheme: string;      // 宫位主题
  applicationArea: string;  // 应用场景
  huaNature: '吉' | '中性偏吉' | '中性' | '中性偏凶' | '凶' | '大吉' | '大凶';
  overallMeaning: string;   // 综合含义
  do: string;               // 宜做什么
  dont: string;             // 忌做什么
  sensitivePeriod: string;  // 敏感时期
}

// 用于 src/data/interpretation.ts
export interface StrategySection {
    emoji: string;
    title: string;
    content: string;
}

export interface DaXianStrategy {
    theme: string;
    sections: StrategySection[];
}