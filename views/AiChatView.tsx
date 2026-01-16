import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Crown, HelpCircle, Activity, Sparkles, User } from 'lucide-react';
import { BaziChart, UserProfile } from '../types';
// 确保这个路径是你项目中 chatService 的真实路径
import { ChatMessage, sendChatMessage, ChatMode } from '../services/chatService'; 
// 确保 UI 组件路径正确
import { SmartTextRenderer } from '../components/ui/BaziUI';
// 确保紫微排盘函数路径正确
import { calculateChart } from '../ziwei/services/astrologyService';

export const AiChatView: React.FC<{ chart: BaziChart; profile: UserProfile }> = ({ chart, profile }) => {
    // 1. 状态管理
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        // 尝试从本地存储恢复对话
        const key = `chat_history_${profile.id}`;
        if (typeof window !== 'undefined') {
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
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // 2. 预先计算紫微盘数据 (转成文本喂给 AI)
    const ziweiDataString = useMemo(() => {
        try {
            if (!profile.birthDate || !profile.birthTime) return "（用户出生信息不完整，跳过紫微排盘）";

            // 增强日期的兼容性处理
            const dateParts = profile.birthDate.split(/[-/]/); // 支持 2023-01-01 或 2023/01/01
            if (dateParts.length !== 3) return "（日期格式异常）";

            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]);
            const day = parseInt(dateParts[2]);
            const hour = parseInt(profile.birthTime.split(':')[0]);
            
            const genderKey = profile.gender === 'male' ? 'M' : 'F';
            const lng = profile.longitude || 120; // 默认经度

            // 调用排盘算法
            const zwChart = calculateChart(year, month, day, hour, genderKey, lng);
            
            // 序列化关键信息
            let desc = "【紫微命盘摘要】\n";
            if (zwChart && zwChart.palaces) {
                desc += `五行局：${zwChart.bureau.name}\n`;
                
                const mingGong = zwChart.palaces.find(p => p.isMing);
                if (mingGong) {
                    desc += `命宫主星：${mingGong.stars.major.map(s=>s.name).join(', ') || '无主星'}\n`;
                    desc += `命宫辅星：${mingGong.stars.minor.map(s=>s.name).join(', ')}\n`;
                    
                    const huaInfo = [...mingGong.stars.major, ...mingGong.stars.minor]
                        .filter(s => s.hua)
                        .map(s => `${s.name}化${s.hua}`)
                        .join('，');
                    if (huaInfo) desc += `命宫四化：${huaInfo}\n`;
                }
                desc += `身宫位置：${zwChart.palaces[zwChart.shenIndex]?.name}\n`;
                
                // 补充财帛和官禄
                const moneyPalace = zwChart.palaces.find(p => p.name === '财帛');
                const careerPalace = zwChart.palaces.find(p => p.name === '官禄');
                if (moneyPalace) desc += `财帛宫主星：${moneyPalace.stars.major.map(s=>s.name).join(', ')}\n`;
                if (careerPalace) desc += `官禄宫主星：${careerPalace.stars.major.map(s=>s.name).join(', ')}\n`;
            }
            return desc; 
        } catch (e) {
            console.error("紫微排盘数据生成失败:", e);
            return "（紫微排盘计算出现未知错误，请侧重八字分析）";
        }
    }, [profile]);

    // 3. 自动保存 & 滚动
    useEffect(() => {
        const key = `chat_history_${profile.id}`;
        localStorage.setItem(key, JSON.stringify(messages));
        scrollToBottom();
    }, [messages, profile.id]);

    const scrollToBottom = () => { 
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
    };

    // 4. 发送逻辑
    const handleSend = async (contentOverride?: string) => {
        const msgContent = contentOverride || input;
        if (!msgContent.trim() || loading) return;
         
        // 立即上屏用户消息
        const userMsg: ChatMessage = { role: 'user', content: msgContent };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSuggestions([]); // 清空建议
        setLoading(true);

        try {
            // 先放一个空的 assistant 消息占位
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
            
            let fullText = ""; // 用于累积完整的响应文本

            // 调用我们在 ChatService 中定义的函数 (确保该函数已经解决了 CORS 问题)
            await sendChatMessage(
                [...messages, userMsg], // 传入当前完整历史
                profile,
                chart,
                ziweiDataString,
                mode, 
                (chunk) => {
                    // --- 流式回调 ---
                    fullText += chunk; // 累积文本
                    
                    // 实时解析是否包含建议问题 (格式: |||问题1;问题2)
                    const parts = fullText.split('|||');
                    const mainContent = parts[0];
                    const suggestionPart = parts[1];

                    // 更新 UI 状态
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        const lastMsg = newMsgs[newMsgs.length - 1];
                        if (lastMsg.role === 'assistant') {
                            lastMsg.content = mainContent;
                        }
                        return newMsgs;
                    });

                    // 如果发现了建议问题，更新建议栏
                    if (suggestionPart) {
                        const newSuggestions = suggestionPart.split(/[;；]/)
                            .map(s => s.trim())
                            .filter(s => s.length > 0);
                        if (newSuggestions.length > 0) {
                            setSuggestions(newSuggestions);
                        }
                    }
                }
            );

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                // 如果是空消息（说明刚开始就挂了），填入错误提示
                if(lastMsg.role === 'assistant' && lastMsg.content === '') {
                     lastMsg.content = '抱歉，连接天机（服务器）时出现波动，请检查网络或稍后再试。';
                }
                return newMsgs;
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f8f7] relative">
            {/* 顶部模式切换栏 */}
            <div className="bg-white/80 backdrop-blur-md border-b border-stone-200 p-2 flex justify-center items-center shadow-sm z-20 sticky top-0">
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
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 pb-6">
                <div className="text-center mt-2">
                    <span className="inline-block px-3 py-1 bg-stone-200/50 rounded-full text-[10px] text-stone-500 font-medium">
                        当前正在使用 {mode === 'bazi' ? '子平八字' : '紫微斗数'} 理论进行推演
                    </span>
                </div>

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        {msg.role === 'assistant' && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm border border-stone-800 ${mode === 'ziwei' ? 'bg-indigo-900 text-white' : 'bg-stone-900 text-amber-400'}`}>
                                {mode === 'ziwei' ? <Sparkles size={14} /> : <Crown size={14} fill="currentColor" />}
                            </div>
                        )}
                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-[14px] leading-relaxed shadow-sm break-words ${
                            msg.role === 'user' 
                                ? 'bg-stone-900 text-white rounded-tr-none shadow-stone-200'
                                : 'bg-white text-stone-800 rounded-tl-none border border-stone-100 shadow-stone-200'
                        }`}>
                            <SmartTextRenderer 
                                content={msg.content} 
                                className={msg.role === 'user' ? 'text-white' : 'text-stone-800'} 
                            />
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0 ml-2 mt-1">
                                <User size={16} className="text-stone-500"/>
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading 状态 */}
                {loading && messages[messages.length - 1].role === 'user' && (
                    <div className="flex justify-start animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 mr-2 mt-1">
                            <Activity size={14} className="animate-spin text-stone-400"/>
                        </div>
                        <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-stone-100 shadow-sm flex gap-1.5 items-center">
                            <div className="text-xs text-stone-400 font-medium">大师正在推演中...</div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-2" />
            </div>
             
            {/* 底部输入区 */}
            <div className="p-3 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-20">
                {/* 智能建议气泡 */}
                {suggestions.length > 0 && !loading && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 px-1 animate-in slide-in-from-bottom-2 fade-in">
                        {suggestions.map((s, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleSend(s)}
                                className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-full border transition-all flex items-center gap-1 active:scale-95 shadow-sm ${
                                    mode === 'ziwei' 
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-100 hover:bg-amber-100 hover:border-amber-200'
                                }`}
                            >
                                <HelpCircle size={12} /> {s}
                            </button>
                        ))}
                    </div>
                )}
                
                <div className="flex gap-2 items-end">
                    <textarea 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        placeholder={mode === 'bazi' ? "输入您想问的八字问题..." : "输入您想问的紫微斗数问题..."}
                        className="flex-1 bg-stone-100 border-transparent focus:bg-white focus:border-stone-300 rounded-2xl px-4 py-3 text-sm outline-none resize-none max-h-24 min-h-[48px] transition-all focus:shadow-sm focus:ring-2 focus:ring-stone-100" 
                        rows={1} 
                        disabled={loading}
                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    />
                    <button 
                        onClick={() => handleSend()} 
                        disabled={loading || !input.trim()} 
                        className={`p-3 rounded-full h-12 w-12 flex items-center justify-center transition-all ${
                            !input.trim() || loading
                                ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
                                : 'bg-stone-900 text-amber-400 shadow-lg active:scale-95 hover:bg-stone-800 hover:shadow-xl'
                        }`}
                    >
                        {loading ? <Activity size={20} className="animate-spin" /> : <Send size={20} className={input.trim() ? "ml-0.5" : ""} />}
                    </button>
                </div>
            </div>
        </div>
    );
};