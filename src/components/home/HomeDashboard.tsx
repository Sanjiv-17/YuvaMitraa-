import React from 'react';
import { 
  Flame, 
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
  Building2,
  TrendingUp,
  Share2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Job, Course } from '../../types';
import { SAMPLE_GOVT_SCHEMES } from '../../data/mockData';
import { DailyGoalCard } from './DailyGoalCard';

export const HomeDashboard: React.FC = () => {
  const { 
    user, 
    jobs, 
    courses, 
    applications, 
    certificates, 
    setActiveTab, 
    setSelectedJobForDetail,
    setSelectedCourseForPlayer,
    calculateDistance,
    t
  } = useApp();

  // Top 3 jobs sorted by proximity or relevance
  const nearbyJobs = (jobs || []).slice(0, 3);

  // In-progress courses
  const enrolledCoursesList = (courses || []).filter(c => 
    (user?.enrolledCourses || []).some(e => e.courseId === c.id && !e.passed)
  );

  // Active interview / shortlisted applications
  const activeInterviews = (applications || []).filter(a => a.status === 'Interview' || a.status === 'Shortlisted');

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
              Namaste, {user.name.split(' ')[0]}! 🚀
            </h1>
            
            <p className="text-xs sm:text-sm text-orange-100 max-w-xl font-medium">
              You are on a <span className="text-white font-bold">{user.streakDays}-day streak</span>! Complete 1 quiz today to level up your employability score and unlock verified recruiter visibility.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs bg-black/20 backdrop-blur-xs px-3 py-1 rounded-full font-medium">
                ⭐ {user.xpPoints} XP Earned
              </span>
              <span className="text-xs bg-black/20 backdrop-blur-xs px-3 py-1 rounded-full font-medium">
                🎖️ {user.badges[user.badges.length - 1] || 'Scholar'}
              </span>
              <span className="text-xs bg-black/20 backdrop-blur-xs px-3 py-1 rounded-full font-medium">
                📍 {user.location.split(',')[0]}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('jobs')}
              className="px-5 py-3 rounded-2xl bg-white text-[#FF7A00] font-bold text-xs sm:text-sm shadow-md hover:bg-orange-50 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              <span>Find Nearby Jobs</span>
            </button>
            <button
              onClick={() => setActiveTab('resume')}
              className="px-5 py-3 rounded-2xl bg-orange-700/40 hover:bg-orange-700/60 text-white font-semibold text-xs sm:text-sm border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>AI ATS Resume Review</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Shortlist / Interview Alert Banner */}
      {activeInterviews.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-purple-300 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] bg-purple-400/30 text-purple-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Recruiter Update
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-white mt-0.5">
                You have {activeInterviews.length} active application(s) shortlisted with {activeInterviews[0].company}!
              </h3>
              <p className="text-[11px] text-purple-200">
                Practice role-specific interview questions with your AI voice mentor now.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('interview')}
            className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Start AI Mock Interview</span>
          </button>
        </div>
      )}

      {/* Daily Study / Skill Goal Card */}
      <DailyGoalCard />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div 
          onClick={() => setActiveTab('applications')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#FF7A00]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Applications</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF7A00] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{applications.length}</div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <CheckCircle className="w-3 h-3" />
            <span>
              {applications.filter(a => a.status === 'Shortlisted' || a.status === 'Interview' || a.status === 'Selected').length} In Progress
            </span>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('courses')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#FF7A00]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">In-Progress Courses</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{user.enrolledCourses.length || 1}</div>
          <div className="text-[11px] text-[#0284C7] font-medium flex items-center gap-1 mt-1">
            <span>Free interactive lessons</span>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('certificates')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#FF7A00]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Certificates Earned</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{certificates.length}</div>
          <div className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-1">
            <span>Verified QR stamped</span>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('profile')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#FF7A00]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Profile Readiness</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">88%</div>
          <div className="text-[11px] text-purple-600 font-medium flex items-center gap-1 mt-1">
            <span>Upload fresh projects (+12%)</span>
          </div>
        </div>

      </div>

      {/* Modern AI Tools Launchpad */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF7A00]" />
              <span>AI Career Acceleration Suite</span>
            </h2>
            <p className="text-xs text-slate-500">Powered by Gemini 3.8 Flash</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div 
            onClick={() => setActiveTab('resume')}
            className="p-4 rounded-2xl bg-gradient-to-br from-orange-50/70 to-amber-50/40 border border-orange-100 hover:border-orange-300 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#FF7A00] text-white flex items-center justify-center shadow-xs mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 group-hover:text-[#FF7A00] transition-colors">
              AI Resume & ATS Checker
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Get an instant ATS score (0-100), missing keywords, and recruiter formatting tips.
            </p>
          </div>

          <div 
            onClick={() => setActiveTab('interview')}
            className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/70 to-blue-50/40 border border-sky-100 hover:border-sky-300 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0284C7] text-white flex items-center justify-center shadow-xs mb-3">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 group-hover:text-[#0284C7] transition-colors">
              AI Mock Interview Practice
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Practice answering real technical and HR questions with instant voice/text evaluation.
            </p>
          </div>

          <div 
            onClick={() => setActiveTab('roadmap')}
            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-100 hover:border-emerald-300 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs mb-3">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
              Career Roadmap Generator
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Generate a personalized step-by-step milestone curriculum for your target career.
            </p>
          </div>

          <div 
            onClick={() => setActiveTab('schemes')}
            className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/40 border border-purple-100 hover:border-purple-300 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs mb-3">
              <Landmark className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
              PM Schemes & Scholarships
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              PM Internship Scheme, PMKVY, NAPS, and Direct Benefit Transfer scholarships.
            </p>
          </div>

        </div>
      </div>

      {/* Main Split: Recommended Jobs & Ongoing Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Nearby & Recommended Internships */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Top Internship & Job Openings
              </h2>
              <p className="text-xs text-slate-500">Sorted by proximity to {(user?.location || 'New Delhi').split(',')[0]}</p>
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
            {nearbyJobs.map((job) => {
              const distance = calculateDistance(job.coordinates);
              const isSaved = (user?.savedJobIds || []).includes(job.id);

              return (
                <div
                  key={job.id}
                  className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={job.companyLogo}
                      alt={job.company}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                          {job.title}
                        </h3>
                        {job.isGovernmentSponsored && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                            Govt Scheme
                          </span>
                        )}
                        <span className="text-[10px] bg-[#E6F4FF] text-[#0284C7] px-2 py-0.5 rounded-full font-semibold">
                          {job.type}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-medium">{job.company}</p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{job.location}</span>
                          {distance > 0 && (
                            <span className="text-[#FF7A00] font-semibold">({distance} km)</span>
                          )}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{job.stipend}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{job.duration}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                        {job.requiredSkills.slice(0, 3).map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedJobForDetail(job);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Check Eligibility
                    </button>
                    <span className="text-[10px] text-slate-400">
                      {job.applicantsCount} applicants
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: In-Progress Courses & Quick Quiz */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Continue Learning
            </h2>
            <button
              onClick={() => setActiveTab('courses')}
              className="text-xs font-semibold text-[#FF7A00]"
            >
              All Courses
            </button>
          </div>

          <div className="space-y-3">
            {courses.slice(0, 2).map((course) => (
              <div
                key={course.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#FF7A00]/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-[#0284C7] bg-[#E6F4FF] px-2 py-0.5 rounded-sm">
                      {course.category}
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 truncate mt-1">
                      {course.title}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {course.modulesCount} Modules • {course.durationHours} Hours
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold">
                    <span>⭐ {course.rating}</span>
                    <span className="text-slate-400 text-[10px]">({course.enrolledCount} enrolled)</span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedCourseForPlayer(course);
                      setActiveTab('course-player');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-orange-50 text-[#FF7A00] hover:bg-orange-100 font-semibold text-xs transition-colors"
                  >
                    Start Quiz
                  </button>
                </div>
              </div>
            ))}
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
              className="mt-3 w-full py-2 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1.5"
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
