import React from 'react';
import { BRANCH_CENTERS } from '../ziwei/constants'; // 确保这个路径是对的，或者从 services/constants 引入

interface ZiweiChartViewProps {
  chartData: any;
  profile: any;
  activePalaceName: string;
  onPalaceClick: (name: string) => void;
  onStarClick: (e: any, name: string) => void;
}

const getStarColor = (type?: string, isDarkBg?: boolean) => {
  if (isDarkBg) {
    // 深色背景下的星曜颜色适配
    switch (type) {
      case 'major': return 'text-amber-300'; // 主星金黄色
      case 'lucky': return 'text-emerald-300';
      case 'bad': return 'text-rose-300';
      default: return 'text-stone-300';
    }
  }
  // 浅色背景（默认）
  switch (type) {
    case 'major': return 'text-red-700';
    case 'lucky': return 'text-emerald-700';
    case 'bad': return 'text-stone-500';
    default: return 'text-slate-500';
  }
};

const getBrightnessColor = (b?: string, isDarkBg?: boolean) => {
  if (!b) return isDarkBg ? 'text-white/20' : 'text-stone-300';
  if (b === '庙' || b === '旺') return isDarkBg ? 'text-amber-400' : 'text-red-600';
  return isDarkBg ? 'text-stone-400' : 'text-stone-500';
};

const formatBrightness = (b?: string) => {
  if (b === '得地') return '得';
  if (b === '利益') return '利';
  return b;
};

const getHuaBg = (hua: string) => {
  switch (hua) {
    case '禄': return 'bg-emerald-600';
    case '权': return 'bg-red-600';
    case '科': return 'bg-blue-600';
    case '忌': return 'bg-stone-800';
    default: return 'bg-stone-400';
  }
};

// 增加 isDarkBg 参数，用于适配深色背景
const VerticalStar: React.FC<{ name: string; type: string; brightness?: string; hua?: string; isDarkBg?: boolean }> = ({ name, type, brightness, hua, isDarkBg }) => {
  return (
    <div className="flex flex-col items-center relative group shrink-0 mb-1.5 px-0.5">
      {hua && (
        <span className={`absolute -left-2 -top-1 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] text-white font-bold shadow-sm ring-1 ring-white z-20 ${getHuaBg(hua)}`}>
          {hua}
        </span>
      )}

      <div className={`flex flex-col items-center leading-[1.1] font-black tracking-tighter ${type === 'major' ? 'text-[12px] sm:text-[14px]' : 'text-[10px] sm:text-[11px]'} ${getStarColor(type, isDarkBg)}`}>
        {name.split('').map((char, i) => (
          <span key={i}>{char}</span>
        ))}
      </div>
      
      {brightness && (
        <span className={`text-[8px] sm:text-[9px] font-bold mt-0.5 ${getBrightnessColor(brightness, isDarkBg)}`}>
          {formatBrightness(brightness)}
        </span>
      )}
    </div>
  );
};

const chunkStars = (stars: any[], size: number = 3) => {
  const result = [];
  for (let i = 0; i < stars.length; i += size) {
    result.push(stars.slice(i, i + size));
  }
  return result;
};

