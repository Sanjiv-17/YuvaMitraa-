import React, { useMemo } from 'react';
import {
  Sparkles,
  Briefcase,
  BookOpen,
  Award,
  Compass,
  Mic,
  FileText,
  Landmark,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle,
  CheckCircle2,
  Circle,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DailyGoalCard } from './DailyGoalCard';
import { RecommendedForYou } from '../recommendations/RecommendedForYou';
import { LastUpdatedBadge } from '../common/LastUpdatedBadge';
import { suggestResourcesForMissingSkills } from '../../services/matchingEngine';

export const HomeDashboard: React.FC = () => {
  const {
    user,
    jobs,
    courses,
    applications,
    certificates,
    recommendationsBundle,
    isLoadingOpportunities,
    setActiveTab,
    setSelectedJobForDetail,
    setSelectedCourseForPlayer,
    calculateDistance
  } = useApp();

  // Top 3 live openings
  const nearbyJobs = (jobs || []).slice(0, 3);

  // Completed & In-progress courses
  const enrolledMap = useMemo(() => {
    const map = new Map<string, { completedCount: number; passed: boolean }>();
    (user?.enrolledCourses || []).forEach((e) => {
      map.set(e.courseId, {
        completedCount: (e.completedModuleIds || []).length,
        passed: Boolean(e.passed),
      });
    });
    return map;
  }, [user?.enrolledCourses]);

  const completedCoursesCount = useMemo(
    () => (user?.enrolledCourses || []).filter((e) => e.passed).length,
    [user?.enrolledCourses]
  );

  // Courses to display in Continue Learning: prioritize active enrolled courses, then missing-skill recommendations
  const learningCards = useMemo(() => {
    const activeEnrolled = (courses || []).filter((c) => {
      const entry = enrolledMap.get(c.id);
      return entry && !entry.passed;
    });

    if (activeEnrolled.length >= 2) {
      return activeEnrolled.slice(0, 2).map((course) => ({
        course,
        reason: 'In Progress',
      }));
    }

    const pickedIds = new Set(activeEnrolled.map((c) => c.id));
    const cards: Array<{ course: (typeof courses)[number]; reason: string }> = activeEnrolled.map((course) => ({
      course,
      reason: 'In Progress',
    }));

    const missingSkills = recommendationsBundle?.overallMissingSkills || [];
    if (missingSkills.length > 0) {
      const suggested = suggestResourcesForMissingSkills(missingSkills);
      for (const s of suggested) {
        if (cards.length >= 2) break;
        const match = courses.find((c) => c.id === s.courseId && !pickedIds.has(c.id));
        if (match) {
          pickedIds.add(match.id);
          cards.push({ course: match, reason: `Builds ${s.skill}` });
        }
      }
    }

    for (const c of courses) {
      if (cards.length >= 2) break;
      if (!pickedIds.has(c.id)) {
        pickedIds.add(c.id);
        cards.push({ course: c, reason: 'Recommended' });
      }
    }

    return cards;
  }, [courses, enrolledMap, recommendationsBundle?.overallMissingSkills]);

  // Active interviews / shortlisted applications (prioritize those with an interviewDate)
  const activeInterviews = useMemo(() => {
    return (applications || [])
      .filter((a) => a.status === 'Interview' || a.status === 'Shortlisted' || Boolean(a.interviewDate))
      .sort((a, b) => {
        if (a.interviewDate && !b.interviewDate) return -1;
        if (!a.interviewDate && b.interviewDate) return 1;
        return (a.interviewDate || '').localeCompare(b.interviewDate || '');
      });
  }, [applications]);

  // Profile completion breakdown & checklist
  const profileChecklist = useMemo(() => {
    const items = [
      {
        id: 'identity',
        label: 'Name & Contact',
        done: Boolean(user?.name && user?.email),
        weight: 15,
        targetTab: 'profile',
      },
      {
        id: 'education',
        label: 'Education & College',
        done: Boolean(user?.education || user?.institution || user?.college),
        weight: 20,
        targetTab: 'profile',
      },
      {
        id: 'skills',
        label: 'Skills Listed',
        done: (user?.skills || []).length > 0,
        weight: 20,
        targetTab: 'profile',
      },
      {
        id: 'goals',
        label: 'Interests & Career Goals',
        done: (user?.interests || []).length > 0 || Boolean(user?.careerGoals?.trim()),
        weight: 15,
        targetTab: 'profile',
      },
      {
        id: 'resume',
        label: 'Resume Uploaded',
        done: Boolean(user?.resumeText && user.resumeText.trim().length > 20),
        weight: 20,
        targetTab: 'resume',
      },
      {
        id: 'projects',
        label: 'Projects Added',
        done: (user?.projects || []).length > 0,
        weight: 10,
        targetTab: 'profile',
      },
    ];
    const percentage = items.reduce((acc, item) => acc + (item.done ? item.weight : 0), 0);
    return { items, percentage };
  }, [user]);

  const nextAction = profileChecklist.items.find((i) => !i.done);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF7A00] via-[#FF8C1A] to-[#FF9E3B] p-6 sm:p-8 text-white shadow-xl shadow-orange-500/15">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-12 w-48 h-48 rounded-full bg-orange-400/30 blur-lg pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white">
              <Sparkles className="w-3.5 h-3.5" />
              <span>National Youth Skill & Employment Mission</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Namaste, {(user?.name || 'Member').split(' ')[0]}!
            </h1>

            <p className="text-xs sm:text-sm text-orange-100 max-w-xl font-medium">
              You are on a <span className="text-white font-bold">{user?.streakDays ?? 0}-day streak</span>. Complete a skill module or review your matched internships today to boost recruiter readiness.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs bg-black/20 backdrop-blur-xs px-3 py-1 rounded-full font-medium">
                {user?.xpPoints ?? 0} XP Earned
              </span>
              <span className="text-xs bg-black/20 backdrop-blur-xs px-3 py-1 rounded-full font-medium">
                {(user?.badges || [])[(user?.badges || []).length - 1] || 'New Member'}
              </span>
              <span className="text-xs bg-black/20 backdrop-blur-xs px-3 py-1 rounded-full font-medium">
                {(user?.location || 'India').split(',')[0]}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('jobs')}
              className="px-5 py-3 rounded-2xl bg-white text-[#FF7A00] font-bold text-xs sm:text-sm shadow-md hover:bg-orange-50 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              <span>Find Internships</span>
            </button>
            <button
              onClick={() => setActiveTab('resume')}
              className="px-5 py-3 rounded-2xl bg-orange-700/40 hover:bg-orange-700/60 text-white font-semibold text-xs sm:text-sm border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Smart Resume Review</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Shortlist / Scheduled Interview Alert Banner */}
      {activeInterviews.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center shrink-0">
              {activeInterviews[0].interviewDate ? (
                <Calendar className="w-5 h-5 text-purple-200" />
              ) : (
                <Sparkles className="w-5 h-5 text-purple-300" />
              )}
            </div>
            <div>
              <span className="text-[10px] bg-purple-400/30 text-purple-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {activeInterviews[0].interviewDate ? 'Upcoming Interview' : 'Application Update'}
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-white mt-0.5">
                {activeInterviews[0].jobTitle} at {activeInterviews[0].company}
                {activeInterviews.length > 1 ? ` (+${activeInterviews.length - 1} more)` : ''}
              </h3>
              <p className="text-[11px] text-purple-200">
                {activeInterviews[0].interviewDate
                  ? `Scheduled on ${activeInterviews[0].interviewDate}${activeInterviews[0].interviewTime ? ` at ${activeInterviews[0].interviewTime}` : ''}${activeInterviews[0].interviewMode ? ` • ${activeInterviews[0].interviewMode}` : ''}`
                  : 'Practice role-specific technical and HR questions with your AI Interview Coach.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setActiveTab('applications')}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              View Schedule
            </button>
            <button
              onClick={() => setActiveTab('interview')}
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Mock Interview</span>
            </button>
          </div>
        </div>
      )}

      {/* Profile Completion Progress & Recent Update Activity */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Career Profile Completion
              </h2>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                profileChecklist.percentage >= 85
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-orange-50 dark:bg-orange-950/60 text-[#FF7A00]'
              }`}>
                {profileChecklist.percentage}%
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
              <LastUpdatedBadge
                label="Profile"
                timestamp={user?.profileUpdatedAt}
                prefix="Updated"
                emptyText="Not updated yet"
              />
              <LastUpdatedBadge
                label="Resume"
                timestamp={user?.resumeUpdatedAt}
                prefix="Updated"
                emptyText="No resume uploaded"
              />
            </div>
          </div>

          {nextAction ? (
            <button
              onClick={() => setActiveTab(nextAction.targetTab)}
              className="px-3.5 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-950 text-[#FF7A00] text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <span>Complete: {nextAction.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Recruiter-Ready Profile</span>
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF7A00] to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${profileChecklist.percentage}%` }}
          />
        </div>

        {/* Checklist Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {profileChecklist.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.targetTab)}
              className={`px-2.5 py-2 rounded-xl border text-left text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                item.done
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#FF7A00]'
              }`}
            >
              {item.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Daily Study / Skill Goal Card */}
      <DailyGoalCard />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('applications')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#FF7A00]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Applications</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-[#FF7A00] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{applications.length}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
            <CheckCircle className="w-3 h-3" />
            <span>
              {applications.filter((a) => a.status === 'Shortlisted' || a.status === 'Interview' || a.status === 'Selected').length} Active Pipeline
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('courses')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#FF7A00]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Courses Progress</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0284C7] flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {completedCoursesCount} <span className="text-xs font-semibold text-slate-400">/ {(user?.enrolledCourses || []).length} enrolled</span>
          </div>
          <div className="text-[11px] text-[#0284C7] dark:text-sky-400 font-medium flex items-center gap-1 mt-1">
            <span>Completed courses</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('certificates')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#FF7A00]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Certificates Earned</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{certificates.length}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-1">
            <span>Verified credentials</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('profile')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#FF7A00]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Profile Readiness</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{profileChecklist.percentage}%</div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1 mt-1 truncate">
            <span>{nextAction ? `Next: ${nextAction.label}` : 'Recruiter Ready'}</span>
          </div>
        </div>
      </div>

      {/* AI Career Tools Launchpad */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF7A00]" />
              <span>AI Career Acceleration Suite</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Smart resume reviews, interview coaching, and career roadmaps tailored to your profile
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            onClick={() => setActiveTab('resume')}
            className="p-4 rounded-2xl bg-gradient-to-br from-orange-50/70 to-amber-50/40 dark:from-orange-950/30 dark:to-slate-800/60 border border-orange-100 dark:border-orange-900/50 hover:border-orange-300 dark:hover:border-orange-700 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#FF7A00] text-white flex items-center justify-center shadow-xs mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-[#FF7A00] transition-colors">
              Smart Resume & ATS Analyzer
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Extract education, skills, projects & experience with missing-skill suggestions.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('interview')}
            className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/70 to-blue-50/40 dark:from-sky-950/30 dark:to-slate-800/60 border border-sky-100 dark:border-sky-900/50 hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0284C7] text-white flex items-center justify-center shadow-xs mb-3">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-[#0284C7] transition-colors">
              AI Mock Interview Practice
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Practice answering real technical and HR questions with instant voice/text evaluation.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('roadmap')}
            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/30 dark:to-slate-800/60 border border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs mb-3">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Career Roadmap Generator
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Generate a personalized step-by-step milestone curriculum for your target career.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('schemes')}
            className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/40 dark:from-purple-950/30 dark:to-slate-800/60 border border-purple-100 dark:border-purple-900/50 hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs mb-3">
              <Landmark className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              PM Schemes & Scholarships
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              PM Internship Scheme, PMKVY, NAPS, and Direct Benefit Transfer scholarships.
            </p>
          </div>
        </div>
      </div>

      {/* Personalized AI Internship Matching Section */}
      <RecommendedForYou compact />

      {/* Main Split: Verified Openings & Continue Learning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Verified Live Internships & Jobs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Top Verified Internship & Job Openings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live verified opportunities near {(user?.location || 'India').split(',')[0]} & remote
              </p>
            </div>
            <button
              onClick={() => setActiveTab('jobs')}
              className="text-xs font-semibold text-[#FF7A00] hover:text-[#E06900] flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({jobs.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {nearbyJobs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
                <Briefcase className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isLoadingOpportunities ? 'Fetching live verified opportunities...' : 'Explore live openings in Opportunities'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Open the Opportunities hub to browse Arbeitnow, Remotive, Firestore verified Indian internships, and AICTE/NCS portals.
                </p>
              </div>
            ) : (
              nearbyJobs.map((job) => {
                const distance = calculateDistance(job.coordinates);
                return (
                  <div
                    key={job.id}
                    className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <img
                        src={job.companyLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company || 'YM')}&background=FF7A00&color=fff`}
                        alt={job.company}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 dark:border-slate-700 shrink-0 bg-slate-50 dark:bg-slate-800"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {job.title}
                          </h3>
                          {job.isGovernmentSponsored && (
                            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-800">
                              Govt Scheme
                            </span>
                          )}
                          <span className="text-[10px] bg-[#E6F4FF] dark:bg-sky-950/70 text-[#0284C7] dark:text-sky-300 px-2 py-0.5 rounded-full font-semibold">
                            {job.type}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{job.company}</p>

                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{job.location}</span>
                            {distance > 0 && (
                              <span className="text-[#FF7A00] font-semibold">({distance} km)</span>
                            )}
                          </span>
                          {job.stipend && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">{job.stipend}</span>
                            </>
                          )}
                          {job.duration && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{job.duration}</span>
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                          {(job?.requiredSkills || []).slice(0, 3).map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setSelectedJobForDetail(job)}
                        className="px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        Check Eligibility
                      </button>
                      <span className="text-[10px] text-slate-400">
                        {job.opportunitySource || 'Verified Listing'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Personalized Learning & Credentials */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Continue Learning
            </h2>
            <button
              onClick={() => setActiveTab('courses')}
              className="text-xs font-semibold text-[#FF7A00] cursor-pointer"
            >
              All Courses
            </button>
          </div>

          <div className="space-y-3">
            {learningCards.map(({ course, reason }) => {
              const progress = enrolledMap.get(course.id);
              const pct = progress
                ? Math.min(100, Math.round((progress.completedCount / Math.max(1, course.modulesCount)) * 100))
                : 0;

              return (
                <div
                  key={course.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#FF7A00]/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-[#0284C7] dark:text-sky-300 bg-[#E6F4FF] dark:bg-sky-950/70 px-2 py-0.5 rounded-sm">
                          {course.category}
                        </span>
                        <span className="text-[10px] font-semibold text-[#FF7A00] bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded-sm truncate">
                          {reason}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-white truncate mt-1">
                        {course.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {course.modulesCount} Modules • {course.durationHours} Hours
                      </p>
                    </div>
                  </div>

                  {progress && (
                    <div className="mt-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>{progress.completedCount}/{course.modulesCount} modules completed</span>
                        <span className="text-[#FF7A00]">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#FF7A00] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold">
                      <span>★ {course.rating}</span>
                      <span className="text-slate-400 text-[10px]">({course.enrolledCount} enrolled)</span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedCourseForPlayer(course);
                        setActiveTab('course-player');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-[#FF7A00] hover:bg-orange-100 dark:hover:bg-orange-950 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      {progress ? 'Continue' : 'Start Course'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Youth Scheme Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-4.5 rounded-2xl text-white shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-sm">
              Govt Notification
            </span>
            <h3 className="text-sm font-bold mt-2">
              Prime Minister’s Internship Scheme 2026
            </h3>
            <p className="text-xs text-emerald-100 mt-1 line-clamp-2">
              1 Crore youth internships in top 500 companies with ₹5,000 monthly stipend + ₹6,000 grant.
            </p>
            <button
              onClick={() => setActiveTab('schemes')}
              className="mt-3 w-full py-2 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Check Eligibility & Guidelines</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
