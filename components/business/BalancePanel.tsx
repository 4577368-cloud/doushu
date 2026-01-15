import React from 'react';
import { BarChart3 } from 'lucide-react';
import { BalanceAnalysis } from '../../types';
import { ElementText } from '../ui/BaziUI';

export const BalancePanel: React.FC<{ balance: BalanceAnalysis; wuxing: Record<string, number>; dm: string }> = ({ balance, wuxing, dm }) => {
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
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          <span className="text-[9px] font-black text-indigo-900 bg-indigo-100/50 px-1.5 py-0.5 rounded uppercase">喜用</span>
          {balance.yongShen.map(s => (
            <span key={s} className="text-[11px] font-bold text-indigo-950 flex items-center gap-0.5">
                <div className="w-1 h-1 rounded-full bg-emerald-500"/>{s}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-indigo-900/80 leading-snug font-bold italic">“{balance.advice}”</p>
      </div>
    </div>
  );
};