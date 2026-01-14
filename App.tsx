import React, { useState, useEffect, useMemo } from 'react';
import { BottomNav, Header } from './components/Layout';
import { AppTab, ChartSubTab, UserProfile, BaziChart, Gender, ModalData, GanZhi, Pillar, BaziReport, BalanceAnalysis } from './types';
import { calculateBazi, interpretAnnualPillar, interpretLuckPillar, interpretYearPillar, interpretMonthPillar, interpretDayPillar, interpretHourPillar } from './services/baziService';
import { analyzeBaziStructured } from './services/geminiService';
import { getArchives, saveArchive, deleteArchive, saveAiReportToArchive, updateArchive } from './services/storageService';
import { Activity, BrainCircuit, RotateCcw, Info, X, Sparkles, Sun, Trash2, MapPin, History, Eye, EyeOff, Compass, Calendar, Clock, Check, BarChart3, CheckCircle, FileText, ClipboardCopy, Maximize2, ChevronRight, User, Edit2, Plus, Tag } from 'lucide-react';
import { CHINA_LOCATIONS, FIVE_ELEMENTS, SHEN_SHA_DESCRIPTIONS } from './services/constants';

import ZiweiView from './components/ZiweiView';
import { BaziAnalysisView } from './components/BaziAnalysisView';

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

