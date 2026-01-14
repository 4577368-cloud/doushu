
import React, { useState, useEffect, useRef } from 'react';
import { BottomNav, Header } from './components/Layout';
import { AppTab, ChartSubTab, UserProfile, BaziChart, Gender, ModalData, GanZhi, Pillar, LuckPillar, AnnualFortune, PatternAnalysis, BalanceAnalysis } from './types';
import { calculateBazi, getGanZhiForYear, calculateAnnualFortune, getShenShaForDynamicPillar } from './services/baziService';
import { analyzeBaziStructured, BaziReport } from './services/geminiService';
import { getArchives, saveArchive, deleteArchive, saveAiReportToArchive } from './services/storageService';
import { User, Activity, BrainCircuit, RotateCcw, Info, Stars, X, Key, Sparkles, Smile, Heart, Star, Sun, Moon, Flower2, Bird, Cat, Ghost, Crown, Trash2, MapPin, History, TrendingUp, Eye, EyeOff, FolderOpen, Compass, Search, Calendar, Clock, Check, ChevronRight, BarChart3, Quote, Briefcase, Zap, ShieldCheck, CheckCircle, Edit3, Save, FileText, LayoutList, ClipboardCopy, Map, InfoIcon } from 'lucide-react';
import { 
  interpretDayPillar, 
  interpretMonthPillar, 
  interpretYearPillar, 
  interpretHourPillar,
  interpretLuckPillar,
  interpretAnnualPillar
} from './services/baziService';
import { 
  HEAVENLY_STEMS, 
  EARTHLY_BRANCHES,
  CHINA_LOCATIONS,
  FIVE_ELEMENTS,
  NA_YIN_DESCRIPTIONS,
  LIFE_STAGE_DESCRIPTIONS,
  SHEN_SHA_DESCRIPTIONS,
  TEN_GODS_READING
} from './services/constants';

import ZiweiView from './components/ZiweiView';

// --- 基础渲染组件 ---
const ElementText: React.FC<{ text: string; className?: string; showFiveElement?: boolean }> = ({ text, className = '', showFiveElement = false }) => {
  if (!text) return null;
  const element = FIVE_ELEMENTS[text] || text;
  const colorMap: Record<string, string> = {
    '木': 'text-green-600', '火': 'text-red-600', '土': 'text-amber-700', '金': 'text-orange-500', '水': 'text-blue-600'
  };
  const colorClass = colorMap[element] || 'text-stone-800';
  
  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <span className={colorClass}>{text}</span>
      {showFiveElement && <span className={`text-[8px] scale-90 leading-none ${colorClass}`}>({element})</span>}
    </div>
  );
};

const ShenShaBadge: React.FC<{ name: string }> = ({ name }) => {
  const isAuspicious = ['天乙', '太极', '文昌', '福星', '天德', '月德', '禄', '将星', '金舆', '天厨'].some(k => name.includes(k));
  const isInauspicious = ['劫煞', '灾煞', '孤辰', '寡宿', '羊刃', '元辰', '亡神', '丧门', '吊客', '白虎', '地空', '地劫'].some(k => name.includes(k));
  const isPeach = ['桃花', '红艳', '咸池'].some(k => name.includes(k));
  let style = "bg-stone-100 text-stone-600 border-stone-200"; 
  if (isAuspicious) style = "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold";
  else if (isInauspicious) style = "bg-rose-50 text-rose-800 border-rose-200 font-bold";
  else if (isPeach) style = "bg-pink-50 text-pink-800 border-pink-200 font-bold";
  return <span className={`text-[8px] px-1 py-0.5 rounded border whitespace-nowrap leading-none ${style}`}>{name.length > 2 ? name.slice(0, 2) : name}</span>;
};

