import React, { useState, useMemo, useEffect } from 'react';
import { BaziChart, GanZhi, ModalData } from '../types';
import { calculateAnnualFortune, interpretAnnualPillar, getGanZhiForYear, getShenShaForDynamicPillar } from '../services/baziService';
import { FIVE_ELEMENTS, SHEN_SHA_DESCRIPTIONS, HEAVENLY_STEMS, EARTHLY_BRANCHES } from '../services/constants';
import { Sparkles, CheckCircle, ClipboardCopy, Star, History, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface BaziAnalysisViewProps {
  chart: BaziChart;
  onShowModal: (title: string, gz: GanZhi, name: string, ss: string[]) => void;
}

// --- 1. 基础 UI 组件 ---
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

// --- 星运颜色辅助函数 ---
const getLifeStageStyle = (stage: string) => {
  if (['帝旺', '临官'].includes(stage)) return 'text-rose-600 bg-rose-50 border border-rose-100'; // 极强
  if (['长生', '冠带'].includes(stage)) return 'text-amber-600 bg-amber-50 border border-amber-100'; // 强
  if (['胎', '养'].includes(stage)) return 'text-emerald-600 bg-emerald-50 border border-emerald-100'; // 进气
  if (['沐浴'].includes(stage)) return 'text-pink-500 bg-pink-50 border border-pink-100'; // 桃花
  return 'text-stone-400 bg-stone-50 border border-stone-100'; // 弱
};

const MarkdownParser: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  const lines = content.split('\n').filter(line => line.trim() !== '');
  return (
    <div className="space-y-2 text-sm text-stone-600 leading-relaxed">
      {lines.map((line, idx) => {
        const isHeader = line.match(/^(\p{Emoji}|🎯|⚡|🌊|🌟)/u);
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={idx} className={`${isHeader ? 'mt-3 font-bold text-stone-800 bg-stone-50 p-2 rounded-lg' : 'pl-1'}`}>
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <b key={i} className="text-amber-700 mx-1">{part.slice(2, -2)}</b>;
              }
              return part;
            })}
          </div>
        );
      })}
    </div>
  );
};

