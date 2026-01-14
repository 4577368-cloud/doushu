
import React from 'react';
import { BRANCH_CENTERS } from '../ziwei/constants';

interface ZiweiChartViewProps {
  chartData: any;
  profile: any;
  activePalaceName: string;
  onPalaceClick: (name: string) => void;
  onStarClick: (e: any, name: string) => void;
}

const getStarColor = (type?: string) => {
  switch (type) {
    case 'major': return 'text-red-700';
    case 'lucky': return 'text-emerald-700';
    case 'bad': return 'text-stone-500';
    default: return 'text-slate-500';
  }
};

const getBrightnessColor = (b?: string) => {
  if (!b) return 'text-stone-300';
  if (b === '庙' || b === '旺') return 'text-red-600';
  return 'text-stone-500';
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

const VerticalStar: React.FC<{ name: string; type: string; brightness?: string; hua?: string }> = ({ name, type, brightness, hua }) => {
  return (
    <div className="flex flex-col items-center relative group shrink-0 mb-1.5 px-0.5">
      {/* 
         四化标签：移至左上角 (-left-2)，并稍微上浮 (-top-1) 
         这样标签会悬浮在星曜名称第一字的左侧，不会挡住本星文字，也不会挡住右侧列文字。
      */}
      {hua && (
        <span className={`absolute -left-2 -top-1 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] text-white font-bold shadow-sm ring-1 ring-white z-20 ${getHuaBg(hua)}`}>
          {hua}
        </span>
      )}

      {/* 星曜名称 */}
      <div className={`flex flex-col items-center leading-[1.1] font-black tracking-tighter ${type === 'major' ? 'text-[12px] sm:text-[14px]' : 'text-[10px] sm:text-[11px]'} ${getStarColor(type)}`}>
        {name.split('').map((char, i) => (
          <span key={i}>{char}</span>
        ))}
      </div>
      
      {/* 亮度 */}
      {brightness && (
        <span className={`text-[8px] sm:text-[9px] font-bold mt-0.5 ${getBrightnessColor(brightness)}`}>
          {formatBrightness(brightness)}
        </span>
      )}
    </div>
  );
};

// 分列逻辑：每列最多3个
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
  const activePalace = chartData.palaces.find((p: any) => p.name === activePalaceName);
  const getSanFangSiZhengIndices = (zhiIndex: number) => [
    zhiIndex, (zhiIndex + 4) % 12, (zhiIndex + 8) % 12, (zhiIndex + 6) % 12
  ];

  return (
    <div className="w-full max-w-full overflow-hidden bg-white p-1 sm:p-2 shrink-0 select-none">
      <div className="grid grid-cols-4 grid-rows-4 gap-[1px] bg-stone-200 border border-stone-200 shadow-xl relative aspect-[4/5.2] sm:aspect-[4/4.8] w-full mx-auto overflow-hidden rounded-xl">
        
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
                        fill="rgba(16, 185, 129, 0.02)" stroke="rgba(16, 185, 129, 0.5)" strokeWidth="0.12" strokeDasharray="1,1" />
                  <line x1={pSelf.x} y1={pSelf.y} x2={pTravel.x} y2={pTravel.y} 
                        stroke="rgba(16, 185, 129, 0.7)" strokeWidth="0.08" strokeDasharray="2,1" />
                </>
              );
            })()}
          </svg>
        )}

        {chartData.gridMapping.map((branchIndex: any, gridIdx: number) => {
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
          const isActive = activePalaceName === palace.name;
          const isRelated = activePalace && getSanFangSiZhengIndices(activePalace.zhiIndex).includes(palace.zhiIndex) && !isActive;

          const majorChunks = chunkStars(palace.stars.major, 3);
          const minorChunks = chunkStars(palace.stars.minor, 3);

          return (
            <div key={gridIdx} onClick={() => onPalaceClick(palace.name)} 
                 className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
                    isActive ? 'bg-indigo-50/50 ring-2 ring-inset ring-indigo-600 z-30' : 
                    isRelated ? 'bg-indigo-50/10' : 'bg-white hover:bg-stone-50'
                 }`}>
                
                <div className="absolute top-1 left-1.5 z-30 flex flex-col items-start leading-none pointer-events-none opacity-40">
                  <span className="text-[10px] sm:text-[11px] font-serif font-black text-stone-600">{palace.stem}{palace.zhi}</span>
                  <span className="text-[7px] sm:text-[8px] font-sans font-bold text-stone-400">{palace.daXian}</span>
                </div>

                {/* 星曜列容器：保持 flex-row-reverse 布局 */}
                <div className="absolute top-2 right-1.5 bottom-10 left-1.5 flex flex-row-reverse items-start justify-start gap-x-3.5 sm:gap-x-5 z-20 overflow-y-auto no-scrollbar pt-1 pl-2">
                  {/* 主星列 */}
                  {majorChunks.map((chunk, cIdx) => (
                    <div key={`maj-${cIdx}`} className="flex flex-col items-center shrink-0">
                      {chunk.map((s: any, i: number) => (
                        <VerticalStar key={i} name={s.name} type="major" brightness={s.brightness} hua={s.hua} />
                      ))}
                    </div>
                  ))}

                  {/* 辅星列 */}
                  {minorChunks.map((chunk, cIdx) => (
                    <div key={`min-${cIdx}`} className={`flex flex-col items-center shrink-0 pt-0.5 ${cIdx > 0 ? 'opacity-60 scale-90' : ''}`}>
                      {chunk.map((s: any, i: number) => (
                        <VerticalStar key={i} name={s.name} type={s.type} brightness={s.brightness} hua={s.hua} />
                      ))}
                    </div>
                  ))}
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 h-9 z-10 flex items-center justify-center pointer-events-none bg-gradient-to-t from-white via-white/95 to-transparent">
                  <div className={`text-[11px] sm:text-[12px] font-black px-3 py-1 rounded transition-all duration-300 ${
                    isActive ? 'text-indigo-700 scale-110' : 'text-red-900 opacity-80'
                  }`}>
                    {palace.name}
                  </div>
                </div>

                <div className="absolute bottom-1 left-1.5 text-[8px] font-bold text-stone-300 pointer-events-none uppercase">
                   {palace.changSheng}
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
