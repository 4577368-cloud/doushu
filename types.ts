export type Gender = 'male' | 'female';

export interface AiReportRecord {
    id: string;
    date: number;
    content: string;
    type?: 'bazi' | 'ziwei'; // 新增：区分报告类型
}

export interface UserProfile {
  id: string;
  name: string;
  birthDate: string; 
  birthTime: string; 
  gender: Gender;
  isSolarTime: boolean;
  province?: string;
  city?: string;
  longitude?: number;
  createdAt: number;
  avatar?: string;
  tags?: string[];
  aiReports?: AiReportRecord[];
  lastUpdated?: number;
}

// 基础排盘接口保持不变
export interface GanZhi {
  gan: string;
  zhi: string;
  ganElement: string;
  zhiElement: string;
  hiddenStems: HiddenStem[];
  naYin: string;
  shiShenGan: string;
  lifeStage: string;
  selfLifeStage: string;
}

export interface HiddenStem {
  stem: string;
  type: string;
  powerPercentage: number;
  shiShen: string;
}

export interface Pillar {
  name: string;
  ganZhi: GanZhi;
  kongWang: boolean;
  shenSha: string[];
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
  dayMasterStrength: {
    score: number;
    level: string;
    description: string;
  };
  yongShen: string[];
  xiShen: string[];
  jiShen: string[];
  method: string;
  advice: string;
}

export interface PatternAnalysis {
  name: string;
  type: string;
  isEstablished: boolean;
  level: string;
  keyFactors: {
    beneficial: string[];
    destructive: string[];
  };
  description: string;
}

export interface AnnualFortune {
  year: number;
  ganZhi: GanZhi;
  rating: string;
  reasons: string[];
  score: number;
}

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
  balance: BalanceAnalysis;
  pattern: PatternAnalysis;
  originalTime?: string;
  solarTime?: string;
  solarTimeData?: { longitude: number; city: string };
  mangPai?: string[];
  godStrength?: any[];
  shenShaInteractions?: any[];
}

export enum AppTab {
  HOME = 'home',
  CHART = 'chart',
  ZIWEI = 'ziwei', // 新增：紫微入口
  ARCHIVE = 'archive'
}

export enum ChartSubTab {
  BASIC = 'basic',
  DETAIL = 'detail',
  ANALYSIS = 'analysis'
}

export interface ModalData {
  title: string;
  pillarName: string;
  ganZhi: GanZhi;
  shenSha: string[];
  kongWang?: boolean;
}

export interface InterpretationResult {
    title: string;
    content: string;
}

export interface TrendActivation {
    name: string;
    effect: string;
}

export interface GodStrength {
    god: string;
    strength: number;
}

export interface ShenShaInteraction {
    name: string;
    effect: string;
}