// --- 详情弹窗 ---
const DetailModal: React.FC<{ data: ModalData; chart: BaziChart | null; onClose: () => void }> = ({ data, chart, onClose }) => {
  if (!chart) return null;
  const interp = data.pillarName.includes('年') ? interpretYearPillar(chart) : 
                 data.pillarName.includes('月') ? interpretMonthPillar(chart) : 
                 data.pillarName.includes('日') ? interpretDayPillar(chart) : 
                 data.pillarName.includes('时') ? interpretHourPillar(chart) : 
                 data.title.includes('大运') ? interpretLuckPillar(chart, data.ganZhi) : interpretAnnualPillar(chart, data.ganZhi);

  const [copied, setCopied] = useState(false);

  const handleCopyText = () => {
    const textToCopy = interp?.integratedSummary || "";
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-200 animate-slide-up flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 bg-indigo-600 rounded-full" />
            <span className="text-sm font-black text-stone-900 uppercase tracking-widest">{data.pillarName}深度解析</span>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-950 transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          <div className="flex justify-center items-center gap-5 bg-stone-50 py-3 rounded-3xl border border-stone-100 shadow-inner shrink-0">
            <div className="flex flex-col items-center">
              <ElementText text={data.ganZhi.gan} className="text-3xl font-serif font-black" showFiveElement />
              <span className="text-[9px] mt-1 text-stone-400 font-bold uppercase">天干</span>
            </div>
            <div className="w-px h-10 bg-stone-200" />
            <div className="flex flex-col items-center">
              <ElementText text={data.ganZhi.zhi} className="text-3xl font-serif font-black" showFiveElement />
              <span className="text-[9px] mt-1 text-stone-400 font-bold uppercase">地支</span>
            </div>
            <div className="w-px h-10 bg-stone-200" />
            <div className="flex flex-col items-center justify-center text-center px-1">
              <span className="text-[11px] font-black text-indigo-700">{data.pillarName === '日柱' ? '日元' : data.ganZhi.shiShenGan}</span>
              <span className="text-[9px] text-stone-500 font-medium leading-tight">{data.ganZhi.naYin}</span>
              <span className={`text-[9px] font-bold px-1.5 rounded-full mt-0.5 ${data.ganZhi.lifeStage.includes('旺') ? 'bg-red-50 text-red-600' : 'bg-stone-200 text-stone-600'}`}>
                {data.ganZhi.lifeStage}
              </span>
            </div>
          </div>

          <div className="space-y-5">
            <section className="space-y-2">
              <div className="flex justify-between items-center">
                <h5 className="text-[11px] font-black text-emerald-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle size={12} /> 大师详断
                </h5>
                <button 
                  onClick={handleCopyText}
                  className={`flex items-center gap-1 text-[9px] font-bold transition-all px-2 py-1 rounded-full ${copied ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600'}`}
                >
                  {copied ? <><Check size={10}/> 已复制</> : <><ClipboardCopy size={10}/> 复制</>}
                </button>
              </div>
              <div className="text-[13px] text-stone-800 leading-relaxed whitespace-pre-wrap text-justify font-bold bg-emerald-50/20 p-4 rounded-2xl border border-emerald-100/50 shadow-sm italic">
                {interp?.integratedSummary}
              </div>
            </section>

            {data.shenSha.length > 0 && (
              <section className="space-y-2">
                <h5 className="text-[11px] font-black text-amber-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <Star size={12} /> 神煞加持
                </h5>
                <div className="grid grid-cols-1 gap-2">
                  {data.shenSha.map(s => (
                    <div key={s} className="flex gap-3 items-start p-3 bg-white border border-stone-100 rounded-xl hover:bg-amber-50/30 transition-colors">
                      <div className="shrink-0 pt-0.5"><ShenShaBadge name={s}/></div>
                      <p className="text-[11px] text-stone-600 leading-normal font-medium">{SHEN_SHA_DESCRIPTIONS[s] || "此星入命，主命局有特定之感应。"}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 五行强弱面板 ---
const BalancePanel: React.FC<{ balance: BalanceAnalysis; wuxing: Record<string, number>; dm: string }> = ({ balance, wuxing, dm }) => {
  const elements = ['木', '火', '土', '金', '水'];
  return (
    <div className="bg-white border border-stone-300 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2"><BarChart3 size={14} className="text-stone-600"/><span className="text-[10px] font-black text-stone-700 uppercase tracking-widest">能量均衡分析</span></div>
        <div className="px-2.5 py-0.5 bg-stone-900 text-white rounded-full text-[9px] font-black uppercase shadow-sm">日元 {dm} · {balance.dayMasterStrength.level}</div>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {elements.map(el => (
          <div key={el} className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl bg-stone-50 border border-stone-200 shadow-inner">
            <ElementText text={el} className="font-black text-[10px]" />
            <div className="text-[9px] font-black text-stone-800 bg-white px-1.5 rounded-full border border-stone-100">{wuxing[el] || 0}</div>
          </div>
        ))}
      </div>
      <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/50">
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5"><span className="text-[9px] font-black text-indigo-900 bg-indigo-100/50 px-1.5 py-0.5 rounded uppercase">喜用</span>{balance.yongShen.map(s => <span key={s} className="text-[11px] font-bold text-indigo-950 flex items-center gap-0.5"><div className="w-1 h-1 rounded-full bg-emerald-500"/>{s}</span>)}</div>
        <p className="text-[11px] text-indigo-900/80 leading-snug font-bold italic">“{balance.advice}”</p>
      </div>
    </div>
  );
};

// --- 八字主网格 ---
const BaziChartGrid: React.FC<{ chart: BaziChart; onOpenModal: any }> = ({ chart, onOpenModal }) => {
  const pillars = [
    { key: 'year', label: '年柱', data: chart.pillars.year },
    { key: 'month', label: '月柱', data: chart.pillars.month },
    { key: 'day', label: '日柱', data: chart.pillars.day },
    { key: 'hour', label: '时柱', data: chart.pillars.hour },
  ];

  const rows = [
    { label: '天干', render: (p: Pillar) => (
      <div onClick={() => onOpenModal(p.name, p.ganZhi, p.name, p.shenSha)} className="relative w-full h-full flex flex-col items-center justify-center pt-2 cursor-pointer group">
        <span className="absolute top-0.5 right-0.5 text-[8px] font-black text-indigo-600 scale-90">{p.name === '日柱' ? '日元' : p.ganZhi.shiShenGan}</span>
        <ElementText text={p.ganZhi.gan} className="text-2xl font-bold font-serif" showFiveElement />
      </div>
    )},
    { label: '地支', render: (p: Pillar) => (
      <div onClick={() => onOpenModal(p.name, p.ganZhi, p.name, p.shenSha)} className="flex flex-col items-center justify-center py-1 cursor-pointer">
        <ElementText text={p.ganZhi.zhi} className="text-2xl font-bold font-serif" showFiveElement />
      </div>
    )},
    { label: '星运', render: (p: Pillar) => <span className="text-[10px] font-black text-stone-900">{p.ganZhi.lifeStage}</span> },
    { label: '纳音', render: (p: Pillar) => <span className="text-[9px] text-stone-700 font-medium py-1 px-0.5 whitespace-nowrap">{p.ganZhi.naYin}</span> },
    { label: '神煞', render: (p: Pillar) => (<div className="flex flex-wrap justify-center gap-0.5 w-full px-0.5 min-h-[40px] content-start pt-1">{p.shenSha.slice(0, 3).map((s, i) => <ShenShaBadge key={i} name={s} />)}</div>) }
  ];

  return (
    <div className="bg-white border border-stone-300 rounded-2xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-5 bg-stone-100 border-b border-stone-300 text-center text-[9px] font-bold text-stone-700 uppercase tracking-wider py-1.5">
        <div className="border-r border-stone-300">项目</div>{pillars.map(p => <div key={p.key}>{p.label}</div>)}
      </div>
      {rows.map((row, idx) => (
        <div key={idx} className={`grid grid-cols-5 border-b border-stone-200 last:border-0 text-center items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/30'}`}>
          <div className="text-[9px] font-black text-stone-400 border-r border-stone-200 h-full flex items-center justify-center uppercase py-1">{row.label}</div>
          {pillars.map(p => <div key={p.key} className="flex flex-col items-center h-full justify-center">{row.render(p.data)}</div>)}
        </div>
      ))}
    </div>
  );
};

// --- 六柱联动网格 ---
const FortuneGrid: React.FC<{ chart: BaziChart; year: number; onOpenModal: any }> = ({ chart, year, onOpenModal }) => {
    const annualGz = getGanZhiForYear(year, chart.dayMaster);
    const luckIdx = chart.luckPillars.findIndex(l => year >= l.startYear && year <= l.endYear);
    const currentLuck = chart.luckPillars[luckIdx !== -1 ? luckIdx : 0];
    const pillars = [
        { title: '年柱', gz: chart.pillars.year.ganZhi, ss: chart.pillars.year.shenSha },
        { title: '月柱', gz: chart.pillars.month.ganZhi, ss: chart.pillars.month.shenSha },
        { title: '日柱', gz: chart.pillars.day.ganZhi, ss: chart.pillars.day.shenSha },
        { title: '时柱', gz: chart.pillars.hour.ganZhi, ss: chart.pillars.hour.shenSha },
        { title: '大运', gz: currentLuck.ganZhi, ss: getShenShaForDynamicPillar(currentLuck.ganZhi.gan, currentLuck.ganZhi.zhi, chart), highlight: 'text-indigo-600', dynamic: 'luck' },
        { title: '流年', gz: annualGz, ss: getShenShaForDynamicPillar(annualGz.gan, annualGz.zhi, chart), highlight: 'text-indigo-600', dynamic: 'year' }
    ];
    const rows = [
        { label: '天干', render: (p: any) => (
          <div className="relative w-full py-1 flex flex-col items-center cursor-pointer" onClick={() => onOpenModal(p.title, p.gz, p.title, p.ss)}>
            <span className="absolute top-0 right-0.5 text-[8px] font-black text-indigo-500">{p.title === '日柱' ? '日元' : p.gz.shiShenGan}</span>
            <ElementText text={p.gz.gan} className="text-xl font-black font-serif" showFiveElement />
          </div>
        )},
        { label: '地支', render: (p: any) => <div className="py-1 flex flex-col items-center cursor-pointer" onClick={() => onOpenModal(p.title, p.gz, p.title, p.ss)}><ElementText text={p.gz.zhi} className="text-xl font-black font-serif" showFiveElement /></div> },
        { label: '星运', render: (p: any) => <span className="text-[9px] font-black text-stone-900">{p.gz.lifeStage}</span> },
        { label: '藏干', render: (p: any) => (
          <div className="flex flex-col text-[8px] py-1 items-center gap-0.5">
            {p.gz.hiddenStems.map((h: any, i: number) => <div key={i} className={`flex items-center gap-0.5 ${h.type === '主气' ? 'font-black' : 'text-stone-400'}`}><ElementText text={h.stem} /><span>{h.shiShen}</span></div>)}
          </div>
        )},
        { label: '纳音', render: (p: any) => <span className="text-[8px] font-medium py-1 text-stone-500 whitespace-nowrap">{p.gz.naYin}</span> },
        { label: '神煞', render: (p: any) => <div className="flex flex-col gap-0.5 py-1 px-0.5 overflow-hidden min-h-[44px]">{p.ss.slice(0, 2).map((s: string, i: number) => <ShenShaBadge key={i} name={s} />)}</div> }
    ];
    return (
        <div className="bg-white border border-stone-300 rounded-3xl overflow-hidden shadow-md">
            <div className="grid grid-cols-7 divide-x divide-stone-200 bg-stone-100 border-b border-stone-300 text-center py-1.5 text-[9px] font-black text-stone-700 uppercase">
                <div className="bg-stone-100">项目</div>{pillars.map((p, i) => <div key={i} className={p.highlight ? `${p.highlight} font-black` : 'text-stone-700'}>{p.title}</div>)}
            </div>
            {rows.map((row, rIdx) => (
                <div key={rIdx} className={`grid grid-cols-7 divide-x divide-stone-200 border-b border-stone-200 last:border-0 items-center text-center ${rIdx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                    <div className="text-[9px] font-black text-stone-400 uppercase bg-stone-100/10 h-full flex items-center justify-center border-r border-stone-200 px-0.5">{row.label}</div>
                    {pillars.map((p, i) => (
                      <div key={i} className={`py-1 ${p.dynamic === 'luck' ? 'bg-indigo-50/20 border-l-[1.5px] border-indigo-400/30' : p.dynamic === 'year' ? 'bg-amber-50/20 border-l-[1.5px] border-amber-400/30' : ''}`}>
                        {row.render(p)}
                      </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

const BaziChartView: React.FC<{ profile: UserProfile; chart: BaziChart; onShowModal: any; onSaveReport: any; onAiAnalysis: any; loadingAi: boolean; aiReport: BaziReport | null }> = ({ profile, chart, onShowModal, onSaveReport, onAiAnalysis, loadingAi, aiReport }) => {
  const [activeSubTab, setActiveSubTab] = useState<ChartSubTab>(ChartSubTab.BASIC);
  const [analysisYear, setAnalysisYear] = useState(new Date().getFullYear());
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const fortune = calculateAnnualFortune(chart, analysisYear);
  const openDetailedModal = (title: string, gz: GanZhi, name: string, ss: string[]) => onShowModal({ title, pillarName: name, ganZhi: gz, shenSha: ss });

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex border-b border-stone-200 bg-white shadow-sm overflow-x-auto no-scrollbar">
        {[{id:ChartSubTab.BASIC,label:'八字命盘'},{id:ChartSubTab.DETAIL,label:'流年大运'},{id:ChartSubTab.ANALYSIS,label:'大师解盘'}].map(tab => (
           <button key={tab.id} onClick={() => setActiveSubTab(tab.id as ChartSubTab)} className={`flex-1 min-w-[80px] py-3 text-[11px] font-black border-b-2 transition-all ${activeSubTab === tab.id ? 'border-stone-950 text-stone-950' : 'border-transparent text-stone-500'}`}>{tab.label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto bg-[#f9f9f8] p-4 pb-24">
         {activeSubTab === ChartSubTab.BASIC && (
            <div className="space-y-4 animate-fade-in">
                <div className="bg-white border border-stone-300 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-stone-100 border-b border-stone-300 px-3 py-2 flex items-center justify-between"><div className="flex items-center gap-1.5"><Info size={14} className="text-stone-600" /><span className="font-black text-[10px] text-stone-700 uppercase tracking-wider">命盘核心</span></div><div className="text-[9px] font-black text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">{profile.birthDate}</div></div>
                    <div className="p-4 text-xs text-stone-800 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col items-center gap-0.5 bg-stone-50 p-2 rounded-xl border border-stone-200"><span className="text-[8px] text-stone-500 font-black">命宫</span><span className="font-black text-indigo-950 text-sm">{chart.mingGong}</span></div>
                            <div className="flex flex-col items-center gap-0.5 bg-stone-50 p-2 rounded-xl border border-stone-200"><span className="text-[8px] text-stone-500 font-black">身宫</span><span className="font-black text-teal-950 text-sm">{chart.shenGong}</span></div>
                            <div className="flex flex-col items-center gap-0.5 bg-stone-50 p-2 rounded-xl border border-stone-200"><span className="text-[8px] text-stone-500 font-black">胎元</span><span className="font-black text-rose-950 text-sm">{chart.taiYuan}</span></div>
                        </div>
                        <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-200 text-amber-950 font-black text-center text-[11px] tracking-wide">{chart.startLuckText}</div>
                    </div>
                </div>
                <BaziChartGrid chart={chart} onOpenModal={openDetailedModal} />
                <BalancePanel balance={chart.balance} wuxing={chart.wuxingCounts} dm={chart.dayMaster} />
            </div>
         )}
         {activeSubTab === ChartSubTab.DETAIL && (
             <div className="space-y-4 animate-fade-in">
                 <FortuneGrid chart={chart} year={analysisYear} onOpenModal={openDetailedModal} />
                 
                 <div className="bg-white rounded-2xl border border-stone-300 shadow-sm overflow-hidden">
                    <div className="bg-stone-100 px-4 py-1.5 border-b border-stone-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5"><History size={14} className="text-stone-700"/><span className="text-[9px] font-black text-stone-800 uppercase tracking-widest">大运巡航</span></div>
                      <div className={`px-2 py-0.5 rounded text-[8px] font-black ${fortune.rating === '吉' ? 'bg-emerald-100 text-emerald-700' : fortune.rating === '凶' ? 'bg-rose-100 text-rose-700' : 'bg-stone-200 text-stone-600'}`}>{analysisYear}年{fortune.rating}运</div>
                    </div>
                    <div className="flex overflow-x-auto no-scrollbar p-1.5 gap-2 bg-stone-50/30">
                        {chart.luckPillars.map((luck, idx) => {
                            const isCurrent = analysisYear >= luck.startYear && analysisYear <= luck.endYear;
                            return (
                                <button key={idx} onClick={() => setAnalysisYear(luck.startYear)} className={`flex-shrink-0 min-w-[60px] py-1.5 px-0.5 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-0.5 ${isCurrent ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-2 ring-indigo-100' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}>
                                    <span className={`text-[9px] font-black ${isCurrent ? 'text-white' : 'text-stone-950'}`}>{luck.startAge}岁</span>
                                    <div className="font-serif font-black text-xs flex gap-0.5 leading-none"><ElementText text={luck.ganZhi.gan} className={isCurrent?'text-white':''}/><ElementText text={luck.ganZhi.zhi} className={isCurrent?'text-white':''}/></div>
                                    <span className={`text-[7px] font-black ${isCurrent ? 'text-indigo-200' : 'text-stone-500'}`}>{luck.startYear}</span>
                                </button>
                            );
                        })}
                    </div>
                 </div>

                 <div className="bg-white p-3 rounded-2xl border border-stone-300 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-stone-950 flex items-center gap-1.5"><TrendingUp size={14} className="text-amber-600"/>流年选择 ({analysisYear})</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                        {(() => {
                            const luck = chart.luckPillars.find(l => analysisYear >= l.startYear && analysisYear <= l.endYear) || chart.luckPillars[0];
                            return Array.from({length: 10}).map((_, i) => {
                                const y = luck.startYear + i;
                                const gz = getGanZhiForYear(y, chart.dayMaster);
                                const isSel = analysisYear === y;
                                const fort = calculateAnnualFortune(chart, y);
                                return (
                                    <button key={y} onClick={()=>setAnalysisYear(y)} className={`py-1 rounded-lg border-2 text-center transition-all relative ${isSel ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm scale-105 z-10' : 'bg-white border-stone-200 text-stone-800 hover:border-stone-400'}`}>
                                        <div className="text-[7px] font-black mb-0.5 opacity-60">{y}</div>
                                        <div className="text-[10px] font-black font-serif leading-none">{gz.gan}{gz.zhi}</div>
                                        {fort.rating !== '平' && <div className={`absolute top-0.5 right-0.5 w-1 h-1 rounded-full border border-white ${fort.rating==='吉'?'bg-emerald-500':'bg-rose-500'}`} />}
                                    </button>
                                );
                            });
                        })()}
                    </div>
                 </div>

                 <div className={`p-4 rounded-2xl border-2 shadow-sm ${fortune.rating === '吉' ? 'bg-emerald-50/60 border-emerald-200' : fortune.rating === '凶' ? 'bg-rose-50/60 border-rose-200' : 'bg-stone-50 border-stone-300'}`}>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-black/5"><div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${fortune.rating === '吉' ? 'bg-emerald-600 text-white' : fortune.rating === '凶' ? 'bg-rose-600 text-white' : 'bg-stone-600 text-white'}`}><CheckCircle size={18}/></div><div><h4 className={`text-sm font-black ${fortune.rating === '吉' ? 'text-emerald-950' : fortune.rating === '凶' ? 'text-rose-950' : 'text-stone-950'}`}>{analysisYear} {fortune.rating}运详解</h4></div></div>
                    <div className="space-y-3">{fortune.reasons.map((r, i) => (<div key={i} className="flex gap-2.5 items-start group"><div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${fortune.rating === '吉' ? 'bg-emerald-500' : fortune.rating === '凶' ? 'bg-rose-500' : 'bg-stone-600'}`} /><p className={`text-[12px] leading-relaxed text-justify font-bold ${fortune.rating === '吉' ? 'text-emerald-950' : fortune.rating === '凶' ? 'text-rose-950' : 'text-stone-950'}`} dangerouslySetInnerHTML={{ __html: r.replace(/【(.*?)】/g, '<b class="bg-black/5 px-0.5 rounded">$1</b>') }} /></div>))}</div>
                 </div>
             </div>
         )}
         {activeSubTab === ChartSubTab.ANALYSIS && (
            <div className="space-y-4 animate-fade-in">
                <div className="bg-white border border-stone-300 p-5 rounded-2xl shadow-sm">
                    <div className="relative mb-4">
                        <input type={showApiKey?"text":"password"} value={apiKey} onChange={e => {setApiKey(e.target.value); localStorage.setItem('ai_api_key', e.target.value);}} placeholder="填入 API Key" className="w-full bg-stone-50 border border-stone-300 p-3 rounded-xl text-sm font-sans focus:border-stone-950 outline-none shadow-inner font-black text-stone-950"/>
                        <button onClick={()=>setShowApiKey(!showApiKey)} className="absolute right-3 top-3 text-stone-400">{showApiKey?<EyeOff size={18}/>:<Eye size={18}/>}</button>
                    </div>
                    <button onClick={onAiAnalysis} disabled={loadingAi || !apiKey} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${apiKey ? 'bg-stone-950 text-white active:scale-95 shadow-lg' : 'bg-stone-100 text-stone-400'}`}>
                      {loadingAi ? <Activity className="animate-spin" size={20}/> : <BrainCircuit size={20}/>} {loadingAi ? '解盘中，请稍候...' : '生成大师解盘报告'}
                    </button>
                 </div>
                 {aiReport && (
                     <div className="bg-white border border-stone-300 p-6 rounded-3xl space-y-6 shadow-sm">
                         <h3 className="font-serif font-black text-stone-950 text-lg border-b border-stone-100 pb-4 text-center">命运宏图 · 深度推演</h3>
                         <div className="space-y-6">
                            {aiReport.sections.map(s => (
                                <div key={s.id} className="space-y-2.5">
                                   <h4 className="font-black text-stone-950 text-[13px] flex items-center gap-2"><div className="w-1 h-3 bg-stone-950 rounded-full"/>{s.title}</h4>
                                   <div className="text-[13px] text-stone-800 leading-relaxed text-justify px-2.5 whitespace-pre-wrap border-l-2 border-stone-100 font-bold">
                                     {typeof s.content === 'string' ? s.content : JSON.stringify(s.content, null, 2)}
                                   </div>
                                </div>
                            ))}
                         </div>
                         <button onClick={() => {navigator.clipboard.writeText(aiReport.copyText); alert("报告已复制");}} className="w-full bg-stone-50 text-stone-700 py-3 rounded-xl text-[11px] font-black border border-stone-200 shadow-inner">一键保存报告文本</button>
                     </div>
                 )}
            </div>
         )}
      </div>
    </div>
  );
};

const HomeView: React.FC<{ onGenerate: (profile: UserProfile) => void; archives: UserProfile[]; }> = ({ onGenerate, archives }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [dateInput, setDateInput] = useState(''); 
  const [hourInput, setHourInput] = useState('12'); 
  const [isSolarTime, setIsSolarTime] = useState(false);
  const [province, setProvince] = useState('北京市');
  const [city, setCity] = useState('北京');
  const [longitude, setLongitude] = useState<number | undefined>(116.40);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const parseDateInput = (val: string) => {
    if (val.length !== 8) return null;
    const year = val.substring(0, 4), month = val.substring(4, 6), day = val.substring(6, 8);
    const y = parseInt(year), m = parseInt(month), d = parseInt(day);
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    return { formattedDate: `${year}-${month}-${day}`, display: `${year}年${month}月${day}日` };
  };

  const parsed = parseDateInput(dateInput);
  
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => { 
    const provName = e.target.value; setProvince(provName); 
    const provData = CHINA_LOCATIONS.find(p => p.name === provName);
    if (provData && provData.cities.length > 0) { 
      setCity(provData.cities[0].name); 
      setLongitude(provData.cities[0].longitude); 
    }
  };
  
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => { 
    const cityName = e.target.value; setCity(cityName); 
    const cityData = CHINA_LOCATIONS.find(p => p.name === province)?.cities.find(c => c.name === cityName); 
    if (cityData) setLongitude(cityData.longitude); 
  };
  
  const citiesForProvince = CHINA_LOCATIONS.find(p => p.name === province)?.cities || [];

  return (
    <div className="flex flex-col h-full bg-[#fafaf9] p-6 overflow-y-auto pb-24">
       <div className="text-center mb-8 mt-2">
         <div className="w-16 h-16 mx-auto mb-4 p-0.5 border border-stone-200 rounded-2xl shadow-lg bg-white flex items-center justify-center overflow-hidden">
           <img src="https://imgus.tangbuy.com/static/images/2026-01-10/631ac4d3602b4f508bb0cad516683714-176803435086117897846087613804795.png" className="w-full h-full object-cover" alt="Logo" />
         </div>
         <h2 className="text-2xl font-serif font-black text-stone-950 tracking-wider">玄枢命理</h2>
         <p className="text-[10px] text-stone-400 mt-1 tracking-[0.25em] uppercase font-sans font-bold">Ancient Wisdom · AI Insights</p>
       </div>
       
       <form onSubmit={e => { e.preventDefault(); if (!parsed) return; onGenerate({ id: Date.now().toString(), name: name || '访客', gender, birthDate: parsed.formattedDate, birthTime: `${hourInput.padStart(2, '0')}:00`, isSolarTime, province, city, longitude, createdAt: Date.now(), avatar: 'default' }); }} className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">姓名</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none font-serif focus:border-stone-400 text-sm shadow-sm transition-all" placeholder="请输入姓名"/>
            </div>
            <div className="w-28 space-y-1.5">
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">乾坤</label>
              <div className="flex bg-white border border-stone-200 p-1 rounded-xl shadow-sm h-[46px]">
                <button type="button" onClick={() => setGender('male')} className={`flex-1 rounded-lg text-[11px] font-black transition-all ${gender === 'male' ? 'bg-indigo-600 text-white shadow-md' : 'text-stone-400'}`}>乾</button>
                <button type="button" onClick={() => setGender('female')} className={`flex-1 rounded-lg text-[11px] font-black transition-all ${gender === 'female' ? 'bg-rose-600 text-white shadow-md' : 'text-stone-400'}`}>坤</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
             <div className="col-span-3 space-y-1.5">
               <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">生诞 (YYYYMMDD)</label>
               <div className="relative">
                 <input type="text" inputMode="numeric" maxLength={8} value={dateInput} onChange={e => setDateInput(e.target.value.replace(/\D/g, ''))} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none font-sans text-base tracking-widest focus:border-stone-400 shadow-sm" placeholder="19900101" />
                 <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300" />
               </div>
             </div>
             <div className="col-span-2 space-y-1.5">
               <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">时辰</label>
               <div className="relative">
                 <select value={hourInput} onChange={e => setHourInput(e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl px-3 py-3 outline-none font-sans text-base focus:border-stone-400 shadow-sm appearance-none">
                   {Array.from({length: 24}).map((_, i) => (<option key={i} value={i}>{i.toString().padStart(2, '0')} 时</option>))}
                 </select>
                 <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none" />
               </div>
             </div>
          </div>

          <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isSolarTime ? 'bg-white border-stone-300 shadow-md' : 'bg-stone-50/50 border-stone-100'}`}>
            <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setIsSolarTime(!isSolarTime)}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-colors ${isSolarTime ? 'bg-amber-100 text-amber-600' : 'bg-white text-stone-300 border border-stone-200'}`}>
                  <Sun size={18} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-[13px] font-bold ${isSolarTime ? 'text-stone-900' : 'text-stone-400'}`}>真太阳时校准</span>
                  <span className="text-[9px] text-stone-400 font-bold tracking-tight">根据出生地经度修正出生时间</span>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full p-0.5 transition-colors relative ${isSolarTime ? 'bg-amber-500' : 'bg-stone-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isSolarTime ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </div>
            
            {isSolarTime && (
              <div className="px-4 pb-5 pt-1 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">省份</label>
                  <div className="relative">
                    <select value={province} onChange={handleProvinceChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-none font-sans text-sm focus:border-amber-400 appearance-none">
                      {CHINA_LOCATIONS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                    <MapPin size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">城市</label>
                  <div className="relative">
                    <select value={city} onChange={handleCityChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-none font-sans text-sm focus:border-amber-400 appearance-none">
                      {citiesForProvince.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <Map size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4">
            <button type="submit" className="w-full h-14 bg-stone-950 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 group hover:bg-stone-800 transition-all active:scale-[0.98]">
              <Compass size={20} className="group-hover:rotate-180 transition-transform duration-700 text-amber-400" />
              <span className="text-base tracking-widest font-serif">开启命运推演</span>
            </button>
            <button type="button" onClick={() => setShowHistoryModal(true)} className="w-full h-14 bg-white border-2 border-stone-200 text-stone-700 font-black rounded-2xl flex items-center justify-center gap-2 text-sm hover:border-stone-400 transition-all shadow-sm">
              <History size={18} className="text-indigo-600" />
              <span>历史命盘</span>
            </button>
          </div>
       </form>

       {showHistoryModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={() => setShowHistoryModal(false)} />
              <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl flex flex-col max-h-[75vh] animate-slide-up">
                  <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                    <h3 className="font-black text-stone-900 text-base flex items-center gap-2"><History size={20}/> 快速调取命盘</h3>
                    <X onClick={() => setShowHistoryModal(false)} size={22} className="text-stone-400 cursor-pointer"/>
                  </div>
                  <div className="overflow-y-auto p-3 space-y-2">
                    {archives.length > 0 ? archives.map(p => (
                      <div key={p.id} onClick={() => {onGenerate(p); setShowHistoryModal(false);}} className="p-4 bg-stone-50 hover:bg-indigo-50 rounded-2xl cursor-pointer border border-stone-100 transition-all">
                        <div className="flex justify-between items-center">
                          <b className="text-stone-900 text-base">{p.name}</b>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.gender==='male'?'bg-indigo-100 text-indigo-700':'bg-rose-100 text-rose-700'}`}>{p.gender==='male'?'乾':'坤'}</span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1 font-sans">{p.birthDate} {p.birthTime}</p>
                      </div>
                    )) : <div className="text-center py-16 text-stone-300 text-sm italic font-serif">暂无历史缓存</div>}
                  </div>
              </div>
          </div>
       )}
    </div>
  );
};

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.HOME);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [baziChart, setBaziChart] = useState<BaziChart | null>(null);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [archives, setArchives] = useState<UserProfile[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiReport, setAiReport] = useState<BaziReport | null>(null);

  useEffect(() => { setArchives(getArchives()); }, []);

  const handleGenerate = (profile: UserProfile) => {
    try {
        const newBazi = calculateBazi(profile);
        const updatedArchives = saveArchive(profile);
        setArchives(updatedArchives);
        setCurrentProfile(profile);
        setBaziChart(newBazi);
        setCurrentTab(AppTab.CHART);
        setAiReport(null);
    } catch (e) { alert("排盘失败"); }
  };

  const handleAiAnalysis = async () => {
    const key = localStorage.getItem('ai_api_key');
    if (!key || !baziChart) return;
    setLoadingAi(true);
    try {
      const result = await analyzeBaziStructured(baziChart, key);
      setAiReport(result);
      if (currentProfile) {
        const updated = saveAiReportToArchive(currentProfile.id, result.copyText, 'bazi');
        setArchives(updated);
      }
    } catch (e) { 
      alert(e instanceof Error ? e.message : '分析过程出错'); 
    } finally { 
      setLoadingAi(false); 
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f4] overflow-hidden text-stone-950 font-sans select-none">
      <Header title={currentTab === AppTab.HOME ? '玄枢命理' : currentProfile?.name || '排盘'} rightAction={currentTab !== AppTab.HOME && <button onClick={()=>{setCurrentProfile(null);setCurrentTab(AppTab.HOME);setAiReport(null);}} className="p-2 hover:bg-stone-100 rounded-full transition-colors"><RotateCcw size={18} className="text-stone-700"/></button>}/>
      <div className="flex-1 overflow-hidden relative">
        {currentTab === AppTab.HOME ? <HomeView onGenerate={handleGenerate} archives={archives} /> : 
         currentTab === AppTab.CHART && baziChart && currentProfile ? <BaziChartView profile={currentProfile} chart={baziChart} onShowModal={setModalData} onSaveReport={(r:string, t:'bazi'|'ziwei')=>saveAiReportToArchive(currentProfile.id, r, t)} onAiAnalysis={handleAiAnalysis} loadingAi={loadingAi} aiReport={aiReport} /> :
         currentTab === AppTab.ZIWEI && currentProfile ? <ZiweiView profile={currentProfile} onSaveReport={(r)=>saveAiReportToArchive(currentProfile.id, r, 'ziwei')} /> : 
         currentTab === AppTab.ARCHIVE ? <ArchiveView archives={archives} setArchives={setArchives} onSelect={handleGenerate} /> :
         <HomeView onGenerate={handleGenerate} archives={archives} />}
      </div>
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      {modalData && <DetailModal data={modalData} chart={baziChart} onClose={() => setModalData(null)} />}
    </div>
  );
};

