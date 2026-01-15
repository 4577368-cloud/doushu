import React, { useState } from 'react';
import { Crown, Compass, Edit2, FileText, Trash2, X, Tag, Activity, LogOut } from 'lucide-react';
import { UserProfile } from '../types';
import { deleteArchive, updateArchive } from '../services/storageService';

export const ArchiveView: React.FC<{ archives: UserProfile[]; setArchives: any; onSelect: any; isVip: boolean; onVipClick: () => void; session: any; onLogout: () => void }> = ({ archives, setArchives, onSelect, isVip, onVipClick, session, onLogout }) => {
    const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
    const [viewingReports, setViewingReports] = useState<UserProfile | null>(null);
    const [customTag, setCustomTag] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const PRESET_TAGS = ['家人', '朋友', '同事', '客户', '自己'];

    // 🔥 删除逻辑
    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`确定要永久删除 [ ${name} ] 的档案吗？`)) return;
        setIsDeleting(id);
        try {
            const updatedList = await deleteArchive(id);
            setArchives(updatedList);
        } catch (error) {
            alert('删除失败，请重试');
        } finally {
            setIsDeleting(null);
        }
    };

    // 🔥 保存逻辑
    const handleSaveEdit = async () => {
        if (!editingProfile) return;
        setIsSaving(true);
        try {
            const updatedList = await updateArchive(editingProfile);
            setArchives(updatedList);
            setEditingProfile(null);
        } catch (error) {
            alert('保存失败，请重试');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleTag = (tag: string) => {
        if (!editingProfile) return;
        const currentTags = editingProfile.tags || [];
        const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
        setEditingProfile({ ...editingProfile, tags: newTags });
    };

    const addCustomTag = () => {
        if (!customTag.trim() || !editingProfile) return;
        const currentTags = editingProfile.tags || [];
        if (!currentTags.includes(customTag.trim())) {
            setEditingProfile({ ...editingProfile, tags: [...currentTags, customTag.trim()] });
        }
        setCustomTag('');
    };

    return (
        <div className="h-full flex flex-col bg-[#f5f5f4] overflow-y-auto pb-24">
             {session && (
                 // 🔥 修复层级：z-50
                 <div className="bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-stone-900 text-amber-500 flex items-center justify-center font-bold text-lg border-2 border-amber-500 shadow-sm">
                             {session.user.email?.[0].toUpperCase()}
                         </div>
                         <div>
                             <p className="text-xs font-bold text-stone-900">{session.user.email}</p>
                             <p className="text-[10px] text-stone-400 font-medium">云端同步已开启</p>
                         </div>
                     </div>
                     <button onClick={onLogout} className="p-2 bg-stone-50 text-stone-500 rounded-lg hover:bg-stone-100 border border-stone-200">
                         <LogOut size={16} />
                     </button>
                 </div>
             )}

            <div className="p-5 space-y-4">
                {!isVip && (
                    <div onClick={onVipClick} className="bg-gradient-to-r from-stone-900 to-stone-700 rounded-3xl p-5 shadow-lg relative overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Crown size={80} /></div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-amber-400 mb-1">升级 VIP 尊享版</h3>
                                <p className="text-xs text-stone-300 font-medium">解锁 AI 深度对话 · 免 Key 无限畅享</p>
                            </div>
                            <div className="bg-amber-400 text-stone-900 px-3 py-2 rounded-xl text-xs font-black shadow-md group-hover:bg-amber-300 transition-colors">
                                立即开通
                            </div>
                        </div>
                    </div>
                )}

                {archives.length > 0 ? archives.map(p => (
                    <div key={p.id} className={`bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-4 transition-all ${isDeleting === p.id ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-black text-stone-900 text-lg">{p.name}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.gender==='male'?'bg-indigo-50 text-indigo-700':'bg-rose-50 text-rose-700'}`}>{p.gender==='male'?'乾':'坤'}</span>
                                </div>
                                <p className="text-[11px] text-stone-500 font-medium mb-2">{p.birthDate} {p.birthTime} {p.isSolarTime ? '(真太阳)' : ''}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {p.tags && p.tags.length > 0 ? p.tags.map(t => (
                                        <span key={t} className="text-[9px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-bold border border-stone-200">#{t}</span>
                                    )) : <span className="text-[9px] text-stone-300 italic">未分类</span>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={()=>onSelect(p)} className="p-2.5 bg-stone-950 text-white rounded-xl shadow-md active:scale-95 transition-transform"><Compass size={18}/></button>
                               <button onClick={()=>setEditingProfile(p)} className="p-2.5 bg-white border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50"><Edit2 size={18}/></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-50">
                            <button onClick={()=>setViewingReports(p)} className="py-2.5 bg-stone-50 text-stone-600 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 hover:bg-stone-100 transition-colors"><FileText size={14}/> 解盘记录 ({p.aiReports?.length || 0})</button>
                            <button onClick={() => handleDelete(p.id, p.name)} disabled={isDeleting === p.id} className="py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 hover:bg-rose-100 transition-colors border border-rose-100">{isDeleting === p.id ? <Activity size={14} className="animate-spin"/> : <Trash2 size={14}/>} {isDeleting === p.id ? '删除中...' : '删除档案'}</button>
                        </div>
                    </div>
                )) : <div className="text-center py-20 text-stone-400 font-bold text-sm">暂无云端档案，请先排盘保存</div>}
            </div>

            {editingProfile && (
                <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => !isSaving && setEditingProfile(null)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up">
                        <div className="p-5 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
                            <h3 className="font-black text-stone-900">编辑档案</h3>
                            <button onClick={()=> !isSaving && setEditingProfile(null)}><X size={20} className="text-stone-400"/></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-stone-500 uppercase tracking-wider">姓名</label>
                                <input type="text" value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none font-bold text-stone-900 focus:border-stone-400"/>
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black text-stone-500 uppercase tracking-wider flex items-center gap-2"><Tag size={14}/> 标签管理</label>
                                <div className="flex flex-wrap gap-2">{PRESET_TAGS.map(tag => (<button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${editingProfile.tags?.includes(tag) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-stone-200 text-stone-500 hover:border-indigo-200'}`}>{tag}</button>))}</div>
                                <div className="flex gap-2">
                                    <input type="text" value={customTag} onChange={e => setCustomTag(e.target.value)} placeholder="添加自定义标签..." className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-stone-400"/><button onClick={addCustomTag} className="p-2 bg-stone-200 rounded-lg text-stone-600 hover:bg-stone-300"><Plus size={16}/></button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-2">{editingProfile.tags?.filter(t => !PRESET_TAGS.includes(t)).map(t => (<div key={t} className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-[10px] font-bold border border-amber-100">#{t}<button onClick={() => toggleTag(t)}><X size={10}/></button></div>))}</div>
                            </div>
                            <button onClick={handleSaveEdit} disabled={isSaving} className={`w-full py-3 rounded-xl font-bold shadow-lg mt-2 active:scale-95 transition-transform flex items-center justify-center gap-2 ${isSaving ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-stone-900 text-white'}`}>{isSaving ? <><Activity size={16} className="animate-spin"/> 保存中...</> : '保存修改'}</button>
                        </div>
                    </div>
                </div>
            )}
            
            {viewingReports && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={() => setViewingReports(null)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-slide-up overflow-hidden">
                        <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50"><h3 className="font-black text-stone-900">{viewingReports.name} 的报告库</h3><X onClick={() => setViewingReports(null)} size={20} className="text-stone-400 cursor-pointer"/></div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                            {viewingReports.aiReports?.length ? viewingReports.aiReports.map(r => (
                                <div key={r.id} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-2">
                                    <div className="flex justify-between items-center"><span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{r.type==='ziwei'?'紫微':'八字'}</span><span className="text-[9px] text-stone-400">{new Date(r.date).toLocaleString()}</span></div>
                                    <div className="text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap font-medium">{typeof r.content === 'string' ? r.content : JSON.stringify(r.content, null, 2)}</div>
                                    <button onClick={()=>{navigator.clipboard.writeText(String(r.content)); alert('已复制');}} className="w-full py-2 bg-stone-100 text-stone-700 rounded-xl text-[10px] font-bold">复制全文</button>
                                </div>
                            )) : <div className="text-center py-20 text-stone-300 italic">暂无记录</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};