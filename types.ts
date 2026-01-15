export type Gender = 'male' | 'female';

export interface GanZhi {
  gan: string;
  zhi: string;
  ganElement: string;
  zhiElement: string;
  hiddenStems: { stem: string; type: string; powerPercentage: number; shiShen: string }[];
  naYin: string;
  shiShenGan: string;     // 天干十神
  lifeStage: string;      // 十二长生
  selfLifeStage?: string; // 自坐长生
}

export interface Pillar {
  name: string;
  ganZhi: GanZhi;
  shenSha: string[];
  kongWang?: boolean;
}

export interface LuckPillar {
  index: number;
  startAge: number;
  startYear: number;
  endYear: number;
  ganZhi: GanZhi;
}

export interface XiaoYun {
  age: number;
  year: number;
  ganZhi: GanZhi;
}

export interface BalanceAnalysis {
  dayMasterStrength: { score: number; level: string; description: string };
  yongShen: string[];
  xiShen: string[];
  jiShen: string[];
  method: string;
  advice: string;
}

export interface PatternAnalysis {
  name: string;
  type: string; // 正格/外格
  isEstablished: boolean;
  level: string; // 上/中/下等
  keyFactors: { beneficial: string[]; destructive: string[] };
  description: string;
}

export interface BaziChart {
  profileId: string;
  gender: Gender;
  dayMaster: string;
  dayMasterElement: string;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  mingGong: string;
  shenGong: string;
  taiYuan: string;
  taiXi: string;
  wuxingCounts: Record<string, number>;
  luckPillars: LuckPillar[];
  xiaoYun: XiaoYun[];
  startLuckText: string;
  godStrength: any[]; // 暂简略
  shenShaInteractions: any[];
  balance: BalanceAnalysis;
  pattern: PatternAnalysis;
  originalTime?: string;
  mangPai?: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  gender: Gender;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  isSolarTime: boolean;
  province?: string;
  city?: string;
  longitude?: number;
  createdAt: number;
  avatar?: string;
  tags?: string[]; 
  aiReports?: { id: string; date: number; content: string; type: 'bazi' | 'ziwei' }[];
}

export interface ModalData {
  title: string;
  pillarName: string;
  ganZhi: GanZhi;
  shenSha: string[];
}

export enum AppTab {
  HOME = 'home',
  CHART = 'chart',
  ZIWEI = 'ziwei',
  ARCHIVE = 'archive'
}

export enum ChartSubTab {
  BASIC = 'basic',
  DETAIL = 'detail',
  ANALYSIS = 'analysis',
  CHAT = 'chat'
}

export interface AnnualFortune {
  year: number;
  ganZhi: GanZhi;
  rating: '吉' | '凶' | '平';
  reasons: string[];
  score: number;
}

export interface BaziReport {
  overall: string;
  career: string;
  wealth: string;
  love: string;
  health: string;
  advice: string;
  luckyElements: string[];
  copyText: string;
  sections: { id: string; title: string; content: string }[];
}

// 占位接口
export interface HiddenStem {
  stem: string;
  type: '主气' | '中气' | '余气';
}
export interface GodStrength {}
export interface TrendActivation {}
export interface ShenShaInteraction {}
export interface InterpretationResult {}
export interface PillarInterpretation {
    pillarName: string;
    coreSymbolism: string;
    hiddenDynamics: string;
    naYinInfluence: string;
    lifeStageEffect: string;
    shenShaEffects: string[];
    roleInDestiny: string;
    integratedSummary: string;
}

// Ziwei placeholder types to satisfy main App imports if needed
export interface HistoryItem {
  id: string;
  birthData: any;
  generatedAt: number;
  content: string;
}