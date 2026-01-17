import React, { useState } from 'react';
import { Trash2, Search, User, Clock, ChevronRight, Calendar, Cloud, RefreshCw, LogOut, Crown, Edit3, X, Save, Fingerprint, Plus } from 'lucide-react';
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

// 预设的快捷标签 (可根据需要修改)
const PRESET_TAGS = ["客户", "朋友", "家人", "同事", "VIP", "重要"];

// --- 子组件：滑动开关 ---
const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <button 
        onClick={(e) => { e.stopPropagation(); if(!disabled) onChange(); }}
        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ease-in-out ${checked ? 'bg-amber-500' : 'bg-stone-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
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
    
    // 编辑状态
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ name: string; tags: string }>({ name: '', tags: '' });

    // 过滤逻辑
    const filtered = archives.filter(p => 
        (p.name && p.name.includes(searchTerm)) || 
        (p.birthDate && p.birthDate.includes(searchTerm)) ||
        (p.tags && p.tags.some(t => t.includes(searchTerm)))
    );

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('确定要删除这条档案吗？聊天记录也将被移除。')) {
            const newList = await deleteArchive(id);
            setArchives(newList);
        }
    };

    const handleSetSelf = async (id: string) => {
        const newList = await setArchiveAsSelf(id);
        setArchives(newList);
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
            console.error(e);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    };

    // 进入编辑模式
    const startEdit = (e: React.MouseEvent, profile: UserProfile) => {
        e.stopPropagation();
        setEditingId(profile.id);
        // 将标签数组转为空格分隔字符串
        setEditForm({ name: profile.name, tags: profile.tags?.join(' ') || '' });
    };

    // 添加快捷标签
    const addTag = (e: React.MouseEvent, tag: string) => {
        e.stopPropagation();
        e.preventDefault();
        // 避免重复添加
        if (!editForm.tags.includes(tag)) {
            setEditForm(prev => ({ ...prev, tags: (prev.tags + ' ' + tag).trim() }));
        }
    };

    // 保存编辑
    const saveEdit = async (e: React.MouseEvent, profile: UserProfile) => {
        e.stopPropagation();
        if (!editForm.name.trim()) return alert("姓名不能为空");

        const updatedProfile = {
            ...profile,
            name: editForm.name,
            // 过滤空标签
            tags: editForm.tags.split(' ').map(t => t.trim()).filter(t => t !== '')
        };

        const newList = await updateArchive(updatedProfile);
        setArchives(newList);
        setEditingId(null);
    };

    // 取消编辑
    const cancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(null);
    };

    return (
        <div className="h-full flex flex-col bg-[#f5f5f4]">
            
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
                            disabled={syncStatus === 'loading' || syncStatus === 'success'}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg border
                                ${syncStatus === 'success' 
                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                                    : syncStatus === 'error'
                                        ? 'bg-rose-500/10 border-rose-500/50 text-rose-400'
                                        : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500'
                                }
                            `}
                        >
                            <RefreshCw size={12} className={syncStatus === 'loading' ? 'animate-spin' : ''} />
                            {syncStatus === 'loading' ? '同步中...' : 
                             syncStatus === 'success' ? '已同步' : 
                             syncStatus === 'error' ? '重试' : '云端同步'}
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
                            {/* 🔥 编辑模式遮罩 (修复版：垂直布局 + 快捷标签 + 底部按钮) */}
                            {editingId === profile.id ? (
                                <div className="absolute inset-0 bg-white z-30 flex flex-col p-4 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                                    <h4 className="text-xs font-bold text-stone-400 uppercase mb-3 flex items-center gap-1">
                                        <Edit3 size={12}/> 编辑档案
                                    </h4>
                                    
                                    {/* 垂直排版：姓名 */}
                                    <div className="mb-3">
                                        <label className="text-[10px] text-stone-400 font-bold ml-1">姓名</label>
                                        <input 
                                            autoFocus
                                            value={editForm.name}
                                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                                            className="w-full bg-stone-50 rounded-xl px-3 py-2 text-sm font-bold text-stone-800 outline-none border border-stone-200 focus:border-indigo-500 focus:bg-white transition-colors"
                                            placeholder="输入姓名"
                                        />
                                    </div>

                                    {/* 垂直排版：标签 */}
                                    <div className="flex-1">
                                        <label className="text-[10px] text-stone-400 font-bold ml-1">标签 (空格分隔)</label>
                                        <input 
                                            value={editForm.tags}
                                            onChange={e => setEditForm({...editForm, tags: e.target.value})}
                                            className="w-full bg-stone-50 rounded-xl px-3 py-2 text-xs text-stone-600 outline-none border border-stone-200 focus:border-indigo-500 focus:bg-white transition-colors mb-2"
                                            placeholder="例如：客户 朋友"
                                        />
                                        
                                        {/* 🔥 快捷标签选区 */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {PRESET_TAGS.map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={(e) => addTag(e, tag)}
                                                    className="flex items-center gap-0.5 px-2 py-1 bg-stone-100 hover:bg-indigo-50 hover:text-indigo-600 border border-stone-200 rounded-md text-[10px] text-stone-500 transition-colors"
                                                >
                                                    <Plus size={8}/> {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 🔥 底部按钮区 (确保能点到) */}
                                    <div className="flex gap-2 mt-2 pt-2 border-t border-stone-100">
                                        <button 
                                            onClick={(e) => cancelEdit(e)} 
                                            className="flex-1 py-2 rounded-xl text-xs font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors"
                                        >
                                            取消
                                        </button>
                                        <button 
                                            onClick={(e) => saveEdit(e, profile)} 
                                            className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-1"
                                        >
                                            <Save size={14}/> 保存修改
                                        </button>
                                    </div>
                                </div>
                            ) : null}

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
                                        {/* 标签 */}
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
                                            className="p-1.5 text-stone-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                                            title="编辑资料"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(e, profile.id)}
                                            className="p-1.5 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
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
        </div>
    );
};