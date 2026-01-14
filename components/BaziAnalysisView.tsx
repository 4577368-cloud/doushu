
import React, { useState } from 'react';
import { BaziChart, AnnualFortune, GanZhi } from '../types';
import { calculateAnnualFortune } from '../services/baziService';
import { History, Baby, TrendingUp, ChevronRight } from 'lucide-react';

interface BaziAnalysisViewProps {
  chart: BaziChart;
}

const ElementText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const map: Record<string, string> = {
    '甲': 'text-green-600', '乙': 'text-green-600', '寅': 'text-green-600', '卯': 'text-green-600',
    '丙': 'text-red-600', '丁': 'text-red-600', '巳': 'text-red-600', '午': 'text-red-600',
    '戊': 'text-amber-700', '己': 'text-amber-700', '辰': 'text-amber-700', '戌': 'text-amber-700', '丑': 'text-amber-700', '未': 'text-amber-700',
    '庚': 'text-orange-500', '辛': 'text-orange-500', '申': 'text-orange-500', '酉': 'text-orange-500',
    '壬': 'text-blue-600', '癸': 'text-blue-600', '亥': 'text-blue-600', '子': 'text-blue-600'
  };
  return <span className={`${map[text] || 'text-stone-800'} ${className}`}>{text}</span>;
};

export const BaziAnalysisView: React.FC<BaziAnalysisViewProps> = ({ chart }) => {
  const [analysisYear, setAnalysisYear] = useState(new Date().getFullYear());
  const fortune = calculateAnnualFortune(chart, analysisYear);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. 流年选择器 */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-amber-600" />
            <span className="font-bold text-stone-800">流年运势推演：{analysisYear}年</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            fortune.rating === '吉' ? 'bg-emerald-100 text-emerald-700' : 
            fortune.rating === '凶' ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-600'
          }`}>{fortune.rating}运</span>
        </div>
        <input 
          type="range" min="1950" max="2050" value={analysisYear} 
          onChange={e => setAnalysisYear(parseInt(e.target.value))} 
          className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-800"
        />
        <div className="flex justify-between text-[10px] text-stone-400 mt-1 font-sans">
          <span>1950</span><span>2000</span><span>2050</span>
        </div>
      </div>

      {/* 2. 流年精断 (找回丢失的断语) */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-5"><TrendingUp size={48}/></div>
        <h4 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
          {analysisYear} {fortune.ganZhi.gan}{fortune.ganZhi.zhi}年 · 详解
        </h4>
        <div className="space-y-3">
          {fortune.reasons.map((r, i) => (
            <div key={i} className="flex gap-2 items-start text-xs leading-relaxed text-stone-600">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <p dangerouslySetInnerHTML={{ __html: r.replace(/【(.*?)】/g, '<b class="text-stone-800">$1</b>') }} />
            </div>
          ))}
        </div>
      </div>

      {/* 3. 十年大运 (完整结构) */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="bg-stone-50 px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-stone-500" />
            <span className="font-bold text-stone-800 text-sm">十年大运巡航</span>
          </div>
          <span className="text-[10px] text-stone-400 font-sans">{chart.startLuckText}</span>
        </div>
        <div className="divide-y divide-stone-50">
          {chart.luckPillars.map((luck, idx) => {
            const isCurrent = analysisYear >= luck.startYear && analysisYear <= luck.endYear;
            return (
              <div key={idx} className={`p-4 flex items-center justify-between transition-colors ${isCurrent ? 'bg-amber-50/50' : 'hover:bg-stone-50/50'}`}>
                <div className="flex items-center gap-6">
                  <div className="text-center w-12 border-r border-stone-100 pr-4">
                    <div className="text-[10px] text-stone-400 mb-0.5 font-sans">{luck.startAge}岁</div>
                    <div className="text-xs font-bold text-stone-900 font-sans">{luck.startYear}</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1.5">
                      <div className="text-base font-serif font-bold">
                        <ElementText text={luck.ganZhi.gan} />
                        <ElementText text={luck.ganZhi.zhi} />
                      </div>
                      <span className="text-xs text-stone-500 font-medium">{luck.ganZhi.shiShenGan}运</span>
                    </div>
                    <span className="text-[10px] text-stone-400 italic mt-0.5">{luck.ganZhi.naYin}</span>
                  </div>
                </div>
                {isCurrent && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">现行大运</span>
                    <span className="text-[9px] text-amber-700 mt-1 font-medium">{luck.ganZhi.lifeStage}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 早年童运 (修复逻辑) */}
      {chart.xiaoYun && chart.xiaoYun.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="bg-stone-50 px-4 py-3 border-b flex items-center gap-2">
            <Baby size={18} className="text-stone-500" />
            <span className="font-bold text-stone-800 text-sm">起运前 · 童限运势</span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {chart.xiaoYun.map((xy, i) => (
              <div key={i} className="flex items-center justify-between bg-stone-50 p-2.5 rounded-xl border border-stone-100 hover:border-stone-200 transition-all">
                <span className="text-[10px] text-stone-400 font-sans">{xy.age}岁 ({xy.year})</span>
                <div className="flex gap-1 font-serif font-bold text-sm">
                  <ElementText text={xy.ganZhi.gan} />
                  <ElementText text={xy.ganZhi.zhi} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
