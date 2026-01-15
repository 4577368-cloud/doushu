// src/components/BaziAnalysisView.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { BaziChart, GanZhi } from '../types'; // 注意路径可能需要调整为 ../../types
import { calculateAnnualFortune, interpretAnnualPillar, getGanZhiForYear, getShenShaForDynamicPillar } from '../services/baziService'; // 注意路径
import { Sparkles, CheckCircle, ClipboardCopy } from 'lucide-react';
import { ElementText } from './ui/BaziUI'; // 引用你的 UI 组件

// 定义 props 接口
interface BaziAnalysisViewProps {
  chart: BaziChart;
  onShowModal: (title: string, gz: any, name: string, ss: string[]) => void;
}

// Markdown 解析器 (如果你还没有把它移到 UI 库，可以暂时放这里)
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

// 六柱网格组件 (仅用于此视图)
const FortuneGrid: React.FC<{ chart: BaziChart; year: number; onShowModal: any }> = ({ chart, year, onShowModal }) => {
    const annualGz = getGanZhiForYear(year, chart.dayMaster);
    const luckIdx = chart.luckPillars.findIndex(l => year >= l.startYear && year <= l.endYear);
    const currentLuck = chart.luckPillars[luckIdx !== -1 ? luckIdx : 0] || chart.luckPillars[0];

    const pillars = [
        { title: '年柱', gz: chart.pillars.year.ganZhi, ss: chart.pillars.year.shenSha, type: 'static', name: '年柱' },
        { title: '月柱', gz: chart.pillars.month.ganZhi, ss: chart.pillars.month.shenSha, type: 'static', name: '月柱' },
        { title: '日柱', gz: chart.pillars.day.ganZhi, ss: chart.pillars.day.shenSha, type: 'static', name: '日柱' },
        { title: '时柱', gz: chart.pillars.hour.ganZhi, ss: chart.pillars.hour.shenSha, type: 'static', name: '时柱' },
        { title: '大运', gz: currentLuck.ganZhi, ss: getShenShaForDynamicPillar(currentLuck.ganZhi.gan, currentLuck.ganZhi.zhi, chart), type: 'luck', name: '大运', highlightClass: 'bg-indigo-50 border-x border-indigo-100' },
        { title: '流年', gz: annualGz, ss: getShenShaForDynamicPillar(annualGz.gan, annualGz.zhi, chart), type: 'year', name: '流年', highlightClass: 'bg-amber-50 border-x border-amber-100' }
    ];

    return (
        <div className="bg-white border border-stone-300 rounded-3xl overflow-hidden shadow-sm mb-4">
            <div className="grid grid-cols-7 border-b border-stone-300">
                 <div className="bg-stone-100 text-stone-500 font-black text-[10px] flex items-center justify-center uppercase tracking-wider py-2">六柱</div>
                 {pillars.map((p, i) => (
                     <div key={i} className={`flex items-center justify-center py-2 text-[11px] font-black ${p.highlightClass ? 'text-stone-900 ' + p.highlightClass : 'bg-stone-100 text-stone-600 border-l border-stone-200'}`}>{p.title}</div>
                 ))}
            </div>
            <div className="grid grid-cols-7 border-b border-stone-200 items-stretch min-h-[64px]">
                 <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">天干</div>
                 {pillars.map((p, i) => (
                     <div key={i} onClick={() => onShowModal(p.title + '详情', p.gz, p.name, p.ss)} className={`relative flex flex-col items-center justify-center py-2 cursor-pointer hover:bg-black/5 transition-colors ${p.highlightClass || 'border-l border-stone-200'}`}>
                         <span className="absolute top-1 right-1 text-[8px] font-black text-indigo-400 scale-90">{p.title === '日柱' ? '日元' : p.gz.shiShenGan}</span>
                         <ElementText text={p.gz.gan} className="text-2xl font-black font-serif" showFiveElement />
                     </div>
                 ))}
            </div>
            <div className="grid grid-cols-7 border-b border-stone-200 items-stretch min-h-[50px]">
                 <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">地支</div>
                 {pillars.map((p, i) => (
                     <div key={i} onClick={() => onShowModal(p.title + '详情', p.gz, p.name, p.ss)} className={`flex flex-col items-center justify-center py-2 cursor-pointer hover:bg-black/5 transition-colors ${p.highlightClass || 'border-l border-stone-200'}`}>
                         <ElementText text={p.gz.zhi} className="text-2xl font-black font-serif" showFiveElement />
                     </div>
                 ))}
            </div>
        </div>
    );
};

