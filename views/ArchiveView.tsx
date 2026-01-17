import React, { useState, useMemo } from 'react';
import { Trash2, Search, User, Clock, ChevronRight, Calendar, Cloud, RefreshCw, LogOut, Crown, Edit3, X, Save, Fingerprint, Plus, Tag, Layers } from 'lucide-react';
import { UserProfile } from '../types';
import { deleteArchive, syncArchivesFromCloud, setArchiveAsSelf, updateArchive } from '../services/storageService';

interface ArchiveViewProps {
    archives: UserProfile[];
    setArchives: React.Dispatch<React.SetStateAction<UserProfile[]>>;
    onSelect: (profile: UserProfile) => void;
    isVip: boolean;
    onVipClick: () => void;
    session: any; 
    onLogout: () => void;
}

const PRESET_TAGS = ["客户", "朋友", "家人", "同事", "VIP", "重要", "案例"];

// --- 优化的开关组件 ---
const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean; isDark?: boolean }> = ({ checked, onChange, disabled, isDark }) => (
    <div 
        onClick={(e) => { 
            e.stopPropagation(); 
            if(!disabled) onChange(); 
        }}
        className={`
            relative w-10 h-5 rounded-full transition-colors duration-300 ease-in-out flex items-center px-0.5 cursor-pointer z-20
            ${checked ? 'bg-amber-500' : (isDark ? 'bg-stone-700' : 'bg-stone-300')} 
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
);

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
    const [syncStatus, setSyncStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ name: string; tags: string }>({ name: '', tags: '' });

    // 1. 动态计算顶部标签统计
    const tagStats = useMemo(() => {
        const stats: Record<string, number> = {};
        archives.forEach(p => {
            if (p.tags && p.tags.length > 0) {
                p.tags.forEach(t => {
                    if(t) stats[t] = (stats[t] || 0) + 1;
                });
            }
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 3);
    }, [archives]);

    // 🔥 2. 核心优化：过滤 + 置顶排序
    const displayList = useMemo(() => {
        // 第一步：先过滤
        const list = archives.filter(p => 
            (p.name && p.name.includes(searchTerm)) || 
            (p.birthDate && p.birthDate.includes(searchTerm)) ||
            (p.tags && p.tags.some(t => t.includes(searchTerm)))
        );
        
        // 第二步：再排序 (本人置顶 > 创建时间倒序)
        return list.sort((a, b) => {
            // 权重：本人(1) > 非本人(0)
            const weightA = a.isSelf ? 1 : 0;
            const weightB = b.isSelf ? 1 : 0;
            
            if (weightA !== weightB) {
                return weightB - weightA; // 权重大的排前面
            }
            
            // 权重相同时，按创建时间倒序 (新创建的在前面)
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }, [archives, searchTerm]);

    // 操作逻辑
    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('确定要删除这条档案吗？')) {
            const newList = await deleteArchive(id);
            setArchives(newList);
        }
    };

    const handleSetSelf = async (id: string) => {
        // 乐观更新 UI (立即看到效果)
        const optimisticList = archives.map(p => ({
            ...p,
            isSelf: p.id === id
        }));
        setArchives(optimisticList);

        // 后台保存
        try {
            await setArchiveAsSelf(id);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSync = async () => {
        if (!session?.user) return alert("请先登录");
        setSyncStatus('loading');
        try {
            const newList = await syncArchivesFromCloud(session.user.id);
            setArchives(newList);
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2000); 
        } catch (e) {
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    };

    // 编辑逻辑...
    const startEdit = (e: React.MouseEvent, profile: UserProfile) => {
        e.stopPropagation();
        setEditingId(profile.id);
        setEditForm({ name: profile.name, tags: profile.tags?.join(' ') || '' });
    };

    const addTag = (e: React.MouseEvent, tag: string) => {
        e.preventDefault(); e.stopPropagation();
        const currentTags = editForm.tags.split(' ').map(t => t.trim()).filter(t => t);
        if (!currentTags.includes(tag)) {
            setEditForm(prev => ({ ...prev, tags: [...currentTags, tag].join(' ') }));
        }
    };

    const saveEdit = async () => {
        const editingProfile = archives.find(p => p.id === editingId);
        if (!editingProfile) return;
        if (!editForm.name.trim()) return alert("姓名不能为空");

        const updatedProfile = {
            ...editingProfile,
            name: editForm.name,
            tags: editForm.tags.split(' ').map(t => t.trim()).filter(t => t !== '')
        };

        const newList = await updateArchive(updatedProfile);
        setArchives(newList);
        setEditingId(null);
    };

    return (
        <div className="h-full flex flex-col bg-[#f5f5f4] relative">
            
            {/* 顶部黑金会员卡 */}
            <div className="bg-[#1c1917] p-6 pb-12 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden shrink-0 z-10">
                <div className="absolute top-[-50%] right-[-10%] w-[80%] h-[200%] bg-gradient-to-b from-amber-500/10 via-transparent to-transparent rotate-12 pointer-events-none blur-3xl"></div>
                
                {/* 头部用户信息 */}
                <div className="relative flex justify-between items-start z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-amber-300 via-amber-500 to-amber-200 shadow-lg shadow-amber-900/50">
                            <div className="w-full h-full rounded-full bg-[#1c1917] flex items-center justify-center">
                                <User size={24} className="text-amber-400" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-stone-100 font-bold text-lg tracking-wide font-serif">
                                    {session ? (session.user.email?.split('@')[0] || '命理师') : '访客'}
                                </h2>
                                {isVip ? (
                                    <span className="flex items-center gap-1 bg-gradient-to-r from-amber-300 to-amber-500 text-[#1c1917] text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                        <Crown size={10} fill="currentColor"/> VIP
                                    </span>
                                ) : (
                                    <span onClick={onVipClick} className="flex items-center gap-1 bg-stone-800 text-stone-500 border border-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer hover:text-stone-300">
                                        普通
                                    </span>
                                )}
                            </div>
                            <p className="text-stone-500 text-xs mt-1 font-medium tracking-wide">
                                {session ? `ID: ${session.user.id.slice(0,8).toUpperCase()}` : '离线模式'}
                            </p>
                        </div>
                    </div>
                    {session ? (
                        <button onClick={onLogout} className="text-[10px] text-stone-500 hover:text-rose-400 flex items-center gap-1 px-2 py-1"><LogOut size={10}/> 退出</button>
                    ) : (
                        <button className="text-xs bg-amber-500 text-[#1c1917] px-4 py-1 rounded-full font-bold">登录</button>
                    )}
                </div>

                {/* 动态统计栏 */}
                <div className="mt-8 flex items-end gap-6 relative z-10 overflow-x-auto no-scrollbar pb-1">
                    <div>
                        <div className="text-2xl font-black text-stone-200 font-serif leading-none">{archives.length}</div>
                        <div className="text-[9px] text-stone-500 uppercase tracking-widest mt-1.5">总档案</div>
                    </div>
                    <div className="w-px h-6 bg-stone-800 mb-1"></div>

                    {tagStats.length > 0 ? (
                        tagStats.map(([tag, count], idx) => (
                            <div key={tag} className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-500" style={{animationDelay: `${idx * 100}ms`}}>
                                <div className="text-2xl font-black text-amber-500 font-serif leading-none">{count}</div>
                                <div className="text-[9px] text-stone-500 uppercase tracking-widest mt-1.5 truncate max-w-[4em]">{tag}</div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col opacity-50">
                            <div className="text-2xl font-black text-stone-600 font-serif leading-none">-</div>
                            <div className="text-[9px] text-stone-600 uppercase tracking-widest mt-1.5">无标签</div>
                        </div>
                    )}

                    <div className="flex-1"></div>

                    {session && (
                        <button 
                            onClick={handleSync}
                            disabled={syncStatus === 'loading' || syncStatus === 'success'}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-lg border shrink-0 mb-1
                                ${syncStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'}
                            `}
                        >
                            <RefreshCw size={10} className={syncStatus === 'loading' ? 'animate-spin' : ''} />
                            {syncStatus === 'loading' ? '同步中' : syncStatus === 'success' ? '已同步' : '云同步'}
                        </button>
                    )}
                </div>
            </div>

            {/* 搜索框 */}
            <div className="px-5 -mt-6 z-20">
                <div className="bg-white rounded-2xl shadow-lg shadow-stone-200/50 p-1.5 flex items-center border border-stone-100">
                    <Search className="ml-3 text-stone-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="搜索姓名、日期或标签..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent text-stone-800 text-sm py-2.5 px-3 outline-none font-medium placeholder:text-stone-300"
                    />
                </div>
            </div>

            {/* 列表内容区 */}
            <div className="flex-1 overflow-y-auto p-4 pt-4 space-y-3 custom-scrollbar">
                {displayList.map((profile, index) => {
                    const isSelf = profile.isSelf;
                    return (
                        <div 
                            key={profile.id} 
                            onClick={() => onSelect(profile)}
                            className={`
                                group relative border rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-all duration-500 cursor-pointer overflow-hidden
                                ${isSelf 
                                    ? 'bg-[#1c1917] border-amber-500/30 shadow-lg shadow-amber-900/20 ring-1 ring-amber-500/20 order-first' // 黑金样式
                                    : 'bg-white border-stone-200 hover:border-amber-200 hover:shadow-md' // 普通样式
                                }
                            `}
                            // 为置顶添加动画效果
                            style={isSelf ? { animation: 'fade-in 0.5s ease-out' } : {}}
                        >
                            {isSelf && (
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                            )}

                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${isSelf ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-[#1c1917]' : (profile.gender === 'male' ? 'bg-indigo-500 text-white' : 'bg-rose-400 text-white')}`}>
                                        {profile.name[0]}
                                    </div>
                                    
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-black text-[15px] ${isSelf ? 'text-amber-50' : 'text-stone-800'}`}>{profile.name}</h3>
                                            {isSelf && (
                                                <span className="flex items-center gap-0.5 text-[9px] font-bold bg-amber-500 text-[#1c1917] px-1.5 py-0.5 rounded-full shadow-sm">
                                                    <Crown size={9} fill="currentColor"/> 本人
                                                </span>
                                            )}
                                        </div>
                                        <div className={`flex items-center gap-3 text-xs mt-1 ${isSelf ? 'text-stone-400' : 'text-stone-500'}`}>
                                            <span className="flex items-center gap-1"><Calendar size={10}/> {profile.birthDate}</span>
                                            <span className="flex items-center gap-1"><Clock size={10}/> {profile.birthTime}</span>
                                        </div>
                                        
                                        {profile.tags && profile.tags.length > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {profile.tags.map((tag, i) => (
                                                    <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-md ${isSelf ? 'bg-stone-800 text-stone-400 border border-stone-700' : 'bg-stone-100 text-stone-500'}`}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3">
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <span className={`text-[9px] font-bold ${isSelf ? 'text-amber-500' : 'text-stone-300'}`}>
                                            {isSelf ? '当前账号' : '设为本人'}
                                        </span>
                                        <ToggleSwitch 
                                            checked={!!isSelf} 
                                            onChange={() => handleSetSelf(profile.id)} 
                                            isDark={isSelf} 
                                        />
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={(e) => startEdit(e, profile)}
                                            className={`p-1.5 rounded-full transition-colors ${isSelf ? 'text-stone-500 hover:text-amber-400 hover:bg-stone-800' : 'text-stone-300 hover:text-indigo-500 hover:bg-indigo-50'}`}
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(e, profile.id)}
                                            className={`p-1.5 rounded-full transition-colors ${isSelf ? 'text-stone-500 hover:text-rose-400 hover:bg-stone-800' : 'text-stone-300 hover:text-rose-500 hover:bg-rose-50'}`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <ChevronRight size={16} className={isSelf ? 'text-stone-600' : 'text-stone-200'} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 全局编辑弹窗 */}
            {editingId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingId(null)}></div>
                    <div className="relative bg-[#1c1917] w-full max-w-sm rounded-[2rem] shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 border border-stone-800" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-stone-800 pb-4">
                            <h3 className="font-black text-stone-100 text-lg flex items-center gap-2"><Edit3 size={18} className="text-amber-500"/> 编辑档案</h3>
                            <button onClick={() => setEditingId(null)} className="p-2 text-stone-500 hover:text-stone-300"><X size={20}/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-stone-500 ml-1">姓名</label>
                                <input autoFocus value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-stone-900/50 rounded-xl px-4 py-3 text-sm font-bold text-stone-200 outline-none border border-stone-800 focus:border-amber-500/50 transition-all"/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-stone-500 ml-1 flex items-center gap-1"><Tag size={12}/> 标签</label>
                                <input value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} className="w-full bg-stone-900/50 rounded-xl px-4 py-3 text-sm text-stone-300 outline-none border border-stone-800 focus:border-amber-500/50 transition-all"/>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {PRESET_TAGS.map(tag => (
                                        <button key={tag} onClick={(e) => addTag(e, tag)} className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-amber-500 hover:text-[#1c1917] border border-stone-700 hover:border-amber-400 rounded-lg text-xs text-stone-400 font-medium transition-all active:scale-95"><Plus size={10}/> {tag}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setEditingId(null)} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-stone-400 bg-stone-800 hover:bg-stone-700">取消</button>
                            <button onClick={saveEdit} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-[#1c1917] bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-900/20">保存修改</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};