import React, { useState, useEffect, useRef } from 'react';
import { Crown, HelpCircle, Send, User, Sparkles, Eraser } from 'lucide-react';
import { BaziChart } from '../types';
import { ChatMessage, sendChatMessage } from '../services/chatService';
import { SmartTextRenderer } from '../components/ui/BaziUI';

export const AiChatView: React.FC<{ chart: BaziChart }> = ({ chart }) => {
    // 1. 初始化消息列表 (尝试从 localStorage 读取历史记录)
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

    // 2. 自动保存聊天记录到本地 & 自动滚动到底部
    useEffect(() => { 
        const key = `chat_history_${chart.profileId}`; 
        localStorage.setItem(key, JSON.stringify(messages)); 
        scrollToBottom(); 
    }, [messages, chart.profileId]);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

    // 3. 清空聊天记录的功能
    const handleClearHistory = () => {
        if(window.confirm('确定要清空当前的对话记录吗？')) {
            const initialMsg: ChatMessage = { role: 'assistant', content: '对话已重置。请问您还有什么想问的吗？' };
            setMessages([initialMsg]);
            setSuggestions(['我的财运如何？', '适合往哪个方向发展？', '今年要注意什么？']);
        }
    }

    // 4. 发送消息核心逻辑
    const handleSend = async (contentOverride?: string) => {
        const msgContent = contentOverride || input;
        if (!msgContent.trim() || loading) return;
        
        // 立即显示用户的提问
        const userMsg: ChatMessage = { role: 'user', content: msgContent };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSuggestions([]); // 发送期间隐藏旧建议
        setLoading(true);
        
        // 缓冲区，用于处理 "内容 ||| 建议" 的分割
        let fullResponseBuffer = "";

        try {
            // 准备发送给 API 的上下文 (最近 10 条，防止 Token 溢出)
            const contextMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content })).slice(-10);
            
            // 先放一个空的 AI 回复占位
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
            
            // 调用 Service
            await sendChatMessage(contextMessages, chart, (chunk) => {
                fullResponseBuffer += chunk;
                
                // 解析：检查是否有建议分割符 "|||"
                const parts = fullResponseBuffer.split('|||');
                const displayContent = parts[0]; // 展示给用户看的正文
                const suggestionRaw = parts[1];  // 隐藏的建议部分

                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    // 只更新正文部分，不把 ||| 后面的乱码显示出来
                    if (lastMsg.role === 'assistant') {
                        lastMsg.content = displayContent;
                    }
                    return newMsgs;
                });

                // 如果检测到了建议部分，实时更新建议按钮
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
                // 如果最后一条是空的（说明刚开始就挂了），填入错误提示
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
            {/* 顶部简易标题栏 (可选，增加沉浸感) */}
            <div className="px-4 py-2 bg-white/50 border-b border-stone-100 flex justify-between items-center text-[10px] text-stone-400">
                <span className="flex items-center gap-1"><Sparkles size={10} className="text-amber-500"/> AI 命理师在线</span>
                <button onClick={handleClearHistory} className="flex items-center gap-1 hover:text-stone-600 transition-colors"><Eraser size={10}/> 清除记忆</button>
            </div>

            {/* 消息列表区域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-6">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        {/* 头像 */}
                        {msg.role === 'assistant' ? (
                            <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm border border-stone-800">
                                <Crown size={14} fill="currentColor" />
                            </div>
                        ) : null}

                        {/* 气泡 */}
                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-stone-800 text-white rounded-tr-none shadow-stone-200' 
                                : 'bg-white text-stone-800 rounded-tl-none border border-stone-100 shadow-stone-200'
                        }`}>
                            <SmartTextRenderer 
                                content={msg.content} 
                                className={msg.role === 'user' ? 'text-white/90' : 'text-stone-800'} 
                            />
                        </div>

                        {/* 用户头像 (可选) */}
                        {msg.role === 'user' ? (
                            <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center shrink-0 ml-2 mt-1">
                                <User size={14} />
                            </div>
                        ) : null}
                    </div>
                ))}

                {/* Loading 动画状态 */}
                {loading && messages[messages.length - 1].role === 'user' && (
                    <div className="flex justify-start animate-pulse">
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
            
            {/* 底部输入区域 */}
            <div className="p-3 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-10">
                {/* 智能建议气泡 */}
                {suggestions.length > 0 && !loading && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 px-1">
                        {suggestions.map((s, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleSend(s)}
                                className="whitespace-nowrap px-3 py-1.5 bg-stone-50 text-stone-600 text-xs font-bold rounded-full border border-stone-200 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                            >
                                <HelpCircle size={10} /> {s}
                            </button>
                        ))}
                    </div>
                )}
                
                {/* 输入框 */}
                <div className="flex gap-2 items-end">
                    <textarea 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        placeholder="向大师提问 (例如: 我今年的财运如何?)..." 
                        className="flex-1 bg-stone-100 border-transparent focus:bg-white focus:border-stone-300 focus:ring-2 focus:ring-stone-100 rounded-2xl px-4 py-3 text-sm outline-none resize-none max-h-24 min-h-[48px] transition-all placeholder:text-stone-400" 
                        rows={1} 
                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    />
                    <button 
                        onClick={() => handleSend()} 
                        disabled={loading || !input.trim()} 
                        className={`p-3 rounded-full h-12 w-12 flex items-center justify-center transition-all ${!input.trim() || loading ? 'bg-stone-100 text-stone-300' : 'bg-stone-900 text-amber-400 shadow-lg active:scale-95 hover:bg-stone-800'}`}
                    >
                        <Send size={20} className={input.trim() && !loading ? "ml-0.5" : ""} />
                    </button>
                </div>
            </div>
        </div>
    );
};