const ArchiveView: React.FC<{ archives: UserProfile[]; setArchives: any; onSelect: any }> = ({ archives, setArchives, onSelect }) => {
    const [viewingReports, setViewingReports] = useState<UserProfile | null>(null);
    return (
        <div className="h-full flex flex-col bg-[#f5f5f4] p-5 overflow-y-auto pb-24 space-y-4">
            {archives.map(p => (
                <div key={p.id} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <div><h3 className="font-black text-stone-950">{p.name}</h3><p className="text-[10px] text-stone-500">{p.birthDate} {p.birthTime}</p></div>
                        <div className="flex gap-2">
                           <button onClick={()=>onSelect(p)} className="p-2 bg-stone-950 text-white rounded-xl"><Compass size={16}/></button>
                           <button onClick={()=>{if(window.confirm("确定删除吗？")) setArchives(deleteArchive(p.id));}} className="p-2 text-rose-600 bg-rose-50 rounded-xl border border-rose-100"><Trash2 size={16}/></button>
                        </div>
                    </div>
                    <button onClick={()=>setViewingReports(p)} className="w-full py-2 bg-stone-50 text-stone-600 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5"><FileText size={14}/> 查看解盘记录 ({p.aiReports?.length || 0})</button>
                </div>
            ))}
            {viewingReports && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={() => setViewingReports(null)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-slide-up overflow-hidden">
                        <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                            <h3 className="font-black text-stone-950">{viewingReports.name} 的报告库</h3>
                            <X onClick={() => setViewingReports(null)} size={20} className="text-stone-400 cursor-pointer"/>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                            {viewingReports.aiReports?.length ? viewingReports.aiReports.map(r => (
                                <div key={r.id} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-2">
                                    <div className="flex justify-between items-center"><span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{r.type==='ziwei'?'紫微':'八字'}</span><span className="text-[9px] text-stone-400">{new Date(r.date).toLocaleString()}</span></div>
                                    <div className="text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap font-medium">
                                      {typeof r.content === 'string' ? r.content : JSON.stringify(r.content, null, 2)}
                                    </div>
                                    <button onClick={()=>{navigator.clipboard.writeText(String(r.content)); alert('已复制');}} className="w-full py-2 bg-stone-100 text-stone-700 rounded-xl text-[10px] font-bold">复制全文</button>
                                </div>
                            )) : <div className="text-center py-20 text-stone-300 italic">暂无记录</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
