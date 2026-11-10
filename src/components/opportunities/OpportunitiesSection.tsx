import React, { useState } from 'react';
import { 
  Briefcase, 
  Landmark, 
  CheckSquare, 
  Bookmark, 
  Sparkles 
} from 'lucide-react';
import { JobFinder } from '../jobs/JobFinder';
import { GovtSchemes } from '../schemes/GovtSchemes';
import { ApplicationTracker } from '../applications/ApplicationTracker';
import { useApp } from '../../context/AppContext';

export const OpportunitiesSection: React.FC<{ initialSubTab?: 'jobs' | 'schemes' | 'applications' | 'saved' }> = ({
  initialSubTab = 'jobs'
}) => {
  const { applications, savedJobIds } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'jobs' | 'schemes' | 'applications' | 'saved'>(initialSubTab);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Opportunities Header & Sub-Navigation */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] text-xs font-semibold uppercase tracking-wider mb-2">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Career Gateway</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Opportunities & Internships
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Explore verified student internships, entry-level jobs, and official Government youth schemes across India.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <span className="block text-xs text-slate-500 dark:text-slate-400">Applications</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">{applications.length}</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-center">
              <span className="block text-xs text-[#FF7A00]">Saved Jobs</span>
              <span className="text-base font-bold text-[#FF7A00]">{savedJobIds.length}</span>
            </div>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            onClick={() => setActiveSubTab('jobs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'jobs'
                ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>All Opportunities</span>
          </button>

          <button
            onClick={() => setActiveSubTab('schemes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'schemes'
                ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Government Schemes</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Official
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('applications')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'applications'
                ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>My Applications ({applications.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('saved')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'saved'
                ? 'bg-[#FF7A00] text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Saved ({savedJobIds.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area Based on Active SubTab */}
      <div>
        {activeSubTab === 'jobs' && <JobFinder />}
        {activeSubTab === 'schemes' && <GovtSchemes />}
        {activeSubTab === 'applications' && <ApplicationTracker />}
        {activeSubTab === 'saved' && (
          <div className="space-y-4">
            <JobFinder />
          </div>
        )}
      </div>
    </div>
  );
};
