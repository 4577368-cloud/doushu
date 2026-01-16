import React, { useState, useEffect } from 'react';
import { Trash2, Search, User, Clock, ChevronRight, Calendar, Cloud, RefreshCw, LogOut, Crown, Check, ToggleLeft, ToggleRight, Fingerprint } from 'lucide-react';
import { UserProfile } from '../types';
import { deleteArchive, syncArchivesFromCloud, setArchiveAsSelf } from '../services/storageService';

interface ArchiveViewProps {
    archives: UserProfile[];
    setArchives: React.Dispatch<React.SetStateAction<UserProfile[]>>;
    onSelect: (profile: UserProfile) => void;
    isVip: boolean;
    onVipClick: () => void;
    session: any; 
    onLogout: () => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ 
    archives, 
    setArchives, 
    onSelect, 
    isVip, 
    onVipClick,
    session,
    onLogout
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    // 同步状态: 'idle' | 'loading' | 'success' | 'error'
    const [syncStatus, setSyncStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');

    // 过滤逻辑
    const filtered = archives.filter(p => 
        (p.name && p.name.includes(searchTerm)) || 
        (p.birthDate && p.birthDate.includes(searchTerm))
    );

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('确定要删除这条档案吗？聊天记录也将被移除。')) {
            const newList = await deleteArchive(id);
            setArchives(newList);
        }
    };

    // 🔥 设为本人
    const handleSetSelf = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // 防止触发 onSelect
        const newList = await setArchiveAsSelf(id);
        setArchives(newList);
    };

    // 🔥 手动同步 (带明确反馈)
    const handleSync = async () => {
        if (!session?.user) return alert("请先登录");
        
        setSyncStatus('loading');
        try {
            const newList = await syncArchivesFromCloud(session.user.id);
            setArchives(newList);
            
            // 成功反馈
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2000); 
        } catch (e) {
            console.error(e);
            setSyncStatus('error');
            alert("同步失败，请检查网络或重新登录");
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#f5f5f4]">
            
            {/* 🔥 顶部黑金用户卡片 (回归) */}
            <div className="bg-stone-900 p-6 pb-8 rounded-b-[2rem] shadow-xl relative overflow-hidden z-10 shrink-0">
                {/* 背景装饰 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 p-0.5 shadow-lg">
                            <div className="w-full h-full rounded-full bg-stone-900 flex items-center justify-center">
                                <User size={24} className="text-amber-400" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-white font-bold text-lg">
                                    {session ? (session.user.email?.split('@')[0] || '命理师') : '访客用户'}
                                </h2>
                                {isVip && <Crown size={14} className="text-amber-400 fill-amber-400" />}
                            </div>
                            <p className="text-stone-400 text-xs mt-1 font-medium">
                                {session ? '已连接云端数据库' : '本地离线模式'}
                            </p>
                        </div>
                    </div>

                    {session ? (
                        <button onClick={onLogout} className="text-xs text-stone-500 hover:text-stone-300 flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors">
                            <LogOut size={12}/> 退出
                        </button>
                    ) : (
                        <button className="text-xs bg-amber-500 text-stone-900 px-4 py-1.5 rounded-full font-bold shadow-lg active:scale-95">
                            去登录
                        </button>
                    )}
                </div>

                {/* 卡片底部数据栏 */}
                <div className="mt-6 flex justify-between items-end">
                    <div className="flex gap-4">
                        <div className="text-center">
                            <div className="text-xl font-black text-white">{archives.length}</div>
                            <div className="text-[10px] text-stone-500 uppercase tracking-wider">档案数</div>
                        </div>
                        <div className="w-px h-8 bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-xl font-black text-amber-400">{isVip ? 'VIP' : 'Std'}</div>
                            <div className="text-[10px] text-stone-500 uppercase tracking-wider">权益</div>
                        </div>
                    </div>

                    {/* 🔥 同步按钮 (带状态) */}
                    {session && (
                        <button 
                            onClick={handleSync}
                            disabled={syncStatus === 'loading' || syncStatus === 'success'}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg
                                ${syncStatus === 'success' 
                                    ? 'bg-emerald-500 text-white' 
                                    : syncStatus === 'error'
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-white/10 text-stone-300 hover:bg-white/20 hover:text-white'
                                }
                            `}
                        >
                            {syncStatus === 'loading' && <RefreshCw size={14} className="animate-spin" />}
                            {syncStatus === 'success' && <Check size={14} />}
                            {syncStatus === 'error' && <RefreshCw size={14} />}
                            {syncStatus === 'idle' && <Cloud size={14} />}
                            
                            {syncStatus === 'loading' ? '正在同步...' : 
                             syncStatus === 'success' ? '同步成功' : 
                             syncStatus === 'error' ? '同步失败' : '同步云端'}
                        </button>
                    )}
                </div>
            </div>

            {/* 搜索栏 (悬浮在卡片下方) */}
            <div className="px-4 -mt-5 z-20 relative">
                <div className="bg-white rounded-2xl shadow-lg p-1 flex items-center">
                    <Search className="ml-3 text-stone-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="搜索姓名或日期..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent text-stone-800 text-sm py-3 px-3 outline-none font-medium placeholder:text-stone-300"
                    />
                </div>
            </div>

            {/* 列表内容区 */}
            <div className="flex-1 overflow-y-auto p-4 pt-4 space-y-3 custom-scrollbar">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-stone-400 space-y-2 mt-10">
                        <Search size={32} className="opacity-20" />
                        <p className="text-xs">暂无相关档案</p>
                    </div>
                ) : (
                    filtered.map(profile => (
                        <div 
                            key={profile.id} 
                            onClick={() => onSelect(profile)}
                            className={`
                                group relative bg-white border rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer overflow-hidden
                                ${profile.isSelf ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-50/10' : 'border-stone-200 hover:border-amber-300 hover:shadow-md'}
                            `}
                        >
                            {/* 左侧装饰条 */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${profile.gender === 'male' ? 'bg-indigo-500' : 'bg-rose-400'}`} />

                            <div className="flex justify-between items-start pl-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-stone-800 text-base">{profile.name}</h3>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${profile.gender === 'male' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-500'}`}>
                                            {profile.gender === 'male' ? '乾造' : '坤造'}
                                        </span>
                                        {/* 本人标识 */}
                                        {profile.isSelf && (
                                            <span className="flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">
                                                <Fingerprint size={10}/> 本人
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-stone-500 font-medium">
                                        <span className="flex items-center gap-1"><Calendar size={12}/> {profile.birthDate}</span>
                                        <span className="flex items-center gap-1"><Clock size={12}/> {profile.birthTime}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* 🔥 设为本人开关 */}
                                    <button
                                        onClick={(e) => handleSetSelf(e, profile.id)}
                                        className={`transition-colors ${profile.isSelf ? 'text-amber-500' : 'text-stone-300 hover:text-stone-400'}`}
                                        title={profile.isSelf ? "已设为本人命盘" : "设为本人命盘"}
                                    >
                                        {profile.isSelf ? <ToggleRight size={28} fill="currentColor" className="opacity-20"/> : <ToggleLeft size={28} />}
                                    </button>

                                    <div className="w-px h-4 bg-stone-200"></div>

                                    <button 
                                        onClick={(e) => handleDelete(e, profile.id)}
                                        className="p-1.5 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            {/* 标签 */}
                            {profile.tags && profile.tags.length > 0 && (
                                <div className="flex gap-1 mt-3 pl-3 overflow-x-auto no-scrollbar">
                                    {profile.tags.map((tag, i) => (
                                        <span key={i} className="whitespace-nowrap text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-md font-medium">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};