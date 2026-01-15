import React, { useState } from 'react';
import { Crown, Sparkles } from 'lucide-react';

export const VipActivationModal: React.FC<{ onClose: () => void; onActivate: () => void }> = ({ onClose, onActivate }) => {
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