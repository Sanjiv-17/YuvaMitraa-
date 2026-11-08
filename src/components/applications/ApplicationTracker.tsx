import React, { useState } from 'react';
import { 
  CheckSquare, 
  Briefcase, 
  Building2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Award,
  Video,
  ExternalLink,
  Trash2,
  BellRing
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Application } from '../../types';

const PIPELINE_STEPS: Array<{ key: Application['status']; label: string }> = [
  { key: 'Applied', label: 'Applied' },
  { key: 'Shortlisted', label: 'Shortlisted' },
  { key: 'Interview', label: 'Interview Scheduled' },
  { key: 'Selected', label: 'Offer Received' },
];

export const ApplicationTracker: React.FC = () => {
  const { applications, setActiveTab, updateApplicationStatus } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [calendarAlert, setCalendarAlert] = useState<string | null>(null);

  const statuses = ['All', 'Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

  const filteredApps = applications.filter((app) => {
    if (filterStatus === 'All') return true;
    return app.status === filterStatus;
  });

  const countByStatus = (status: string) => {
    if (status === 'All') return applications.length;
    return applications.filter(a => a.status === status).length;
  };

  const handleAddToCalendar = (app: Application) => {
    setCalendarAlert(`Interview reminder added to Google Calendar for ${app.jobTitle} with ${app.company}!`);
    setTimeout(() => setCalendarAlert(null), 3500);
  };

  const getStepProgressIndex = (status: Application['status']) => {
    switch (status) {
      case 'Applied': return 0;
      case 'Shortlisted': return 1;
      case 'Interview': return 2;
      case 'Selected': return 3;
      case 'Rejected': return -1;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-[#FF7A00] text-xs font-bold mb-1.5">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Career Pipeline Tracking</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>My Application Tracker</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time status updates, recruiter communications, stage pipelines, and interview reminders
          </p>
        </div>

        <button
          onClick={() => setActiveTab('jobs')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
        >
          <Briefcase className="w-4 h-4" />
          <span>Explore More Openings</span>
        </button>
      </div>

      {/* Calendar Alert Banner */}
      {calendarAlert && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in">
          <BellRing className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{calendarAlert}</span>
        </div>
      )}

      {/* Pipeline Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Applied</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{applications.length}</div>
          <span className="text-[10px] text-slate-500">Active submissions</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Shortlisted</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{countByStatus('Shortlisted')}</div>
          <span className="text-[10px] text-emerald-700">Passed resume review</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Interviews</span>
          <div className="text-2xl font-black text-purple-600 mt-1">{countByStatus('Interview')}</div>
          <span className="text-[10px] text-purple-700">Practice with AI Mock tool</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-[#FF7A00] uppercase tracking-wider block">Offers</span>
          <div className="text-2xl font-black text-[#FF7A00] mt-1">{countByStatus('Selected')}</div>
          <span className="text-[10px] text-orange-600">Selection verified</span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs no-scrollbar">
        {statuses.map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === st
                ? 'bg-[#FF7A00] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{st}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              filterStatus === st ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {countByStatus(st)}
            </span>
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-500 space-y-3">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No applications in &quot;{filterStatus}&quot; stage</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Apply to fresh openings on YuvaMitraa with automated AI skill matching and direct recruiter forwarding.
          </p>
          <button
            onClick={() => setActiveTab('jobs')}
            className="mt-2 px-4 py-2 bg-orange-50 text-[#FF7A00] text-xs font-bold rounded-xl hover:bg-orange-100 transition-colors"
          >
            Browse Nearby Internships
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const isShortlisted = app.status === 'Shortlisted';
            const isInterview = app.status === 'Interview';
            const isSelected = app.status === 'Selected';
            const isRejected = app.status === 'Rejected';
            const stepIdx = getStepProgressIndex(app.status);

            return (
              <div
                key={app.id}
                className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs hover:border-[#FF7A00]/50 transition-all space-y-4"
              >
                {/* Top Row: Title, Company, Status Badge & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 tracking-tight">
                        {app.jobTitle}
                      </h3>
                      
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : isShortlisted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isInterview
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : isRejected
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {app.status}
                      </span>

                      {app.matchScore && (
                        <span className="text-[10px] bg-orange-50 text-[#FF7A00] border border-orange-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{app.matchScore}% AI Match</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{app.company}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400 font-normal">Applied on {app.appliedDate}</span>
                    </div>
                  </div>

                  {/* Context Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    {(isShortlisted || isInterview) && (
                      <button
                        onClick={() => setActiveTab('interview')}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Practice Mock Interview</span>
                      </button>
                    )}

                    {isInterview && (
                      <button
                        onClick={() => handleAddToCalendar(app)}
                        className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0284C7] text-xs font-bold border border-sky-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Add Reminder</span>
                      </button>
                    )}

                    {isSelected && (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        <span>Internship Verified</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pipeline Progression Stepper */}
                {!isRejected ? (
                  <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                    <div className="grid grid-cols-4 gap-2 text-center relative">
                      {PIPELINE_STEPS.map((step, sIdx) => {
                        const isDone = stepIdx >= sIdx;
                        const isCurrent = stepIdx === sIdx;

                        return (
                          <div key={step.key} className="flex flex-col items-center space-y-1 relative z-10">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isCurrent
                                ? 'bg-[#FF7A00] text-white ring-4 ring-orange-200 scale-105'
                                : isDone
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200 text-slate-500'
                            }`}>
                              {isDone ? <CheckCircle2 className="w-4 h-4" /> : sIdx + 1}
                            </div>
                            <span className={`text-[10px] font-bold ${
                              isCurrent ? 'text-[#FF7A00]' : isDone ? 'text-slate-800' : 'text-slate-400'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50/70 rounded-2xl border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Application not advanced for this cycle. We recommend taking the related YuvaMitraa course to earn a certificate and re-apply!</span>
                  </div>
                )}

                {/* Cover Note Preview */}
                {app.coverLetter && (
                  <div className="text-[11px] text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-100 flex items-start gap-2">
                    <span className="font-bold text-slate-700 shrink-0">Your Cover Note:</span>
                    <span className="italic line-clamp-2">{app.coverLetter}</span>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
