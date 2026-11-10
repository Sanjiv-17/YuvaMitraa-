import React, { useState } from 'react';
import { 
  BookOpen, 
  Award, 
  PlayCircle, 
  Sparkles, 
  CheckCircle, 
  ArrowLeft 
} from 'lucide-react';
import { CourseCatalog } from '../courses/CourseCatalog';
import { CoursePlayer } from '../courses/CoursePlayer';
import { CertificateView } from '../certificates/CertificateView';
import { useApp } from '../../context/AppContext';

export const LearnSection: React.FC<{ initialSubTab?: 'catalog' | 'player' | 'certificates' }> = ({
  initialSubTab = 'catalog'
}) => {
  const { certificates, selectedCourseForPlayer, setSelectedCourseForPlayer, user } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'player' | 'certificates'>(
    selectedCourseForPlayer ? 'player' : initialSubTab
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Sub-Navigation */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 text-[#0284C7] text-xs font-semibold uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Skill & Learning Academy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Courses & Skill Development
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Industry-aligned practical video modules, interactive quizzes, and verifiable QR-coded certificates.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-center">
              <span className="block text-xs text-[#0284C7]">Enrolled</span>
              <span className="text-base font-bold text-[#0284C7]">{user.enrolledCourses?.length || 1}</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
              <span className="block text-xs text-amber-600">Certificates</span>
              <span className="text-base font-bold text-amber-600">{certificates.length}</span>
            </div>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'catalog'
                ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Course Catalog</span>
          </button>

          {selectedCourseForPlayer && (
            <button
              onClick={() => setActiveSubTab('player')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                activeSubTab === 'player'
                  ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>Active Lesson Player</span>
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('certificates')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'certificates'
                ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>My Certificates ({certificates.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {activeSubTab === 'catalog' && <CourseCatalog />}
        {activeSubTab === 'player' && <CoursePlayer />}
        {activeSubTab === 'certificates' && <CertificateView />}
      </div>
    </div>
  );
};
