import React, { useState } from 'react';
import { Trash2, Search, User, Clock, ChevronRight, Calendar, Cloud, RefreshCw, LogOut } from 'lucide-react';
import { UserProfile } from '../types';
import { deleteArchive, syncArchivesFromCloud } from '../services/storageService'; // 引入 sync

interface ArchiveViewProps {
    archives: UserProfile[];
    setArchives: React.Dispatch<React.SetStateAction<UserProfile[]>>;
    onSelect: (profile: UserProfile) => void;
    isVip: boolean;
    onVipClick: () => void;
    session: any; // 接收 session 判断是否登录
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
    const [isSyncing, setIsSyncing] = useState(false); // 同步加载状态

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

    // 🔥 手动同步功能
    const handleSync = async () => {
        if (!session?.user) {
            alert("请先登录才能同步云端数据");
            return;
        }
        setIsSyncing(true);
        try {
            // 调用 service 层的智能合并同步
            const newList = await syncArchivesFromCloud(session.user.id);
            setArchives(newList); // 更新界面
            // 稍微延迟一下 loading 状态，让用户感知到操作
            setTimeout(() => setIsSyncing(false), 500);
        } catch (e) {
            setIsSyncing(false);
            alert("同步失败，请检查网络");
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#f5f5f4]">
            
            {/* 顶部控制栏 */}
            <div className="p-4 bg-white shadow-sm z-10 space-y-3">
                
                {/* 标题与操作区 */}
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-black text-stone-800 flex items-center gap-2">
                        <User className="text-stone-400" size={20}/>
                        我的档案库
                        <span className="text-xs bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full font-normal">
                            {archives.length}
                        </span>
                    </h2>

                    {/* 右侧按钮组 */}
                    <div className="flex gap-2">
                        {/* 🔥 云端同步按钮 (仅登录显示) */}
                        {session && (
                            <button 
                                onClick={handleSync}
                                disabled={isSyncing}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                                    ${isSyncing 
                                        ? 'bg-stone-100 text-stone-400 border-stone-200' 
                                        : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 active:scale-95'}
                                `}
                            >
                                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                                {isSyncing ? '同步中' : '同步云端'}
                            </button>
                        )}
                        
                        {/* 退出登录 */}
                        {session && (
                            <button 
                                onClick={onLogout}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-stone-500 border border-stone-200 hover:bg-stone-100 hover:text-stone-700 active:scale-95 transition-all"
                            >
                                <LogOut size={12} />
                                退出
                            </button>
                        )}
                    </div>
                </div>

                {/* 搜索框 */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="搜索姓名或生日..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-stone-100 text-stone-800 text-sm rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-stone-200 transition-all placeholder:text-stone-400 font-medium"
                    />
                </div>
            </div>

            {/* 列表内容区 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-stone-400 space-y-2">
                        <Search size={32} className="opacity-20" />
                        <p className="text-xs">未找到相关档案</p>
                    </div>
                ) : (
                    filtered.map(profile => (
                        <div 
                            key={profile.id} 
                            onClick={() => onSelect(profile)}
                            className="group relative bg-white border border-stone-200 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all hover:border-amber-300 hover:shadow-md cursor-pointer overflow-hidden"
                        >
                            {/* 左侧装饰条 */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${profile.gender === 'male' ? 'bg-indigo-500' : 'bg-rose-400'}`} />

                            <div className="flex justify-between items-start pl-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-black text-stone-800 text-base">{profile.name}</h3>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${profile.gender === 'male' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-500'}`}>
                                            {profile.gender === 'male' ? '乾造' : '坤造'}
                                        </span>
                                        {/* 云端标识: 如果已登录，默认都视为已同步，或者可以比对 updated_at */}
                                        {session && <Cloud size={10} className="text-emerald-400" fill="currentColor" />}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-stone-500 font-medium">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {profile.birthDate}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {profile.birthTime}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => handleDelete(e, profile.id)}
                                        className="p-2 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <ChevronRight size={16} className="text-stone-300 group-hover:text-amber-400 transition-colors" />
                                </div>
                            </div>
                            
                            {/* 标签展示 */}
                            {profile.tags && profile.tags.length > 0 && (
                                <div className="flex gap-1 mt-3 pl-2 overflow-x-auto no-scrollbar">
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