import React, { useState, useEffect } from 'react';
// 🔥 引入图标
import { RotateCcw, MessageCircle, Crown, Activity, Sparkles, Compass, CheckCircle } from 'lucide-react';

// --- 1. 引入服务和类型 ---
import { supabase } from './services/supabase';
import { Auth } from './Auth';
import { 
  AppTab, UserProfile, BaziChart, ModalData, BaziReport as AiBaziReport 
} from './types';
import { calculateBazi } from './services/baziService';
import { analyzeBaziStructured } from './services/geminiService';
import { 
  getArchives, saveArchive, saveAiReportToArchive, getVipStatus, activateVipOnCloud 
} from './services/storageService';

// --- 2. 引入组件 ---
import { BottomNav } from './components/Layout';
import { AppHeader } from './components/ui/AppHeader'; 
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { VipActivationModal } from './components/modals/VipActivationModal';
import { DetailModal } from './components/modals/DetailModal';

// --- 3. 引入视图 ---
import { HomeView } from './views/HomeView';
import { ArchiveView } from './views/ArchiveView';
import { BaziChartView } from './views/BaziChartView';
import { AiChatView } from './views/AiChatView';
import ZiweiView from './components/ZiweiView'; 

// 🔥 新增：注册成功/欢迎弹窗组件
const WelcomeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 text-center space-y-4 animate-slide-up">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-stone-900">恭喜您，注册成功！</h3>
            <p className="text-sm text-stone-500 leading-relaxed">
                邮箱验证已通过。<br/>
                欢迎来到玄枢命理，开启您的探索之旅。
            </p>
            <button 
                onClick={onClose}
                className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
            >
                开始体验
            </button>
        </div>
    </div>
);

