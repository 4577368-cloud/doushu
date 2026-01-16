export type Gender = 'male' | 'female';

export enum AppTab {
  HOME = 'home',
  CHART = 'chart', // 八字
  CHAT = 'chat',   // 🔥 新增：对话
  ZIWEI = 'ziwei', // 紫微
  ARCHIVE = 'archive'
}

export enum ChartSubTab {
  BASIC = 'basic',
  DETAIL = 'detail',
  ANALYSIS = 'analysis',
  // CHAT = 'chat' // ❌ 移除这里的 CHAT，因为已经变成一级导航了
}

export interface UserProfile {
  id: string;
  name: string;
  gender: Gender;
  birthDate: string;
  birthTime: string;
  isSolarTime: boolean;
  province?: string;
  city?: string;
  longitude?: number;
  tags?: string[];
  createdAt?: number;
  aiReports?: HistoryItem[];
  avatar?: string;
  isSelf?: boolean; // 🔥 新增：标记是否为本人
}

export interface HistoryItem {
    id: string;
    date: number;
    content: string;
    type: 'bazi' | 'ziwei';
}

// ... (其他接口保持不变，为了节省篇幅省略，请保留原文件中的 BaziChart, GanZhi 等定义)
export interface GanZhi {
  gan: string;
  zhi: string;
  shiShenGan: string;
  hiddenStems: { stem: string; shiShen: string; type: string }[];
  naYin: string;
  lifeStage: string;
}

export interface Pillar {
  ganZhi: GanZhi;
  shenSha: string[];
  name: string;
}

export interface BaziChart {
  profileId: string;
  gender: Gender;
  dayMaster: string;
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
  startLuckYear: number;
  startLuckText: string;
  wuxingCounts: Record<string, number>;
  pattern: {
    name: string;
    description: string;
  };
  balance: BalanceAnalysis;
  mingGong: string;
  shenGong: string;
  taiYuan: string;
}

export interface BalanceAnalysis {
  scores: Record<string, number>;
  dayMasterStrength: {
    score: number;
    level: string;
  };
  yongShen: string[];
  xiShen: string[];
  jiShen: string[];
  advice: string;
}

export interface ModalData {
  title: string;
  pillarName: string;
  ganZhi: GanZhi;
  shenSha: string[];
}

export interface BaziReport {
  html: string;
  copyText: string;
}