// --- 智能排版渲染器 ---
const SmartTextRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  const lines = content.split('\n').filter(line => line.trim() !== '');
  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-stone-700">
      {lines.map((line, idx) => {
        const isHeader = line.match(/^(\p{Emoji}|🎯|⚡|🌊|🌟|💼|💰|💕|#)/u);
        if (isHeader) {
           return (
             <div key={idx} className="mt-4 first:mt-0 bg-stone-50 border-l-2 border-indigo-400 pl-3 py-1.5 rounded-r-lg">
                <span className="font-bold text-stone-900">{line.replace(/#/g, '')}</span>
             </div>
           );
        }
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx} className="text-justify">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <span key={i} className="font-bold text-indigo-700 mx-0.5">{part.slice(2, -2)}</span>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

// --- 历史报告详情模态框 ---
const ReportHistoryModal: React.FC<{ report: any; onClose: () => void }> = ({ report, onClose }) => {
    if (!report) return null;
    return (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] animate-slide-up overflow-hidden">
                <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/80 backdrop-blur sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{report.userName}</span>
                            <span className="text-[10px] text-stone-400">{new Date(report.date).toLocaleString()}</span>
                        </div>
                        <h3 className="font-black text-stone-900 text-sm">大师解盘报告详单</h3>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-stone-100 text-stone-400 hover:text-stone-950 transition-colors"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white">
                    <SmartTextRenderer content={report.content} />
                </div>
                <div className="p-4 border-t border-stone-100 bg-stone-50">
                    <button onClick={() => { navigator.clipboard.writeText(report.content); alert('报告内容已复制'); }} className="w-full py-3 bg-stone-900 text-white rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <ClipboardCopy size={16} /> 复制完整报告
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 2. 详情弹窗组件 ---
const DetailModal: React.FC<{ data: ModalData; chart: BaziChart | null; onClose: () => void }> = ({ data, chart, onClose }) => {
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
    const textToCopy = interp?.integratedSummary || "";
    navigator.clipboard.writeText(textToCopy).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  if (!interp) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-200 animate-slide-up flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-white/90 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2"><div className="w-1.5 h-4 bg-indigo-600 rounded-full" /><span className="text-sm font-black text-stone-900 uppercase tracking-widest">{data.pillarName}深度解析</span></div>
          <button onClick={onClose} className="p-2 rounded-full bg-stone-50 text-stone-400 hover:text-stone-950 hover:bg-stone-100 transition-colors"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          <div className="flex justify-center items-center gap-6 bg-gradient-to-br from-stone-50 to-white py-4 rounded-3xl border border-stone-200 shadow-sm shrink-0">
            <div className="flex flex-col items-center"><ElementText text={data.ganZhi.gan} className="text-4xl font-serif font-black" showFiveElement /></div>
            <div className="w-px h-12 bg-stone-200" />
            <div className="flex flex-col items-center"><ElementText text={data.ganZhi.zhi} className="text-4xl font-serif font-black" showFiveElement /></div>
            <div className="w-px h-12 bg-stone-200" />
            <div className="flex flex-col items-center justify-center text-center gap-1">
              <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">{data.pillarName === '日柱' ? '日元' : data.ganZhi.shiShenGan}</span>
              <span className="text-[10px] text-stone-500 font-medium">{data.ganZhi.naYin}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${['帝旺','临官','冠带','长生'].includes(data.ganZhi.lifeStage) ? 'bg-red-50 text-red-600' : 'bg-stone-100 text-stone-500'}`}>{data.ganZhi.lifeStage}</span>
            </div>
          </div>
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h5 className="text-xs font-black text-stone-800 flex items-center gap-1.5 uppercase tracking-wider"><CheckCircle size={14} className="text-emerald-500" /> 大师断语</h5>
                <button onClick={handleCopyText} className={`flex items-center gap-1 text-[10px] font-bold transition-all px-2.5 py-1 rounded-full ${copied ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>{copied ? <Check size={12}/> : <ClipboardCopy size={12}/>} {copied ? '已复制' : '复制'}</button>
              </div>
              <div className="bg-white p-1 rounded-2xl"><SmartTextRenderer content={interp.integratedSummary} /></div>
            </section>
            {data.shenSha.length > 0 && (
              <section className="space-y-3 pt-2 border-t border-stone-100">
                <h5 className="text-xs font-black text-stone-800 flex items-center gap-1.5 uppercase tracking-wider px-1"><Sparkles size={14} className="text-amber-500" /> 神煞加持</h5>
                <div className="grid grid-cols-1 gap-2.5">
                  {data.shenSha.map(s => (
                    <div key={s} className="flex gap-3 items-start p-3 bg-stone-50/50 border border-stone-100 rounded-xl"><div className="shrink-0 pt-0.5"><ShenShaBadge name={s}/></div><p className="text-[11px] text-stone-600 leading-normal font-medium">{SHEN_SHA_DESCRIPTIONS[s] || "此星入命，主命局有特定之感应。"}</p></div>
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

// --- 3. 五行强弱面板 ---
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
          <div key={el} className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl bg-stone-50 border border-stone-200 shadow-inner"><ElementText text={el} className="font-black text-[10px]" /><div className="text-[9px] font-black text-stone-800 bg-white px-1.5 rounded-full border border-stone-100">{wuxing[el] || 0}</div></div>
        ))}
      </div>
      <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/50">
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5"><span className="text-[9px] font-black text-indigo-900 bg-indigo-100/50 px-1.5 py-0.5 rounded uppercase">喜用</span>{balance.yongShen.map(s => <span key={s} className="text-[11px] font-bold text-indigo-950 flex items-center gap-0.5"><div className="w-1 h-1 rounded-full bg-emerald-500"/>{s}</span>)}</div>
        <p className="text-[11px] text-indigo-900/80 leading-snug font-bold italic">“{balance.advice}”</p>
      </div>
    </div>
  );
};

// --- 4. 八字主网格 ---
const BaziChartGrid: React.FC<{ chart: BaziChart; onOpenModal: any }> = ({ chart, onOpenModal }) => {
  const pillars = [
    { key: 'year', label: '年柱', data: chart.pillars.year },
    { key: 'month', label: '月柱', data: chart.pillars.month },
    { key: 'day', label: '日柱', data: chart.pillars.day },
    { key: 'hour', label: '时柱', data: chart.pillars.hour },
  ];
  const rows = [
    { label: '天干', render: (p: Pillar) => (
      <div onClick={() => onOpenModal(p.name, p.ganZhi, p.name, p.shenSha)} className="relative w-full h-full flex flex-col items-center justify-center pt-2 cursor-pointer group hover:bg-black/5 transition-colors rounded-lg"><span className="absolute top-0.5 right-0.5 text-[8px] font-black text-indigo-600 scale-90">{p.name === '日柱' ? '日元' : p.ganZhi.shiShenGan}</span><ElementText text={p.ganZhi.gan} className="text-2xl font-bold font-serif" showFiveElement /></div>
    )},
    { label: '地支', render: (p: Pillar) => (
      <div onClick={() => onOpenModal(p.name, p.ganZhi, p.name, p.shenSha)} className="flex flex-col items-center justify-center py-1 cursor-pointer hover:bg-black/5 transition-colors rounded-lg"><ElementText text={p.ganZhi.zhi} className="text-2xl font-bold font-serif" showFiveElement /></div>
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

// --- 5. 综合图表视图组件 ---
const BaziChartView: React.FC<{ profile: UserProfile; chart: BaziChart; onShowModal: any; onSaveReport: any; onAiAnalysis: any; loadingAi: boolean; aiReport: BaziReport | null }> = ({ profile, chart, onShowModal, onSaveReport, onAiAnalysis, loadingAi, aiReport }) => {
  const [activeSubTab, setActiveSubTab] = useState<ChartSubTab>(ChartSubTab.BASIC);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [archives, setArchives] = useState<UserProfile[]>([]);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<any | null>(null);

  useEffect(() => { setArchives(getArchives()); }, [aiReport]);

  const allHistoryReports = useMemo(() => {
      const all: any[] = [];
      archives.forEach(user => {
          if (user.aiReports && user.aiReports.length > 0) {
              user.aiReports.forEach(report => {
                  all.push({ ...report, userName: user.name, userGender: user.gender });
              });
          }
      });
      return all.sort((a, b) => b.date - a.date);
  }, [archives]);

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
             <div className="animate-fade-in"><BaziAnalysisView chart={chart} onShowModal={openDetailedModal} /></div>
         )}
         
         {activeSubTab === ChartSubTab.ANALYSIS && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white border border-stone-300 p-5 rounded-2xl shadow-sm">
                    <div className="relative mb-4">
                        <input type={showApiKey?"text":"password"} value={apiKey} onChange={e => {setApiKey(e.target.value); localStorage.setItem('ai_api_key', e.target.value);}} placeholder="填入 API Key" className="w-full bg-stone-50 border border-stone-300 p-3 rounded-xl text-sm font-sans focus:border-stone-950 outline-none shadow-inner font-black text-stone-950"/>
                        <button onClick={()=>setShowApiKey(!showApiKey)} className="absolute right-3 top-3 text-stone-400">{showApiKey?<EyeOff size={18}/>:<Eye size={18}/>}</button>
                    </div>
                    <button onClick={onAiAnalysis} disabled={loadingAi || !apiKey} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${apiKey ? 'bg-stone-950 text-white active:scale-95 shadow-lg' : 'bg-stone-100 text-stone-400'}`}>
                      {loadingAi ? <Activity className="animate-spin" size={20}/> : <BrainCircuit size={20}/>} {loadingAi ? '解盘中，请稍候...' : '为当前命盘生成报告'}
                    </button>
                 </div>
                 {aiReport && (
                     <div className="bg-white border border-stone-300 p-6 rounded-3xl space-y-4 shadow-sm animate-slide-up">
                         <div className="flex items-center gap-2 text-emerald-600 font-black border-b border-stone-100 pb-3">
                             <Sparkles size={18}/> <span>本次生成结果</span>
                         </div>
                         <div className="bg-stone-50 p-4 rounded-xl text-sm leading-relaxed text-stone-700 max-h-[300px] overflow-y-auto custom-scrollbar">
                            <SmartTextRenderer content={aiReport.copyText} />
                         </div>
                         <button onClick={() => {navigator.clipboard.writeText(aiReport.copyText); alert("报告已复制");}} className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl text-xs font-black border border-emerald-100 shadow-sm flex items-center justify-center gap-2">
                             <ClipboardCopy size={14}/> 复制本次报告内容
                         </button>
                     </div>
                 )}
                 <div className="space-y-3">
                     <div className="flex items-center gap-2 px-2"><History size={16} className="text-stone-400"/><h3 className="font-black text-stone-600 text-xs uppercase tracking-wider">全站解盘历史存档 ({allHistoryReports.length})</h3></div>
                     {allHistoryReports.length > 0 ? (
                         <div className="grid grid-cols-1 gap-3">
                             {allHistoryReports.map((report, idx) => (
                                 <div key={report.id || idx} className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                                     <div className="flex justify-between items-start mb-2">
                                         <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-100">{report.userName?.[0]}</div><div><div className="font-black text-stone-900 text-sm">{report.userName}</div><div className="text-[10px] text-stone-400">{new Date(report.date).toLocaleString()}</div></div></div>
                                         <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">{report.type === 'ziwei' ? '紫微' : '八字'}</span>
                                     </div>
                                     <div className="text-xs text-stone-500 line-clamp-2 mb-3 leading-relaxed bg-stone-50/50 p-2 rounded-lg">{report.content.slice(0, 80)}...</div>
                                     <div className="flex gap-2">
                                         <button onClick={() => setSelectedHistoryReport(report)} className="flex-1 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 group-hover:bg-indigo-600 transition-colors"><Maximize2 size={12}/> 查看完整报告</button>
                                         <button onClick={() => { navigator.clipboard.writeText(report.content); alert('已复制'); }} className="w-10 flex items-center justify-center border border-stone-200 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-50"><ClipboardCopy size={14}/></button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     ) : <div className="text-center py-10 text-stone-300 text-xs italic bg-stone-50 rounded-2xl border border-stone-100 border-dashed">暂无历史生成记录</div>}
                 </div>
            </div>
         )}
      </div>
      {selectedHistoryReport && <ReportHistoryModal report={selectedHistoryReport} onClose={() => setSelectedHistoryReport(null)} />}
    </div>
  );
};

// --- 6. 首页视图组件 ---
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

// --- 7. 档案视图组件 ---
const ArchiveView: React.FC<{ archives: UserProfile[]; setArchives: any; onSelect: any }> = ({ archives, setArchives, onSelect }) => {
    const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
    const [viewingReports, setViewingReports] = useState<UserProfile | null>(null);
    const [customTag, setCustomTag] = useState('');

    const PRESET_TAGS = ['家人', '朋友', '同事', '客户', '自己'];

    const handleSaveEdit = () => {
        if (!editingProfile) return;
        const updatedList = updateArchive(editingProfile);
        setArchives(updatedList);
        setEditingProfile(null);
    };

    const toggleTag = (tag: string) => {
        if (!editingProfile) return;
        const currentTags = editingProfile.tags || [];
        const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
        setEditingProfile({ ...editingProfile, tags: newTags });
    };

    const addCustomTag = () => {
        if (!customTag.trim() || !editingProfile) return;
        const currentTags = editingProfile.tags || [];
        if (!currentTags.includes(customTag.trim())) {
            setEditingProfile({ ...editingProfile, tags: [...currentTags, customTag.trim()] });
        }
        setCustomTag('');
    };

    return (
        <div className="h-full flex flex-col bg-[#f5f5f4] p-5 overflow-y-auto pb-24 space-y-4">
            {archives.map(p => (
                <div key={p.id} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-black text-stone-950 text-lg">{p.name}</h3>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.gender==='male'?'bg-indigo-50 text-indigo-700':'bg-rose-50 text-rose-700'}`}>{p.gender==='male'?'乾':'坤'}</span>
                            </div>
                            <p className="text-[11px] text-stone-500 font-medium mb-2">{p.birthDate} {p.birthTime} {p.isSolarTime ? '(真太阳)' : ''}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {p.tags && p.tags.length > 0 ? p.tags.map(t => (
                                    <span key={t} className="text-[9px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-bold border border-stone-200">#{t}</span>
                                )) : <span className="text-[9px] text-stone-300 italic">未分类</span>}
                            </div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={()=>onSelect(p)} className="p-2.5 bg-stone-950 text-white rounded-xl shadow-md active:scale-95 transition-transform"><Compass size={18}/></button>
                           <button onClick={()=>setEditingProfile(p)} className="p-2.5 bg-white border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50"><Edit2 size={18}/></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-50">
                        <button onClick={()=>setViewingReports(p)} className="py-2.5 bg-stone-50 text-stone-600 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 hover:bg-stone-100 transition-colors"><FileText size={14}/> 解盘记录 ({p.aiReports?.length || 0})</button>
                        <button onClick={()=>{if(window.confirm("确定删除此档案吗？此操作不可恢复。")) setArchives(deleteArchive(p.id));}} className="py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 hover:bg-rose-100 transition-colors border border-rose-100"><Trash2 size={14}/> 删除档案</button>
                    </div>
                </div>
            ))}
            {editingProfile && (
                <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setEditingProfile(null)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up">
                        <div className="p-5 border-b border-stone-100 bg-stone-50 flex justify-between items-center"><h3 className="font-black text-stone-900">编辑档案</h3><button onClick={()=>setEditingProfile(null)}><X size={20} className="text-stone-400"/></button></div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-2"><label className="text-xs font-black text-stone-500 uppercase tracking-wider">姓名</label><input type="text" value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none font-bold text-stone-900 focus:border-stone-400"/></div>
                            <div className="space-y-3"><label className="text-xs font-black text-stone-500 uppercase tracking-wider flex items-center gap-2"><Tag size={14}/> 标签管理</label><div className="flex flex-wrap gap-2">{PRESET_TAGS.map(tag => (<button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${editingProfile.tags?.includes(tag) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-stone-200 text-stone-500 hover:border-indigo-200'}`}>{tag}</button>))}</div><div className="flex gap-2"><input type="text" value={customTag} onChange={e => setCustomTag(e.target.value)} placeholder="添加自定义标签..." className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-stone-400"/><button onClick={addCustomTag} className="p-2 bg-stone-200 rounded-lg text-stone-600 hover:bg-stone-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-1.5 pt-2">{editingProfile.tags?.filter(t => !PRESET_TAGS.includes(t)).map(t => (<div key={t} className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-[10px] font-bold border border-amber-100">#{t}<button onClick={() => toggleTag(t)}><X size={10}/></button></div>))}</div></div>
                            <button onClick={handleSaveEdit} className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold shadow-lg mt-2 active:scale-95 transition-transform">保存修改</button>
                        </div>
                    </div>
                </div>
            )}
            {viewingReports && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={() => setViewingReports(null)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-slide-up overflow-hidden">
                        <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50"><h3 className="font-black text-stone-950">{viewingReports.name} 的报告库</h3><X onClick={() => setViewingReports(null)} size={20} className="text-stone-400 cursor-pointer"/></div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                            {viewingReports.aiReports?.length ? viewingReports.aiReports.map(r => (
                                <div key={r.id} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-2">
                                    <div className="flex justify-between items-center"><span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{r.type==='ziwei'?'紫微':'八字'}</span><span className="text-[9px] text-stone-400">{new Date(r.date).toLocaleString()}</span></div>
                                    <div className="text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap font-medium">{typeof r.content === 'string' ? r.content : JSON.stringify(r.content, null, 2)}</div>
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

// --- 8. 主 App 组件 ---
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

export default App;