export const ZiweiChartView: React.FC<ZiweiChartViewProps> = ({ 
  chartData, profile, activePalaceName, onPalaceClick, onStarClick 
}) => {
  // 1. 找到当前激活的宫位对象
  const activePalace = chartData.palaces.find((p: any) => p.name === activePalaceName);

  // 2. 计算三方四正关系 (基于地支索引)
  const getRelationType = (targetZhiIndex: number) => {
      if (!activePalace) return null;
      const activeIdx = activePalace.zhiIndex;
      
      if (targetZhiIndex === activeIdx) return 'self'; // 本宫
      if ((activeIdx + 6) % 12 === targetZhiIndex) return 'opposite'; // 对宫
      if ((activeIdx + 4) % 12 === targetZhiIndex || (activeIdx + 8) % 12 === targetZhiIndex) return 'trine'; // 三合
      return null;
  };

  return (
    <div className="w-full max-w-full overflow-hidden bg-white p-1 sm:p-2 shrink-0 select-none">
      <div className="grid grid-cols-4 grid-rows-4 gap-[1px] bg-stone-200 border border-stone-200 shadow-xl relative aspect-[4/5.2] sm:aspect-[4/4.8] w-full mx-auto overflow-hidden rounded-xl">
        
        {/* SVG 连线层 */}
        {activePalace && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-40" viewBox="0 0 100 100" preserveAspectRatio="none">
            {(() => {
              const i = activePalace.zhiIndex;
              const pSelf = BRANCH_CENTERS[i];
              const pWealth = BRANCH_CENTERS[(i + 4) % 12];
              const pCareer = BRANCH_CENTERS[(i + 8) % 12];
              const pTravel = BRANCH_CENTERS[(i + 6) % 12];
              return (
                <>
                  <path d={`M ${pSelf.x} ${pSelf.y} L ${pWealth.x} ${pWealth.y} L ${pCareer.x} ${pCareer.y} Z`} 
                        fill="rgba(79, 70, 229, 0.03)" stroke="rgba(79, 70, 229, 0.4)" strokeWidth="0.12" strokeDasharray="1,1" />
                  <line x1={pSelf.x} y1={pSelf.y} x2={pTravel.x} y2={pTravel.y} 
                        stroke="rgba(147, 51, 234, 0.5)" strokeWidth="0.08" strokeDasharray="2,1" />
                </>
              );
            })()}
          </svg>
        )}

        {chartData.gridMapping.map((branchIndex: any, gridIdx: number) => {
          // 中庭信息
          if (branchIndex === null) {
            if (gridIdx === 5) return (
              <div key="center" className="col-span-2 row-span-2 bg-white flex flex-col items-center p-2 sm:p-4 relative z-20 overflow-hidden border-2 border-stone-100/50 rounded-lg shadow-inner m-1">
                <div className="flex gap-2 sm:gap-4 text-[11px] sm:text-[13px] font-black text-stone-700 mb-2">
                    {chartData.baZi?.map((bz: string, i: number) => (
                        <span key={i} className="font-serif border-b border-stone-100">{bz}</span>
                    ))}
                </div>
                <div className="flex items-center justify-between w-full px-2 mb-2 border-b border-stone-100 pb-1 shrink-0">
                    <span className="text-sm sm:text-base font-black text-indigo-950 font-serif">{chartData.bureau?.name}</span>
                    <span className="text-[10px] sm:text-[11px] text-stone-400 font-bold">{profile.name} · {profile.gender==='male'?'乾造':'坤造'}</span>
                </div>
                <div className="w-full flex-1 overflow-y-auto no-scrollbar pt-1 text-left space-y-2.5">
                  {chartData.patterns?.map((pat: any, idx: number) => (
                    <div key={idx} className="border-l-2 border-indigo-100 pl-2 py-0.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[8px] px-1 py-0.5 rounded-sm text-white font-bold shrink-0 ${pat.type.includes('吉') ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                          {pat.type.charAt(0)}
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-black text-stone-800 font-serif">{pat.name}</span>
                      </div>
                      <p className="text-[9px] leading-tight text-stone-500 text-justify">{pat.description}</p>
                    </div>
                  ))}
                  {(!chartData.patterns || chartData.patterns.length === 0) && (
                    <div className="h-full flex items-center justify-center text-[10px] text-stone-300 italic">暂无特殊格局</div>
                  )}
                </div>
              </div>
            );
            return null;
          }
          
          const palace = chartData.palaces[branchIndex];
          
          // 🔥 核心修改：计算关系类型
          const relation = getRelationType(palace.zhiIndex);
          const isActive = relation === 'self';

          // 🔥 核心修改：根据关系设置背景色
          let bgClass = 'bg-white hover:bg-stone-50'; // 默认
          let borderClass = '';
          
          if (relation === 'self') {
             // 本宫：深蓝背景，高亮
             bgClass = 'bg-indigo-900 ring-2 ring-inset ring-amber-400 z-30 shadow-xl';
          } else if (relation === 'opposite') {
             // 对宫：淡紫色
             bgClass = 'bg-purple-100/60 ring-1 ring-inset ring-purple-200';
          } else if (relation === 'trine') {
             // 三合：淡蓝色
             bgClass = 'bg-sky-100/60 ring-1 ring-inset ring-sky-200';
          }

          const majorChunks = chunkStars(palace.stars.major, 3);
          const minorChunks = chunkStars(palace.stars.minor, 3);

          return (
            <div key={gridIdx} onClick={() => onPalaceClick(palace.name)} 
                 className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${bgClass} ${borderClass}`}>
                
                {/* 宫位干支 & 大限 */}
                <div className="absolute top-1 left-1.5 z-30 flex flex-col items-start leading-none pointer-events-none">
                  <span className={`text-[10px] sm:text-[11px] font-serif font-black ${isActive ? 'text-amber-100/80' : 'text-stone-600 opacity-60'}`}>
                      {palace.stem}{palace.zhi}
                  </span>
                  <span className={`text-[7px] sm:text-[8px] font-sans font-bold ${isActive ? 'text-white/40' : 'text-stone-400'}`}>
                      {palace.daXian}
                  </span>
                </div>

                {/* 星曜列 */}
                <div className="absolute top-2 right-1.5 bottom-10 left-1.5 flex flex-row-reverse items-start justify-start gap-x-3.5 sm:gap-x-5 z-20 overflow-y-auto no-scrollbar pt-1 pl-2">
                  {/* 主星 */}
                  {majorChunks.map((chunk, cIdx) => (
                    <div key={`maj-${cIdx}`} className="flex flex-col items-center shrink-0">
                      {chunk.map((s: any, i: number) => (
                        <VerticalStar key={i} name={s.name} type="major" brightness={s.brightness} hua={s.hua} isDarkBg={isActive} />
                      ))}
                    </div>
                  ))}

                  {/* 辅星 */}
                  {minorChunks.map((chunk, cIdx) => (
                    <div key={`min-${cIdx}`} className={`flex flex-col items-center shrink-0 pt-0.5 ${cIdx > 0 ? 'opacity-60 scale-90' : ''}`}>
                      {chunk.map((s: any, i: number) => (
                        <VerticalStar key={i} name={s.name} type={s.type} brightness={s.brightness} hua={s.hua} isDarkBg={isActive} />
                      ))}
                    </div>
                  ))}
                </div>
                
                {/* 底部宫位名 */}
                <div className={`absolute bottom-0 left-0 right-0 h-9 z-10 flex items-center justify-center pointer-events-none bg-gradient-to-t ${isActive ? 'from-indigo-900 via-indigo-900/90' : 'from-white via-white/95'} to-transparent`}>
                  <div className={`text-[11px] sm:text-[12px] font-black px-3 py-1 rounded transition-all duration-300 ${
                    isActive ? 'text-amber-300 scale-110 tracking-widest' : 'text-red-900 opacity-80'
                  }`}>
                    {palace.name}
                  </div>
                </div>

                {/* 长生状态 */}
                <div className={`absolute bottom-1 left-1.5 text-[8px] font-bold pointer-events-none uppercase ${isActive ? 'text-white/20' : 'text-stone-300'}`}>
                   {palace.changSheng}
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};