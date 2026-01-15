// Auth.tsx (优化文案版)
import React, { useState } from 'react';
// ✅ 确保这里是正确的引用路径
import { supabase } from './services/supabase'; 
import { User, Mail, Lock, LogIn, UserPlus, Loader2 } from 'lucide-react';

export const Auth = ({ onLoginSuccess }: { onLoginSuccess?: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'error' | 'success'>('error');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      if (isSignUp) {
        // 注册逻辑
        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            // 可选：重定向URL，防止点邮件链接后跳错地方
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) throw error;
        setMsg('✅ 注册确认邮件已发送！请去您的邮箱点击链接激活账号，然后回来登录。');
        setMsgType('success');
        // 注册成功后不自动切回登录，让用户先看清提示
      } else {
        // 登录逻辑
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (error: any) {
      setMsg(error.message || '操作失败，请重试');
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-3xl shadow-xl border border-stone-100 overflow-hidden animate-slide-up">
      <div className="bg-stone-900 p-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-20"></div>
        <div className="w-16 h-16 bg-stone-800 rounded-2xl mx-auto mb-3 flex items-center justify-center text-amber-500 shadow-inner relative z-10 border border-stone-700">
          <User size={32} />
        </div>
        <h2 className="text-xl font-serif font-black text-amber-50 tracking-wide relative z-10">
          {isSignUp ? '创建新账号' : '登录档案库'}
        </h2>
        <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1 relative z-10">
          {isSignUp ? 'Set up your destiny' : 'Sync Your Destiny Data'}
        </p>
      </div>

      <div className="p-8">
        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider ml-1">邮箱</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-stone-900 focus:bg-white transition-all text-sm font-bold text-stone-800"
                placeholder="您的邮箱地址"
                required
              />
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider ml-1">
                {isSignUp ? '设置登录密码' : '登录密码'}
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-stone-900 focus:bg-white transition-all text-sm font-bold text-stone-800"
                placeholder={isSignUp ? "请设置6位以上密码" : "请输入密码"}
                required
                minLength={6}
              />
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            </div>
          </div>

          {msg && (
            <div className={`text-xs p-3 rounded-xl text-center font-bold leading-relaxed ${msgType === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-stone-900 text-amber-50 rounded-xl font-black text-sm shadow-lg hover:bg-stone-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin"/> : (isSignUp ? <UserPlus size={18}/> : <LogIn size={18}/>)}
            {loading ? '处理中...' : (isSignUp ? '发送注册验证邮件' : '立即登录')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setMsg(''); }}
            className="text-xs text-stone-500 hover:text-stone-900 font-bold transition-colors underline decoration-stone-300 underline-offset-4"
          >
            {isSignUp ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </div>
      </div>
    </div>
  );
};