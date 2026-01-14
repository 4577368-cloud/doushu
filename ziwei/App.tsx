import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { calculateChart, calculateDaXianAnalysis } from './services/astrologyService';
import { generateRuleBasedAnalysis } from './services/interpretationService';
import { callDeepSeekAPI } from './services/aiService';
import { ChartData, DaXianResult, AiAnalysisData, Palace, HistoryItem } from './types';
import { 
    HEAVENLY_STEMS, PROVINCE_DATA, BRANCH_CENTERS, 
    STAR_INFO, SHEN_SHA_DB, SI_HUA_TABLE, LIU_NIAN_STAR_MEANINGS,
    LUCKY_STARS, BAD_STARS, PALACE_NAMES
} from './constants';

// --- Icons ---
const IconCopy = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
);
const IconLoading = () => (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const IconMagic = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);
const IconChart = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
);
const IconTrash = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
);

// --- Style Helpers ---
const getStarColor = (type?: string) => {
    switch (type) {
        case 'major': return 'text-red-700 font-extrabold';
        case 'lucky': return 'text-emerald-700 font-bold';
        case 'bad': return 'text-slate-500 font-normal';
        case 'tough': return 'text-stone-600 font-medium';
        case 'soft': return 'text-blue-700 font-medium';
        case 'peach': return 'text-rose-500 font-medium';
        case 'movement': return 'text-amber-600 font-bold';
        default: return 'text-gray-500 font-normal';
    }
};

const getBrightnessStyle = (brightness?: string) => {
    if (!brightness) return 'text-slate-300';
    if (brightness.includes('庙')) return 'text-[#b91c1c] font-black'; 
    if (brightness.includes('旺')) return 'text-[#ef4444] font-bold'; 
    if (brightness.includes('得')) return 'text-[#15803d] font-medium'; 
    if (brightness.includes('利')) return 'text-[#22c55e] font-medium'; 
    if (brightness.includes('平')) return 'text-slate-400 font-normal';
    if (brightness.includes('不')) return 'text-slate-500 font-normal';
    if (brightness.includes('陷')) return 'text-stone-500 font-normal opacity-80';
    return 'text-slate-300';
};

const getPatternStyle = (type: string) => {
    switch(type) {
        case '大吉': return 'bg-yellow-400 text-yellow-900 border border-yellow-500 font-bold';
        case '吉': return 'bg-emerald-400 text-emerald-900 border border-emerald-500 font-bold';
        case '特殊': return 'bg-indigo-400 text-white border border-indigo-500 font-bold';
        case '大凶': return 'bg-red-600 text-white border border-red-700 font-bold';
        case '凶': return 'bg-slate-400 text-slate-900 border border-slate-500 font-bold';
        case '平': return 'bg-slate-200 text-slate-700 border border-slate-300';
        default: return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
};

// --- Sub-Components ---

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center p-12 text-purple-900 bg-slate-50 min-h-[400px]">
    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-800 rounded-full animate-spin mb-4"></div>
    <div className="text-purple-900 font-serif tracking-widest font-bold text-lg">星盘推演中...</div>
  </div>
);

const AnalysisLoading = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-indigo-800 animate-pulse bg-white rounded-xl border border-indigo-100 p-8">
        <div className="text-5xl mb-6 opacity-80">📜</div>
        <div className="font-serif text-xl font-bold mb-2">大师正在推演...</div>
        <div className="text-sm text-indigo-900">正在结合流年、大限与宫位矩阵进行分析</div>
    </div>
);

const AdvancedAnalysisLoading = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-blue-800 animate-pulse bg-white rounded-xl border border-blue-100 p-8">
        <div className="text-5xl mb-6 opacity-80">☯️</div>
        <div className="font-serif text-xl font-bold mb-2">国学大师正在推演...</div>
        <div className="text-sm text-blue-900">正在连接术数模型与金融市场数据</div>
    </div>
);

