import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Building2,
  MapPin,
  Clock,
  Calendar,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ExternalLink,
  RefreshCw,
  Loader2,
  ShieldCheck,
  GraduationCap,
  Target,
  ChevronRight,
  Info,
  SlidersHorizontal,
  Award,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { InternshipRecommendation, Job } from '../../types';
import { openExternalUrl } from '../../utils/navigation';

interface RecommendedForYouProps {
  compact?: boolean;
}

function getTierStyles(score: number): {
  badge: string;
  ring: string;
  bar: string;
} {
  if (score >= 90) {
    return {
      badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      ring: 'border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40',
      bar: 'bg-emerald-500',
    };
  }
  if (score >= 80) {
    return {
      badge: 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800',
      ring: 'border-[#0284C7] text-[#0284C7] dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40',
      bar: 'bg-[#0284C7]',
    };
  }
  if (score >= 65) {
    return {
      badge: 'bg-orange-100 dark:bg-orange-950/60 text-[#E06900] dark:text-orange-300 border-orange-300 dark:border-orange-800',
      ring: 'border-[#FF7A00] text-[#FF7A00] dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40',
      bar: 'bg-[#FF7A00]',
    };
  }
  if (score >= 50) {
    return {
      badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      ring: 'border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40',
      bar: 'bg-amber-500',
    };
  }
  return {
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    ring: 'border-slate-400 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800',
    bar: 'bg-slate-400',
  };
}

function buildFallbackJobFromRecommendation(rec: InternshipRecommendation): Job {
  const modeType: Job['type'] =
    rec.workMode.toLowerCase() === 'online' ? 'remote' : 'internship';
  return {
    id: rec.jobId || rec.internshipId,
    title: rec.title,
    company: rec.companyName,
    companyLogo: `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.companyName)}&background=FF7A00&color=fff`,
    location: rec.location || 'India',
    city: rec.location || 'India',
    coordinates: { lat: 28.6139, lng: 77.209 },
    type: modeType,
    category: 'Tech',
    stipend: rec.stipend || '',
    stipendAmount: 0,
    duration: rec.duration || 'Internship',
    requiredSkills: rec.requiredSkills || [],
    eligibility: rec.eligibility,
    description: rec.matchReason,
    responsibilities: [],
    perks: [],
    deadline: rec.applicationDeadline || 'Active Opening',
    applicantsCount: 0,
    postedDate: new Date().toISOString().split('T')[0],
    isVerified: rec.isVerified,
    verificationStatus: 'approved',
    opportunitySource: rec.sourceName || 'Verified Partner',
    originalUrl: rec.applyUrl || undefined,
    externalSourceUrl: rec.applyUrl || undefined,
  };
}

