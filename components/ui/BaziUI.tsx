import React from 'react';
import { FIVE_ELEMENTS } from '../../services/constants';

// --- 五行文字组件 ---
export const ElementText: React.FC<{ text: string; className?: string; showFiveElement?: boolean }> = ({ text, className = '', showFiveElement = false }) => {
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

// --- 神煞徽章组件 ---
export const ShenShaBadge: React.FC<{ name: string }> = ({ name }) => {
  const isAuspicious = ['天乙', '太极', '文昌', '福星', '天德', '月德', '禄', '将星', '金舆', '天厨'].some(k => name.includes(k));
  const isInauspicious = ['劫煞', '灾煞', '孤辰', '寡宿', '羊刃', '元辰', '亡神', '丧门', '吊客', '白虎', '地空', '地劫'].some(k => name.includes(k));
  const isPeach = ['桃花', '红艳', '咸池'].some(k => name.includes(k));
  
  let style = "bg-stone-100 text-stone-600 border-stone-200"; 
  if (isAuspicious) style = "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold";
  else if (isInauspicious) style = "bg-rose-50 text-rose-800 border-rose-200 font-bold";
  else if (isPeach) style = "bg-pink-50 text-pink-800 border-pink-200 font-bold";
  
  return <span className={`text-[8px] px-1 py-0.5 rounded border whitespace-nowrap leading-none ${style}`}>{name.length > 2 ? name.slice(0, 2) : name}</span>;
};

// --- 星运样式工具函数 ---
export const getLifeStageStyle = (stage: string) => {
  if (['帝旺', '临官'].includes(stage)) return 'text-rose-600 bg-rose-50 border border-rose-100';
  if (['长生', '冠带'].includes(stage)) return 'text-amber-600 bg-amber-50 border border-amber-100';
  if (['胎', '养'].includes(stage)) return 'text-emerald-600 bg-emerald-50 border border-emerald-100';
  if (['沐浴'].includes(stage)) return 'text-pink-500 bg-pink-50 border border-pink-100';
  return 'text-stone-400 bg-stone-50 border border-stone-100';
};

// --- 智能文本渲染器 ---
export const SmartTextRenderer: React.FC<{ content: string; className?: string }> = ({ content, className = 'text-stone-700' }) => {
  if (!content) return null;
  const lines = content.split('\n');
  const isDarkBg = className.includes('text-white');

  return (
    <div className={`space-y-3 text-[13px] leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        if (line.trim() === '') return <div key={idx} className="h-1" />;
        const isHeader = line.match(/^(\p{Emoji}|🎯|⚡|🌊|🌟|💼|💰|💕|#)/u);
        
        if (isHeader) {
           return (
             <div key={idx} className={`mt-4 first:mt-0 pl-3 py-1.5 rounded-r-lg border-l-2 ${
                 isDarkBg ? 'bg-white/10 border-amber-400' : 'bg-stone-100 border-indigo-400'
             }`}>
                <span className={`font-bold ${isDarkBg ? 'text-amber-100' : 'text-stone-900'} opacity-90`}>{line.replace(/#/g, '')}</span>
             </div>
           );
        }
        
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx} className="text-justify">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <span key={i} className={`font-bold mx-0.5 ${isDarkBg ? 'text-amber-300' : 'text-indigo-700'}`}>{part.slice(2, -2)}</span>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};