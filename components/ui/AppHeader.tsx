import React from 'react';
import { Crown } from 'lucide-react';

export const AppHeader: React.FC<{ title: string; rightAction?: React.ReactNode; isVip: boolean }> = ({ title, rightAction, isVip }) => (
  <header className={`sticky top-0 z-50 px-5 h-16 flex items-center justify-between transition-all duration-500 ${isVip ? 'bg-[#1c1917] border-b border-amber-900/30 shadow-2xl' : 'bg-white/90 backdrop-blur-md border-b border-stone-200 text-stone-900'}`}>
    <h1 className={`text-lg font-serif font-black tracking-wider flex items-center gap-2.5 ${isVip ? 'text-amber-100' : 'text-stone-900'}`}>
      {isVip && (
          <div className="relative">
              <div className="absolute inset-0 bg-amber-400 blur-sm opacity-20 animate-pulse"></div>
              <Crown size={20} className="text-amber-400 fill-amber-400" />
          </div>
      )}
      <span className={isVip ? "bg-clip-text text-transparent bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100" : ""}>{title}</span>
    </h1>
    <div className="flex items-center gap-2">
      {rightAction}
    </div>
  </header>
);