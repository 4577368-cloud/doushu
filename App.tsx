import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BottomNav } from './components/Layout';
// ✅ 引入数据库客户端
import { supabase } from './services/supabase';
// ✅ 引入独立的 Auth 组件
import { Auth } from './Auth';
// 引入类型定义
import { AppTab, ChartSubTab, UserProfile, BaziChart, Gender, ModalData, GanZhi, Pillar, BaziReport, BalanceAnalysis, HistoryItem } from './types';
// 引入业务服务
import { calculateBazi, interpretAnnualPillar, interpretLuckPillar, interpretYearPillar, interpretMonthPillar, interpretDayPillar, interpretHourPillar } from './services/baziService';
import { analyzeBaziStructured, BaziReport as AiBaziReport } from './services/geminiService';
import { sendChatMessage, ChatMessage } from './services/chatService';
import { getArchives, saveArchive, deleteArchive, saveAiReportToArchive, updateArchive } from './services/storageService';
// 引入图标
import { Activity, BrainCircuit, RotateCcw, Info, X, Sparkles, Sun, Trash2, MapPin, Map, History, Eye, EyeOff, Compass, Calendar, Clock, Check, BarChart3, CheckCircle, FileText, ClipboardCopy, Maximize2, ChevronRight, User, Edit2, Plus, Tag, ShieldCheck, Crown, Send, MessageCircle, HelpCircle, Gem, ArrowLeftRight, GitMerge, LogOut, Mail, Cloud, Save, AlertTriangle } from 'lucide-react';
// 引入常量
import { CHINA_LOCATIONS, FIVE_ELEMENTS, SHEN_SHA_DESCRIPTIONS } from './services/constants';

// 引入子页面组件
import ZiweiView from './components/ZiweiView';
import { BaziAnalysisView } from './components/BaziAnalysisView';

// --- 🔥 关键新增：防白屏错误边界组件 ---
// 如果某个组件渲染出错，它会捕获错误并显示提示，而不是让整个页面变白
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-rose-50 text-center">
          <AlertTriangle size={48} className="text-rose-500 mb-4" />
          <h2 className="text-lg font-bold text-rose-800 mb-2">排盘显示出错了</h2>
          <p className="text-xs text-rose-600 mb-4 bg-white p-3 rounded border border-rose-200 w-full overflow-auto text-left font-mono">
            {this.state.error?.toString() || "未知错误"}
          </p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-rose-600 text-white rounded-lg shadow font-bold text-sm">刷新页面重试</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- 基础 UI 组件 (完整保留) ---
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

const getLifeStageStyle = (stage: string) => {
  if (['帝旺', '临官'].includes(stage)) return 'text-rose-600 bg-rose-50 border border-rose-100';
  if (['长生', '冠带'].includes(stage)) return 'text-amber-600 bg-amber-50 border border-amber-100';
  if (['胎', '养'].includes(stage)) return 'text-emerald-600 bg-emerald-50 border border-emerald-100';
  if (['沐浴'].includes(stage)) return 'text-pink-500 bg-pink-50 border border-pink-100';
  return 'text-stone-400 bg-stone-50 border border-stone-100';
};

