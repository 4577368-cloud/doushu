import React from 'react';
import { X, ClipboardCopy } from 'lucide-react';
import { SmartTextRenderer } from '../ui/BaziUI';

export const ReportHistoryModal: React.FC<{ report: any; onClose: () => void }> = ({ report, onClose }) => {
    if (!report) return null;
    return (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] animate-slide-up overflow-hidden">
                <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/80 backdrop-blur sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{report.userName}</span>
                            <span className="text-[10px] text-stone-400">{new Date(report.date).toLocaleString()}</span>
                        </div>
                        <h3 className="font-black text-stone-900 text-sm">大师解盘报告详单</h3>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-stone-100 text-stone-400 hover:text-stone-950 transition-colors"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white">
                    <SmartTextRenderer content={report.content} />
                </div>
                <div className="p-4 border-t border-stone-100 bg-stone-50">
                    <button onClick={() => { navigator.clipboard.writeText(report.content); alert('报告内容已复制'); }} className="w-full py-3 bg-stone-900 text-white rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <ClipboardCopy size={16} /> 复制完整报告
                    </button>
                </div>
            </div>
        </div>
    );
};