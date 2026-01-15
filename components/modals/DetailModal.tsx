import React, { useState } from 'react';
import { X, CheckCircle, ClipboardCopy, Sparkles, Check } from 'lucide-react';
import { ModalData, BaziChart } from '../../types';
import { interpretAnnualPillar, interpretLuckPillar, interpretYearPillar, interpretMonthPillar, interpretDayPillar, interpretHourPillar } from '../../services/baziService';
import { SHEN_SHA_DESCRIPTIONS } from '../../services/constants';
import { ElementText, SmartTextRenderer, ShenShaBadge } from '../ui/BaziUI';

export const DetailModal: React.FC<{ data: ModalData; chart: BaziChart | null; onClose: () => void }> = ({ data, chart, onClose }) => {
  if (!chart) return null;
  let interp;
  if (data.pillarName === '流年') {
      interp = interpretAnnualPillar(chart, data.ganZhi);
  } else if (data.pillarName === '大运') {
      interp = interpretLuckPillar(chart, data.ganZhi);
  } else {
      interp = data.pillarName.includes('年') ? interpretYearPillar(chart) : 
               data.pillarName.includes('月') ? interpretMonthPillar(chart) : 
               data.pillarName.includes('日') ? interpretDayPillar(chart) : 
               data.pillarName.includes('时') ? interpretHourPillar(chart) : null;
  }
  
  const [copied, setCopied] = useState(false);
  const handleCopyText = () => { 
      navigator.clipboard.writeText(interp?.integratedSummary || "").then(() => { 
          setCopied(true); 
          setTimeout(() => setCopied(false), 2000); 
      }); 
  };
  
  if (!interp) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-200 animate-slide-up flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-white/90 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
            <span className="text-sm font-black text-stone-900 uppercase tracking-widest">{data.pillarName}深度解析</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-stone-50 text-stone-400 hover:text-stone-950 hover:bg-stone-100 transition-colors"><X size={18}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          <div className="flex justify-center items-center gap-6 bg-gradient-to-br from-stone-50 to-white py-4 rounded-3xl border border-stone-200 shadow-sm shrink-0">
            <div className="flex flex-col items-center"><ElementText text={data.ganZhi.gan} className="text-4xl font-serif font-black" showFiveElement /></div>
            <div className="w-px h-12 bg-stone-200" />
            <div className="flex flex-col items-center"><ElementText text={data.ganZhi.zhi} className="text-4xl font-serif font-black" showFiveElement /></div>
            <div className="w-px h-12 bg-stone-200" />
            <div className="flex flex-col items-center justify-center text-center gap-1">
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">
                    {data.pillarName === '日柱' ? '日元' : data.ganZhi.shiShenGan}
                </span>
                <span className="text-[10px] text-stone-500 font-medium">{data.ganZhi.naYin}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${['帝旺','临官','冠带','长生'].includes(data.ganZhi.lifeStage) ? 'bg-red-50 text-red-600' : 'bg-stone-100 text-stone-500'}`}>
                    {data.ganZhi.lifeStage}
                </span>
            </div>
          </div>
          
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex justify-between items-center px-1">
                  <h5 className="text-xs font-black text-stone-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <CheckCircle size={14} className="text-emerald-500" /> 大师断语
                  </h5>
                  <button onClick={handleCopyText} className={`flex items-center gap-1 text-[10px] font-bold transition-all px-2.5 py-1 rounded-full ${copied ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                      {copied ? <Check size={12}/> : <ClipboardCopy size={12}/>} {copied ? '已复制' : '复制'}
                  </button>
              </div>
              <div className="bg-white p-1 rounded-2xl"><SmartTextRenderer content={interp.integratedSummary} /></div>
            </section>
            
            {data.shenSha.length > 0 && (
                <section className="space-y-3 pt-2 border-t border-stone-100">
                    <h5 className="text-xs font-black text-stone-800 flex items-center gap-1.5 uppercase tracking-wider px-1">
                        <Sparkles size={14} className="text-amber-500" /> 神煞加持
                    </h5>
                    <div className="grid grid-cols-1 gap-2.5">
                        {data.shenSha.map(s => (
                            <div key={s} className="flex gap-3 items-start p-3 bg-stone-50/50 border border-stone-100 rounded-xl">
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