const Tooltip = ({ tooltip }: { tooltip: { title: string; content: string; x: number; y: number } | null }) => {
    if (!tooltip) return null;
    return (
        <div 
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[100] w-64 bg-slate-900/95 text-slate-100 p-3 rounded-lg shadow-2xl backdrop-blur-sm border border-slate-700 transform -translate-x-1/2 -translate-y-full mt-[-8px]"
            style={{ left: tooltip.x, top: tooltip.y }}
        >
            <div className="font-bold text-amber-400 mb-1 text-sm border-b border-slate-700 pb-1 flex justify-between">
                <span>{tooltip.title}</span>
            </div>
            <div className="text-xs leading-relaxed text-slate-300 text-justify">
                {tooltip.content}
            </div>
            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 border-r border-b border-slate-700 transform rotate-45"></div>
        </div>
    );
};

const AiSuccessModal = ({ onClose, onView }: { onClose: () => void; onView: () => void; }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in" onClick={onClose}>
    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
      <div className="text-6xl mb-4">🎉</div>
      <h3 className="text-xl font-bold text-indigo-900 mb-2">AI 报告已生成</h3>
      <p className="text-sm text-slate-600 mb-6">您的专属财富策略报告已准备就绪，是否立即查看？</p>
      <div className="flex justify-center gap-4">
        <button
          onClick={onClose}
          className="px-6 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          关闭
        </button>
        <button
          onClick={onView}
          className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition-colors"
        >
          立即查看
        </button>
      </div>
    </div>
  </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ year: 1990, month: 1, day: 1, hour: 12, gender: 'M' as 'M'|'F', city: '北京', lng: 116.40 });
  const [analysisYear, setAnalysisYear] = useState(new Date().getFullYear());
  const [selectedProvince, setSelectedProvince] = useState('北京');
  const [selectedCity, setSelectedCity] = useState('北京');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activePalaceName, setActivePalaceName] = useState('命宫');
  const [daXianAnalysis, setDaXianAnalysis] = useState<DaXianResult | null>(null);
  const [tooltip, setTooltip] = useState<{ content: string; title: string; x: number; y: number } | null>(null);
  const [apiKey, setApiKey] = useState('');
  
  // State for AI Tab
  const [analysisTab, setAnalysisTab] = useState<'rule' | 'deepseek'>('rule');
  const [deepSeekContent, setDeepSeekContent] = useState<string>('');
  const [isDeepSeekLoading, setIsDeepSeekLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [showAiSuccessModal, setShowAiSuccessModal] = useState(false);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const leftPillarRef = useRef<HTMLDivElement>(null);
  const [reportMinHeight, setReportMinHeight] = useState<string | number>('auto');

  useEffect(() => {
    const updateHeight = () => {
        if (leftPillarRef.current && window.innerWidth >= 1024) { // lg breakpoint for side-by-side layout
            setReportMinHeight(leftPillarRef.current.offsetHeight);
        } else {
            setReportMinHeight('auto'); // Reset on smaller screens
        }
    };

    // Use a timeout to ensure DOM is updated after chartData changes
    const timeoutId = setTimeout(updateHeight, 150);
    
    window.addEventListener('resize', updateHeight);
    
    return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', updateHeight);
    };
}, [chartData, loading]); // Recalculate when chart data or loading state changes


  const virtualAge = (formData.year && !isNaN(Number(formData.year))) ? (analysisYear - Number(formData.year) + 1) : 1;
  
  const currentStemIndex = (analysisYear - 4) % 10;
  const currentBranchIndex = (analysisYear - 4) % 12;
  const currentYearGan = HEAVENLY_STEMS[currentStemIndex < 0 ? currentStemIndex + 10 : currentStemIndex];
  
  const liuNianPalace = chartData?.palaces.find(p => p.zhiIndex === currentBranchIndex);

  // --- History Management ---
  const STORAGE_KEY = 'ziwei_report_history';

  const loadHistoryFromStorage = (): HistoryItem[] => {
      try {
          const storedHistory = localStorage.getItem(STORAGE_KEY);
          if (storedHistory) {
              return JSON.parse(storedHistory);
          }
      } catch (error) {
          console.error("Failed to load history from storage:", error);
      }
      return [];
  };

  const saveHistoryToStorage = (historyToSave: HistoryItem[]) => {
      try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(historyToSave));
      } catch (error) {
          console.error("Failed to save history to storage:", error);
      }
  };

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
    setHistory(loadHistoryFromStorage());
  }, []);

  const handleCalculate = () => {
    const data = calculateChart(
        Number(formData.year), 
        Number(formData.month), 
        Number(formData.day), 
        Number(formData.hour), 
        formData.gender, 
        formData.lng
    );
    setChartData(data);
    setAiAnalysis(null);
    setDeepSeekContent('');
    setViewingHistoryId(null);
    
    if (data) {
        const analysis = calculateDaXianAnalysis(data.palaces, currentYearGan, virtualAge);
        setDaXianAnalysis(analysis);
    }
  };

  useEffect(() => {
    if (!loading) handleCalculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, formData.year, formData.month, formData.day, formData.hour, formData.gender, formData.lng, analysisYear]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const prov = e.target.value;
      setSelectedProvince(prov);
      const cities = PROVINCE_DATA.find(p => p.name === prov)?.cities || [];
      if (cities.length > 0) {
          const firstCity = cities[0];
          setSelectedCity(firstCity.name);
          setFormData(prev => ({ ...prev, city: firstCity.name, lng: firstCity.lng }));
      }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const cName = e.target.value;
      setSelectedCity(cName);
      const cities = PROVINCE_DATA.find(p => p.name === selectedProvince)?.cities || [];
      const city = cities.find(c => c.name === cName);
      if (city) {
          setFormData(prev => ({ ...prev, city: city.name, lng: city.lng }));
      }
  };

  const handleStarClick = (e: React.MouseEvent, starName: string) => {
    e.stopPropagation();

    if (tooltip && tooltip.title === starName) {
        setTooltip(null);
        return;
    }

    const desc = STAR_INFO[starName] || SHEN_SHA_DB[starName]?.rule;
    if (!desc) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
        title: starName,
        content: desc,
        x: rect.left + rect.width / 2,
        y: rect.top,
    });
  };

  useEffect(() => {
    const handleOutsideClick = () => {
        setTooltip(null);
    };
    if (tooltip) {
        window.addEventListener('click', handleOutsideClick);
    }
    return () => {
        window.removeEventListener('click', handleOutsideClick);
    };
  }, [tooltip]);


  const activePalace = chartData?.palaces.find(p => p.name === activePalaceName);
  const citiesForProvince = PROVINCE_DATA.find(p => p.name === selectedProvince)?.cities || [];
  
  const getSanFangSiZhengIndices = (zhiIndex: number) => [zhiIndex, (zhiIndex + 4) % 12, (zhiIndex + 8) % 12, (zhiIndex + 6) % 12];

  const runRuleBasedAnalysis = async () => {
    if (!chartData) return;
    setAiLoading(true);
    setAnalysisTab('rule');
    setViewingHistoryId(null);
    
    setTimeout(() => {
        const allPalacesContent: Record<string, { content: string }> = {};
        chartData.palaces.forEach(palace => {
            const resultHtml = generateRuleBasedAnalysis(
                chartData, 
                palace.name, 
                analysisYear, 
                virtualAge
            );
            allPalacesContent[palace.name] = { content: resultHtml };
        });

        setAiAnalysis({
            palaces: allPalacesContent,
            siHua: [],
            daXian: []
        });
        setAiLoading(false);
    }, 800);
  };

  const handleAiAnalyze = async () => {
      if (!chartData) return;
      if (!apiKey) {
          alert("请先在右上角输入 API Key");
          return;
      }

      setAnalysisTab('deepseek');
      if (deepSeekContent && !viewingHistoryId) return; // Don't re-run if content already exists and it's not from history

      setIsDeepSeekLoading(true);
      setViewingHistoryId(null);

      try {
          const htmlReport = await callDeepSeekAPI(apiKey, chartData, virtualAge, formData.gender, analysisYear);
          setDeepSeekContent(htmlReport);

          // --- Caching Logic ---
          const now = new Date();
          const pad = (num: number) => num.toString().padStart(2, '0');
          const birthDateStr = `${formData.year}${pad(Number(formData.month))}${pad(Number(formData.day))}`;
          const genDateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

          const todayCount = history.filter(item => {
              const itemGenDate = new Date(item.generatedAt);
              const itemGenDateStr = `${itemGenDate.getFullYear()}${pad(itemGenDate.getMonth() + 1)}${pad(itemGenDate.getDate())}`;
              const itemBirthStr = `${item.birthData.year}${pad(Number(item.birthData.month))}${pad(Number(item.birthData.day))}`;
              return itemBirthStr === birthDateStr && itemGenDateStr === genDateStr;
          }).length;
          
          const counter = pad(todayCount + 1);
          const newId = `${birthDateStr}-${genDateStr}${counter}`;

          const newItem: HistoryItem = {
              id: newId,
              birthData: { ...formData, year: Number(formData.year), month: Number(formData.month), day: Number(formData.day), hour: Number(formData.hour) },
              generatedAt: now.getTime(),
              content: htmlReport,
          };

          const newHistory = [newItem, ...history];
          setHistory(newHistory);
          saveHistoryToStorage(newHistory);
          setShowAiSuccessModal(true);

      } catch (error) {
          console.error(error);
          setDeepSeekContent(`<div class="text-red-600 bg-red-50 p-4 rounded">请求失败，请检查网络或API Key。<br/>错误信息: ${String(error)}</div>`);
      } finally {
          setIsDeepSeekLoading(false);
      }
  };

  const handleCopyReport = () => {
    const htmlToFormattedText = (html: string): string => {
        if (!html) return '';
        let text = html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<p[^>]*>/gi, '\n')
            .replace(/<h[1-6][^>]*>/gi, '\n\n')
            .replace(/<li[^>]*>/gi, '\n* ')
            .replace(/<tr[^>]*>/gi, '\n')
            .replace(/<(td|th)[^>]*>/gi, ' | ');
        
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = text;
        text = tempDiv.textContent || tempDiv.innerText || "";

        return text.replace(/(\n\s*){3,}/g, '\n\n').replace(/ +\| +/g, ' | ').trim();
    };

    let contentToCopy = "";
    if (analysisTab === 'rule' && aiAnalysis) {
        contentToCopy = PALACE_NAMES.map(name => {
            const html = aiAnalysis.palaces[name]?.content || "";
            if (!html) return `\n\n--- 【${name}】 ---\n\n(无内容)`;
            return `\n\n--- 【${name}】 ---\n\n` + htmlToFormattedText(html);
        }).join('');
    } else if (analysisTab === 'deepseek' && deepSeekContent) {
        contentToCopy = htmlToFormattedText(deepSeekContent);
    }

    if (contentToCopy) {
        navigator.clipboard.writeText(contentToCopy.trim()).then(() => {
            setCopySuccess('已复制！');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    }
  };


  const handleViewHistory = (item: HistoryItem) => {
    setDeepSeekContent(item.content);
    setAnalysisTab('deepseek');
    setViewingHistoryId(item.id);
    reportContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  const handleDeleteHistoryItem = (idToDelete: string) => {
    if (window.confirm("您确定要永久删除这份报告吗？此操作无法撤销。")) {
        const newHistory = history.filter(item => item.id !== idToDelete);
        setHistory(newHistory);
        saveHistoryToStorage(newHistory);
        
        if (viewingHistoryId === idToDelete) {
            setViewingHistoryId(null);
            setDeepSeekContent('');
        }
    }
  };

  const handleViewReportAndCloseModal = () => {
    setShowAiSuccessModal(false);
    reportContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-6 font-serif text-gray-900 flex justify-center items-start">
      <Tooltip tooltip={tooltip} />
      {showAiSuccessModal && (
        <AiSuccessModal
          onClose={() => setShowAiSuccessModal(false)}
          onView={handleViewReportAndCloseModal}
        />
      )}
      
      <div ref={mainContainerRef} className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Left Column: Chart Area */}
          <div ref={leftPillarRef} className="w-full lg:w-[520px] xl:w-[580px] flex-shrink-0 flex flex-col gap-2 lg:sticky lg:top-4">
              
              {/* Control Header */}
              <div className="bg-white shadow-xl rounded-sm overflow-hidden border border-slate-300">
                <div className="bg-[#2e1065] text-amber-50 p-2 flex flex-col gap-2 border-b-4 border-indigo-700 relative z-40">
                    {/* Row 1: Title and Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black tracking-widest font-serif text-yellow-100 whitespace-nowrap">天机命盘通解</h1>
                            <div className="flex bg-indigo-900/50 rounded-lg p-0.5 border border-indigo-500/30">
                                <button onClick={() => setFormData({...formData, gender: 'M'})} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.gender === 'M' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-200 hover:text-white'}`}>乾造</button>
                                <button onClick={() => setFormData({...formData, gender: 'F'})} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.gender === 'F' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-200 hover:text-white'}`}>坤造</button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                             <div className="flex items-center gap-1 relative">
                                <span className="text-indigo-300 text-[10px] pl-1 whitespace-nowrap">流年</span>
                                <input 
                                    type="number" 
                                    value={analysisYear}
                                    onChange={(e) => setAnalysisYear(Number(e.target.value))}
                                    className="w-20 bg-indigo-950/80 text-center border border-indigo-400 rounded text-indigo-50 focus:outline-none focus:ring-1 focus:ring-amber-400 text-[11px] py-1"
                                />
                            </div>
                            <input 
                                type="password" 
                                placeholder="API Key" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-24 bg-indigo-950/80 border border-indigo-400 rounded text-indigo-50 text-[10px] py-1 px-2 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder-indigo-400/50"
                            />
                            <button onClick={runRuleBasedAnalysis} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold py-1.5 px-3 rounded shadow-lg transition-all border border-emerald-400/30 active:scale-95">
                                <IconChart /> 排盘
                            </button>
                            <button onClick={handleAiAnalyze} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold py-1.5 px-3 rounded shadow-lg transition-all border border-blue-400/30 active:scale-95">
                                <IconMagic /> AI解析
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Inputs */}
                    <div className="flex flex-wrap gap-1.5 items-center bg-indigo-900/20 p-1.5 rounded border border-indigo-500/10">
                        {/* Date inputs */}
                        {['year', 'month', 'day', 'hour'].map(field => (
                            <div key={field} className="relative flex-1 min-w-[50px]">
                                <input 
                                    type="number" 
                                    name={field} 
                                    value={(formData as any)[field]} 
                                    onChange={(e) => {
                                        const { name, value } = e.target;
                                        setFormData((prev:any) => ({ ...prev, [name]: value }));
                                    }} 
                                    className="w-full bg-indigo-950/80 text-center border border-indigo-400 rounded text-indigo-50 focus:outline-none focus:ring-1 focus:ring-amber-400 pr-4 text-[11px] py-1"
                                /> 
                                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-indigo-400 pointer-events-none">
                                    {field === 'year' ? '年' : field === 'month' ? '月' : field === 'day' ? '日' : '时'}
                                </span>
                            </div>
                        ))}
                        {/* Location selects */}
                        <div className="flex gap-1 flex-1 min-w-[100px]">
                            <select value={selectedProvince} onChange={handleProvinceChange} className="flex-1 bg-indigo-950/80 border border-indigo-400 rounded text-indigo-50 text-[10px] py-1 px-1 focus:outline-none">
                                {PROVINCE_DATA.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                            </select>
                            <select value={selectedCity} onChange={handleCityChange} className="flex-1 bg-indigo-950/80 border border-indigo-400 rounded text-indigo-50 text-[10px] py-1 px-1 focus:outline-none">
                                {citiesForProvince.map((c:any) => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
              </div>

              {/* Chart Grid */}
              <div ref={chartRef} className="p-2 bg-slate-100 relative z-20">
                {chartData ? (
                  <div className="grid grid-cols-4 grid-rows-4 gap-[1px] bg-slate-300 border-2 border-slate-300 shadow-lg relative aspect-[4/5] lg:aspect-[9/10]">
                    
                    {activePalace && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-50" viewBox="0 0 100 100">
                        {(() => {
                          const i = activePalace.zhiIndex;
                          const pSelf = BRANCH_CENTERS[i];
                          const pWealth = BRANCH_CENTERS[(i + 4) % 12];
                          const pCareer = BRANCH_CENTERS[(i + 8) % 12];
                          const pTravel = BRANCH_CENTERS[(i + 6) % 12];
                          return (
                              <>
                                  <path d={`M ${pSelf.x} ${pSelf.y} L ${pWealth.x} ${pWealth.y} L ${pCareer.x} ${pCareer.y} Z`} fill="none" stroke="#22c55e" strokeWidth="0.25" strokeDasharray="1.5 1.5" opacity="0.8"/>
                                  <line x1={pSelf.x} y1={pSelf.y} x2={pTravel.x} y2={pTravel.y} stroke="#22c55e" strokeWidth="0.15" opacity="0.9"/>
                                  <circle cx={pSelf.x} cy={pSelf.y} r="0.8" fill="#22c55e" />
                                  <circle cx={pTravel.x} cy={pTravel.y} r="0.8" fill="#22c55e" />
                                  <circle cx={pWealth.x} cy={pWealth.y} r="0.8" fill="#22c55e" />
                                  <circle cx={pCareer.x} cy={pCareer.y} r="0.8" fill="#22c55e" />
                              </>
                          );
                        })()}
                      </svg>
                    )}

                    {chartData.gridMapping.map((branchIndex, gridIdx) => {
                      if (branchIndex === null) {
                        if (gridIdx === 5) {
                          return (
                              <div key="center" className="col-span-2 row-span-2 bg-white flex flex-col p-2 relative overflow-hidden z-10 text-center">
                                <div className="mb-1 w-full border-b border-slate-100 pb-1 shrink-0">
                                    <div className="flex items-center justify-center gap-2 flex-wrap mb-1">
                                        <div className="text-2xl font-black text-indigo-900 tracking-widest leading-none">{chartData.bureau?.name}</div>
                                        <div className="text-xs text-slate-500 font-bold">
                                            {chartData.lunar.getYearGan()}{chartData.lunar.getYearZhi()}年 · {formData.gender === 'M' ? '乾造' : '坤造'}
                                        </div>
                                    </div>
                                    <div className="flex justify-center gap-2 text-xs bg-slate-50 p-1 rounded border border-slate-100">
                                        <span className="font-serif text-indigo-900 font-bold">{chartData.baZi[0]}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="font-serif text-indigo-900 font-bold">{chartData.baZi[1]}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="font-serif text-indigo-900 font-bold">{chartData.baZi[2]}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="font-serif text-indigo-900 font-bold">{chartData.baZi[3]}</span>
                                    </div>
                                </div>
                                
                                <div className="flex-grow overflow-y-auto custom-scrollbar text-left relative">
                                    <div className="mb-2">
                                        {chartData.patterns && chartData.patterns.length > 0 ? (
                                            <div className="space-y-1 px-1">
                                                {chartData.patterns.map((pat: any, idx: number) => (
                                                    <div key={idx} className="border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                                                        <div className="flex items-center gap-1">
                                                            <span className={`flex-shrink-0 px-1 py-0 rounded-[2px] text-xs ${getPatternStyle(pat.type)}`}>
                                                                {pat.type}
                                                            </span>
                                                            <span className="font-bold text-slate-800 text-xs">
                                                                {pat.name}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 leading-tight text-justify">
                                                            {pat.description}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-300 text-center mt-2">暂无特殊格局</div>
                                        )}
                                    </div>
                                </div>
                              </div>
                          );
                        }
                        return null;
                      }

                      const palace = chartData.palaces[branchIndex];
                      const isActive = activePalaceName === palace.name;
                      const isLiuNian = palace.zhiIndex === currentBranchIndex;
                      const isRelated = activePalace && getSanFangSiZhengIndices(activePalace.zhiIndex).includes(palace.zhiIndex) && !isActive;
                      const allStars = [...palace.stars.major, ...palace.stars.minor];

                      return (
                        <div key={gridIdx}
                            onClick={() => setActivePalaceName(palace.name)} 
                            className={`relative overflow-hidden cursor-pointer transition-all duration-300 
                                ${isActive ? 'bg-purple-50 ring-2 ring-purple-600 pulse-glow z-10' : 
                                    isRelated ? 'bg-indigo-50/50' : 'bg-white hover:bg-slate-50'
                                }`} 
                        >
                            {isLiuNian && (
                                <div className="absolute top-0 left-0 pointer-events-none bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-br font-bold z-0 shadow-sm opacity-90">
                                    流年{analysisYear}
                                </div>
                            )}
                            
                            <div className="absolute top-1 bottom-14 left-1 right-1 flex flex-row-reverse flex-wrap content-start items-start gap-1 overflow-hidden pointer-events-none pl-2 pt-2 z-10"> 
                                {allStars.map((star, i) => (
                                    <div 
                                        key={i} 
                                        onClick={(e) => handleStarClick(e, star.name)}
                                        className={`flex flex-col items-center leading-none pointer-events-auto relative ${star.type === 'major' ? 'mx-0.5 mt-0.5' : 'mx-[1px] mt-1'}`}
                                    >
                                        <span className={`writing-vertical-rl ${getStarColor(star.type)} ${star.type === 'major' ? 'text-sm sm:text-base md:text-lg font-extrabold tracking-widest' : 'text-[9px] sm:text-[10px] tracking-tight'}`}>
                                            {star.name}
                                        </span>
                                        <div className="flex flex-col items-center mt-1 gap-0.5">
                                            {star.hua && (
                                                <span className={`text-[10px] w-4 h-4 flex items-center justify-center rounded-full text-white font-bold shadow-sm z-20 ${
                                                    star.hua === '禄' ? 'bg-green-600' : 
                                                    star.hua === '权' ? 'bg-red-600' : 
                                                    star.hua === '科' ? 'bg-blue-600' : 'bg-black'
                                                }`}>
                                                    {star.hua}
                                                </span>
                                            )}
                                            {star.brightness && (
                                                <span className={`text-[10px] whitespace-nowrap ${getBrightnessStyle(star.brightness)}`}>
                                                    {star.brightness}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="absolute bottom-11 left-1 text-lg md:text-xl lg:text-2xl text-slate-400 font-serif font-extrabold z-0 leading-none opacity-40 pointer-events-none">
                                {palace.stem}<br/>{palace.zhi}
                            </div>
                            
                            <div className="absolute bottom-0 left-0 right-0 bg-slate-50/90 border-t border-slate-100 px-1 py-1 flex items-end justify-center min-h-[24px] z-20">
                                <div className={`text-sm sm:text-base md:text-lg font-black px-2 rounded-sm shadow-sm ${isActive ? 'bg-purple-700 text-white' : 'bg-red-50 text-red-900 border border-red-100'}`}>
                                    {palace.name}
                                </div>
                                <div className="absolute right-1 bottom-0.5 text-[10px] sm:text-xs font-bold text-slate-400 origin-bottom-right">
                                    {palace.daXian}
                                </div>
                                <div className="absolute left-1 bottom-0.5 text-[10px] sm:text-xs font-bold text-slate-400 origin-bottom-left">
                                    {palace.changSheng}
                                </div>
                            </div>
                        </div>
                      );
                    })}
                  </div>
                ) : ( 
                  <div className="text-center py-20 text-stone-400">初始化...</div> 
                )}
              </div>
          </div>

          {/* Right Column: Report Section */}
          <div className="w-full flex-grow min-w-0 max-w-4xl" id="report-anchor">
            {(aiLoading || isDeepSeekLoading || aiAnalysis || deepSeekContent) && (
                <div 
                    id="report-card" 
                    ref={reportContainerRef} 
                    className="bg-white shadow-xl rounded-sm border border-slate-300 px-6 py-0 animate-fade-in flex flex-col relative lg:max-h-[calc(100vh-3rem)] overflow-hidden"
                    style={{ minHeight: reportMinHeight }}
                >
            
                    {!apiKey && (
                        <div className="sticky top-0 z-40 bg-amber-50 text-amber-800 text-xs px-4 py-1 text-center border-b border-amber-200 font-bold invisible">
                        </div>
                    )}

                    <div id="report-header" className={`sticky top-0 z-30 bg-white pt-6 pb-4 flex items-center gap-4 border-b border-slate-200 mb-2 flex-shrink-0 no-export`}>
                        <button onClick={() => setAnalysisTab('rule')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${analysisTab === 'rule' ? 'border-indigo-600 text-indigo-900' : 'border-transparent text-slate-500 hover:text-indigo-700'}`}>
                            🔮 详解
                        </button>
                        <button onClick={() => setAnalysisTab('deepseek')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${analysisTab === 'deepseek' ? 'border-blue-600 text-blue-900' : 'border-transparent text-slate-500 hover:text-blue-700'}`}>
                            ☯️ 财富策略
                        </button>
                        
                        <div className="ml-auto flex items-center gap-1.5">
                            <button onClick={handleCopyReport} disabled={exportLoading} className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1.5 rounded transition-colors active:scale-95" title="复制报告文本">
                                {copySuccess && !copySuccess.includes('复制') ? <span className="text-green-600 font-bold">{copySuccess}</span> : (
                                    <>
                                        <IconCopy /> <span>文本</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div id="report-scroll-container" className="flex-grow overflow-y-auto custom-scrollbar pb-6">
                        {analysisTab === 'rule' && (
                            aiLoading ? <AnalysisLoading /> : (
                                aiAnalysis ? (
                                    <div className="space-y-6 pt-2">
                                        <div className="flex items-center justify-between no-export">
                                            <h2 className="text-xl font-bold text-indigo-900">
                                                命理排盘
                                            </h2>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2 justify-center bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-inner no-export">
                                            {PALACE_NAMES.map((name) => (
                                                <button
                                                    key={name}
                                                    onClick={() => setActivePalaceName(name)}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 border shadow-sm ${
                                                        activePalaceName === name
                                                            ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200 ring-offset-1 transform scale-105'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                                                    }`}
                                                >
                                                    {name}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="min-h-[300px]" dangerouslySetInnerHTML={{ __html: aiAnalysis?.palaces[activePalaceName]?.content || '<div class="text-slate-500 text-center py-20">请点击上方“排盘”按钮生成详细分析报告</div>' }} />
                                    </div>
                                ) : (
                                    <div className="text-slate-500 text-center py-20 bg-slate-50 rounded border border-dashed border-slate-200">
                                        <p className="mb-2">点击“规则排盘”生成传统命理详解</p>
                                    </div>
                                )
                            )
                        )}

                        {analysisTab === 'deepseek' && (
                            isDeepSeekLoading ? <AdvancedAnalysisLoading /> : (
                                deepSeekContent ? (
                                    <div className="space-y-6 animate-fade-in pt-2 pb-10">
                                        <div className="prose prose-sm prose-slate max-w-none prose-headings:text-indigo-900 prose-headings:font-bold prose-p:text-slate-800 prose-li:text-slate-800 prose-table:text-sm prose-th:bg-indigo-50 prose-th:text-indigo-900 prose-td:border-slate-200">
                                            <div dangerouslySetInnerHTML={{ __html: deepSeekContent }} />
                                        </div>
                                        <div className="text-xs text-slate-400 text-center pt-8 border-t border-slate-100 mt-8">
                                            由 国学大师提供支持 · 投资有风险，决策需谨慎！
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-slate-50 rounded border border-dashed border-slate-200">
                                        <div className="mb-4 text-4xl opacity-20">☯️</div>
                                        <p className="text-slate-600 font-bold mb-2">AI 跨市场财富策略报告</p>
                                        <p className="text-slate-500 text-xs mb-4 max-w-md mx-auto">
                                            结合传统紫微斗数与现代金融数据，为您生成 A股/港股/美股 投资建议。
                                        </p>
                                        {!apiKey && <p className="text-red-500 text-xs font-bold mb-4">请先在顶部输入 API Key</p>}
                                        <button 
                                            onClick={handleAiAnalyze}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-blue-700 transition-transform active:scale-95"
                                        >
                                            立即生成分析
                                        </button>
                                    </div>
                                )
                            )
                        )}
                    </div>
                </div>
            )}
            
            {history.length > 0 && (
              <div className="mt-6 bg-white shadow-xl rounded-sm border border-slate-300 p-6 animate-fade-in">
                  <h3 className="text-lg font-bold text-indigo-900 border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
                      <span>历史报告</span>
                  </h3>
                  <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                      {history.map(item => (
                          <li key={item.id} className={`flex items-center justify-between w-full text-left rounded-lg transition-colors border ${
                              viewingHistoryId === item.id 
                              ? 'bg-indigo-100 border-indigo-200 ring-2 ring-indigo-300' 
                              : 'bg-slate-50 hover:bg-indigo-50 border-slate-100 hover:border-indigo-100'
                          }`}>
                              <div 
                                  onClick={() => handleViewHistory(item)}
                                  className="flex-grow cursor-pointer p-3"
                              >
                                  <span className="font-bold text-sm text-slate-800">{item.id}</span>
                                  <span className="text-xs text-slate-500 block mt-1">
                                      {`生辰: ${item.birthData.year}年${item.birthData.month}月${item.birthData.day}日 / 生成于: ${new Date(item.generatedAt).toLocaleDateString()}`}
                                  </span>
                              </div>
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteHistoryItem(item.id);
                                  }}
                                  className="ml-2 mr-3 p-2 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors flex-shrink-0"
                                  title="删除报告"
                              >
                                  <IconTrash />
                              </button>
                          </li>
                      ))}
                  </ul>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}

export default App;
