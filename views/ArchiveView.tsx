import React, { useState, useEffect } from 'react';
import { Trash2, Search, User, Clock, ChevronRight, Calendar, Cloud, RefreshCw, LogOut, Crown, Edit3, X, Save, Fingerprint, Plus, Tag, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
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

// --- 全局 Toast 组件 ---
type ToastType = 'success' | 'error' | 'warning' | 'loading' | null;
interface ToastState { show: boolean; msg: string; type: ToastType; }

const Toast: React.FC<{ state: ToastState }> = ({ state }) => {
    if (!state.show) return null;
    
    let bg = "bg-stone-800";
    let icon = <Loader2 size={16} className="animate-spin text-stone-400"/>;
    
    if (state.type === 'success') { bg = "bg-emerald-600"; icon = <CheckCircle size={16} className="text-white"/>; }
    if (state.type === 'error') { bg = "bg-rose-600"; icon = <AlertCircle size={16} className="text-white"/>; }
    if (state.type === 'warning') { bg = "bg-amber-600"; icon = <Cloud size={16} className="text-white"/>; }

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className={`${bg} text-white px-4 py-3 rounded-full shadow-xl flex items-center gap-3 min-w-[200px] justify-center`}>
                {icon}
                <span className="text-sm font-bold tracking-wide">{state.msg}</span>
            </div>
        </div>
    );
};

