import React from 'react';
import { Home, Briefcase, BookOpen, User, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC<{ onOpenAssistant: () => void }> = ({ onOpenAssistant }) => {
  const { activeTab, setActiveTab, t } = useApp();

  const items = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'jobs', label: t('jobs'), icon: Briefcase },
    { id: 'chat_trigger', label: 'AI Help', icon: Sparkles, isAction: true },
    { id: 'courses', label: t('courses'), icon: BookOpen },
    { id: 'profile', label: t('profile'), icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        if (item.isAction) {
          return (
            <button
              key={item.id}
              onClick={onOpenAssistant}
              className="flex flex-col items-center justify-center -mt-4 group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FF7A00] to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <span className="text-[10px] font-semibold text-[#FF7A00] mt-0.5">
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
              isActive ? 'text-[#FF7A00] font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5 truncate max-w-[64px]">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
