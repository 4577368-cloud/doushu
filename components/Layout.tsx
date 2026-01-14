
import React from 'react';
import { Compass, ScrollText, User, Stars } from 'lucide-react';
import { AppTab } from '../types';

interface HeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, rightAction }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 h-14 flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="w-10"></div>
      <h1 className="font-serif font-bold text-lg text-stone-800 tracking-wide">{title}</h1>
      <div className="w-10 flex justify-end">
        {rightAction}
      </div>
    </header>
  );
};

interface BottomNavProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: AppTab.HOME, label: '首页', icon: Compass },
    { id: AppTab.CHART, label: '八字', icon: ScrollText },
    { id: AppTab.ZIWEI, label: '紫微', icon: Stars }, // 新增：紫微入口
    { id: AppTab.ARCHIVE, label: '档案', icon: User },
  ];

  return (
    <div className="bg-white border-t border-stone-200 pb-safe pt-2 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] shrink-0 z-50">
      <div className="flex justify-between items-end pb-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 min-w-[4rem] transition-all duration-300 ${
                isActive ? 'text-stone-900 -translate-y-1' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${
                isActive ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' : 'bg-transparent'
              }`}>
                <tab.icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium tracking-wider ${
                isActive ? 'opacity-100 font-bold' : 'opacity-70'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