// --- 开关组件 ---
const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <div 
        onClick={(e) => { e.stopPropagation(); if(!disabled) onChange(); }}
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ease-in-out flex items-center px-0.5 cursor-pointer z-20 ${checked ? 'bg-amber-500' : 'bg-stone-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:ring-2 hover:ring-amber-200/50'}`}
    >
        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
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
    
    // Toast 状态管理
    const [toast, setToast] = useState<ToastState>({ show: false, msg: '', type: null });
    
    // 辅助函数：显示 Toast
    const showToast = (msg: string, type: ToastType, duration = 2000) => {
        setToast({ show: true, msg, type });
        if (type !== 'loading') {
            setTimeout(() => setToast(prev => ({ ...prev, show: false })), duration);
        }
    };

    // 辅助函数：处理服务层返回结果
    const handleResult = (result: any, successMsg: string) => {
        if (result._cloudError) {
            showToast('已存本地，云端同步失败', 'warning', 3000);
        } else {
            showToast(successMsg, 'success');
        }
        return result; // 返回纯净的数组给 setState (React 会忽略 _cloudError 属性)
    };

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ name: string; tags: string }>({ name: '', tags: '' });
    const editingProfile = editingId ? archives.find(p => p.id === editingId) : null;

    const filtered = archives.filter(p => 
        (p.name && p.name.includes(searchTerm)) || 
        (p.birthDate && p.birthDate.includes(searchTerm)) ||
        (p.tags && p.tags.some(t => t.includes(searchTerm)))
    );

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('确定要删除这条档案吗？聊天记录也将被移除。')) {
            showToast('正在删除...', 'loading');
            try {
                const newList = await deleteArchive(id);
                setArchives(handleResult(newList, '删除成功'));
            } catch (e) {
                showToast('删除失败', 'error');
            }
        }
    };

    const handleSetSelf = async (id: string) => {
        showToast('正在更新状态...', 'loading');
        try {
            const newList = await setArchiveAsSelf(id);
            setArchives(handleResult(newList, '已设为本人命盘'));
        } catch (e) {
            showToast('设置失败', 'error');
        }
    };

    const handleSync = async () => {
        if (!session?.user) return alert("请先登录");
        showToast('正在同步云端...', 'loading');
        try {
            const newList = await syncArchivesFromCloud(session.user.id);
            setArchives(handleResult(newList, '云端同步完成'));
        } catch (e) {
            console.error(e);
            showToast('同步失败，请检查网络', 'error');
        }
    };

    const startEdit = (e: React.MouseEvent, profile: UserProfile) => {
        e.stopPropagation();
        setEditingId(profile.id);
        setEditForm({ name: profile.name, tags: profile.tags?.join(' ') || '' });
    };

    const addTag = (e: React.MouseEvent, tag: string) => {
        e.preventDefault();
        e.stopPropagation();
        const currentTags = editForm.tags.split(' ').map(t => t.trim()).filter(t => t);
        if (!currentTags.includes(tag)) {
            const newTags = [...currentTags, tag].join(' ');
            setEditForm(prev => ({ ...prev, tags: newTags }));
        }
    };

    const saveEdit = async () => {
        if (!editingProfile) return;
        if (!editForm.name.trim()) return alert("姓名不能为空");

        showToast('正在保存...', 'loading');
        const updatedProfile = {
            ...editingProfile,
            name: editForm.name,
            tags: editForm.tags.split(' ').map(t => t.trim()).filter(t => t !== '')
        };

        try {
            const newList = await updateArchive(updatedProfile);
            setArchives(handleResult(newList, '档案修改已保存'));
            setEditingId(null);
        } catch (e) {
            showToast('保存失败', 'error');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    return (
        <div className="h-full flex flex-col bg-[#f5f5f4] relative">
            
            {/* 🔥 全局 Toast 挂载点 */}
            <Toast state={toast} />

            {/* 顶部黑金会员卡 */}
            <div className="bg-[#1c1917] p-6 pb-12 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden shrink-0">
                <div className="absolute top-[-50%] right-[-10%] w-[80%] h-[200%] bg-gradient-to-b from-amber-500/10 via-transparent to-transparent rotate-12 pointer-events-none blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>

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
                                        普通用户
                                    </span>
                                )}
                            </div>
                            <p className="text-stone-500 text-xs mt-1 font-medium tracking-wide">
                                {session ? `ID: ${session.user.id.slice(0,8).toUpperCase()}` : '未登录 - 数据仅存储在本地'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                        {session ? (
                            <button onClick={onLogout} className="text-[10px] text-stone-500 hover:text-rose-400 flex items-center gap-1 px-2 py-1 transition-colors">
                                <LogOut size={10}/> 退出
                            </button>
                        ) : (
                            <button className="text-xs bg-amber-500 text-[#1c1917] px-5 py-1.5 rounded-full font-bold shadow-lg shadow-amber-900/50 active:scale-95 hover:bg-amber-400 transition-colors">
                                立即登录
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-8 flex justify-between items-end relative z-10">
                    <div className="flex gap-6">
                        <div>
                            <div className="text-2xl font-black text-stone-200 font-serif">{archives.length}</div>
                            <div className="text-[9px] text-stone-500 uppercase tracking-widest mt-0.5">已存档案</div>
                        </div>
                        <div className="w-px h-8 bg-stone-800"></div>
                        <div>
                            <div className="text-2xl font-black text-amber-500 font-serif">{archives.filter(a=>a.tags?.includes('客户')).length}</div>
                            <div className="text-[9px] text-stone-500 uppercase tracking-widest mt-0.5">客户</div>
                        </div>
                    </div>

                    {session && (
                        <button 
                            onClick={handleSync}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg border bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 active:scale-95"
                        >
                            <RefreshCw size={12} className={toast.type === 'loading' ? 'animate-spin' : ''} />
                            云端同步
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
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-stone-400 space-y-2 mt-8">
                        <Search size={32} className="opacity-10" />
                        <p className="text-xs opacity-50">暂无相关档案</p>
                    </div>
                ) : (
                    filtered.map(profile => (
                        <div 
                            key={profile.id} 
                            onClick={() => onSelect(profile)}
                            className={`
                                group relative bg-white border rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-all cursor-pointer overflow-hidden
                                ${profile.isSelf ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-50/10' : 'border-stone-200 hover:border-amber-200 hover:shadow-md'}
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${profile.gender === 'male' ? 'bg-indigo-500' : 'bg-rose-400'}`}>
                                        {profile.name[0]}
                                    </div>
                                    
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-stone-800 text-[15px]">{profile.name}</h3>
                                            {profile.isSelf && (
                                                <span className="flex items-center gap-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">
                                                    <Fingerprint size={9}/> 本人
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
                                            <span className="flex items-center gap-1"><Calendar size={10}/> {profile.birthDate}</span>
                                            <span className="flex items-center gap-1"><Clock size={10}/> {profile.birthTime}</span>
                                        </div>
                                        
                                        {profile.tags && profile.tags.length > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {profile.tags.map((tag, i) => (
                                                    <span key={i} className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-md">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3">
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <span className={`text-[9px] font-bold ${profile.isSelf ? 'text-amber-600' : 'text-stone-300'}`}>
                                            {profile.isSelf ? '当前账号' : '设为本人'}
                                        </span>
                                        <ToggleSwitch 
                                            checked={!!profile.isSelf} 
                                            onChange={() => handleSetSelf(profile.id)} 
                                        />
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={(e) => startEdit(e, profile)}
                                            className="p-1.5 text-stone-300 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors z-10"
                                            title="编辑资料"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(e, profile.id)}
                                            className="p-1.5 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors z-10"
                                            title="删除档案"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <ChevronRight size={16} className="text-stone-200" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 🔥 全局编辑弹窗 (黑金风格版) */}
            {editingId && editingProfile && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={cancelEdit}></div>
                    
                    <div className="relative bg-[#1c1917] w-full max-w-sm rounded-[2rem] shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 border border-stone-800" onClick={e => e.stopPropagation()}>
                        
                        <div className="flex justify-between items-center border-b border-stone-800 pb-4">
                            <h3 className="font-black text-stone-100 text-lg flex items-center gap-2">
                                <div className="p-2 bg-stone-800 rounded-full text-amber-500">
                                    <Edit3 size={18}/>
                                </div>
                                编辑档案
                            </h3>
                            <button onClick={cancelEdit} className="p-2 text-stone-500 hover:text-stone-300 rounded-full hover:bg-stone-800 transition-colors">
                                <X size={20}/>
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-500 ml-1">姓名</label>
                                <input 
                                    autoFocus
                                    value={editForm.name}
                                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                                    className="w-full bg-stone-900/50 rounded-xl px-4 py-3 text-sm font-bold text-stone-200 outline-none border border-stone-800 focus:border-amber-500/50 focus:bg-stone-900 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-stone-600"
                                    placeholder="请输入姓名"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-500 ml-1 flex items-center gap-1">
                                    <Tag size={12}/> 标签 (空格分隔)
                                </label>
                                <input 
                                    value={editForm.tags}
                                    onChange={e => setEditForm({...editForm, tags: e.target.value})}
                                    className="w-full bg-stone-900/50 rounded-xl px-4 py-3 text-sm text-stone-300 outline-none border border-stone-800 focus:border-amber-500/50 focus:bg-stone-900 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-stone-600"
                                    placeholder="例如：客户 朋友"
                                />
                                
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {PRESET_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={(e) => addTag(e, tag)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-amber-500 hover:text-[#1c1917] border border-stone-700 hover:border-amber-400 rounded-lg text-xs text-stone-400 font-medium transition-all active:scale-95"
                                        >
                                            <Plus size={10}/> {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={cancelEdit} 
                                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-stone-400 bg-stone-800 hover:bg-stone-700 transition-colors"
                            >
                                取消
                            </button>
                            <button 
                                onClick={saveEdit} 
                                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-[#1c1917] bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save size={16}/> 保存修改
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};