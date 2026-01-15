import React from 'react';
import { BaziChart } from '../../types';
import { ElementText, ShenShaBadge, getLifeStageStyle } from '../ui/BaziUI';

export const BaziChartGrid: React.FC<{ chart: BaziChart; onOpenModal: any }> = ({ chart, onOpenModal }) => {
  const pillars = [
    { key: 'year', label: '年柱', data: chart.pillars.year },
    { key: 'month', label: '月柱', data: chart.pillars.month },
    { key: 'day', label: '日柱', data: chart.pillars.day },
    { key: 'hour', label: '时柱', data: chart.pillars.hour },
  ];

  return (
    <div className="bg-white border border-stone-300 rounded-3xl overflow-hidden shadow-sm mb-2">
      {/* 表头 */}
      <div className="grid grid-cols-5 bg-stone-100 border-b border-stone-300 text-center py-2 text-[10px] font-black text-stone-700 uppercase tracking-wider">
        <div className="bg-stone-100 flex items-center justify-center">四柱</div>
        {pillars.map(p => <div key={p.key}>{p.label}</div>)}
      </div>

      {/* 1. 天干 */}
      <div className="grid grid-cols-5 border-b border-stone-200 items-stretch min-h-[64px]">
        <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">天干</div>
        {pillars.map(p => (
          <div key={p.key} onClick={() => onOpenModal(p.label, p.data.ganZhi, p.data.name, p.data.shenSha)} className="relative w-full flex flex-col items-center justify-center py-2 cursor-pointer hover:bg-black/5 transition-colors border-l border-stone-200">
            <span className="absolute top-1 right-1 text-[8px] font-black text-indigo-400 scale-90">{p.data.name === '日柱' ? '日元' : p.data.ganZhi.shiShenGan}</span>
            <ElementText text={p.data.ganZhi.gan} className="text-2xl font-black font-serif" showFiveElement />
          </div>
        ))}
      </div>

      {/* 2. 地支 */}
      <div className="grid grid-cols-5 border-b border-stone-200 items-stretch min-h-[50px]">
        <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">地支</div>
        {pillars.map(p => (
          <div key={p.key} onClick={() => onOpenModal(p.label, p.data.ganZhi, p.data.name, p.data.shenSha)} className="flex flex-col items-center justify-center py-2 cursor-pointer hover:bg-black/5 transition-colors border-l border-stone-200">
            <ElementText text={p.data.ganZhi.zhi} className="text-2xl font-black font-serif" showFiveElement />
          </div>
        ))}
      </div>

      {/* 3. 藏干 */}
      <div className="grid grid-cols-5 border-b border-stone-200 items-stretch">
        <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">藏干</div>
        {pillars.map(p => (
          <div key={p.key} className="flex flex-col items-center justify-center py-2 gap-0.5 border-l border-stone-200">
            {p.data.ganZhi.hiddenStems.slice(0, 2).map((h, idx) => (
              <div key={idx} className="flex items-center gap-0.5 scale-90">
                <span className={`text-[10px] ${h.type==='主气'?'font-black':'text-stone-500'}`}>{h.stem}</span>
                <span className="text-[8px] text-stone-400">{h.shiShen}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 4. 星运 */}
      <div className="grid grid-cols-5 border-b border-stone-200 items-stretch min-h-[30px]">
        <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">星运</div>
        {pillars.map(p => {
          const styleClass = getLifeStageStyle(p.data.ganZhi.lifeStage);
          return (
            <div key={p.key} className="flex items-center justify-center py-1.5 border-l border-stone-200">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md leading-none ${styleClass}`}>{p.data.ganZhi.lifeStage}</span>
            </div>
          );
        })}
      </div>

      {/* 5. 神煞 */}
      <div className="grid grid-cols-5 border-b border-stone-200 items-stretch min-h-[40px]">
        <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">神煞</div>
        {pillars.map(p => (
          <div key={p.key} onClick={() => onOpenModal(p.label, p.data.ganZhi, p.data.name, p.data.shenSha)} className="flex flex-col items-center justify-start pt-2 px-0.5 gap-1 cursor-pointer hover:bg-black/5 transition-colors border-l border-stone-200">
            {p.data.shenSha.slice(0, 2).map((s, idx) => <ShenShaBadge key={idx} name={s} />)}
          </div>
        ))}
      </div>

      {/* 6. 纳音 */}
      <div className="grid grid-cols-5 items-stretch min-h-[30px]">
        <div className="bg-stone-50/50 text-stone-400 font-black text-[9px] flex items-center justify-center border-r border-stone-200">纳音</div>
        {pillars.map(p => (
          <div key={p.key} className="flex items-center justify-center py-1.5 border-l border-stone-200">
            <span className="text-[10px] text-stone-500 font-medium scale-95 whitespace-nowrap">{p.data.ganZhi.naYin}</span>
          </div>
        ))}
      </div>
    </div>
  );
};