export const BaziAnalysisView: React.FC<BaziAnalysisViewProps> = ({ chart, onShowModal }) => {
  const [analysisYear, setAnalysisYear] = useState(new Date().getFullYear());
  const [selectedLuckStartYear, setSelectedLuckStartYear] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const luck = chart.luckPillars.find(l => currentYear >= l.startYear && currentYear <= l.endYear);
    if (luck) setSelectedLuckStartYear(luck.startYear);
  }, [chart]);

  const fortune = useMemo(() => calculateAnnualFortune(chart, analysisYear), [chart, analysisYear]);
  const interpretation = useMemo(() => interpretAnnualPillar(chart, fortune.ganZhi), [chart, fortune]);

  const currentLuckYears = useMemo(() => {
     if (!selectedLuckStartYear) return [];
     return Array.from({ length: 10 }, (_, i) => selectedLuckStartYear + i);
  }, [selectedLuckStartYear]);

  const handleLuckClick = (startYear: number) => {
    setSelectedLuckStartYear(startYear);
    if (analysisYear < startYear || analysisYear > startYear + 9) {
        setAnalysisYear(startYear);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <FortuneGrid chart={chart} year={analysisYear} onShowModal={onShowModal} />

      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-4">
         <div>
            <div className="flex items-center gap-1.5 mb-2"><div className="w-1 h-3 bg-indigo-600 rounded-full"/><span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">大运 (10年运程)</span></div>
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
                {chart.luckPillars.map((luck, idx) => {
                    const isSelected = selectedLuckStartYear === luck.startYear;
                    const isCurrentTime = new Date().getFullYear() >= luck.startYear && new Date().getFullYear() <= luck.endYear;
                    return (
                        <button key={idx} onClick={() => handleLuckClick(luck.startYear)} className={`flex-shrink-0 min-w-[70px] p-2 rounded-xl border transition-all flex flex-col items-center gap-1 relative overflow-hidden ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105' : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-indigo-300'}`}>
                            {isCurrentTime && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white" />}
                            <span className="text-[10px] font-black opacity-80">{luck.startAge}岁</span>
                            <div className="flex gap-0.5 text-sm font-serif font-black"><span>{luck.ganZhi.gan}</span><span>{luck.ganZhi.zhi}</span></div>
                        </button>
                    );
                })}
            </div>
         </div>

         <div className="pt-2 border-t border-stone-100">
             <div className="flex items-center gap-1.5 mb-2"><div className="w-1 h-3 bg-amber-500 rounded-full"/><span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">点击流年 (查看应事)</span></div>
             <div className="grid grid-cols-5 gap-2">
                {currentLuckYears.map(year => {
                    const isSelected = analysisYear === year;
                    const gz = getGanZhiForYear(year, chart.dayMaster);
                    return (
                        <button key={year} onClick={() => setAnalysisYear(year)} className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${isSelected ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-stone-200 text-stone-600 hover:bg-amber-50 hover:border-amber-200'}`}>
                            <span className="text-[10px] font-bold opacity-80 leading-none">{year}</span>
                            <span className="text-xs font-serif font-black leading-none">{gz.gan}{gz.zhi}</span>
                        </button>
                    );
                })}
             </div>
         </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none"><Sparkles size={120} /></div>
        <div className="bg-gradient-to-r from-amber-50 to-white px-5 py-4 border-b border-amber-100/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-6 rounded-full ${fortune.rating === '吉' ? 'bg-emerald-500' : fortune.rating === '凶' ? 'bg-rose-500' : 'bg-stone-400'}`} />
                <h4 className="text-base font-bold text-amber-900 flex items-center gap-2 font-serif">{analysisYear}年运程 · <span className={fortune.rating==='吉'?'text-emerald-600':fortune.rating==='凶'?'text-rose-600':'text-stone-600'}>{fortune.rating}</span></h4>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(interpretation.integratedSummary); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`p-2 rounded-full transition-colors ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-stone-200 text-stone-400 hover:text-stone-700'}`}>{copied ? <CheckCircle size={16}/> : <ClipboardCopy size={16}/>}</button>
        </div>
        <div className="p-5"><MarkdownParser content={interpretation.integratedSummary} /></div>
      </div>
    </div>
  );
};