import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Crown, HelpCircle, Activity, Sparkles, User, Copy, Check } from 'lucide-react';
import { BaziChart, UserProfile } from '../types';
import { ChatMessage, sendChatMessage, ChatMode } from '../services/chatService';
import { SmartTextRenderer } from '../components/ui/BaziUI';
import { calculateChart } from '../ziwei/services/astrologyService';

// 复制按钮小组件
const CopyButton: React.FC<{ content: string }> = ({ content }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        const cleanContent = content.split('|||')[0]; // 只复制正文，不复制建议
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

// 🔥 确保 Props 接收 isVip
export const AiChatView: React.FC<{ chart: BaziChart; profile: UserProfile; isVip: boolean }> = ({ chart, profile, isVip }) => {
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        if (typeof window !== 'undefined') {
            const key = `chat_history_${profile.id}`;
            const saved = localStorage.getItem(key);
            if (saved) { try { return JSON.parse(saved); } catch (e) {} }
        }
        return [{ role: 'assistant', content: `尊贵的 VIP 用户，您好！\n我是您的专属命理师。我已经深度研读了您的命盘。\n\n您不仅可以问我八字，还可以点击顶部切换到【紫微斗数】视角来交叉验证。请问您今天想了解哪方面的运势？` }];
    });
    
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>(['我的事业运如何？', '最近财运怎么样？', '感情方面有桃花吗？']);
    const [mode, setMode] = useState<ChatMode>('bazi'); 
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 紫微数据计算
    const ziweiDataString = useMemo(() => {
        try {
            if (!profile.birthDate || !profile.birthTime) return "（用户出生信息不完整）";
            let safeDate = profile.birthDate.replace(/\//g, '-');
            const dateParts = safeDate.split('-');
            if (dateParts.length !== 3) return "（日期格式错误）";
            const zwChart = calculateChart(parseInt(dateParts[0]), parseInt(dateParts[1]), parseInt(dateParts[2]), parseInt(profile.birthTime.split(':')[0]), profile.gender === 'male' ? 'M' : 'F', profile.longitude || 120);
            if (!zwChart || !zwChart.palaces) return "（紫微排盘失败）";
            
            let desc = "【紫微命盘摘要】\n";
            desc += `五行局：${zwChart.bureau?.name || '未知'}\n`;
            const mingGong = zwChart.palaces.find(p => p.isMing);
            if (mingGong) desc += `命宫主星：${mingGong.stars?.major?.map(s=>s.name).join(', ') || '无'}\n`;
            return desc; 
        } catch (e) { return "（紫微排盘计算异常）"; }
    }, [profile]);

    // 自动滚动与保存
    useEffect(() => {
        const key = `chat_history_${profile.id}`;
        localStorage.setItem(key, JSON.stringify(messages));
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, profile.id]);

    // 发送逻辑
    const handleSend = async (contentOverride?: string) => {
        const msgContent = contentOverride || input;
        if (!msgContent.trim() || loading) return;
         
        const userMsg: ChatMessage = { role: 'user', content: msgContent };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSuggestions([]); 
        setLoading(true);

        try {
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
            
            let fullText = ""; 
            
            await sendChatMessage(
                [...messages, userMsg], 
                profile,
                chart,
                ziweiDataString,
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
                    if (parts[1]) setSuggestions(parts[1].split(/[;；]/).map(s=>s.trim()).filter(s=>s));
                },
                isVip // 🔥🔥🔥 关键：必须传 isVip，否则 service 会拦截
            );

        } catch (error: any) {
            setMessages(prev => {
                const newMsgs = [...prev];
                const last = newMsgs[newMsgs.length - 1];
                if (last.role === 'assistant' && !last.content) last.content = `😓 请求失败: ${error.message}`;
                return newMsgs;
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f8f7] relative">
            {/* 顶部栏 */}
            <div className="bg-white/90 backdrop-blur-md border-b border-stone-200 p-2 flex justify-center z-20 sticky top-0 shadow-sm">
                <div className="bg-stone-100 p-1 rounded-xl flex gap-1">
                    <button onClick={() => setMode('bazi')} className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${mode === 'bazi' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}><Activity size={14} /> 八字</button>
                    <button onClick={() => setMode('ziwei')} className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${mode === 'ziwei' ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400'}`}><Sparkles size={14} /> 紫微</button>
                </div>
            </div>

            {/* 消息区 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-6 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm ${mode === 'ziwei' ? 'bg-indigo-900 text-white' : 'bg-stone-900 text-amber-400'}`}>
                                {mode === 'ziwei' ? <Sparkles size={14}/> : <Crown size={14} fill="currentColor"/>}
                            </div>
                        )}
                        
                        <div className="flex flex-col max-w-[85%]">
                            <div className={`p-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all ${msg.role === 'user' ? 'bg-stone-900 text-white rounded-tr-none' : 'bg-white text-stone-800 rounded-tl-none border border-stone-100'}`}>
                                {/* 🔥 复制/选择支持：select-text 和 iOS 兼容 */}
                                <div className="select-text cursor-text selection:bg-indigo-100 selection:text-indigo-900" style={{ WebkitUserSelect: 'text', userSelect: 'text', wordBreak: 'break-word' }}>
                                    <SmartTextRenderer content={msg.content} className={msg.role === 'user' ? 'text-white' : 'text-stone-800'} />
                                </div>
                            </div>
                            {/* 复制按钮 */}
                            {msg.role === 'assistant' && msg.content && <CopyButton content={msg.content} />}
                        </div>

                        {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0 ml-2 mt-1"><User size={16} className="text-stone-500"/></div>}
                    </div>
                ))}
                {loading && <div className="flex items-center gap-2 p-4 text-xs text-stone-400 animate-pulse"><Activity size={14} className="animate-spin"/> <span>大师正在推演中...</span></div>}
                <div ref={messagesEndRef} className="h-2"/>
            </div>

            {/* 输入区 */}
            <div className="p-3 bg-white border-t border-stone-200 z-20 pb-safe">
                {suggestions.length > 0 && !loading && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 px-1">{suggestions.map((s,i) => (<button key={i} onClick={()=>handleSend(s)} className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors flex items-center gap-1 active:scale-95"><HelpCircle size={12}/>{s}</button>))}</div>
                )}
                <div className="flex gap-2 items-end">
                    <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={mode === 'bazi' ? "问问八字运势..." : "问问紫微星象..."} className="flex-1 bg-stone-100 rounded-2xl px-4 py-3 text-sm outline-none resize-none max-h-24 transition-colors focus:bg-white focus:ring-2 focus:ring-stone-200" rows={1} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}/>
                    <button onClick={()=>handleSend()} disabled={loading||!input.trim()} className={`p-3 rounded-full flex items-center justify-center transition-all ${loading||!input.trim() ? 'bg-stone-200 text-stone-400' : 'bg-stone-900 text-amber-400 shadow-lg active:scale-95'}`}>{loading ? <Activity size={20} className="animate-spin"/> : <Send size={20} />}</button>
                </div>
            </div>
        </div>
    );
};