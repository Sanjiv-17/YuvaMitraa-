import React from 'react';
import { 
  Home, 
  Briefcase, 
  BookOpen, 
  FileText, 
  Mic, 
  Compass, 
  Landmark, 
  CheckSquare, 
  Award, 
  User, 
  Building2, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  count?: number;
  badge?: string;
  ai?: boolean;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, applications, certificates, isRecruiter, isExperienced, isCollege, isAdmin } = useApp();

  const homeTarget = isExperienced ? 'experienced' : isRecruiter ? 'recruiter' : 'home';

  const navItems: NavItem[] = [
    { id: homeTarget, label: isExperienced ? 'Career Hub' : 'Home', icon: Home },
    { id: 'learn', label: 'Learn', icon: BookOpen, count: certificates.length },
    { id: 'opportunities', label: 'Opportunities', icon: Briefcase, count: applications.length, badge: 'Active' },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, ai: true },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  if (isCollege) {
    navItems.push({ id: 'college', label: 'College Portal', icon: Building2, badge: 'AISHE' });
  }

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Dashboard', icon: Landmark, badge: 'Staff' });
  }

  if (isRecruiter && homeTarget !== 'recruiter') {
    navItems.push({ id: 'recruiter', label: 'Recruiter Dashboard', icon: Building2 });
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 min-h-[calc(100vh-4rem)] p-4 shrink-0 transition-colors">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-[#E6F4FF] dark:hover:bg-slate-800 hover:text-[#0284C7] dark:hover:text-sky-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#0284C7] dark:group-hover:text-sky-400'
                }`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.ai && (
                  <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                    isActive ? 'bg-white/20 text-white' : 'bg-orange-100 dark:bg-orange-950/70 text-[#FF7A00]'
                  }`}>
                    <Sparkles className="w-2.5 h-2.5" />
                    AI
                  </span>
                )}
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                    item.badge === 'Govt'
                      ? isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                      : isActive ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-sky-950/70 text-blue-700 dark:text-sky-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-[#FF7A00]' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {item.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Motivation Box */}
      <div className="mt-auto pt-4">
        <div className="bg-gradient-to-br from-[#E6F4FF] to-[#D4EDFF] dark:from-slate-800 dark:to-slate-800/80 p-3.5 rounded-2xl border border-sky-100 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 w-14 h-14 bg-sky-200/50 dark:bg-sky-500/10 rounded-full blur-xs" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0284C7] dark:text-sky-300 bg-white/70 dark:bg-slate-900/70 px-2 py-0.5 rounded-sm">
              Daily Mission
            </span>
            <p className="text-xs font-bold text-slate-800 dark:text-white mt-1.5">
              Pass 1 Module Quiz
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
              Earn 50 XP & keep your streak alive.
            </p>
            <button
              onClick={() => setActiveTab('courses')}
              className="mt-2.5 w-full flex items-center justify-center gap-1 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 text-[#0284C7] dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <span>Explore Courses</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