// --- 2. 六柱网格组件 ---
const FortuneGrid: React.FC<{ chart: BaziChart; year: number; onShowModal: any }> = ({ chart, year, onShowModal }) => {
    const annualGz = getGanZhiForYear(year, chart.dayMaster);
    // 找到当前年份对应的大运
    const luckIdx = chart.luckPillars.findIndex(l => year >= l.startYear && year <= l.endYear);
    const currentLuck = chart.luckPillars[luckIdx !== -1 ? luckIdx : 0] || chart.luckPillars[0];

    const pillars = [
        { title: '年柱', gz: chart.pillars.year.ganZhi, ss: chart.pillars.year.shenSha, type: 'static', name: '年柱' },
        { title: '月柱', gz: chart.pillars.month.ganZhi, ss: chart.pillars.month.shenSha, type: 'static', name: '月柱' },
        { title: '日柱', gz: chart.pillars.day.ganZhi, ss: chart.pillars.day.shenSha, type: 'static', name: '日柱' },
        { title: '时柱', gz: chart.pillars.hour.ganZhi, ss: chart.pillars.hour.shenSha, type: 'static', name: '时柱' },
        { 
          title: '大运', 
          gz: currentLuck.ganZhi, 
          ss: getShenShaForDynamicPillar(currentLuck.ganZhi.gan, currentLuck.ganZhi.zhi, chart), 
          type: 'luck',
          name: '大运',
          highlightClass: 'bg-indigo-50 border-x border-indigo-100'
        },
        { 
          title: '流年', 
          gz: annualGz, 
          ss: getShenShaForDynamicPillar(annualGz.gan, annualGz.zhi, chart), 
          type: 'year',
          name: '流年',
          highlightClass: 'bg-amber-50 border-x border-amber-100'
        }
    ];

    return (
        <div className="bg-white border border-stone-300 rounded-3xl overflow-hidden shadow-sm mb-4">
            {/* 0. 表头 */}
            <div className="grid grid-cols-7 border-b border-stone-300">
                 <div className="bg-stone-100 text-stone-500 font-black text-[10px] flex items-center justify-center uppercase tracking-wider py-2">六柱</div>
                 {pillars.map((p, i) => (
                     <div key={i} className={`flex items-center justify-center py-2 text-[11px] font-black ${p.highlightClass ? 'text-stone-900 ' + p.highlightClass : 'bg-stone-100 text-stone-600 border-l border-stone-200'}`}>
                         {p.title}
                     </div>
                 ))}
            </div>

            {/* 1. 天干 */}
            <div className="grid grid-cols-7 border-b border-stone-200 items-stretch min-h-[64px]">
                 <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">天干</div>
                 {pillars.map((p, i) => (
                     <div 
                        key={i} 
                        onClick={() => onShowModal(p.title + '详情', p.gz, p.name, p.ss)}
                        className={`relative flex flex-col items-center justify-center py-2 cursor-pointer hover:bg-black/5 transition-colors ${p.highlightClass || 'border-l border-stone-200'}`}
                     >
                         <span className="absolute top-1 right-1 text-[8px] font-black text-indigo-400 scale-90">{p.title === '日柱' ? '日元' : p.gz.shiShenGan}</span>
                         <ElementText text={p.gz.gan} className="text-2xl font-black font-serif" showFiveElement />
                     </div>
                 ))}
            </div>

            {/* 2. 地支 */}
            <div className="grid grid-cols-7 border-b border-stone-200 items-stretch min-h-[50px]">
                 <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">地支</div>
                 {pillars.map((p, i) => (
                     <div 
                        key={i} 
                        onClick={() => onShowModal(p.title + '详情', p.gz, p.name, p.ss)}
                        className={`flex flex-col items-center justify-center py-2 cursor-pointer hover:bg-black/5 transition-colors ${p.highlightClass || 'border-l border-stone-200'}`}
                     >
                         <ElementText text={p.gz.zhi} className="text-2xl font-black font-serif" showFiveElement />
                     </div>
                 ))}
            </div>
            
            {/* 3. 藏干 */}
             <div className="grid grid-cols-7 border-b border-stone-200 items-stretch">
                 <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">藏干</div>
                 {pillars.map((p, i) => (
                     <div key={i} className={`flex flex-col items-center justify-center py-2 gap-0.5 ${p.highlightClass || 'border-l border-stone-200'}`}>
                         {p.gz.hiddenStems.slice(0, 2).map((h, idx) => (
                             <div key={idx} className="flex items-center gap-0.5 scale-90">
                                 <span className={`text-[10px] ${h.type==='主气'?'font-black':'text-stone-500'}`}>{h.stem}</span>
                                 <span className="text-[8px] text-stone-400">{h.shiShen}</span>
                             </div>
                         ))}
                     </div>
                 ))}
            </div>

            {/* 4. 星运 (视觉强化版) */}
            <div className="grid grid-cols-7 border-b border-stone-200 items-stretch min-h-[30px]">
                 <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">星运</div>
                 {pillars.map((p, i) => {
                     const styleClass = getLifeStageStyle(p.gz.lifeStage);
                     return (
                        <div key={i} className={`flex items-center justify-center py-1.5 ${p.highlightClass || 'border-l border-stone-200'}`}>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md leading-none ${styleClass}`}>{p.gz.lifeStage}</span>
                        </div>
                     );
                 })}
            </div>

            {/* 5. 神煞 */}
            <div className="grid grid-cols-7 border-b border-stone-200 items-stretch min-h-[40px]">
                 <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">神煞</div>
                 {pillars.map((p, i) => (
                     <div 
                        key={i} 
                        onClick={() => onShowModal(p.title + '神煞', p.gz, p.name, p.ss)}
                        className={`flex flex-col items-center justify-start pt-2 px-0.5 gap-1 cursor-pointer hover:bg-black/5 transition-colors ${p.highlightClass || 'border-l border-stone-200'}`}
                     >
                         {p.ss.slice(0, 2).map((s, idx) => <ShenShaBadge key={idx} name={s} />)}
                     </div>
                 ))}
            </div>

            {/* 6. 纳音 (移至最后) */}
            <div className="grid grid-cols-7 items-stretch min-h-[30px]">
                 <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">纳音</div>
                 {pillars.map((p, i) => (
                     <div key={i} className={`flex items-center justify-center py-1.5 ${p.highlightClass || 'border-l border-stone-200'}`}>
                         <span className="text-[10px] text-stone-500 font-medium scale-95 whitespace-nowrap">{p.gz.naYin}</span>
                     </div>
                 ))}
            </div>
        </div>
    );
};

// --- 3. 主视图组件 ---
export const BaziAnalysisView: React.FC<BaziAnalysisViewProps> = ({ chart, onShowModal }) => {
  const [analysisYear, setAnalysisYear] = useState(new Date().getFullYear());
  const [selectedLuckStartYear, setSelectedLuckStartYear] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // 初始化：定位到当前流年所在的大运
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const luck = chart.luckPillars.find(l => currentYear >= l.startYear && currentYear <= l.endYear);
    if (luck) setSelectedLuckStartYear(luck.startYear);
  }, [chart]);

  const fortune = useMemo(() => calculateAnnualFortune(chart, analysisYear), [chart, analysisYear]);
  const interpretation = useMemo(() => interpretAnnualPillar(chart, fortune.ganZhi), [chart, fortune]);

  // 获取当前选中大运的10年列表
  const currentLuckYears = useMemo(() => {
     if (!selectedLuckStartYear) return [];
     return Array.from({ length: 10 }, (_, i) => selectedLuckStartYear + i);
  }, [selectedLuckStartYear]);

  // 处理大运点击
  const handleLuckClick = (startYear: number) => {
    setSelectedLuckStartYear(startYear);
    // 切换大运时，默认选中该大运的第一年，或者如果当前选中的年份在该大运内则保持不变
    if (analysisYear < startYear || analysisYear > startYear + 9) {
        setAnalysisYear(startYear);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      
      {/* 1. 顶部：六柱网格 (传入 onShowModal) */}
      <FortuneGrid chart={chart} year={analysisYear} onShowModal={onShowModal} />

      {/* 2. 控制区：二级联动导航 */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-4">
         {/* 第一级：大运选择 */}
         <div>
            <div className="flex items-center gap-1.5 mb-2">
                 <div className="w-1 h-3 bg-indigo-600 rounded-full"/>
                 <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">大运 (10年运程)</span>
            </div>
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
                {chart.luckPillars.map((luck, idx) => {
                    const isSelected = selectedLuckStartYear === luck.startYear;
                    const isCurrentTime = new Date().getFullYear() >= luck.startYear && new Date().getFullYear() <= luck.endYear;
                    
                    return (
                        <button 
                            key={idx} 
                            onClick={() => handleLuckClick(luck.startYear)}
                            className={`flex-shrink-0 min-w-[70px] p-2 rounded-xl border transition-all flex flex-col items-center gap-1 relative overflow-hidden ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105' : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-indigo-300'}`}
                        >
                            {isCurrentTime && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white" />}
                            <span className="text-[10px] font-black opacity-80">{luck.startAge}岁</span>
                            <div className="flex gap-0.5 text-sm font-serif font-black">
                                <span>{luck.ganZhi.gan}</span>
                                <span>{luck.ganZhi.zhi}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
         </div>

         {/* 第二级：流年选择 (展示当前大运下的10年) */}
         <div className="pt-2 border-t border-stone-100">
             <div className="flex items-center gap-1.5 mb-2">
                 <div className="w-1 h-3 bg-amber-500 rounded-full"/>
                 <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">点击流年 (查看应事)</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
                {currentLuckYears.map(year => {
                    const isSelected = analysisYear === year;
                    const gz = getGanZhiForYear(year, chart.dayMaster);
                    return (
                        <button 
                            key={year}
                            onClick={() => setAnalysisYear(year)}
                            className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${isSelected ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-stone-200 text-stone-600 hover:bg-amber-50 hover:border-amber-200'}`}
                        >
                            <span className="text-[10px] font-bold opacity-80 leading-none">{year}</span>
                            <span className="text-xs font-serif font-black leading-none">{gz.gan}{gz.zhi}</span>
                        </button>
                    );
                })}
            </div>
         </div>
      </div>

      {/* 3. 核心：深度详解卡片 */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
          <Sparkles size={120} />
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-white px-5 py-4 border-b border-amber-100/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-6 rounded-full ${fortune.rating === '吉' ? 'bg-emerald-500' : fortune.rating === '凶' ? 'bg-rose-500' : 'bg-stone-400'}`} />
                <div>
                    <h4 className="text-base font-bold text-amber-900 flex items-center gap-2 font-serif">
                    {analysisYear}年运程 · <span className={fortune.rating==='吉'?'text-emerald-600':fortune.rating==='凶'?'text-rose-600':'text-stone-600'}>{fortune.rating}</span>
                    </h4>
                </div>
            </div>
            <button 
                onClick={() => { navigator.clipboard.writeText(interpretation.integratedSummary); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className={`p-2 rounded-full transition-colors ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-stone-200 text-stone-400 hover:text-stone-700'}`}
            >
                {copied ? <CheckCircle size={16}/> : <ClipboardCopy size={16}/>}
            </button>
        </div>

        <div className="p-5">
            <MarkdownParser content={interpretation.integratedSummary} />
        </div>
      </div>

    </div>
  );
};