import React from 'react';
import { Compass, Activity, MessageCircle, Sparkles, User } from 'lucide-react';
import { AppTab } from '../types';

interface BottomNavProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  // 🔥 新的 5 项导航结构
  const navItems = [
    { id: AppTab.HOME, label: '首页', icon: Compass },
    { id: AppTab.CHART, label: '八字', icon: Activity },
    { id: AppTab.CHAT, label: '对话', icon: MessageCircle }, // C位
    { id: AppTab.ZIWEI, label: '紫微', icon: Sparkles },
    { id: AppTab.ARCHIVE, label: '档案', icon: User },
  ];

  return (
    <div className="h-[80px] bg-white border-t border-stone-200 flex items-start justify-around px-2 pb-6 pt-2 relative z-50">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        // 如果是中间的“对话”按钮，可以给它特殊的样式（可选，这里保持统一风格但加重颜色）
        const isCenter = item.id === AppTab.CHAT;
        
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 ${
              isActive 
                ? 'text-stone-900 scale-105' 
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <div className={`p-1.5 rounded-2xl transition-all ${
                isActive ? 'bg-stone-100' : 'bg-transparent'
            } ${isCenter && isActive ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                <item.icon 
                    size={isActive ? 24 : 22} 
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isCenter && isActive ? 'text-indigo-600' : ''}
                />
            </div>
            <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-80'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};