const App: React.FC = () => {
  // --- 全局状态管理 ---
  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.HOME);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [baziChart, setBaziChart] = useState<BaziChart | null>(null);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  
  const [archives, setArchives] = useState<UserProfile[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiReport, setAiReport] = useState<AiBaziReport | null>(null);
  
  const [session, setSession] = useState<any>(null);
  const [isVip, setIsVip] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false); // 🔥 新增：控制欢迎弹窗
  
  // 全局保存锁
  const [isGlobalSaving, setIsGlobalSaving] = useState(false); 

  // --- 初始化：监听登录 & 加载数据 ---
  useEffect(() => {
    // 1. 获取初始 Session
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        // 如果 URL 包含 access_token (说明是从邮件跳回来的)，且当前刚获取到 session，视为刚验证成功
        // 或者处理 error (如 otp_expired)，这里可以做更细致的错误提示，但为了体验，如果 session 存在就视为成功
        if (session && window.location.hash.includes('access_token')) {
            setShowWelcomeModal(true);
            // 清理 URL hash，让地址栏好看点
            window.history.replaceState(null, '', window.location.pathname);
        }
    });

    // 2. 监听 Auth 变化 (登录、登出、Token刷新)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
        
        // 🔥 关键逻辑：如果是邮件验证跳转回来，会触发 SIGNED_IN 事件
        if (event === 'SIGNED_IN') {
            // 这里可以判断一下是否是首次（这需要查库，这里简化为只要是通过链接跳回来的就弹窗）
            // 或者简单点，只要登录了且 URL 有 hash 或者是刚注册完的场景
            // 现阶段，如果是刚验证完邮箱跳转回来，通常会带 hash，或者我们可以只在用户明确登录后给个反馈
        }
        
        if (event === 'SIGNED_OUT') {
            setArchives([]);
            setIsVip(false);
            setBaziChart(null);
            setCurrentProfile(null);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleGenerate = (profile: UserProfile) => {
    try {
        let safeDate = profile.birthDate; 
        if (safeDate.length === 8 && !safeDate.includes('-')) {
            safeDate = `${safeDate.slice(0, 4)}-${safeDate.slice(4, 6)}-${safeDate.slice(6, 8)}`;
        }
        const newBazi = calculateBazi({ ...profile, birthDate: safeDate });
        setCurrentProfile(profile);
        setBaziChart(newBazi);
        setCurrentTab(AppTab.CHART);
        setAiReport(null);

        if (session) {
            setIsGlobalSaving(true);
            saveArchive(profile)
              .then(updatedList => {
                  setArchives(updatedList);
                  if (updatedList.length > 0 && updatedList[0].name === profile.name) {
                      setCurrentProfile(prev => prev ? { ...prev, id: updatedList[0].id } : null);
                  }
              })
              .catch(err => console.error("Auto-save failed", err))
              .finally(() => setIsGlobalSaving(false));
        }
    } catch (e) { 
        alert("排盘失败，请检查出生日期格式是否正确"); 
    }
  };

  const handleManualSave = async () => {
      if (isGlobalSaving) return;
      if (!currentProfile || !session) return alert('未登录或无数据');
      setIsGlobalSaving(true);
      try {
          const updatedList = await saveArchive(currentProfile);
          setArchives(updatedList);
          if (updatedList.length > 0 && updatedList[0].name === currentProfile.name) {
              setCurrentProfile(updatedList[0]);
          }
      } catch(e) { } finally { setIsGlobalSaving(false); }
  };

  const handleActivateVip = async () => {
      if (!session) { alert("请先登录！"); return; }
      const success = await activateVipOnCloud(); 
      if (success) { setIsVip(true); alert("🎉 VIP 激活成功！"); }
  };

  const handleAiAnalysis = async () => {
    const key = sessionStorage.getItem('ai_api_key');
    setLoadingAi(true);
    try {
      const result = await analyzeBaziStructured(baziChart!, key || undefined);
      setAiReport(result);
      if (currentProfile && session) {
        const updated = await saveAiReportToArchive(currentProfile.id, result.copyText, 'bazi');
        setArchives(updated);
      }
    } catch (e) { alert(e instanceof Error ? e.message : '分析出错'); } finally { setLoadingAi(false); }
  };

  // --- 页面路由 ---
  const renderContent = () => {
      switch (currentTab) {
          case AppTab.HOME:
              return <HomeView onGenerate={handleGenerate} archives={archives} />;
          case AppTab.CHART:
              if (!baziChart || !currentProfile) {
                  return (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                          <Activity size={48} className="text-stone-300" />
                          <p className="text-sm text-stone-500 font-medium">请先在【首页】输入生辰信息进行排盘</p>
                          <button onClick={() => setCurrentTab(AppTab.HOME)} className="px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-bold shadow-sm active:scale-95 transition-transform flex items-center gap-2"><Compass size={16} /> 立即排盘</button>
                      </div>
                  );
              }
              return (
                  <ErrorBoundary>
                      <BaziChartView profile={currentProfile} chart={baziChart} onShowModal={setModalData} onSaveReport={async (r:string, t:'bazi'|'ziwei')=> { const updated = await saveAiReportToArchive(currentProfile.id, r, t); setArchives(updated); }} onAiAnalysis={handleAiAnalysis} loadingAi={loadingAi} aiReport={aiReport} isVip={isVip} onManualSave={handleManualSave} isSaving={isGlobalSaving} />
                  </ErrorBoundary>
              );
          case AppTab.CHAT:
              if (!isVip) return <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4"><div className="bg-stone-200 p-4 rounded-full"><Crown size={48} className="text-stone-400" /></div><h3 className="font-bold text-lg text-stone-700">VIP 尊享功能</h3><p className="text-sm text-stone-500">升级 VIP 解锁无限次 AI 深度对话</p><button onClick={() => setShowVipModal(true)} className="px-6 py-3 bg-stone-900 text-amber-400 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">立即解锁</button></div>;
              if (!baziChart) return <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4"><MessageCircle size={48} className="text-stone-300" /><p className="text-sm text-stone-500 font-medium">请先排盘，AI 需要命盘数据才能为您解读。</p><button onClick={() => setCurrentTab(AppTab.HOME)} className="px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-bold shadow-sm active:scale-95 transition-transform">去排盘</button></div>;
              return <ErrorBoundary><AiChatView chart={baziChart} /></ErrorBoundary>;
          case AppTab.ZIWEI:
              if (!currentProfile) return <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4"><Sparkles size={48} className="text-stone-300" /><p className="text-sm text-stone-500 font-medium">请先排盘即可查看紫微斗数命盘。</p><button onClick={() => setCurrentTab(AppTab.HOME)} className="px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-bold shadow-sm active:scale-95 transition-transform flex items-center gap-2"><Compass size={16} /> 立即排盘</button></div>;
              return <ZiweiView profile={currentProfile} onSaveReport={async (r) => { const updated = await saveAiReportToArchive(currentProfile.id, r, 'ziwei'); setArchives(updated); }} isVip={isVip} />;
          case AppTab.ARCHIVE:
              if (!session) return <div className="flex flex-col items-center justify-center h-full p-6 bg-[#f5f5f4]"><Auth onLoginSuccess={()=>{}} /></div>;
              return <ArchiveView archives={archives} setArchives={setArchives} onSelect={handleGenerate} isVip={isVip} onVipClick={() => setShowVipModal(true)} session={session} onLogout={() => supabase.auth.signOut()}/>;
          default:
              return <HomeView onGenerate={handleGenerate} archives={archives} />;
      }
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden text-stone-950 font-sans select-none transition-colors duration-700 ${isVip ? 'bg-[#181816]' : 'bg-[#f5f5f4]'}`}>
      <AppHeader title={currentTab === AppTab.HOME ? '玄枢命理' : currentProfile?.name || '排盘'} rightAction={currentTab !== AppTab.HOME && (<button onClick={()=>{setCurrentProfile(null);setCurrentTab(AppTab.HOME);setAiReport(null);}} className={`p-2 rounded-full transition-colors ${isVip ? 'hover:bg-white/10 text-stone-300' : 'hover:bg-stone-100 text-stone-700'}`}><RotateCcw size={18} /></button>)} isVip={isVip} />
      <div className="flex-1 overflow-hidden relative">{renderContent()}</div>
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      {modalData && <DetailModal data={modalData} chart={baziChart} onClose={() => setModalData(null)} />}
      {showVipModal && <VipActivationModal onClose={() => setShowVipModal(false)} onActivate={handleActivateVip} />}
      {/* 🔥 显示欢迎弹窗 */}
      {showWelcomeModal && <WelcomeModal onClose={() => setShowWelcomeModal(false)} />}
    </div>
  );
};

export default App;