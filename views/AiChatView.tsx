// ... imports ...

// 1. 确保 Props 接收 isVip
export const AiChatView: React.FC<{ chart: BaziChart; profile: UserProfile; isVip: boolean }> = ({ chart, profile, isVip }) => {
    
    // ... (状态管理代码不变) ...

    const handleSend = async (contentOverride?: string) => {
        // ... (前面的逻辑不变) ...

        try {
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
            
            let fullText = ""; 

            // 🔥🔥🔥 关键修复在这里：传入 isVip 🔥🔥🔥
            await sendChatMessage(
                [...messages, userMsg], 
                profile,
                chart,
                ziweiDataString,
                mode, 
                (chunk) => {
                    // ... (流式回调逻辑不变) ...
                    fullText += chunk;
                    // ...
                },
                isVip // <--- 这里一定要传！
            );

        } catch (error: any) { // 加个 any 以防类型报错
            console.error("Chat Error:", error);
            // ... (错误处理逻辑不变) ...
            setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg.role === 'assistant' && lastMsg.content === '') {
                    // 优化报错提示
                    lastMsg.content = error.message || '连接服务器失败，请稍后再试。';
                }
                return newMsgs;
            });
        } finally {
            setLoading(false);
        }
    };

    // ... (return 的 JSX 渲染代码不变) ...
};