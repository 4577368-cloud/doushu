import React, { useState, useEffect } from 'react';
// 🔥 引入图标 (确保包含 Activity, Sparkles, Compass)
import { RotateCcw, MessageCircle, Crown, Activity, Sparkles, Compass } from 'lucide-react';

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
  
  // 全局保存锁
  const [isGlobalSaving, setIsGlobalSaving] = useState(false); 

  // --- 初始化 ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadData = async () => {
        if (session) {
            const data = await getArchives();
            setArchives(data);
            const vip = await getVipStatus();
            setIsVip(vip);
        } else {
            setArchives([]);
            setIsVip(false);
        }
    };
    loadData();
  }, [session]);

  // --- 核心业务逻辑 ---

  // 1. 排盘
  const handleGenerate = (profile: UserProfile) => {
    try {
        let safeDate = profile.birthDate; 
        if (safeDate.length === 8 && !safeDate.includes('-')) {
            safeDate = `${safeDate.slice(0, 4)}-${safeDate.slice(4, 6)}-${safeDate.slice(6, 8)}`;
        }
        
        const newBazi = calculateBazi({ ...profile, birthDate: safeDate });
        
        setCurrentProfile(profile);
        setBaziChart(newBazi);
        setCurrentTab(AppTab.CHART); // 默认跳到八字页
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

  // 2. 手动保存
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

  // 3. VIP 激活
  const handleActivateVip = async () => {
      if (!session) { 
          alert("请先登录！VIP 权益需要绑定您的邮箱账号。"); 
          return; 
      }
      const success = await activateVipOnCloud(); 
      if (success) { 
          setIsVip(true); 
          alert("🎉 尊贵的 VIP 用户，您的权益已永久绑定至当前账号！"); 
      }
  };

  // 4. AI 分析
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
    } catch (e) { 
      alert(e instanceof Error ? e.message : '分析过程出错'); 
    } finally { 
      setLoadingAi(false); 
    }
  };

  // --- 页面路由渲染 ---
  const renderContent = () => {
      switch (currentTab) {
          case AppTab.HOME:
              return <HomeView onGenerate={handleGenerate} archives={archives} />;
          
          case AppTab.CHART:
              // 🔥 优化：如果没有排盘数据，显示引导页
              if (!baziChart || !currentProfile) {
                  return (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                          <Activity size={48} className="text-stone-300" />
                          <p className="text-sm text-stone-500 font-medium">请先在【首页】输入生辰信息进行排盘，<br/>即可查看详细的八字命盘分析。</p>
                          <button onClick={() => setCurrentTab(AppTab.HOME)} className="px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-bold shadow-sm active:scale-95 transition-transform flex items-center gap-2">
                              <Compass size={16} /> 立即排盘
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
              // 1. 判断 VIP
              if (!isVip) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                        <div className="bg-stone-200 p-4 rounded-full"><Crown size={48} className="text-stone-400" /></div>
                        <h3 className="font-bold text-lg text-stone-700">VIP 尊享功能</h3>
                        <p className="text-sm text-stone-500">升级 VIP 解锁无限次 AI 深度对话，<br/>探索更多命理奥秘。</p>
                        <button onClick={() => setShowVipModal(true)} className="px-6 py-3 bg-stone-900 text-amber-400 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">立即解锁</button>
                    </div>
                  );
              }
              // 2. 判断是否有数据
              if (!baziChart) {
                  return (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                          <MessageCircle size={48} className="text-stone-300" />
                          <p className="text-sm text-stone-500 font-medium">请先在【首页】或【档案】中<br/>进行排盘，AI 需要命盘数据才能为您解读。</p>
                          <button onClick={() => setCurrentTab(AppTab.HOME)} className="px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-bold shadow-sm active:scale-95 transition-transform">去排盘</button>
                      </div>
                  );
              }
              return (
                  <ErrorBoundary>
                      <AiChatView chart={baziChart} />
                  </ErrorBoundary>
              );

          case AppTab.ZIWEI:
              // 🔥 优化：如果没有排盘数据，显示引导页
              if (!currentProfile) {
                  return (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#f5f5f4] space-y-4">
                          <Sparkles size={48} className="text-stone-300" />
                          <p className="text-sm text-stone-500 font-medium">请先在【首页】输入生辰信息进行排盘，<br/>即可查看紫微斗数命盘。</p>
                          <button onClick={() => setCurrentTab(AppTab.HOME)} className="px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-bold shadow-sm active:scale-95 transition-transform flex items-center gap-2">
                              <Compass size={16} /> 立即排盘
                          </button>
                      </div>
                  );
              }
              return (
                  <ZiweiView 
                    profile={currentProfile} 
                    onSaveReport={async (r) => { 
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
      
      <AppHeader 
        title={currentTab === AppTab.HOME ? '玄枢命理' : currentProfile?.name || '排盘'} 
        rightAction={currentTab !== AppTab.HOME && (
            <button onClick={()=>{setCurrentProfile(null);setCurrentTab(AppTab.HOME);setAiReport(null);}} className={`p-2 rounded-full transition-colors ${isVip ? 'hover:bg-white/10 text-stone-300' : 'hover:bg-stone-100 text-stone-700'}`}>
                <RotateCcw size={18} />
            </button>
        )} 
        isVip={isVip} 
      />
      
      <div className="flex-1 overflow-hidden relative">
        {renderContent()}
      </div>
      
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      
      {modalData && (
          <DetailModal 
            data={modalData} 
            chart={baziChart} 
            onClose={() => setModalData(null)} 
          />
      )}
      
      {showVipModal && (
          <VipActivationModal 
            onClose={() => setShowVipModal(false)} 
            onActivate={handleActivateVip} 
          />
      )}
    </div>
  );
};

export default App;