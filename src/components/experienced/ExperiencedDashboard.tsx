import React from 'react';
import {
  Briefcase,
  Sparkles,
  FileText,
  Mic,
  TrendingUp,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle2,
  Compass,
  Award,
  Building2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ExperiencedDashboard: React.FC = () => {
  const {
    user,
    jobs,
    applications,
    setActiveTab,
    setSelectedJobForDetail,
  } = useApp();

  // Prioritize full-time, contract, and remote roles for experienced candidates
  const experiencedRoles = (jobs || []).filter(
    (j) => j.type === 'full-time' || j.type === 'remote' || j.type === 'part-time'
  );
  const featuredJobs = (experiencedRoles.length > 0 ? experiencedRoles : jobs || []).slice(0, 4);
  const activeInterviews = (applications || []).filter(
    (a) => a.status === 'Interview' || a.status === 'Shortlisted'
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-slate-700/60">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#FF7A00]/20 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF7A00]/20 border border-[#FF7A00]/30 text-xs font-semibold text-amber-300">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Experienced Candidate Career Hub</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {(user?.name || 'Professional').split(' ')[0]}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium">
              {user?.currentRole
                ? `${user.currentRole}${user.yearsOfExperience ? ` • ${user.yearsOfExperience} experience` : ''}`
                : 'Explore verified full-time roles, executive career transitions, ATS resume optimization, and AI-guided interview preparation.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs bg-white/10 px-3 py-1 rounded-full font-medium text-slate-200">
                {applications.length} Active Applications
              </span>
              <span className="text-xs bg-white/10 px-3 py-1 rounded-full font-medium text-slate-200">
                {featuredJobs.length}+ Curated Full-Time Roles
              </span>
              {user?.location && (
                <span className="text-xs bg-white/10 px-3 py-1 rounded-full font-medium text-slate-200">
                  {user.location}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('opportunities')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-amber-500 hover:from-[#e56d00] hover:to-amber-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#FF7A00]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              <span>Browse Full-Time Jobs</span>
            </button>
            <button
              onClick={() => setActiveTab('resume')}
              className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#FF7A00]" />
              <span>AI ATS Resume Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('opportunities')}
          className="text-left bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#FF7A00]/60 shadow-xs transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF7A00] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Briefcase className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Verified Job Openings</h3>
          <p className="text-xs text-slate-500 mt-1">
            Filter full-time, hybrid, and remote roles matching your domain.
          </p>
        </button>

        <button
          onClick={() => setActiveTab('resume')}
          className="text-left bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#FF7A00]/60 shadow-xs transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Executive Resume Builder</h3>
          <p className="text-xs text-slate-500 mt-1">
            Tailor bullet points for senior roles and verify ATS keyword coverage.
          </p>
        </button>

        <button
          onClick={() => setActiveTab('interview')}
          className="text-left bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#FF7A00]/60 shadow-xs transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Mic className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">AI Interview Coach</h3>
          <p className="text-xs text-slate-500 mt-1">
            Practice system design, leadership, and technical rounds with feedback.
          </p>
        </button>

        <button
          onClick={() => setActiveTab('roadmap')}
          className="text-left bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#FF7A00]/60 shadow-xs transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Career Transition Plan</h3>
          <p className="text-xs text-slate-500 mt-1">
            Generate a personalized upskilling roadmap for your next role.
          </p>
        </button>
      </div>

      {/* Active Interviews Notice */}
      {activeInterviews.length > 0 && (
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#FF7A00] shrink-0" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                {activeInterviews.length} Active Shortlist / Interview Invitation
              </h3>
              <p className="text-xs text-slate-600">
                {activeInterviews[0].jobTitle} at {activeInterviews[0].company}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('applications')}
            className="px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#e56d00] text-white text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
          >
            View Applications
          </button>
        </div>
      )}

      {/* Recommended Opportunities for Experienced Professionals */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF7A00]" />
              <span>Recommended Opportunities</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified roles suited for experienced candidates and career switchers
            </p>
          </div>
          <button
            onClick={() => setActiveTab('opportunities')}
            className="text-xs font-bold text-[#FF7A00] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {featuredJobs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No live opportunities loaded yet. Open Opportunities to sync latest verified listings.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJobForDetail(job)}
                className="p-4 rounded-2xl border border-slate-200 hover:border-[#FF7A00]/60 bg-slate-50/50 hover:bg-white transition-all cursor-pointer flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-[#FF7A00]">
                        {job.type}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-2">{job.title}</h3>
                      <p className="text-xs font-medium text-slate-600 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{job.company}</span>
                      </p>
                    </div>
                    {job.isVerified && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {job.stipend}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                  <div className="flex flex-wrap gap-1">
                    {(job.requiredSkills || []).slice(0, 3).map((sk) => (
                      <span key={sk} className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        {sk}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#FF7A00] flex items-center gap-1 shrink-0">
                    Details <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
