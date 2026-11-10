import React, { useState } from 'react';
import { Bot, Smartphone, Monitor } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { FloatingChat } from './components/common/FloatingChat';
import { HomeDashboard } from './components/home/HomeDashboard';
import { LearnSection } from './components/learn/LearnSection';
import { OpportunitiesSection } from './components/opportunities/OpportunitiesSection';
import { AIAssistantSection } from './components/assistant/AIAssistantSection';
import { ProfilePage } from './components/profile/ProfilePage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { RecruiterPortal } from './components/recruiter/RecruiterPortal';
import { JobDetailModal } from './components/jobs/JobDetailModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { LoginScreen } from './components/auth/LoginScreen';

const MainScreenContent: React.FC = () => {
  const { activeTab } = useApp();

  if (activeTab === 'home') {
    return <HomeDashboard />;
  }
  if (activeTab === 'learn' || activeTab === 'courses' || activeTab === 'course-player' || activeTab === 'certificates') {
    const sub = activeTab === 'certificates' ? 'certificates' : (activeTab === 'course-player' ? 'player' : 'catalog');
    return <LearnSection key={`learn-${sub}`} initialSubTab={sub} />;
  }
  if (activeTab === 'opportunities' || activeTab === 'jobs' || activeTab === 'schemes' || activeTab === 'applications') {
    const sub = activeTab === 'schemes' ? 'schemes' : (activeTab === 'applications' ? 'applications' : 'jobs');
    return <OpportunitiesSection key={`opp-${sub}`} initialSubTab={sub} />;
  }
  if (activeTab === 'ai-assistant' || activeTab === 'assistant' || activeTab === 'resume' || activeTab === 'interview' || activeTab === 'roadmap') {
    const sub = activeTab === 'resume' ? 'resume' : (activeTab === 'interview' ? 'interview' : (activeTab === 'roadmap' ? 'roadmap' : 'chat'));
    return <AIAssistantSection key={`ai-${sub}`} initialSubTab={sub} />;
  }
  if (activeTab === 'profile') {
    return <ProfilePage />;
  }
  if (activeTab === 'admin') {
    return <AdminDashboard />;
  }
  if (activeTab === 'recruiter') {
    return <RecruiterPortal />;
  }

  return <HomeDashboard />;
};

const AppContent: React.FC = () => {
  const { isAuthenticated, viewportMode, setViewportMode, setActiveTab } = useApp();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // If not authenticated, display login screen first as required
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // MOBILE SCREEN VIEWPORT: Fixed smartphone frame
  if (viewportMode === 'mobile') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-start sm:justify-center p-1 sm:p-6 font-['Poppins',sans-serif]">
        
        {/* Viewport Control Bar */}
        <div className="w-full max-w-sm mb-3 flex items-center justify-between bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700 text-xs text-white shadow-lg">
          <span className="font-semibold text-slate-300">View Mode:</span>
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl">
            <button
              onClick={() => setViewportMode('desktop')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setViewportMode('mobile')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FF7A00] text-white font-bold transition-all cursor-pointer shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Phone</span>
            </button>
          </div>
        </div>

        {/* Smartphone Frame */}
        <div className="w-full max-w-[400px] h-[844px] bg-slate-950 rounded-[46px] p-2.5 shadow-2xl ring-8 ring-slate-800/90 border-4 border-slate-700 flex flex-col relative overflow-hidden">
          
          {/* Status Bar */}
          <div className="text-white px-5 pt-2 pb-1 flex items-center justify-between text-[11px] font-semibold tracking-wider flex-shrink-0">
            <span>9:41</span>
            <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-800"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700"></div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">5G</span>
              <div className="w-4 h-2 rounded-2xs border border-white/80 p-0.5 flex items-center">
                <div className="h-full w-full bg-white rounded-3xs"></div>
              </div>
            </div>
          </div>

          {/* Phone Inner Display Viewport */}
          <div className="flex-1 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-[36px] overflow-hidden flex flex-col relative">
            
            {/* Fixed Navbar */}
            <div className="flex-shrink-0">
              <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />
            </div>

            {/* Scrollable Content inside Mobile Screen */}
            <main className="flex-1 overflow-y-auto p-3.5 pb-24">
              <MainScreenContent />
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav onOpenAssistant={() => setActiveTab('ai-assistant')} />
          </div>

          {/* Bottom Home Indicator Bar */}
          <div className="w-32 h-1 bg-white/40 rounded-full mx-auto my-1 flex-shrink-0"></div>
        </div>

        {/* Global Modals */}
        <JobDetailModal />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    );
  }

  // DESKTOP RESPONSIVE VIEWPORT: Full expansive desktop layout
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col font-['Poppins',sans-serif] transition-colors">
      
      {/* Top Navigation Bar with Viewport Switcher */}
      <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Body with Desktop Left Sidebar + Main Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 pb-24 lg:pb-12">
          <MainScreenContent />
        </main>
      </div>

      {/* Floating AI Study Assistant Quick-Launcher */}
      <button
        onClick={() => setActiveTab('ai-assistant')}
        className="fixed bottom-20 lg:bottom-6 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white font-bold text-xs shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        title="Open AI Career Assistant"
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="w-4 h-4" />
        </div>
        <span className="hidden sm:inline">AI Career Assistant</span>
        <span className="sm:hidden">AI Mentor</span>
      </button>

      {/* Global Modals */}
      <JobDetailModal />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Mobile Bottom Tab Navigation */}
      <BottomNav onOpenAssistant={() => setActiveTab('ai-assistant')} />

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
