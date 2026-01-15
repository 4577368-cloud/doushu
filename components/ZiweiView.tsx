import React, { useState, useEffect } from 'react';
import { calculateChart } from '../ziwei/services/astrologyService';
import { generateRuleBasedAnalysis } from '../ziwei/services/interpretationService';
import { callDeepSeekAPI } from '../ziwei/services/aiService';
import { UserProfile } from '../types';
import { BrainCircuit, Activity, Sparkles, ClipboardCopy, Crown } from 'lucide-react';
// 🔥 修复：加上花括号 { }，改为命名导入
import { ZiweiChartView } from './ZiweiChartView'; 

interface ZiweiViewProps {
  profile: UserProfile;
  onSaveReport: (report: string) => void;
  isVip: boolean;
}

const PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

const ZiweiView: React.FC<ZiweiViewProps> = ({ profile, onSaveReport, isVip }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [activePalaceName, setActivePalaceName] = useState('命宫');
  const [deepSeekContent, setDeepSeekContent] = useState<string>('');
  const [isDeepSeekLoading, setIsDeepSeekLoading] = useState(false);
  const [apiKey] = useState(() => sessionStorage.getItem('ai_api_key') || ''); 
  const [analysisTab, setAnalysisTab] = useState<'rule' | 'ai'>('rule');

  useEffect(() => {
    const d = profile.birthDate.split('-').map(Number);
    const t = profile.birthTime.split(':').map(Number);
    // 简单的经度处理，默认 120
    const data = calculateChart(d[0], d[1], d[2], t[0], profile.gender === 'male' ? 'M' : 'F', profile.longitude || 120);
    setChartData(data);
  }, [profile]);

  const handleAiAnalyze = async () => {
    // 🔥 VIP 免 Key 检查逻辑
    if (!apiKey && !isVip) { 
        alert("请先在首页设置 API Key，或升级 VIP 解锁免 Key 特权"); 
        return; 
    }

    setIsDeepSeekLoading(true);
    setAnalysisTab('ai');
    
    try {
        const birthYear = parseInt(profile.birthDate.split('-')[0]);
        const age = new Date().getFullYear() - birthYear + 1;
        
        // 调用 AI 服务 (后端会自动处理 VIP 免 Key)
        const html = await callDeepSeekAPI(apiKey, chartData, age, profile.gender === 'male' ? 'M' : 'F', new Date().getFullYear());
        
        setDeepSeekContent(html);
        onSaveReport(html);
    } catch (e: any) { 
        console.error(e);
        setDeepSeekContent(`<p style="color:red">分析失败: ${e.message || "请检查网络"}</p>`); 
    } finally { 
        setIsDeepSeekLoading(false); 
    }
  };

  if (!chartData) return <div className="p-10 text-center animate-pulse text-stone-400 text-sm">正在推演紫微星盘...</div>;

  return (
    <div className="h-full flex flex-col bg-[#f5f5f4] overflow-y-auto">
      {/* 星盘组件 */}
      <ZiweiChartView 
        chartData={chartData}
        profile={profile}
        activePalaceName={activePalaceName}
        onPalaceClick={setActivePalaceName}
        onStarClick={() => {}}
      />

      <div className="flex-1 p-4 pb-24">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="flex border-b border-stone-100 divide-x divide-stone-100">
                  <button onClick={()=>setAnalysisTab('rule')} className={`flex-1 py-3.5 text-xs font-bold transition-colors ${analysisTab==='rule'?'bg-indigo-600 text-white':'text-stone-400 bg-stone-50/50'}`}>宫位详推</button>
                  <button onClick={()=>setAnalysisTab('ai')} className={`flex-1 py-3.5 text-xs font-bold transition-colors flex items-center justify-center gap-1 ${analysisTab==='ai'?'bg-indigo-600 text-white':'text-stone-400 bg-stone-50/50'}`}>
                      {isVip && <Crown size={12} className="text-amber-400" />} AI 财富策略
                  </button>
              </div>
              
              <div className="p-5">
                  {analysisTab === 'rule' ? (
                      <div className="space-y-4">
                          <div className="flex flex-wrap gap-2 justify-center mb-6">
                              {PALACE_NAMES.map(n => (
                                  <button key={n} onClick={()=>setActivePalaceName(n)} className={`px-2.5 py-1.5 text-[10px] rounded-lg border transition-all ${activePalaceName===n?'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-110':'bg-white text-stone-500 border-stone-200 hover:border-indigo-300'}`}>{n}</button>
                              ))}
                          </div>
                          <div className="prose prose-stone prose-sm max-w-none font-serif leading-relaxed text-stone-700 text-xs" 
                               dangerouslySetInnerHTML={{ __html: generateRuleBasedAnalysis(chartData, activePalaceName, new Date().getFullYear(), new Date().getFullYear() - parseInt(profile.birthDate.split('-')[0]) + 1) }} />
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {!deepSeekContent && !isDeepSeekLoading ? (
                              <div className="text-center py-16">
                                  <Sparkles className="mx-auto text-amber-400 mb-4 animate-pulse" size={42}/>
                                  <h3 className="font-bold text-stone-800 text-base mb-2">天机 AI 深度解盘</h3>
                                  <p className="text-xs text-stone-400 mb-8 max-w-[200px] mx-auto leading-relaxed">基于钦天四化与三合流派结合现代金融模型精准分析</p>
                                  <button onClick={handleAiAnalyze} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-xl text-xs active:transform active:scale-95 transition-all flex items-center gap-2 mx-auto">
                                      {isVip ? <Crown size={14} className="text-amber-300"/> : null}
                                      立即开启推演
                                  </button>
                              </div>
                          ) : isDeepSeekLoading ? (
                              <div className="text-center py-20 animate-pulse">
                                  <Activity className="mx-auto animate-spin text-indigo-600 mb-4" size={28} />
                                  <p className="font-serif text-stone-500 tracking-widest text-xs">正在通过星曜矩阵建立财富模型...</p>
                              </div>
                          ) : (
                              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                  <div className="flex justify-end mb-3">
                                    <button onClick={()=>{navigator.clipboard.writeText(deepSeekContent);alert('已复制');}} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100"><ClipboardCopy size={12}/>一键复制报告</button>
                                  </div>
                                  <div className="text-xs leading-relaxed text-stone-700 bg-stone-50 p-5 rounded-2xl border border-stone-100 whitespace-pre-wrap font-serif shadow-inner" 
                                       dangerouslySetInnerHTML={{ __html: deepSeekContent }} />
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default ZiweiView;