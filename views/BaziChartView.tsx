import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Crown, Eye, EyeOff, ShieldCheck, Activity, BrainCircuit, History, Maximize2, ClipboardCopy, Check, Cloud } from 'lucide-react';
import { UserProfile, BaziChart, ChartSubTab, BaziReport as AiBaziReport } from '../types';
import { getArchives, saveAiReportToArchive } from '../services/storageService';
import { SmartTextRenderer } from '../components/ui/BaziUI';
// ❌ 删除了 BaziChartGrid 的引用
import { BalancePanel } from '../components/business/BalancePanel';
import { CoreInfoCard } from '../components/business/CoreInfoCard';
import { BaziAnalysisView } from '../components/BaziAnalysisView';
import { AiChatView } from './AiChatView';
import { ReportHistoryModal } from '../components/modals/ReportHistoryModal';

export const BaziChartView: React.FC<{ profile: UserProfile; chart: BaziChart; onShowModal: any; onSaveReport: any; onAiAnalysis: any; loadingAi: boolean; aiReport: AiBaziReport | null; isVip: boolean; onManualSave: () => void; isSaving: boolean }> = ({ profile, chart, onShowModal, onSaveReport, onAiAnalysis, loadingAi, aiReport, isVip, onManualSave, isSaving }) => {
  const [activeSubTab, setActiveSubTab] = useState<ChartSubTab>(ChartSubTab.DETAIL);
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('ai_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [archives, setArchives] = useState<UserProfile[]>([]);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<any | null>(null);

  useEffect(() => { 
      getArchives().then(setArchives); 
  }, [aiReport]);

  const allHistoryReports = useMemo(() => {
      const all: any[] = [];
      archives.forEach(user => { 
          if (user.aiReports) {
              user.aiReports.forEach(r => all.push({ ...r, userName: user.name }));
          }
      });
      return all.sort((a, b) => b.date - a.date);
  }, [archives]);

  const openDetailedModal = (title: string, gz: any, name: string, ss: string[]) => onShowModal({ title, pillarName: name, ganZhi: gz, shenSha: ss });

  // 🔥 修改点1：移除了 '八字命盘' (BASIC) 选项
  const tabs = [
      { id: ChartSubTab.DETAIL, label: '流年大运' }, 
      { id: ChartSubTab.ANALYSIS, label: '大师解盘' }
  ];
  if (isVip) tabs.push({ id: ChartSubTab.CHAT, label: 'AI 对话' });

  const handleAiAnalysisWrapper = () => { 
      if (!isVip && !apiKey) { 
          alert("请先填写 API Key，或开通 VIP 解锁免 Key 特权"); 
          return; 
      } 
      onAiAnalysis(); 
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部操作栏 */}
      <div className="flex border-b border-stone-200 bg-white shadow-sm overflow-x-auto no-scrollbar justify-between items-center pr-2">
        <div className="flex flex-1">
            {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id as ChartSubTab)} className={`flex-1 min-w-[70px] py-3 text-[11px] font-black border-b-2 transition-all ${activeSubTab === tab.id ? 'border-stone-950 text-stone-950' : 'border-transparent text-stone-500'} ${tab.id === ChartSubTab.CHAT ? 'text-indigo-600' : ''}`}>
                {tab.id === ChartSubTab.CHAT ? <span className="flex items-center justify-center gap-1"><Sparkles size={12}/> {tab.label}</span> : tab.label}
            </button>
            ))}
        </div>
        {/* 手动保存按钮 */}
        <button onClick={onManualSave} disabled={isSaving} className={`ml-2 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${isSaving ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
            {isSaving ? <Activity size={12} className="animate-spin"/> : <Cloud size={12}/>}
            {isSaving ? '同步中...' : '保存档案'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f9f9f8] p-4 pb-24" style={activeSubTab === ChartSubTab.CHAT ? { padding: 0 } : {}}>
         
         {/* 🔥 修改点2：在流年大运下方加入了 BalancePanel (能量均衡) */}
         {activeSubTab === ChartSubTab.DETAIL && (
             <div className="animate-fade-in space-y-4">
                 <CoreInfoCard profile={profile} chart={chart} />
                 <BaziAnalysisView chart={chart} onShowModal={openDetailedModal} />
                 {/* 这里是你要求的能量均衡板块 */}
                 <BalancePanel balance={chart.balance} wuxing={chart.wuxingCounts} dm={chart.dayMaster} />
             </div>
         )}

         {/* 🔥 修改点3：彻底删除了 BASIC (八字命盘) 的代码块 */}

         {activeSubTab === ChartSubTab.ANALYSIS && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white border border-stone-300 p-5 rounded-2xl shadow-sm">
                    {isVip ? (
                        <div className="mb-4 bg-gradient-to-r from-stone-900 to-stone-700 text-amber-400 p-4 rounded-xl flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-2"><Crown size={20} fill="currentColor" /><span className="text-xs font-black tracking-wider">VIP 尊享通道已激活</span></div>
                            <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-white">免 Key 无限畅享</span>
                        </div>
                    ) : (
                        <div className="relative mb-4">
                            {!apiKey && <div className="mb-2 text-[10px] text-stone-400 flex items-center gap-1"><ShieldCheck size={12}/> 未检测到 Key，将尝试使用公共代理</div>}
                            <input type={showApiKey?"text":"password"} value={apiKey} onChange={e => {setApiKey(e.target.value); sessionStorage.setItem('ai_api_key', e.target.value);}} placeholder="填入 API Key (VIP用户无需填写)" className="w-full bg-stone-50 border border-stone-300 p-3 rounded-xl text-sm font-sans focus:border-stone-950 outline-none shadow-inner font-black text-stone-950"/>
                            <button onClick={()=>setShowApiKey(!showApiKey)} className="absolute right-3 top-9 text-stone-400">{showApiKey?<EyeOff size={18}/>:<Eye size={18}/>}</button>
                        </div>
                    )}
                    <button onClick={handleAiAnalysisWrapper} disabled={loadingAi} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${loadingAi ? 'bg-stone-100 text-stone-400' : 'bg-stone-900 text-white active:scale-95 shadow-lg'}`}>
                      {loadingAi ? <Activity className="animate-spin" size={20}/> : <BrainCircuit size={20}/>} {loadingAi ? '正在深度推演...' : '生成大师解盘报告'}
                    </button>
                 </div>
                 {aiReport && (
                     <div className="bg-white border border-stone-300 p-6 rounded-3xl space-y-4 shadow-sm animate-slide-up">
                         <div className="flex items-center gap-2 text-emerald-600 font-black border-b border-stone-100 pb-3"><Sparkles size={18}/> <span>本次生成结果</span></div>
                         <div className="bg-stone-50 p-4 rounded-xl text-sm leading-relaxed text-stone-700 max-h-[300px] overflow-y-auto custom-scrollbar"><SmartTextRenderer content={aiReport.copyText} /></div>
                         <button onClick={() => {navigator.clipboard.writeText(aiReport.copyText); alert("已复制");}} className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl text-xs font-black border border-emerald-100 shadow-sm flex items-center justify-center gap-2"><ClipboardCopy size={14}/> 复制内容</button>
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
                                     <button onClick={() => setSelectedHistoryReport(report)} className="w-full mt-2 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 group-hover:bg-indigo-600 transition-colors"><Maximize2 size={12}/> 查看完整报告</button>
                                 </div>
                             ))}
                         </div>
                     ) : <div className="text-center py-10 text-stone-300 text-xs italic bg-stone-50 rounded-2xl border border-stone-100 border-dashed">暂无历史生成记录</div>}
                 </div>
            </div>
         )}

         {activeSubTab === ChartSubTab.CHAT && isVip && <div className="h-full animate-fade-in"><AiChatView chart={chart} /></div>}
      </div>
      {selectedHistoryReport && <ReportHistoryModal report={selectedHistoryReport} onClose={() => setSelectedHistoryReport(null)} />}
    </div>
  );
};