const SmartTextRenderer: React.FC<{ content: string; className?: string }> = ({ content, className = 'text-stone-700' }) => {
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
                 isDarkBg 
                    ? 'bg-white/10 border-amber-400' 
                    : 'bg-stone-100 border-indigo-400'
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

// --- VIP 顶部栏 ---
const AppHeader: React.FC<{ title: string; rightAction?: React.ReactNode; isVip: boolean }> = ({ title, rightAction, isVip }) => (
  <header className={`sticky top-0 z-50 px-5 h-16 flex items-center justify-between transition-all duration-500 ${isVip ? 'bg-[#1c1917] border-b border-amber-900/30 shadow-2xl' : 'bg-white/90 backdrop-blur-md border-b border-stone-200 text-stone-900'}`}>
    <h1 className={`text-lg font-serif font-black tracking-wider flex items-center gap-2.5 ${isVip ? 'text-amber-100' : 'text-stone-900'}`}>
      {isVip && (
          <div className="relative">
              <div className="absolute inset-0 bg-amber-400 blur-sm opacity-20 animate-pulse"></div>
              <Crown size={20} className="text-amber-400 fill-amber-400" />
          </div>
      )}
      <span className={isVip ? "bg-clip-text text-transparent bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100" : ""}>{title}</span>
    </h1>
    <div className="flex items-center gap-2">
      {rightAction}
    </div>
  </header>
);

// --- VIP 支付弹窗 ---
const VipActivationModal: React.FC<{ onClose: () => void; onActivate: () => void }> = ({ onClose, onActivate }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (code === '202612345') {
            onActivate();
            onClose();
        } else {
            setError('密钥无效，请核对后重试');
        }
    };

    return (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up border border-white/20">
                <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-950 p-7 text-center relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 opacity-10 rotate-12"><Crown size={140} color="white"/></div>
                    <h3 className="text-amber-500/80 text-[10px] font-black tracking-[0.3em] uppercase mb-1 relative z-10">VIP Premium Access</h3>
                    <div className="flex items-baseline justify-center gap-1 text-white relative z-10 my-2">
                        <span className="text-xl font-bold text-amber-500">¥</span>
                        <span className="text-6xl font-black tracking-tighter text-amber-400 drop-shadow-lg">39.9</span>
                        <span className="text-[10px] font-black bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-900 px-2 py-0.5 rounded-full ml-2 shadow-sm transform -translate-y-4">永久解锁</span>
                    </div>
                    <p className="text-[11px] text-stone-400 relative z-10 font-medium">
                        <span className="line-through mr-2 opacity-60">原价 ¥299.0</span>
                        <span className="text-amber-200/80">解锁 AI 深度对话 & 无限排盘</span>
                    </p>
                </div>
                
                <div className="p-6 space-y-6 bg-white">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-52 h-52 bg-white rounded-2xl border border-stone-100 flex items-center justify-center relative overflow-hidden p-2 shadow-lg group">
                            <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-transparent transition-colors z-10 pointer-events-none"/>
                            <img src="https://imgus.tangbuy.com/static/images/2026-01-14/d3cfc3391f4b4049855b70428d881cc8-17683802616059959910686892450765.jpg" alt="Payment QR" className="w-full h-full object-contain rounded-lg" />
                        </div>
                        <p className="text-[11px] text-stone-500 text-center max-w-[240px] leading-relaxed">
                            请使用微信/支付宝扫码支付 <b className="text-stone-900 font-black">¥39.9</b><br/>
                            支付成功后截图联系客服，获取您的专属密钥
                        </p>
                    </div>
                    <div className="space-y-2">
                        <input type="text" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }} placeholder="在此输入专属密钥激活" className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-4 font-mono font-bold text-center text-base focus:border-amber-400 focus:bg-white outline-none transition-all placeholder:font-sans placeholder:text-stone-300 text-stone-800 shadow-inner"/>
                        {error && <p className="text-xs text-rose-500 text-center font-bold animate-pulse">{error}</p>}
                    </div>
                    <button onClick={handleSubmit} className="w-full py-4 bg-[#1c1917] text-white rounded-xl font-black text-sm shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-stone-800"><Sparkles size={16} className="text-amber-400" /> 立即激活永久 VIP</button>
                </div>
            </div>
        </div>
    );
};

