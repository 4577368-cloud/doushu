import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Crown, HelpCircle, Activity, Sparkles, User, AlertCircle } from 'lucide-react';
import { BaziChart, UserProfile } from '../types';
import { ChatMessage, sendChatMessage, ChatMode } from '../services/chatService';
import { SmartTextRenderer } from '../components/ui/BaziUI';
import { calculateChart } from '../ziwei/services/astrologyService';

// 1. 接收 isVip 参数
export const AiChatView: React.FC<{ chart: BaziChart; profile: UserProfile; isVip: boolean }> = ({ chart, profile, isVip }) => {
    // 错误边界状态 (组件级)
    const [renderError, setRenderError] = useState<string | null>(null);

    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        if (typeof window !== 'undefined') {
            const key = `chat_history_${profile.id}`;
            const saved = localStorage.getItem(key);
            if (saved) { 
                try { return JSON.parse(saved); } catch (e) { console.error(e); } 
            }
        }
        return [{ 
            role: 'assistant', 
            content: `尊贵的 VIP 用户，您好！\n我是您的专属命理师。我已经深度研读了您的命盘。\n\n您不仅可以问我八字，还可以点击顶部切换到【紫微斗数】视角来交叉验证。请问您今天想了解哪方面的运势？` 
        }];
    });
    
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>(['我的事业运如何？', '最近财运怎么样？', '感情方面有桃花吗？']);
    const [mode, setMode] = useState<ChatMode>('bazi'); 
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 2. 紫微数据计算 (增加 try-catch 防止日期格式导致的空白页)
    const ziweiDataString = useMemo(() => {
        try {
            if (!profile.birthDate || !profile.birthTime) return "（用户出生信息不完整）";
            
            // 安全处理日期
            let safeDate = profile.birthDate.replace(/\//g, '-');
            const dateParts = safeDate.split('-');
            if (dateParts.length !== 3) return "（日期格式错误）";

            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]);
            const day = parseInt(dateParts[2]);
            const hour = parseInt(profile.birthTime.split(':')[0]);
            const genderKey = profile.gender === 'male' ? 'M' : 'F';
            const lng = profile.longitude || 120;

            const zwChart = calculateChart(year, month, day, hour, genderKey, lng);
            
            // 简单序列化，防止 zwChart 结构异常导致的 crash
            if (!zwChart || !zwChart.palaces) return "（紫微排盘失败）";
            
            let desc = "【紫微命盘摘要】\n";
            desc += `五行局：${zwChart.bureau?.name || '未知'}\n`;
            
            const mingGong = zwChart.palaces.find(p => p.isMing);
            if (mingGong) {
                desc += `命宫主星：${mingGong.stars?.major?.map(s=>s.name).join(', ') || '无'}\n`;
            }
            return desc; 
        } catch (e: any) {
            console.error("紫微排盘 CRASH:", e);
            return "（紫微排盘计算异常，请忽略此部分）";
        }
    }, [profile]);

    // 3. 自动滚动与保存
    useEffect(() => {
        try {
            const key = `chat_history_${profile.id}`;
            localStorage.setItem(key, JSON.stringify(messages));
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } catch(e) { console.error("Storage Error", e); }
    }, [messages, profile.id]);

    // 4. 发送逻辑
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
            
            // 🔥 调用 service，传入 isVip
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
                    if (parts[1]) {
                        setSuggestions(parts[1].split(/[;；]/).map(s=>s.trim()).filter(s=>s));
                    }
                },
                isVip // 🔥 关键
            );

        } catch (error: any) {
            console.error("Chat Error:", error);
            setMessages(prev => {
                const newMsgs = [...prev];
                const last = newMsgs[newMsgs.length - 1];
                if (last.role === 'assistant' && !last.content) {
                     last.content = `😓 请求失败: ${error.message}`;
                }
                return newMsgs;
            });
        } finally {
            setLoading(false);
        }
    };

    // 如果渲染出错，显示这个 fallback UI
    if (renderError) {
        return <div className="p-10 text-center text-rose-500"><AlertCircle className="mx-auto mb-2"/>页面渲染出错，请刷新重试</div>;
    }

    return (
        <div className="flex flex-col h-full bg-[#f8f8f7] relative">
            {/* 顶部栏 */}
            <div className="bg-white/80 backdrop-blur-md border-b border-stone-200 p-2 flex justify-center z-20 sticky top-0">
                <div className="bg-stone-100 p-1 rounded-xl flex gap-1">
                    <button onClick={() => setMode('bazi')} className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${mode === 'bazi' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}><Activity size={14} /> 八字</button>
                    <button onClick={() => setMode('ziwei')} className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${mode === 'ziwei' ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400'}`}><Sparkles size={14} /> 紫微</button>
                </div>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-6 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 ${mode === 'ziwei' ? 'bg-indigo-900 text-white' : 'bg-stone-900 text-amber-400'}`}>{mode === 'ziwei' ? <Sparkles size={14}/> : <Crown size={14} fill="currentColor"/>}</div>}
                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-stone-900 text-white rounded-tr-none' : 'bg-white text-stone-800 rounded-tl-none border border-stone-100'}`}>
                            <SmartTextRenderer content={msg.content} className={msg.role==='user'?'text-white':'text-stone-800'} />
                        </div>
                    </div>
                ))}
                {loading && <div className="flex items-center gap-2 p-4 text-xs text-stone-400"><Activity size={14} className="animate-spin"/> 大师正在思考...</div>}
                <div ref={messagesEndRef} className="h-2"/>
            </div>

            {/* 输入栏 */}
            <div className="p-3 bg-white border-t border-stone-200 z-20">
                {suggestions.length > 0 && !loading && <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">{suggestions.map((s,i)=><button key={i} onClick={()=>handleSend(s)} className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full bg-stone-50 border border-stone-200 text-stone-600 flex items-center gap-1"><HelpCircle size={12}/>{s}</button>)}</div>}
                <div className="flex gap-2 items-end">
                    <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="输入您的问题..." className="flex-1 bg-stone-100 rounded-2xl px-4 py-3 text-sm outline-none resize-none max-h-24" rows={1}/>
                    <button onClick={()=>handleSend()} disabled={loading||!input.trim()} className="p-3 rounded-full bg-stone-900 text-amber-400"><Send size={20}/></button>
                </div>
            </div>
        </div>
    );
};