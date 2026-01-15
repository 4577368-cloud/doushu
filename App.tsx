import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

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

// --- 2. 引入拆分出去的 UI 和 弹窗组件 ---
import { BottomNav } from './components/Layout';
// 注意：确保你真的创建了这些文件，路径要对
import { AppHeader } from './components/ui/AppHeader'; 
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { VipActivationModal } from './components/modals/VipActivationModal';
import { DetailModal } from './components/modals/DetailModal';

// --- 3. 引入拆分出去的 页面视图 ---
import { HomeView } from './views/HomeView';
import { ArchiveView } from './views/ArchiveView';
import { BaziChartView } from './views/BaziChartView';
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
  
  // 全局保存锁（防止重复点击保存）
  const [isGlobalSaving, setIsGlobalSaving] = useState(false); 

  // --- 初始化：监听登录 & 加载数据 ---
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

  // 1. 排盘处理
  const handleGenerate = (profile: UserProfile) => {
    try {
        // 修正日期格式，防止 YYYYMMDD 导致算法崩溃
        let safeDate = profile.birthDate; 
        if (safeDate.length === 8 && !safeDate.includes('-')) {
            safeDate = `${safeDate.slice(0, 4)}-${safeDate.slice(4, 6)}-${safeDate.slice(6, 8)}`;
        }
        
        const newBazi = calculateBazi({ ...profile, birthDate: safeDate });
        
        // 更新 UI
        setCurrentProfile(profile);
        setBaziChart(newBazi);
        setCurrentTab(AppTab.CHART);
        setAiReport(null);

        // 自动保存 (如果已登录)
        if (session) {
            setIsGlobalSaving(true);
            saveArchive(profile)
              .then(updatedList => {
                  setArchives(updatedList);
                  // 同步 ID (将前端生成的临时ID替换为数据库的 UUID)
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

  // 2. 手动保存处理
  const handleManualSave = async () => {
      if (isGlobalSaving) return;
      if (!currentProfile || !session) return alert('未登录或无数据');
      
      setIsGlobalSaving(true);
      try {
          const updatedList = await saveArchive(currentProfile);
          setArchives(updatedList);
          // 再次确保当前查看的 Profile ID 是最新的
          if (updatedList.length > 0 && updatedList[0].name === currentProfile.name) {
              setCurrentProfile(updatedList[0]);
          }
      } catch(e) { 
          // 错误已经在 service 层处理弹窗了
      } finally { 
          setIsGlobalSaving(false); 
      }
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
        // 保存报告
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
              return baziChart && currentProfile ? (
                  <ErrorBoundary>
                      <BaziChartView 
                        profile={currentProfile} 
                        chart={baziChart} 
                        onShowModal={setModalData} 
                        // 处理报告保存 (包括紫微和八字)
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
              ) : null;
          
          case AppTab.ZIWEI:
              return currentProfile ? (
                  <ZiweiView 
                    profile={currentProfile} 
                    onSaveReport={async (r) => { 
                        const updated = await saveAiReportToArchive(currentProfile.id, r, 'ziwei'); 
                        setArchives(updated); 
                    }} 
                    isVip={isVip} 
                  /> 
              ) : null;
          
          case AppTab.ARCHIVE:
              if (!session) return (
                  <div className="flex flex-col items-center justify-center h-full p-6 bg-[#f5f5f4]">
                      <Auth onLoginSuccess={()=>{/* session listener handles this */}} />
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

  // --- 主渲染结构 ---
  return (
    <div className={`flex flex-col h-screen overflow-hidden text-stone-950 font-sans select-none transition-colors duration-700 ${isVip ? 'bg-[#181816]' : 'bg-[#f5f5f4]'}`}>
      
      {/* 顶部导航 */}
      <AppHeader 
        title={currentTab === AppTab.HOME ? '玄枢命理' : currentProfile?.name || '排盘'} 
        // 右上角按钮：如果在非首页，显示“重置/返回”按钮
        rightAction={currentTab !== AppTab.HOME && (
            <button onClick={()=>{setCurrentProfile(null);setCurrentTab(AppTab.HOME);setAiReport(null);}} className={`p-2 rounded-full transition-colors ${isVip ? 'hover:bg-white/10 text-stone-300' : 'hover:bg-stone-100 text-stone-700'}`}>
                <RotateCcw size={18} />
            </button>
        )} 
        isVip={isVip} 
      />
      
      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden relative">
        {renderContent()}
      </div>
      
      {/* 底部导航 */}
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      
      {/* 全局弹窗层 */}
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