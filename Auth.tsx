import React, { useState } from 'react';
import { supabase } from './services/supabase';
import { Mail, Lock, Loader2, ArrowLeft, KeyRound } from 'lucide-react';

export const Auth: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login'); // 新增 forgot 模式
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'forgot') {
        // 🔥 发送重置密码邮件
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin, // 重置后跳回当前页面
        });
        if (error) throw error;
        setMessage({ type: 'success', text: '重置链接已发送至您的邮箱，请查收！' });
      } 
      else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLoginSuccess();
      } 
      else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: '注册确认邮件已发送，请查收！' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '操作失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-6 bg-white rounded-3xl shadow-xl border border-stone-100">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-serif font-black text-stone-900 mb-2">
          {mode === 'login' ? '欢迎回来' : mode === 'register' ? '创建账号' : '找回密码'}
        </h2>
        <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">
          {mode === 'forgot' ? 'Reset Password' : 'Ancient Wisdom · AI Insights'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1 ml-1">邮箱地址</label>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-stone-400" size={18} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-stone-900 transition-colors font-bold text-stone-800" placeholder="name@example.com" required />
          </div>
        </div>

        {mode !== 'forgot' && (
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1 ml-1">密码</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-stone-400" size={18} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-stone-900 transition-colors font-bold text-stone-800" placeholder="••••••••" required />
            </div>
          </div>
        )}

        {message && (
          <div className={`p-3 rounded-xl text-xs font-bold ${message.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {message.text}
          </div>
        )}

        <button disabled={loading} className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" size={20} /> : mode === 'forgot' ? <KeyRound size={20}/> : <Lock size={20} />}
          {loading ? '处理中...' : mode === 'login' ? '立即登录' : mode === 'register' ? '注册账号' : '发送重置邮件'}
        </button>
      </form>

      <div className="mt-6 flex justify-between items-center text-xs font-bold text-stone-500 px-1">
        {mode === 'forgot' ? (
           <button onClick={() => {setMode('login'); setMessage(null);}} className="flex items-center gap-1 hover:text-stone-900"><ArrowLeft size={14}/> 返回登录</button>
        ) : (
           <>
             <button onClick={() => {setMode(mode === 'login' ? 'register' : 'login'); setMessage(null);}} className="hover:text-stone-900 underline decoration-stone-300 underline-offset-4">
               {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
             </button>
             {mode === 'login' && <button onClick={() => {setMode('forgot'); setMessage(null);}} className="hover:text-stone-900">忘记密码？</button>}
           </>
        )}
      </div>
    </div>
  );
};