// --- AI 聊天界面 ---
const AiChatView: React.FC<{ chart: BaziChart }> = ({ chart }) => {
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const key = `chat_history_${chart.profileId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return [
            { role: 'assistant', content: `尊贵的 VIP 用户，您好！\n我是您的专属命理师。我已经深度研读了您的命盘（${chart.dayMaster}日主，${chart.pattern.name}），请问您今天想了解哪方面的运势？` }
        ];
    });

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>(['我的事业运如何？', '最近财运怎么样？', '感情方面有桃花吗？']);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const key = `chat_history_${chart.profileId}`;
        localStorage.setItem(key, JSON.stringify(messages));
        scrollToBottom();
    }, [messages, chart.profileId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = async (contentOverride?: string) => {
        const msgContent = contentOverride || input;
        if (!msgContent.trim() || loading) return;
         
        const userMsg: ChatMessage = { role: 'user', content: msgContent };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSuggestions([]); 
        setLoading(true);

        let fullResponseBuffer = "";

        try {
            const contextMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content })).slice(-10);
             
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
             
            await sendChatMessage(contextMessages, chart, (chunk) => {
                fullResponseBuffer += chunk;
                const parts = fullResponseBuffer.split('|||');
                const displayContent = parts[0]; 
                const suggestionRaw = parts[1];

                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg.role === 'assistant') {
                        lastMsg.content = displayContent;
                    }
                    return newMsgs;
                });

                if (suggestionRaw) {
                    const newSuggestions = suggestionRaw.split(/[;；]/).map(s => s.trim()).filter(s => s.length > 0);
                    if (newSuggestions.length > 0) {
                        setSuggestions(newSuggestions);
                    }
                }
            });

        } catch (error) {
            setMessages(prev => {
                const newMsgs = [...prev];
                if(newMsgs[newMsgs.length-1].content === '') {
                     newMsgs[newMsgs.length-1].content = '抱歉，连接天机（服务器）时出现波动，请稍后再试。';
                }
                return newMsgs;
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f8f7]">
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-6">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm border border-stone-800">
                                <Crown size={14} fill="currentColor" />
                            </div>
                        )}
                        <div className={`max-w-[85%] p-4 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-200'
                                : 'bg-white text-stone-800 rounded-tl-none border border-stone-100 shadow-stone-200'
                        }`}>
                            <SmartTextRenderer 
                                content={msg.content} 
                                className={msg.role === 'user' ? 'text-white' : 'text-stone-800'} 
                            />
                        </div>
                    </div>
                ))}
                {loading && messages[messages.length - 1].role === 'user' && (
                    <div className="flex justify-start">
                        <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center shrink-0 mr-2 mt-1"><Crown size={14} fill="currentColor" /></div>
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-stone-100 shadow-sm flex gap-1.5 items-center">
                            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
             
            <div className="p-3 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                {suggestions.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 px-1 animate-in fade-in slide-in-from-bottom-2">
                        {suggestions.map((s, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleSend(s)}
                                className="whitespace-nowrap px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1 active:scale-95"
                            >
                                <HelpCircle size={10} /> {s}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex gap-2 items-end">
                    <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="请输入您的问题..." className="flex-1 bg-stone-100 border-transparent focus:bg-white focus:border-stone-300 rounded-2xl px-4 py-3 text-sm outline-none resize-none max-h-24 min-h-[48px] transition-all" rows={1} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}/>
                    <button onClick={() => handleSend()} disabled={loading || !input.trim()} className={`p-3 rounded-full h-12 w-12 flex items-center justify-center transition-all ${!input.trim() ? 'bg-stone-200 text-stone-400' : 'bg-stone-900 text-amber-400 shadow-lg active:scale-95 hover:bg-stone-800'}`}><Send size={20} className={input.trim() ? "ml-0.5" : ""} /></button>
                </div>
            </div>
        </div>
    );
};

// --- 历史报告弹窗 ---
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

// --- 八字详情弹窗 ---
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

// --- 五行强弱面板 ---
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

// --- 八字四柱网格 ---
const BaziChartGrid: React.FC<{ chart: BaziChart; onOpenModal: any }> = ({ chart, onOpenModal }) => {
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

// --- 5. 综合图表视图组件 (🔥 增加手动保存按钮 + ErrorBoundary) ---
const BaziChartView: React.FC<{ profile: UserProfile; chart: BaziChart; onShowModal: any; onSaveReport: any; onAiAnalysis: any; loadingAi: boolean; aiReport: AiBaziReport | null; isVip: boolean; onManualSave: () => void }> = ({ profile, chart, onShowModal, onSaveReport, onAiAnalysis, loadingAi, aiReport, isVip, onManualSave }) => {
  const [activeSubTab, setActiveSubTab] = useState<ChartSubTab>(ChartSubTab.DETAIL);
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('ai_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [archives, setArchives] = useState<UserProfile[]>([]);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { 
    getArchives().then(setArchives);
  }, [aiReport]);

  const allHistoryReports = useMemo(() => {
      const all: any[] = [];
      archives.forEach(user => {
          if (user.aiReports) user.aiReports.forEach(r => all.push({ ...r, userName: user.name }));
      });
      return all.sort((a, b) => b.date - a.date);
  }, [archives]);

  const openDetailedModal = (title: string, gz: GanZhi, name: string, ss: string[]) => onShowModal({ title, pillarName: name, ganZhi: gz, shenSha: ss });

  const tabs = [
      { id: ChartSubTab.DETAIL, label: '流年大运' },
      { id: ChartSubTab.BASIC, label: '八字命盘' },
      { id: ChartSubTab.ANALYSIS, label: '大师解盘' }
  ];
  if (isVip) tabs.push({ id: ChartSubTab.CHAT, label: 'AI 对话' });

  const handleManualSaveWrapper = async () => {
      setIsSaving(true);
      await onManualSave();
      setTimeout(() => setIsSaving(false), 1000);
  };

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
        {/* 🔥 新增：手动保存按钮 */}
        <button onClick={handleManualSaveWrapper} disabled={isSaving} className={`ml-2 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${isSaving ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
            {isSaving ? <Check size={12}/> : <Cloud size={12}/>}
            {isSaving ? '已同步' : '保存档案'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f9f9f8] p-4 pb-24" style={activeSubTab === ChartSubTab.CHAT ? { padding: 0 } : {}}>
         {activeSubTab === ChartSubTab.DETAIL && (
             <div className="animate-fade-in"><BaziAnalysisView chart={chart} onShowModal={openDetailedModal} /></div>
         )}
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
                    <button onClick={() => { if(!isVip && !apiKey) return alert('请输入API Key'); onAiAnalysis(); }} disabled={loadingAi} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${loadingAi ? 'bg-stone-100 text-stone-400' : 'bg-stone-950 text-white active:scale-95 shadow-lg'}`}>
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

// --- 6. 首页视图组件 (完善版) ---
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
    <div className="flex flex-col h-full bg-[#fafaf9] overflow-y-auto no-scrollbar">
       <div className="min-h-full flex flex-col justify-center p-6 pb-10 max-w-md mx-auto w-full">
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
       </div>

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
const ArchiveView: React.FC<{ archives: UserProfile[]; setArchives: any; onSelect: any; isVip: boolean; onVipClick: () => void; session: any; onLogout: () => void }> = ({ archives, setArchives, onSelect, isVip, onVipClick, session, onLogout }) => {
    const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
    const [viewingReports, setViewingReports] = useState<UserProfile | null>(null);
    const [customTag, setCustomTag] = useState('');

    const PRESET_TAGS = ['家人', '朋友', '同事', '客户', '自己'];

    const handleSaveEdit = async () => {
        if (!editingProfile) return;
        const updatedList = await updateArchive(editingProfile);
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
        <div className="h-full flex flex-col bg-[#f5f5f4] overflow-y-auto pb-24">
             {session && (
                 <div className="bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-stone-900 text-amber-500 flex items-center justify-center font-bold text-lg border-2 border-amber-500 shadow-sm">
                             {session.user.email?.[0].toUpperCase()}
                         </div>
                         <div>
                             <p className="text-xs font-bold text-stone-900">{session.user.email}</p>
                             <p className="text-[10px] text-stone-400 font-medium">云端同步已开启</p>
                         </div>
                     </div>
                     <button onClick={onLogout} className="p-2 bg-stone-50 text-stone-500 rounded-lg hover:bg-stone-100 border border-stone-200">
                         <LogOut size={16} />
                     </button>
                 </div>
             )}

            <div className="p-5 space-y-4">
                {!isVip && (
                    <div onClick={onVipClick} className="bg-gradient-to-r from-stone-900 to-stone-700 rounded-3xl p-5 shadow-lg relative overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Crown size={80} /></div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-amber-400 mb-1">升级 VIP 尊享版</h3>
                                <p className="text-xs text-stone-300 font-medium">解锁 AI 深度对话 · 免 Key 无限畅享</p>
                            </div>
                            <div className="bg-amber-400 text-stone-900 px-3 py-2 rounded-xl text-xs font-black shadow-md group-hover:bg-amber-300 transition-colors">
                                立即开通
                            </div>
                        </div>
                    </div>
                )}

                {archives.length > 0 ? archives.map(p => (
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
                )) : <div className="text-center py-20 text-stone-400 font-bold text-sm">暂无云端档案，请先排盘保存</div>}
            </div>

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
                        <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50"><h3 className="font-black text-stone-900">{viewingReports.name} 的报告库</h3><X onClick={() => setViewingReports(null)} size={20} className="text-stone-400 cursor-pointer"/></div>
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
  const [aiReport, setAiReport] = useState<AiBaziReport | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isVip, setIsVip] = useState(() => localStorage.getItem('is_vip_user') === 'true');
  const [showVipModal, setShowVipModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadData = async () => {
        if (session) {
            const data = await getArchives();
            setArchives(data);
        } else {
            setArchives([]);
        }
    };
    loadData();
  }, [session]);

  const handleGenerate = (profile: UserProfile) => {
    try {
        // 🔥 关键修正：确保日期格式安全
        let safeDate = profile.birthDate;
        if (safeDate.length === 8 && !safeDate.includes('-')) {
            safeDate = `${safeDate.slice(0, 4)}-${safeDate.slice(4, 6)}-${safeDate.slice(6, 8)}`;
        }
        
        const newBazi = calculateBazi({ ...profile, birthDate: safeDate });
        
        setCurrentProfile(profile);
        setBaziChart(newBazi);
        setCurrentTab(AppTab.CHART);
        setAiReport(null);

        // 后台异步保存
        if (session) {
            saveArchive(profile)
              .then(updatedList => {
                  setArchives(updatedList);
                  // 如果是新建档案，回填 ID
                  if (updatedList.length > 0 && updatedList[0].name === profile.name) {
                      setCurrentProfile(prev => prev ? { ...prev, id: updatedList[0].id } : null);
                  }
              })
              .catch(err => console.error("后台自动保存失败", err));
        }
    } catch (e) { 
        console.error("排盘崩溃:", e);
        alert("排盘失败，请检查出生日期格式是否正确"); 
    }
  };

  const handleManualSave = async () => {
      if (!currentProfile || !session) return alert('未登录或无数据');
      try {
          const updatedList = await saveArchive(currentProfile);
          setArchives(updatedList);
          if (updatedList.length > 0) {
              const justSaved = updatedList[0];
              if (justSaved.name === currentProfile.name) {
                  setCurrentProfile(justSaved);
              }
          }
      } catch(e) {
          // storageService 已处理报错
      }
  };

  const handleActivateVip = () => {
      setIsVip(true);
      localStorage.setItem('is_vip_user', 'true');
      alert("VIP 激活成功！您已解锁 AI 对话功能和无限畅享特权。");
  };

  const handleAiAnalysis = async () => {
    const key = sessionStorage.getItem('ai_api_key');
    setLoadingAi(true);
    try {
      const result = await analyzeBaziStructured(baziChart!, key || undefined);
      setAiReport(result);
      if (currentProfile && session) {
        const updated = await saveAiReportToArchive(currentProfile.id, result.copyText, 'bazi');
        setArchives(updated);
      }
    } catch (e) { 
      alert(e instanceof Error ? e.message : '分析过程出错'); 
    } finally { 
      setLoadingAi(false); 
    }
  };

  const renderContent = () => {
      switch (currentTab) {
          case AppTab.HOME:
              return <HomeView onGenerate={handleGenerate} archives={archives} />;
          case AppTab.CHART:
              return baziChart && currentProfile ? (
                  // 🔥 加上 ErrorBoundary 防止白屏
                  <ErrorBoundary>
                      <BaziChartView 
                        profile={currentProfile} 
                        chart={baziChart} 
                        onShowModal={setModalData} 
                        onSaveReport={async (r:string, t:'bazi'|'ziwei')=> { const updated = await saveAiReportToArchive(currentProfile.id, r, t); setArchives(updated); }} 
                        onAiAnalysis={handleAiAnalysis} 
                        loadingAi={loadingAi} 
                        aiReport={aiReport} 
                        isVip={isVip} 
                        onManualSave={handleManualSave} 
                      />
                  </ErrorBoundary>
              ) : null;
          case AppTab.ZIWEI:
              return currentProfile ? <ZiweiView profile={currentProfile} onSaveReport={async (r) => { const updated = await saveAiReportToArchive(currentProfile.id, r, 'ziwei'); setArchives(updated); }} isVip={isVip} /> : null;
          case AppTab.ARCHIVE:
              if (!session) return <div className="flex flex-col items-center justify-center h-full p-6 bg-[#f5f5f4]"><Auth onLoginSuccess={()=>{}} /></div>;
              return <ArchiveView archives={archives} setArchives={setArchives} onSelect={handleGenerate} isVip={isVip} onVipClick={() => setShowVipModal(true)} session={session} onLogout={() => supabase.auth.signOut()}/>;
          default:
              return <HomeView onGenerate={handleGenerate} archives={archives} />;
      }
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden text-stone-950 font-sans select-none transition-colors duration-700 ${isVip ? 'bg-[#181816]' : 'bg-[#f5f5f4]'}`}>
      <AppHeader title={currentTab === AppTab.HOME ? '玄枢命理' : currentProfile?.name || '排盘'} rightAction={currentTab !== AppTab.HOME && <button onClick={()=>{setCurrentProfile(null);setCurrentTab(AppTab.HOME);setAiReport(null);}} className={`p-2 rounded-full transition-colors ${isVip ? 'hover:bg-white/10 text-stone-300' : 'hover:bg-stone-100 text-stone-700'}`}><RotateCcw size={18} /></button>} isVip={isVip} />
      <div className="flex-1 overflow-hidden relative">{renderContent()}</div>
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      {modalData && <DetailModal data={modalData} chart={baziChart} onClose={() => setModalData(null)} />}
      {showVipModal && <VipActivationModal onClose={() => setShowVipModal(false)} onActivate={handleActivateVip} />}
    </div>
  );
};

export default App;