import React, { useState } from 'react';
import { 
  Briefcase, 
  Search, 
  Globe, 
  Flame, 
  Bell, 
  User, 
  Moon, 
  Sun, 
  Building2, 
  GraduationCap, 
  Settings,
  Check,
  ChevronDown,
  ShieldCheck,
  KeyRound,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Language } from '../../types';

export const Navbar: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const { 
    user, 
    language, 
    setLanguage, 
    t, 
    darkMode, 
    toggleDarkMode, 
    isRecruiter, 
    toggleRecruiterMode,
    notifications,
    markNotificationRead,
    setActiveTab,
    activeTab
  } = useApp();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const languages: Language[] = [
    'English', 'Hindi', 'Marathi', 'Gujarati', 'Bengali', 
    'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Punjabi', 'Odia', 'Urdu'
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab('jobs');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 cursor-pointer shrink-0 group"
        >
          <img
            src="/logo.png"
            alt="YuvaMitraa"
            className="w-10 h-10 object-contain rounded-xl drop-shadow-xs group-hover:scale-105 transition-transform"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Yuva<span className="text-[#FF7A00]">Mitraa</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#E6F4FF] text-[#0284C7] px-1.5 py-0.5 rounded-sm">
                IN
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 -mt-0.5 hidden sm:block">
              Learn • Skill • Work • Grow
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <form 
          onSubmit={handleSearchSubmit} 
          className="hidden md:flex flex-1 max-w-md relative items-center"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-slate-900 border border-transparent focus:border-[#FF7A00] rounded-xl outline-hidden transition-all placeholder:text-slate-400"
          />
        </form>

        {/* Right Navigation & Utility Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* User Role Quick Badge & Switcher */}
          {user.role === 'admin' ? (
            <button
              onClick={() => setActiveTab('admin')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Center</span>
            </button>
          ) : isRecruiter ? (
            <button
              onClick={() => setActiveTab('recruiter')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Recruiter Portal</span>
            </button>
          ) : (
            <button
              onClick={toggleRecruiterMode}
              title="Switch to Recruiter Mode"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Mode</span>
            </button>
          )}

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowLangMenu(!showLangMenu);
                setShowNotifMenu(false);
                setShowUserMenu(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Select App Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span className="hidden sm:inline">{language}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Regional Languages
                </div>
                {languages.map((lng) => (
                  <button
                    key={lng}
                    onClick={() => {
                      setLanguage(lng);
                      setShowLangMenu(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-medium flex items-center justify-between hover:bg-orange-50 dark:hover:bg-slate-700/60 transition-colors ${
                      language === lng ? 'text-[#FF7A00] font-bold bg-orange-50/50' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{lng}</span>
                    {language === lng && <Check className="w-3.5 h-3.5 text-[#FF7A00]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowLangMenu(false);
                setShowUserMenu(false);
              }}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#FF7A00] text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-orange-100 text-[#FF7A00] font-bold px-1.5 py-0.2 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => notifications.forEach(n => markNotificationRead(n.id))}
                    className="text-[10px] font-semibold text-[#0284C7] hover:underline"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5 py-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id);
                        if (notif.actionTab) setActiveTab(notif.actionTab);
                        setShowNotifMenu(false);
                      }}
                      className={`p-2.5 rounded-xl text-left cursor-pointer transition-colors flex items-start gap-2.5 ${
                        !notif.read ? 'bg-orange-50/60 dark:bg-slate-800/80 border border-orange-100 dark:border-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-[#FF7A00] mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{notif.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{notif.message}</p>
                        <span className="text-[9px] font-semibold text-slate-400 mt-1 block">{notif.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dark Mode Quick Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile Quick Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 pl-2 pr-1.5 rounded-full hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <img
                src={user.photoUrl}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-orange-300"
              />
              <div className="flex flex-col text-left hidden sm:block">
                <span className="text-xs font-bold text-slate-700 max-w-[80px] truncate leading-tight block">
                  {user.name.split(' ')[0]}
                </span>
                <span className="text-[9px] font-extrabold uppercase text-[#FF7A00] tracking-wider block">
                  {user.role}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                      user.role === 'admin'
                        ? 'bg-slate-900 text-white'
                        : user.role === 'recruiter'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-orange-100 text-[#FF7A00]'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                    <span>{user.phone ? `+91 ${user.phone}` : ''}</span>
                    <span>•</span>
                    <span className="text-[#FF7A00] font-bold">⭐ {user.xpPoints} XP</span>
                  </div>
                </div>

                {user.role === 'admin' && (
                  <button
                    onClick={() => {
                      setActiveTab('admin');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Admin Dashboard</span>
                  </button>
                )}

                {user.role === 'recruiter' && (
                  <button
                    onClick={() => {
                      setActiveTab('recruiter');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>Recruiter Dashboard</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('profile')}</span>
                </button>

                <button
                  onClick={() => {
                    onOpenSettings();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Settings & Accessibility</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => {
                    useApp().openAuthModal('login');
                    setShowUserMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-[#FF7A00] font-bold hover:bg-orange-50 flex items-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Switch Account / Sign In</span>
                </button>

                <button
                  onClick={() => {
                    useApp().logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-red-600 font-semibold hover:bg-red-50 flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
