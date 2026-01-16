import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { Send, Crown, HelpCircle, Activity, Sparkles, User, Copy, Check, Trash2, ArrowDown } from 'lucide-react';
import { BaziChart, UserProfile } from '../types';
import { ChatMessage, sendChatMessage, ChatMode } from '../services/chatService';
import { SmartTextRenderer } from '../components/ui/BaziUI';
import { calculateChart } from '../ziwei/services/astrologyService';
import { calculateBazi } from '../services/baziService'; 
import { Solar } from 'lunar-javascript';

const CopyButton: React.FC<{ content: string }> = ({ content }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        const cleanContent = content.split('|||')[0];
        navigator.clipboard.writeText(cleanContent).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-600 transition-colors mt-2 ml-1 px-2 py-1 rounded-md hover:bg-stone-100" title="复制全文">
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? <span className="text-emerald-500 font-medium">已复制</span> : <span>复制</span>}
        </button>
    );
};

export const AiChatView: React.FC<{ chart: BaziChart; profile: UserProfile; isVip: boolean }> = ({ chart, profile, isVip }) => {
    
    // --- 1. 时间计算 (公历 + 干支) ---
    const timeContext = useMemo(() => {
        try {
            const now = new Date();
            const solar = Solar.fromDate(now);
            const lunar = solar.getLunar();
            const eightChar = lunar.getEightChar();
            eightChar.setSect(1); // 以立春为界
            
            const gregorianStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;
            const ganzhiStr = `${eightChar.getYearGan()}${eightChar.getYearZhi()}年 ${eightChar.getMonthGan()}${eightChar.getMonthZhi()}月 ${eightChar.getDayGan()}${eightChar.getDayZhi()}日`;
            
            // 返回组合字符串，让AI同时看到公历和干支，避免幻觉
            return `公历${gregorianStr} (农历/干支：${ganzhiStr})`;
        } catch (e) { return "时间获取失败"; }
    }, []); 

    // --- 2. 状态管理 ---
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        if (typeof window !== 'undefined') {
            const key = `chat_history_${profile.id}`;
            const saved = localStorage.getItem(key);
            if (saved) { 
                try { 
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) return parsed.filter(m => m && m.content);
                } catch (e) {} 
            }
        }
        return [{ 
            role: 'assistant', 
            content: `尊贵的 VIP 用户，您好！\n我是您的专属命理师。我已经深度研读了您的命盘。\n\n当前时间：【${timeContext}】\n请问您今天想了解哪方面的运势？` 
        }];
    });
    
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>(['我的事业运如何？', '最近财运怎么样？', '感情方面有桃花吗？']);
    const [mode, setMode] = useState<ChatMode>('bazi'); 
    
    // 滚动相关
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    
    // 🔥 解决痛点2：使用 isReady 控制透明度，实现“无感加载”
    const [isReady, setIsReady] = useState(false);

    // --- 3. 紫微数据辅助 ---
    const generateZiweiString = (p: UserProfile) => {
        try {
            if (!p.birthDate || !p.birthTime) return "（用户出生信息不完整）";
            let safeDate = p.birthDate.replace(/\//g, '-');
            const dateParts = safeDate.split('-');
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]);
            const day = parseInt(dateParts[2]);
            const hour = parseInt(p.birthTime.split(':')[0]);
            const genderKey = p.gender === 'male' ? 'M' : 'F';
            const lng = p.longitude || 120;
            const zwChart = calculateChart(year, month, day, hour, genderKey, lng);
            if (!zwChart || !zwChart.palaces) return "（紫微排盘失败）";
            
            let desc = "【紫微命盘摘要】\n";
            desc += `五行局：${zwChart.bureau?.name || '未知'}\n`;
            const mingGong = zwChart.palaces.find(p => p.isMing);
            if (mingGong) {
                desc += `命宫主星：${mingGong.stars?.major?.map(s=>s.name).join(', ') || '无'}\n`;
            }
            return desc; 
        } catch (e) { return "（紫微排盘计算异常）"; }
    };
    const ziweiDataString = useMemo(() => generateZiweiString(profile), [profile]);

    // --- 4. 滚动逻辑 (核心修复) ---
    
    // 监听用户手动滚动
    const handleScroll = () => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const isUp = scrollHeight - scrollTop - clientHeight > 50;
            setIsUserScrolledUp(isUp);
        }
    };

    // 自动保存
    useEffect(() => {
        const key = `chat_history_${profile.id}`;
        localStorage.setItem(key, JSON.stringify(messages));
    }, [messages, profile.id]);

    // 🔥 页面初始化：静默定位到底部
    useLayoutEffect(() => {
        if (chatContainerRef.current) {
            // 直接修改 scrollTop，不使用 scrollIntoView，避免动画
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            // 定位完成后，显示内容
            requestAnimationFrame(() => setIsReady(true));
        }
    }, []); // 仅在挂载时执行一次

    // 🔥 消息更新：平滑滚动 (仅当用户没往上滑时)
    useEffect(() => {
        if (isReady && !isUserScrolledUp) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isReady, isUserScrolledUp]);


    // --- 5. 交互逻辑 ---
    const handleClearHistory = () => {
        if (window.confirm('确定要清空当前对话记录吗？')) {
            const defaultMsg: ChatMessage = { 
                role: 'assistant', 
                content: `对话已重置。\n我是您的专属命理师，当前时空【${timeContext}】，请问您现在想了解什么？` 
            };
            setMessages([defaultMsg]);
            setSuggestions(['我的事业运如何？', '最近财运怎么样？', '感情方面有桃花吗？']);
            localStorage.removeItem(`chat_history_${profile.id}`);
            // 强制复位
            setIsUserScrolledUp(false);
            if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    const handleSend = async (contentOverride?: string) => {
        const msgContent = contentOverride || input;
        if (!msgContent.trim() || loading) return;
         
        const userMsg: ChatMessage = { role: 'user', content: msgContent };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSuggestions([]); 
        setLoading(true);
        setIsUserScrolledUp(false); // 发送新消息强制回底

        try {
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
            
            let fullText = ""; 
            
            // 实时重算数据，确保名字和八字是最新的
            const freshBaziChart = calculateBazi(profile);
            const freshZiweiString = generateZiweiString(profile);

            await sendChatMessage(
                [...messages, userMsg], 
                profile,        
                freshBaziChart,   
                freshZiweiString, 
                mode, 
                (chunk) => {
                    fullText += chunk;
                    const parts = fullText.split('|||');
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        const last = newMsgs[newMsgs.length - 1];
                        if (last.role === 'assistant') last.content = parts[0];
                        return newMsgs;
                    });
                    if (parts[1]) {
                        const newSugs = parts[1].split(/[;；]/).map(s=>s.trim()).filter(s=>s);
                        if (newSugs.length > 0) setSuggestions(newSugs);
                    }
                },
                isVip,
                timeContext // 传入公历+干支
            );

        } catch (error: any) {
            setMessages(prev => {
                const newMsgs = [...prev];
                const last = newMsgs[newMsgs.length - 1];
                if (last.role === 'assistant' && !last.content) last.content = `😓 请求中断: ${error.message}`;
                return newMsgs;
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f8f7] relative">
            {/* 顶部栏 */}
            <div className="bg-white/90 backdrop-blur-md border-b border-stone-200 p-2 flex justify-between items-center z-20 sticky top-0 shadow-sm px-4">
                <div className="w-8"></div>
                <div className="bg-stone-100 p-1 rounded-xl flex gap-1">
                    <button onClick={() => setMode('bazi')} className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${mode === 'bazi' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}><Activity size={14} /> 八字</button>
                    <button onClick={() => setMode('ziwei')} className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${mode === 'ziwei' ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400'}`}><Sparkles size={14} /> 紫微</button>
                </div>
                <button onClick={handleClearHistory} className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"><Trash2 size={16} /></button>
            </div>

            {/* 消息列表区 - 🔥 使用 opacity 控制显隐，解决闪烁问题 */}
            <div 
                ref={chatContainerRef}
                onScroll={handleScroll}
                className={`flex-1 overflow-y-auto p-4 space-y-6 pb-6 custom-scrollbar scroll-smooth transition-opacity duration-200 ${isReady ? 'opacity-100' : 'opacity-0'}`}
            >
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm ${mode === 'ziwei' ? 'bg-indigo-900 text-white' : 'bg-stone-900 text-amber-400'}`}>
                                {mode === 'ziwei' ? <Sparkles size={14}/> : <Crown size={14} fill="currentColor"/>}
                            </div>
                        )}
                        <div className="flex flex-col max-w-[85%]">
                            <div className={`p-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all ${msg.role === 'user' ? 'bg-stone-900 text-white rounded-tr-none' : 'bg-white text-stone-800 rounded-tl-none border border-stone-100'}`}>
                                <div className="select-text cursor-text selection:bg-indigo-100 selection:text-indigo-900" style={{ WebkitUserSelect: 'text', userSelect: 'text', wordBreak: 'break-word' }}>
                                    <SmartTextRenderer content={msg.content} className={msg.role === 'user' ? 'text-white' : 'text-stone-800'} />
                                </div>
                            </div>
                            {msg.role === 'assistant' && msg.content && <CopyButton content={msg.content} />}
                        </div>
                        {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0 ml-2 mt-1"><User size={16} className="text-stone-500"/></div>}
                    </div>
                ))}
                
                {loading && <div className="flex items-center gap-2 p-4 text-xs text-stone-400 animate-pulse"><Activity size={14} className="animate-spin"/> <span>大师正在推演中...</span></div>}
                
                <div ref={messagesEndRef} className="h-2"/>
            </div>

            {isUserScrolledUp && loading && (
                <button 
                    onClick={() => { setIsUserScrolledUp(false); messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                    className="absolute bottom-24 right-4 bg-stone-900 text-white p-2 rounded-full shadow-lg z-30 animate-bounce"
                >
                    <ArrowDown size={16} />
                </button>
            )}

            {/* 底部输入区 */}
            <div className="p-3 bg-white border-t border-stone-200 z-20 pb-safe">
                {suggestions.length > 0 && !loading && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 px-1">
                        {suggestions.map((s,i) => (<button key={i} onClick={()=>handleSend(s)} className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors flex items-center gap-1 active:scale-95"><HelpCircle size={12}/>{s}</button>))}
                    </div>
                )}
                <div className="flex gap-2 items-end">
                    <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={mode === 'bazi' ? "问问八字运势..." : "问问紫微星象..."} className="flex-1 bg-stone-100 rounded-2xl px-4 py-3 text-sm outline-none resize-none max-h-24 transition-colors focus:bg-white focus:ring-2 focus:ring-stone-200" rows={1} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}/>
                    <button onClick={()=>handleSend()} disabled={loading||!input.trim()} className={`p-3 rounded-full flex items-center justify-center transition-all ${loading||!input.trim() ? 'bg-stone-200 text-stone-400' : 'bg-stone-900 text-amber-400 shadow-lg active:scale-95'}`}>{loading ? <Activity size={20} className="animate-spin"/> : <Send size={20} />}</button>
                </div>
            </div>
        </div>
    );
};