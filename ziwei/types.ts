// ==========================================
// 1. 基础枚举与导航
// ==========================================

export type Gender = 'male' | 'female';

export enum AppTab {
  HOME = 'home',
  CHART = 'chart', // 八字排盘
  CHAT = 'chat',   // 🔥 AI 对话 (新一级入口)
  ZIWEI = 'ziwei', // 紫微斗数
  ARCHIVE = 'archive' // 档案管理
}

export enum ChartSubTab {
  BASIC = 'basic',
  DETAIL = 'detail',
  ANALYSIS = 'analysis'
}

// ==========================================
// 2. 用户档案与历史记录
// ==========================================

export interface UserProfile {
  id: string;
  name: string;
  gender: Gender;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  isSolarTime: boolean;
  province?: string;
  city?: string;
  longitude?: number; // 经度，用于真太阳时和紫微定盘
  tags?: string[];    // 标签：家人/客户/朋友
  createdAt?: number;
  aiReports?: HistoryItem[]; // 历史解盘记录
  avatar?: string;
  isSelf?: boolean;   // 🔥 标记是否为本人档案 (ArchiveView 置顶用)
}

export interface HistoryItem {
    id: string;
    date: number;
    content: string; // 可能是纯文本，也可能是 JSON 字符串
    type: 'bazi' | 'ziwei';
}

// ==========================================
// 3. 八字核心数据结构
// ==========================================

export interface GanZhi {
  gan: string;
  zhi: string;
  shiShenGan: string;     // 天干十神
  hiddenStems: { 
      stem: string; 
      shiShen: string; 
      type: '主气' | '中气' | '余气' 
  }[];
  naYin: string;          // 纳音
  lifeStage: string;      // 十二长生
}

export interface Pillar {
  ganZhi: GanZhi;
  shenSha: string[];      // 神煞列表
  name: string;           // 年柱/月柱/日柱/时柱
}

export interface BaziChart {
  profileId: string;
  gender: Gender;
  dayMaster: string;          // 日主天干 (如 '甲')
  dayMasterElement: string;   // 🔥 新增：日主五行 (如 '木') - AI分析需要
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  luckPillars: {
    startAge: number;
    startYear: number;
    endYear: number;
    ganZhi: GanZhi;
  }[];
  startLuckYear: number;      // 起运年份
  startLuckText: string;      // 起运描述 (如 "3岁起运")
  wuxingCounts: Record<string, number>; // 五行统计 {木: 2, 火: 1...}
  pattern: {
    name: string;             // 格局名称
    description: string;
  };
  balance: BalanceAnalysis;   // 强弱喜忌
  mingGong: string;           // 命宫 (GanZhi string)
  shenGong: string;           // 身宫 (GanZhi string)
  taiYuan: string;            // 胎元
}

export interface BalanceAnalysis {
  scores: Record<string, number>; // 五行分数
  dayMasterStrength: {
    score: number;
    level: string; // 身强/身弱/中和
  };
  yongShen: string[]; // 用神
  xiShen: string[];   // 喜神
  jiShen: string[];   // 忌神
  advice: string;     // 简短建议
}

// ==========================================
// 4. 紫微斗数核心结构 (适配 AiChatView)
// ==========================================

export interface Star {
    name: string;
    brightness?: string; // 庙旺利陷
    hua?: string;        // 禄权科忌
    type: 'major' | 'minor' | 'bad' | 'other';
}

export interface Palace {
    index: number;       // 0-11
    name: string;        // 命宫、兄弟宫...
    ganZhi: string;      // 宫位干支
    stars: {
        major: Star[];   // 主星
        minor: Star[];   // 辅星
        adhoc: Star[];   // 杂曜
    };
    isMing: boolean;     // 是否命宫
    isShen: boolean;     // 是否身宫
}

export interface ZiweiChart {
    palaces: Palace[];
    bureau: { name: string }; // 五行局 (如: 水二局)
    shenIndex: number;        // 身宫索引
    mingIndex: number;        // 命宫索引
}

// ==========================================
// 5. AI 报告与 UI 交互
// ==========================================

export interface ModalData {
  title: string;
  pillarName: string;
  ganZhi: GanZhi;
  shenSha: string[];
}

// 🔥 更新：适配 geminiService 的结构化返回
export interface BaziReportSection {
    id: string;
    title: string;
    content: string;
    type: 'text';
}

export interface BaziReport {
  title?: string;
  copyText: string; // 用于一键复制的纯文本
  // 兼容旧版 html 模式 (如果还有代码在用)
  html?: string;
  // 新版结构化模式
  sections?: BaziReportSection[];
}