import React, { useState } from 'react';
import { Sparkles, Bot } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { FirstLaunchModal } from './components/common/FirstLaunchModal';
import { FloatingChat } from './components/common/FloatingChat';
import { HomeDashboard } from './components/home/HomeDashboard';
import { JobFinder } from './components/jobs/JobFinder';
import { JobDetailModal } from './components/jobs/JobDetailModal';
import { CourseCatalog } from './components/courses/CourseCatalog';
import { CoursePlayer } from './components/courses/CoursePlayer';
import { CertificateView } from './components/certificates/CertificateView';
import { ResumeBuilder } from './components/resume/ResumeBuilder';
import { MockInterview } from './components/interview/MockInterview';
import { CareerRoadmap } from './components/roadmap/CareerRoadmap';
import { GovtSchemes } from './components/schemes/GovtSchemes';
import { ApplicationTracker } from './components/applications/ApplicationTracker';
import { RecruiterPortal } from './components/recruiter/RecruiterPortal';
import { ProfilePage } from './components/profile/ProfilePage';
import { SettingsModal } from './components/settings/SettingsModal';
import { AuthModal } from './components/auth/AuthModal';
import { AdminDashboard } from './components/admin/AdminDashboard';

const AppContent: React.FC = () => {
  const { activeTab, language } = useApp();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col font-['Poppins',sans-serif] transition-colors">
      
      {/* Top Navigation Bar */}
      <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Body with Desktop Left Sidebar + Main Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 pb-24 lg:pb-12">
          {activeTab === 'home' && <HomeDashboard />}
          {activeTab === 'jobs' && <JobFinder />}
          {activeTab === 'courses' && <CourseCatalog />}
          {activeTab === 'course-player' && <CoursePlayer />}
          {activeTab === 'certificates' && <CertificateView />}
          {activeTab === 'resume' && <ResumeBuilder />}
          {activeTab === 'interview' && <MockInterview />}
          {activeTab === 'roadmap' && <CareerRoadmap />}
          {activeTab === 'schemes' && <GovtSchemes />}
          {activeTab === 'applications' && <ApplicationTracker />}
          {activeTab === 'recruiter' && <RecruiterPortal />}
          {activeTab === 'admin' && <AdminDashboard />}
          {activeTab === 'profile' && <ProfilePage />}
        </main>
      </div>

      {/* Floating AI Study Assistant Trigger Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-20 lg:bottom-6 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white font-bold text-xs shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        title="Open AI Study & Career Mentor"
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="w-4 h-4 animate-bounce" />
        </div>
        <span className="hidden sm:inline">AI Study Assistant</span>
        <span className="sm:hidden">Ask AI</span>
      </button>

      {/* Floating AI Study Assistant Modal / Drawer */}
      <FloatingChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* Job Details Modal with Gemini AI Eligibility Result */}
      <JobDetailModal />

      {/* First Launch Language Selector Modal */}
      <FirstLaunchModal />

      {/* Settings & Accessibility Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Authentication & Role Onboarding Modal */}
      <AuthModal />

      {/* Mobile Bottom Tab Navigation */}
      <BottomNav onOpenAssistant={() => setIsChatOpen(true)} />

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
