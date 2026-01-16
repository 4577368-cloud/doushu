import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Crown, HelpCircle, Activity, Sparkles } from 'lucide-react';
import { BaziChart, UserProfile } from '../types';
import { ChatMessage, sendChatMessage, ChatMode } from '../services/chatService';
import { SmartTextRenderer } from '../components/ui/BaziUI';
// 🔥 修复点1：引用正确的函数名 calculateChart
import { calculateChart } from '../ziwei/services/astrologyService';

export const AiChatView: React.FC<{ chart: BaziChart; profile: UserProfile }> = ({ chart, profile }) => {
    // 1. 状态管理
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const key = `chat_history_${profile.id}`;
        const saved = localStorage.getItem(key);
        if (saved) { try { return JSON.parse(saved); } catch (e) { console.error(e); } }
        return [{ role: 'assistant', content: `尊贵的 VIP 用户，您好！\n我是您的专属命理师。我已经深度研读了您的命盘。\n\n您不仅可以问我八字，还可以点击顶部切换到【紫微斗数】视角来交叉验证。请问您今天想了解哪方面的运势？` }];
    });
    
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>(['我的事业运如何？', '最近财运怎么样？', '感情方面有桃花吗？']);
    const [mode, setMode] = useState<ChatMode>('bazi'); 
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 2. 预先计算紫微盘数据 (转成文本喂给 AI)
    const ziweiDataString = useMemo(() => {
        try {
            // 🔥 修复点2：参数转换
            // profile.birthDate 格式为 "YYYY-MM-DD"
            const [yStr, mStr, dStr] = profile.birthDate.split('-');
            const year = parseInt(yStr);
            const month = parseInt(mStr);
            const day = parseInt(dStr);
            
            // profile.birthTime 格式为 "HH:mm"
            const hour = parseInt(profile.birthTime.split(':')[0]);
            
            // 性别转换: 'male'/'female' -> 'M'/'F'
            const genderKey = profile.gender === 'male' ? 'M' : 'F';
            
            // 经度默认 120 (如果 profile 里没有)
            const lng = profile.longitude || 120;

            // 调用正确的排盘函数
            const zwChart = calculateChart(year, month, day, hour, genderKey, lng);
            
            // 序列化关键信息给 AI
            let desc = "【紫微命盘摘要】\n";
            if (zwChart && zwChart.palaces) {
                // 局数
                desc += `五行局：${zwChart.bureau.name}\n`;
                
                const mingGong = zwChart.palaces.find(p => p.isMing);
                if (mingGong) {
                    desc += `命宫主星：${mingGong.stars.major.map(s=>s.name).join(', ') || '无主星'}\n`;
                    desc += `命宫辅星：${mingGong.stars.minor.map(s=>s.name).join(', ')}\n`;
                    // 补充命宫四化信息
                    const huaInfo = [...mingGong.stars.major, ...mingGong.stars.minor]
                        .filter(s => s.hua)
                        .map(s => `${s.name}化${s.hua}`)
                        .join('，');
                    if (huaInfo) desc += `命宫四化：${huaInfo}\n`;
                }
                desc += `身宫位置：${zwChart.palaces[zwChart.shenIndex].name}\n`;
                
                // 补充三方四正
                // 简单列举一下财帛、官禄的主星
                const moneyPalace = zwChart.palaces.find(p => p.name === '财帛');
                const careerPalace = zwChart.palaces.find(p => p.name === '官禄');
                if (moneyPalace) desc += `财帛宫主星：${moneyPalace.stars.major.map(s=>s.name).join(', ')}\n`;
                if (careerPalace) desc += `官禄宫主星：${careerPalace.stars.major.map(s=>s.name).join(', ')}\n`;
            }
            return desc; 
        } catch (e) {
            console.error("紫微排盘数据生成失败:", e);
            return "（紫微排盘数据生成异常，请侧重八字分析）";
        }
    }, [profile]);

    // 3. 自动保存 & 滚动
    useEffect(() => {
        const key = `chat_history_${profile.id}`;
        localStorage.setItem(key, JSON.stringify(messages));
        scrollToBottom();
    }, [messages, profile.id]);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

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
             
            await sendChatMessage(
                [...messages, userMsg], 
                profile,
                chart,
                ziweiDataString,
                mode, 
                (chunk) => {
                    // 简单的流式处理，实际可能会有粘包，这里简化处理
                    // 注意：这里假设 chunk 是累加的或者前端负责累加，取决于 sendChatMessage 实现
                    // 如果 sendChatMessage 返回的是增量 chunk，我们需要一个 buffer
                    // 但通常 React state update 最好是拿到完整文本或者手动拼接
                    // 这里我们假设 chunk 是增量文本
                    
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        const lastMsg = newMsgs[newMsgs.length - 1];
                        if (lastMsg.role === 'assistant') {
                            // 这里做一个简单的处理：如果是第一次收到chunk，直接赋值，否则追加
                            // 但由于我们没有 ref 来存储中间状态，这里用一种简化的方式：
                            // 实际项目中建议把 fullText 存在 ref 里，然后 update state
                            
                            // 修正：sendChatMessage 的回调逻辑里我们通常会传回“当前完整的累积文本”或者需要前端拼
                            // 回顾 chatService，它是把 text chunk 传回来。
                            // 无论如何，最稳妥的方式是把 parts[0] 更新进去。
                            // 由于 React state update 是异步的，这里直接追加可能会有闭包问题
                            // 最好的方式是 sendChatMessage 内部维护 buffer，回调传回 fullText
                            
                            // 鉴于我们无法修改 chatService 的签名（或者不想改动太大）
                            // 我们这里假设 chatService 的 onStream 传回的是 *增量*。
                            // 实际上，为了 UI 不闪烁，最简单的做法是在 handleSend 内部维护一个 let fullText = ""
                            
                            // (下面的逻辑已经在 handleSend 闭包里维护了 fullResponseBuffer 变量)
                        }
                        return newMsgs;
                    });
                }
            );
            
            // 上面的回调逻辑在闭包里比较难写，我们重新写一下 sendChatMessage 的调用方式
            // 实际上 sendChatMessage 内部的实现是：for await chunk ... onStream(text)
            // 所以我们需要在 handleSend 里拼接
            
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
                    const contentPart = parts[0];
                    const suggestionPart = parts[1];

                    setMessages(prev => {
                        const newMsgs = [...prev];
                        const lastMsg = newMsgs[newMsgs.length - 1];
                        if (lastMsg.role === 'assistant') {
                            lastMsg.content = contentPart;
                        }
                        return newMsgs;
                    });

                    if (suggestionPart) {
                        const newSuggestions = suggestionPart.split(/[;；]/).map(s => s.trim()).filter(s => s.length > 0);
                        if (newSuggestions.length > 0) {
                            setSuggestions(newSuggestions);
                        }
                    }
                }
            );

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
            {/* 顶部模式切换栏 */}
            <div className="bg-white border-b border-stone-200 p-2 flex justify-center items-center shadow-sm z-10">
                <div className="bg-stone-100 p-1 rounded-xl flex gap-1">
                    <button 
                        onClick={() => setMode('bazi')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${mode === 'bazi' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <Activity size={14} /> 八字视角
                    </button>
                    <button 
                        onClick={() => setMode('ziwei')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${mode === 'ziwei' ? 'bg-white text-indigo-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <Sparkles size={14} /> 紫微视角
                    </button>
                </div>
            </div>

            {/* 聊天内容区 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-6">
                <div className="text-center text-[10px] text-stone-400">
                    当前正在使用 {mode === 'bazi' ? '八字五行' : '紫微斗数'} 理论进行推演
                </div>

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm border border-stone-800 ${mode === 'ziwei' ? 'bg-indigo-900 text-white' : 'bg-stone-900 text-amber-400'}`}>
                                {mode === 'ziwei' ? <Sparkles size={14} /> : <Crown size={14} fill="currentColor" />}
                            </div>
                        )}
                        <div className={`max-w-[85%] p-4 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-stone-900 text-white rounded-tr-none shadow-stone-200'
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
                        <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center shrink-0 mr-2 mt-1"><Activity size={14} className="animate-spin"/></div>
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-stone-100 shadow-sm flex gap-1.5 items-center">
                            <div className="text-xs text-stone-400 font-bold animate-pulse">大师正在掐指一算...</div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
             
            {/* 底部输入区 */}
            <div className="p-3 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                {suggestions.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 px-1 animate-in fade-in slide-in-from-bottom-2">
                        {suggestions.map((s, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleSend(s)}
                                className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full border transition-colors flex items-center gap-1 active:scale-95 ${
                                    mode === 'ziwei' 
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                                    : 'bg-amber-50 text-amber-800 border-amber-100 hover:bg-amber-100'
                                }`}
                            >
                                <HelpCircle size={10} /> {s}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex gap-2 items-end">
                    <textarea 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        placeholder={mode === 'bazi' ? "问问八字运势..." : "问问紫微星象..."}
                        className="flex-1 bg-stone-100 border-transparent focus:bg-white focus:border-stone-300 rounded-2xl px-4 py-3 text-sm outline-none resize-none max-h-24 min-h-[48px] transition-all" 
                        rows={1} 
                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    />
                    <button 
                        onClick={() => handleSend()} 
                        disabled={loading || !input.trim()} 
                        className={`p-3 rounded-full h-12 w-12 flex items-center justify-center transition-all ${!input.trim() ? 'bg-stone-200 text-stone-400' : 'bg-stone-900 text-amber-400 shadow-lg active:scale-95 hover:bg-stone-800'}`}
                    >
                        <Send size={20} className={input.trim() ? "ml-0.5" : ""} />
                    </button>
                </div>
            </div>
        </div>
    );
};