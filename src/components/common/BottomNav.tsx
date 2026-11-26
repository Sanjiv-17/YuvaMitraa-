import React from 'react';
import { Home, Briefcase, BookOpen, User, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC<{ onOpenAssistant: () => void }> = ({ onOpenAssistant }) => {
  const { activeTab, setActiveTab, isExperienced, isRecruiter } = useApp();

  const homeId = isExperienced ? 'experienced' : isRecruiter ? 'recruiter' : 'home';

  const items = [
    { id: homeId, label: 'Home', icon: Home },
    { id: 'learn', label: 'Learn', icon: BookOpen },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, isAction: true },
    { id: 'opportunities', label: 'Opportunities', icon: Briefcase },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg transition-colors">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        if (item.isAction) {
          return (
            <button
              key={item.id}
              onClick={onOpenAssistant}
              className="flex flex-col items-center justify-center -mt-4 group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FF7A00] to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6" />
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
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors cursor-pointer ${
              isActive
                ? 'text-[#FF7A00] font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5 truncate max-w-[68px]">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