export const RecommendedForYou: React.FC<RecommendedForYouProps> = ({ compact = false }) => {
  const {
    user,
    jobs,
    courses,
    applications,
    recommendationsBundle,
    isLoadingRecommendations,
    recommendationsError,
    recommendationSourceStatus,
    refreshRecommendations,
    setSelectedJobForDetail,
    openJobApplyModal,
    setSelectedCourseForPlayer,
    setActiveTab,
  } = useApp();

  const [beginnerOnly, setBeginnerOnly] = useState(false);

  const hasSparseProfile =
    (user?.skills || []).length === 0 &&
    !user?.education &&
    !user?.course &&
    !user?.branch &&
    (user?.interests || []).length === 0 &&
    !user?.preferredDomain &&
    !user?.careerGoals;

  const allRecommendations = recommendationsBundle?.recommendations || [];
  const filteredRecommendations = useMemo(() => {
    const base = beginnerOnly
      ? allRecommendations.filter((r) => r.isBeginnerFriendly)
      : allRecommendations;
    return compact ? base.slice(0, 4) : base;
  }, [allRecommendations, beginnerOnly, compact]);

  const overallMissingSkills = recommendationsBundle?.overallMissingSkills || [];
  const topSkillGapResources = recommendationsBundle?.topSkillGapResources || [];
  const beginnerCount = recommendationsBundle?.beginnerFriendlyCount ?? 0;

  const handleOpenCourse = (courseId?: string, resourceUrl?: string) => {
    if (courseId) {
      const targetCourse = courses.find((c) => c.id === courseId);
      if (targetCourse) {
        setSelectedCourseForPlayer(targetCourse);
        setActiveTab('course-player');
        return;
      }
    }
    if (resourceUrl && resourceUrl.startsWith('http')) {
      openExternalUrl(resourceUrl);
    } else {
      setActiveTab('courses');
    }
  };

  const resolveMatchingJob = (rec: InternshipRecommendation): Job | undefined => {
    return jobs.find(
      (j) =>
        j.id === rec.jobId ||
        j.id === rec.internshipId ||
        (j.title.toLowerCase() === rec.title.toLowerCase() &&
          j.company.toLowerCase() === rec.companyName.toLowerCase())
    );
  };

  const handleApplyNow = (rec: InternshipRecommendation) => {
    const matchingJob = resolveMatchingJob(rec);
    if (matchingJob) {
      openJobApplyModal(matchingJob);
      return;
    }
    if (rec.applyUrl && rec.applyUrl.startsWith('http')) {
      openExternalUrl(rec.applyUrl);
      return;
    }
    openJobApplyModal(buildFallbackJobFromRecommendation(rec));
  };

  const handleViewDetails = (rec: InternshipRecommendation) => {
    const matchingJob = resolveMatchingJob(rec);
    setSelectedJobForDetail(matchingJob || buildFallbackJobFromRecommendation(rec));
  };

  return (
    <section
      aria-label="Recommended For You"
      className="bg-white dark:bg-slate-800/95 rounded-3xl border border-orange-200/80 dark:border-slate-700 shadow-xs p-5 sm:p-6 space-y-5 font-['Poppins',sans-serif]"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#E06900] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Recommended For You
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#FF7A00] border border-orange-200 dark:border-orange-800">
              AI Weighted Matcher
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Personalized using <strong className="text-slate-700 dark:text-slate-200">40% Skills</strong>,{' '}
            <strong className="text-slate-700 dark:text-slate-200">25% Interests</strong>,{' '}
            <strong className="text-slate-700 dark:text-slate-200">20% Education</strong>,{' '}
            <strong className="text-slate-700 dark:text-slate-200">10% Career Goals</strong> &amp;{' '}
            <strong className="text-slate-700 dark:text-slate-200">5% Location/Mode</strong>.
          </p>

          {/* Active Profile Signals */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-lg font-medium border border-slate-200 dark:border-slate-700">
              Skills: {(user?.skills || []).length > 0 ? (user.skills || []).slice(0, 3).join(', ') + ((user.skills || []).length > 3 ? ` +${user.skills.length - 3}` : '') : 'Add skills'}
            </span>
            {user?.preferredDomain && (
              <span className="text-[11px] bg-sky-50 dark:bg-sky-950/40 text-[#0284C7] dark:text-sky-300 px-2.5 py-0.5 rounded-lg font-medium border border-sky-200 dark:border-sky-800">
                Domain: {user.preferredDomain}
              </span>
            )}
            <span className="text-[11px] bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-lg font-medium border border-slate-200 dark:border-slate-700">
              Pref: {user?.workModePreference || 'Any'} • {user?.preferredLocation || user?.location || 'India'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {beginnerCount > 0 && (
            <button
              type="button"
              onClick={() => setBeginnerOnly((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                beginnerOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Beginner-Friendly ({beginnerCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Edit Preferences</span>
          </button>

          <button
            type="button"
            onClick={() => void refreshRecommendations(true)}
            disabled={isLoadingRecommendations}
            className="px-3.5 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isLoadingRecommendations ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      {/* Incomplete Profile Callout */}
      {hasSparseProfile && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
            <Target className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Complete your Student Profile for sharper AI matches</span>
              <span className="text-[11px] text-amber-800/90 dark:text-amber-300">
                Add your degree, branch, technical skills, areas of interest, and career goals to unlock personalized rankings.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            Update Profile
          </button>
        </div>
      )}

      {/* External API Transparency Banner */}
      {recommendationSourceStatus?.externalUnavailable && allRecommendations.length > 0 && (
        <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-[11px] flex items-center gap-2">
          <Info className="w-4 h-4 text-[#0284C7] shrink-0" />
          <span>
            Paid APIs (AICTE/NCS direct connectors) are currently unconfigured; using free public feeds (Arbeitnow &amp; Remotive), YuvaMitraa &amp; Firestore verified listings ({allRecommendations.length} ranked).
          </span>
        </div>
      )}

      {/* Error State */}
      {recommendationsError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{recommendationsError}</span>
          </div>
          <button
            type="button"
            onClick={() => void refreshRecommendations(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoadingRecommendations && allRecommendations.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-xs text-slate-500 gap-2.5">
          <Loader2 className="w-6 h-6 animate-spin text-[#FF7A00]" />
          <span className="font-semibold">Analyzing your skills, interests, education &amp; career goals...</span>
        </div>
      ) : filteredRecommendations.length === 0 ? (
        /* Explicit Verified Empty State */
        <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-center space-y-2">
          <Briefcase className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {beginnerOnly
              ? 'No beginner-friendly internships found in current filter'
              : 'No verified internship opportunities are currently available'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {beginnerOnly
              ? 'Show all verified internships to view additional opportunities and skill-building paths.'
              : 'YuvaMitraa only recommends verified internships from trusted sources and never generates unverified listings.'}
          </p>
          {beginnerOnly && (
            <button
              type="button"
              onClick={() => setBeginnerOnly(false)}
              className="mt-2 px-4 py-1.5 rounded-xl bg-[#FF7A00] text-white text-xs font-bold cursor-pointer"
            >
              Show All Verified Matches
            </button>
          )}
        </div>
      ) : (
        /* Recommendation Cards Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRecommendations.map((rec) => {
            const tierStyle = getTierStyles(rec.matchScore);
            const hasApplied = applications.some(
              (a) => a.jobId === (rec.jobId || rec.internshipId)
            );

            return (
              <article
                key={rec.internshipId}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-700 hover:border-[#FF7A00]/60 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Top Row: Role, Company & AI Score Circle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {rec.isVerified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3" />
                            <span>{rec.sourceName}</span>
                          </span>
                        )}
                        {rec.isBeginnerFriendly && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            <GraduationCap className="w-3 h-3" />
                            <span>Beginner-Friendly</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                        {rec.title}
                      </h3>

                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#FF7A00] shrink-0" />
                        <span>{rec.companyName}</span>
                      </p>
                    </div>

                    {/* Score Badge */}
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <div
                        className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center shadow-2xs ${tierStyle.ring}`}
                      >
                        <span className="text-sm font-black leading-none">{rec.matchScore}%</span>
                        <span className="text-[9px] font-bold uppercase tracking-tight mt-0.5">Match</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${tierStyle.badge}`}
                      >
                        {rec.matchScore}% Match – {rec.matchTier}
                      </span>
                    </div>
                  </div>

                  {/* Key Logistics Grid: Stipend, Duration, Mode, Location, Deadline */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Stipend</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {rec.stipend || 'Not disclosed'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Duration</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{rec.duration}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Work Mode</span>
                      <span className="font-semibold text-[#0284C7] dark:text-sky-300">{rec.workMode}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-2">
                      <span className="text-slate-400 block text-[10px]">Location</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#FF7A00] shrink-0" />
                        <span className="truncate">{rec.location}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Deadline</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{rec.applicationDeadline}</span>
                      </span>
                    </div>
                  </div>

                  {/* Eligibility Criteria */}
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200/70 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-slate-100">Eligibility: </span>
                    <span>{rec.eligibility}</span>
                  </div>

                  {/* Why this internship matches the student */}
                  <div className="p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/25 border border-orange-200/70 dark:border-orange-900/50 space-y-2">
                    <div className="text-[11px] font-bold text-[#E06900] dark:text-orange-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Why this matches you</span>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
                      {rec.matchReason}
                    </p>

                    {/* Weighted Score Breakdown (40/25/20/10/5) */}
                    <div className="grid grid-cols-5 gap-1.5 pt-1 text-center">
                      {[
                        { label: 'Skills 40%', val: rec.breakdown.skillsScore },
                        { label: 'Interest 25%', val: rec.breakdown.interestScore },
                        { label: 'Edu 20%', val: rec.breakdown.educationScore },
                        { label: 'Goal 10%', val: rec.breakdown.careerGoalScore },
                        { label: 'Loc 5%', val: rec.breakdown.locationPreferenceScore },
                      ].map((metric) => (
                        <div
                          key={metric.label}
                          className="bg-white/90 dark:bg-slate-800 rounded-lg py-1 px-1 border border-orange-100 dark:border-slate-700"
                        >
                          <div className="text-[10px] font-black text-slate-800 dark:text-white">
                            {metric.val}%
                          </div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                            {metric.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Required Skills: Matched vs Missing */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Required Skills ({rec.matchedSkills.length}/{rec.requiredSkills.length} matched):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {rec.requiredSkills.map((skill, idx) => {
                        const isMatched = rec.matchedSkills.includes(skill);
                        return (
                          <span
                            key={`${skill}-${idx}`}
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-lg border ${
                              isMatched
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {isMatched ? (
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            ) : (
                              <AlertCircle className="w-2.5 h-2.5" />
                            )}
                            <span>{skill}</span>
                          </span>
                        );
                      })}
                    </div>

                    {/* Per-Internship Quick Learning Suggestion if missing skills exist */}
                    {rec.missingSkills.length > 0 && rec.suggestedResources.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="font-bold text-amber-700 dark:text-amber-300">Bridge Gap:</span>
                        {rec.suggestedResources.slice(0, 2).map((res, rIdx) => (
                          <button
                            key={rIdx}
                            type="button"
                            onClick={() => handleOpenCourse(res.courseId, res.resourceUrl)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-[#0284C7] dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-semibold cursor-pointer"
                          >
                            <BookOpen className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[180px]">{res.courseTitle}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleViewDetails(rec)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                  >
                    Full Details
                  </button>

                  <div className="flex items-center gap-2">
                    {rec.applyUrl && rec.applyUrl.startsWith('http') && (
                      <a
                        href={rec.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-[#0284C7] dark:text-sky-300 text-xs font-bold border border-sky-200 dark:border-sky-800 flex items-center gap-1"
                      >
                        <span>Official Site</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleApplyNow(rec)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                        hasApplied
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-[#FF7A00] hover:bg-[#E06900] text-white'
                      }`}
                    >
                      <span>{hasApplied ? 'Applied ✓' : 'Apply Now'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Compact Mode Footer Link */}
      {compact && allRecommendations.length > filteredRecommendations.length && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className="text-xs font-bold text-[#FF7A00] hover:text-[#E06900] flex items-center gap-1 cursor-pointer"
          >
            <span>Explore All {allRecommendations.length} Ranked Internships</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Skill Gap Analysis & Learning Pathway Panel */}
      {(overallMissingSkills.length > 0 || topSkillGapResources.length > 0) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50/90 via-white to-orange-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-sky-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-[#0284C7]" />
                <span>Skill Gap Analysis &amp; Recommended Courses</span>
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Improve these missing skills from your top internship matches to push your AI score toward 90%+ Excellent.
              </p>
            </div>
            {beginnerCount > 0 && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
                {beginnerCount} Beginner-Friendly Internships Available
              </span>
            )}
          </div>

          {overallMissingSkills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mr-1">
                Skills to Improve:
              </span>
              {overallMissingSkills.map((skill, idx) => (
                <span
                  key={`${skill}-${idx}`}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-100/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                >
                  + {skill}
                </span>
              ))}
            </div>
          )}

          {topSkillGapResources.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topSkillGapResources.map((res, idx) => (
                <div
                  key={`${res.skill}-${idx}`}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950 text-[#0284C7] dark:text-sky-300">
                        Skill: {res.skill}
                      </span>
                      {res.duration && (
                        <span className="text-[10px] font-semibold text-slate-400">
                          {res.duration}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                      {res.courseTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {res.provider} • {res.reason}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenCourse(res.courseId, res.resourceUrl)}
                      className="px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>{res.courseId ? 'Start Certified Course' : 'Open Resource'}</span>
                    </button>
                    {res.resourceUrl && res.courseId && (
                      <a
                        href={res.resourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-slate-500 hover:text-[#0284C7] flex items-center gap-1"
                      >
                        <span>Docs</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
