import React, { useState, useEffect } from 'react';
import { RotateCcw, MessageCircle, Crown, Activity, Sparkles, Compass, CheckCircle, Lock, KeyRound } from 'lucide-react';

import { supabase } from './services/supabase';
import { Auth } from './Auth';
import { AppTab, UserProfile, BaziChart, ModalData, BaziReport as AiBaziReport } from './types';
import { calculateBazi } from './services/baziService';
import { analyzeBaziStructured } from './services/geminiService';
import { getArchives, saveArchive, saveAiReportToArchive, getVipStatus, activateVipOnCloud } from './services/storageService';

import { BottomNav } from './components/Layout';
import { AppHeader } from './components/ui/AppHeader'; 
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { VipActivationModal } from './components/modals/VipActivationModal';
import { DetailModal } from './components/modals/DetailModal';

import { HomeView } from './views/HomeView';
import { ArchiveView } from './views/ArchiveView';
import { BaziChartView } from './views/BaziChartView';
import { AiChatView } from './views/AiChatView';
import ZiweiView from './components/ZiweiView'; 

// --- 内联组件：密码重置弹窗 ---
const PasswordResetModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleUpdate = async () => {
        if (!password.trim() || password.length < 6) {
            alert('密码长度不能少于6位');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: password });
        setLoading(false);
        if (error) {
            alert('密码修改失败: ' + error.message);
        } else { 
            alert('密码修改成功！请重新登录。'); 
            onClose(); 
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-sm rounded-[2rem] p-6 space-y-4 animate-slide-up shadow-2xl">
                <div className="text-center">
                    <h3 className="text-lg font-black text-stone-900">设置新密码</h3>
                    <p className="text-xs text-stone-500">请输入您的新密码以完成重置</p>
                </div>
                <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-stone-400" size={18} />
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-12 pr-4 outline-none font-bold text-stone-800 focus:border-stone-400 transition-colors" 
                        placeholder="输入新密码" 
                    />
                </div>
                <button 
                    onClick={handleUpdate} 
                    disabled={loading} 
                    className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    {loading ? <Activity size={18} className="animate-spin"/> : <KeyRound size={18}/>}
                    {loading ? '提交中...' : '确认修改'}
                </button>
            </div>
        </div>
    );
};

// --- 内联组件：欢迎弹窗 ---
const WelcomeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 text-center space-y-4 animate-slide-up">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-stone-900">恭喜您，注册成功！</h3>
            <p className="text-sm text-stone-500 leading-relaxed font-medium">
                邮箱验证已通过。<br/>欢迎来到玄枢命理，开启您的探索之旅。
            </p>
            <button 
                onClick={onClose} 
                className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform hover:bg-stone-800"
            >
                开始体验
            </button>
        </div>
    </div>
);

const App: React.FC = () => {
  // --- 状态管理 ---
  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.HOME);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [baziChart, setBaziChart] = useState<BaziChart | null>(null);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  
  const [archives, setArchives] = useState<UserProfile[]>([]);
  
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiReport, setAiReport] = useState<AiBaziReport | null>(null);
  
  const [session, setSession] = useState<any>(null);
  const [isVip, setIsVip] = useState(false);
  
  // 弹窗控制
  const [showVipModal, setShowVipModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [isGlobalSaving, setIsGlobalSaving] = useState(false); 

  // --- 生命周期 & Auth 监听 ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
        // 处理注册后的跳转
        if (event === 'SIGNED_IN') {
            if (window.location.hash.includes('access_token') && !window.location.hash.includes('type=recovery')) {
                 setShowWelcomeModal(true);
                 // 清除 URL hash 保持美观
                 window.history.replaceState(null, '', window.location.pathname);
            }
        }
        // 处理密码重置链接
        if (event === 'PASSWORD_RECOVERY') {
            setShowPasswordResetModal(true);
        }
        // 登出清理
        if (event === 'SIGNED_OUT') {
            setArchives([]); 
            setIsVip(false); 
            setBaziChart(null); 
            setCurrentProfile(null);
            setCurrentTab(AppTab.HOME);
        }
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- 加载用户数据 ---
  useEffect(() => {
    const loadData = async () => {
        if (session) {
            const data = await getArchives();
            setArchives(data);
            const vip = await getVipStatus();
            setIsVip(vip);
        }
    };
    loadData();
  }, [session]);

  // --- 核心业务逻辑 ---

  // 排盘
  const handleGenerate = (profile: UserProfile) => {
    try {
        // 简单的日期格式清洗
        let safeDate = profile.birthDate; 
        if (safeDate.length === 8 && !safeDate.includes('-')) {
            safeDate = `${safeDate.slice(0, 4)}-${safeDate.slice(4, 6)}-${safeDate.slice(6, 8)}`;
        }
        
        const newBazi = calculateBazi({ ...profile, birthDate: safeDate });
        setCurrentProfile(profile); 
        setBaziChart(newBazi); 
        setCurrentTab(AppTab.CHART); 
        setAiReport(null); // 切换排盘时清空旧的 AI 报告
        
        // 如果已登录，自动保存/更新档案
        if (session) {
            setIsGlobalSaving(true);
            saveArchive(profile).then(updatedList => {
                  setArchives(updatedList);
                  // 确保 currentProfile 拥有最新的 ID（如果是新建的）
                  if (updatedList.length > 0 && updatedList[0].name === profile.name) {
                      setCurrentProfile(prev => prev ? { ...prev, id: updatedList[0].id } : null);
                  }
              }).catch(err => console.error(err)).finally(() => setIsGlobalSaving(false));
        }
    } catch (e) { 
        alert("排盘失败，请检查出生日期格式"); 
    }
  };

  // 手动保存档案
  const handleManualSave = async () => {
      if (isGlobalSaving) return;
      if (!currentProfile || !session) return alert('未登录或无数据');
      setIsGlobalSaving(true);
      try {
          const updatedList = await saveArchive(currentProfile);
          setArchives(updatedList);
          // 重新定位当前 Profile 以获取最新 ID
          const latest = updatedList.find(p => p.name === currentProfile.name && p.birthDate === currentProfile.birthDate);
          if (latest) setCurrentProfile(latest);
          alert("档案保存成功");
      } catch(e) { 
          alert("保存失败");
      } finally { 
          setIsGlobalSaving(false); 
      }
  };

  // 激活 VIP
  const handleActivateVip = async () => {
      if (!session) { alert("请先登录！"); return; }
      const success = await activateVipOnCloud(); 
      if (success) { 
          setIsVip(true); 
          setShowVipModal(false);
          alert("🎉 VIP 激活成功！"); 
      }
  };

  // 生成 AI 报告 (单次分析)
  const handleAiAnalysis = async () => {
    if (!baziChart) return;
    const key = sessionStorage.getItem('ai_api_key');
    setLoadingAi(true);
    try {
      // 这里的 analyzeBaziStructured 是之前的 heavy-request
      const result = await analyzeBaziStructured(baziChart!, key || undefined);
      setAiReport(result);
      
      if (currentProfile && session) {
        // 自动保存报告到档案
        const updated = await saveAiReportToArchive(currentProfile.id, result.copyText, 'bazi');
        setArchives(updated);
      }
    } catch (e) { 
        alert(e instanceof Error ? e.message : '分析出错'); 
    } finally { 
        setLoadingAi(false); 
    }
  };

  // --- 路由渲染逻辑 ---
  const renderContent = () => {
      switch (currentTab) {
          case AppTab.HOME:
              return <HomeView onGenerate={handleGenerate} archives={archives} />;
          
          case AppTab.CHART:
              if (!baziChart || !currentProfile) {
                  return (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                          <div className="bg-stone-200 p-4 rounded-full"><Activity size={48} className="text-stone-400" /></div>
                          <h3 className="font-bold text-lg text-stone-700">尚未排盘</h3>
                          <p className="text-sm text-stone-500">请先在【首页】输入生辰信息，<br/>开启您的八字命理分析。</p>
                          <button onClick={() => setCurrentTab(AppTab.HOME)} className="px-6 py-3 bg-stone-900 text-amber-400 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                              <Compass size={18} /> 立即排盘
                          </button>
                      </div>
                  );
              }
              return (
                  <ErrorBoundary>
                      <BaziChartView 
                          profile={currentProfile} 
                          chart={baziChart} 
                          onShowModal={setModalData} 
                          onSaveReport={async (r:string, t:'bazi'|'ziwei')=> { 
                              if(!session) return alert("请先登录");
                              const updated = await saveAiReportToArchive(currentProfile.id, r, t); 
                              setArchives(updated); 
                          }} 
                          onAiAnalysis={handleAiAnalysis} 
                          loadingAi={loadingAi} 
                          aiReport={aiReport} 
                          isVip={isVip} 
                          onManualSave={handleManualSave} 
                          isSaving={isGlobalSaving} 
                      />
                  </ErrorBoundary>
              );
          
          case AppTab.CHAT:
              // 1. VIP 拦截
              if (!isVip) return (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                      <div className="bg-stone-200 p-4 rounded-full"><Crown size={48} className="text-stone-400" /></div>
                      <h3 className="font-bold text-lg text-stone-700">VIP 尊享功能</h3>
                      <p className="text-sm text-stone-500">升级 VIP 解锁无限次 AI 深度对话，<br/>探索更多命理奥秘。</p>
                      <button onClick={() => setShowVipModal(true)} className="px-6 py-3 bg-stone-900 text-amber-400 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">立即解锁</button>
                  </div>
              );
              // 2. 数据拦截 (没有排盘数据时)
              if (!baziChart || !currentProfile) return (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                      <div className="bg-stone-200 p-4 rounded-full"><MessageCircle size={48} className="text-stone-300" /></div>
                      <h3 className="font-bold text-lg text-stone-700">数据缺失</h3>
                      <p className="text-sm text-stone-500 font-medium">AI 需要命盘数据作为依据。<br/>请先进行排盘。</p>
                      <button onClick={() => setCurrentTab(AppTab.HOME)} className="px-6 py-3 bg-stone-900 text-amber-400 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                          <Compass size={18} /> 去排盘
                      </button>
                  </div>
              );
              // 3. 正常渲染 Chat (传入 profile 用于紫微计算)
              return (
                  <ErrorBoundary>
                      <AiChatView chart={baziChart} profile={currentProfile} />
                  </ErrorBoundary>
              );
          
          case AppTab.ZIWEI:
              if (!currentProfile) {
                  return (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                          <div className="bg-stone-200 p-4 rounded-full"><Sparkles size={48} className="text-stone-300" /></div>
                          <h3 className="font-bold text-lg text-stone-700">紫微斗数</h3>
                          <p className="text-sm text-stone-500 font-medium">请先在【首页】输入生辰信息，<br/>即可生成紫微斗数命盘。</p>
                          <button onClick={() => setCurrentTab(AppTab.HOME)} className="px-6 py-3 bg-stone-900 text-amber-400 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                              <Compass size={18} /> 立即排盘
                          </button>
                      </div>
                  );
              }
              return (
                  <ZiweiView 
                      profile={currentProfile} 
                      onSaveReport={async (r) => { 
                          if(!session) return alert("请先登录");
                          const updated = await saveAiReportToArchive(currentProfile.id, r, 'ziwei'); 
                          setArchives(updated); 
                      }} 
                      isVip={isVip} 
                  />
              );
          
          case AppTab.ARCHIVE:
              if (!session) return (
                  <div className="flex flex-col items-center justify-center h-full p-6 bg-[#f5f5f4]">
                      <Auth onLoginSuccess={()=>{}} />
                  </div>
              );
              return (
                  <ArchiveView 
                      archives={archives} 
                      setArchives={setArchives} 
                      onSelect={handleGenerate} 
                      isVip={isVip} 
                      onVipClick={() => setShowVipModal(true)} 
                      session={session} 
                      onLogout={() => supabase.auth.signOut()}
                  />
              );
          
          default:
              return <HomeView onGenerate={handleGenerate} archives={archives} />;
      }
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden text-stone-950 font-sans select-none transition-colors duration-700 ${isVip ? 'bg-[#181816]' : 'bg-[#f5f5f4]'}`}>
      
      {/* 顶部导航栏 */}
      <AppHeader 
          title={currentTab === AppTab.HOME ? '玄枢命理' : currentProfile?.name || '排盘'} 
          // 只有在非首页且有数据时，才显示重置按钮
          rightAction={currentTab !== AppTab.HOME && currentProfile && (
              <button 
                  onClick={()=>{
                      setCurrentProfile(null);
                      setCurrentTab(AppTab.HOME);
                      setAiReport(null);
                  }} 
                  className={`p-2 rounded-full transition-colors ${isVip ? 'hover:bg-white/10 text-stone-300' : 'hover:bg-stone-100 text-stone-700'}`}
                  title="重新排盘"
              >
                  <RotateCcw size={18} />
              </button>
          )} 
          isVip={isVip} 
      />
      
      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden relative">
          {renderContent()}
      </div>
      
      {/* 底部 Tab */}
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      
      {/* 全局模态框 */}
      {modalData && <DetailModal data={modalData} chart={baziChart} onClose={() => setModalData(null)} />}
      {showVipModal && <VipActivationModal onClose={() => setShowVipModal(false)} onActivate={handleActivateVip} />}
      {showWelcomeModal && <WelcomeModal onClose={() => setShowWelcomeModal(false)} />}
      {showPasswordResetModal && <PasswordResetModal onClose={() => setShowPasswordResetModal(false)} />}
    </div>
  );
};

export default App;