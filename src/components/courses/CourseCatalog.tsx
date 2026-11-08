import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Star, 
  Clock, 
  Award, 
  CheckCircle, 
  Play, 
  Sparkles,
  ChevronRight,
  Filter,
  Flame,
  Bookmark,
  TrendingUp,
  GraduationCap,
  Users,
  Check,
  Zap,
  BarChart2,
  SlidersHorizontal,
  FolderOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Course } from '../../types';

export const CourseCatalog: React.FC = () => {
  const { courses, setSelectedCourseForPlayer, setActiveTab, user } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'in-progress' | 'completed' | 'not-started'>('All');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'duration'>('popular');
  const [bookmarkedCourseIds, setBookmarkedCourseIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('ym_bookmarked_courses');
    return saved ? JSON.parse(saved) : ['course-1', 'course-8'];
  });

  const toggleBookmark = (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setBookmarkedCourseIds(prev => {
      const next = prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId];
      localStorage.setItem('ym_bookmarked_courses', JSON.stringify(next));
      return next;
    });
  };

  const categories = [
    'All',
    'Tech',
    'Communication',
    'Digital Marketing',
    'Finance',
    'Design',
    'Government Exam Prep'
  ];

  // User Stats Calculation
  const totalEnrolled = user.enrolledCourses.length;
  const certifiedCount = user.enrolledCourses.filter(e => e.passed).length;
  const inProgressCount = user.enrolledCourses.filter(e => !e.passed).length;
  const estimatedHoursLearned = user.enrolledCourses.reduce((acc, curr) => {
    const c = courses.find(item => item.id === curr.courseId);
    return acc + (c ? Math.round(c.durationHours * (curr.completedModuleIds.length / Math.max(1, c.modules.length))) : 0);
  }, 0);

  const filteredCourses = useMemo(() => {
    return courses
      .filter((c) => {
        const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
        const matchesLevel = levelFilter === 'All' || c.level === levelFilter;
        
        const isEnrolled = user.enrolledCourses.some(e => e.courseId === c.id);
        const isPassed = user.enrolledCourses.some(e => e.courseId === c.id && e.passed);
        
        let matchesStatus = true;
        if (statusFilter === 'completed') matchesStatus = isPassed;
        else if (statusFilter === 'in-progress') matchesStatus = isEnrolled && !isPassed;
        else if (statusFilter === 'not-started') matchesStatus = !isEnrolled;

        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = !query || 
          c.title.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.instructor.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query);

        return matchesCategory && matchesLevel && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'duration') return a.durationHours - b.durationHours;
        return b.enrolledCount - a.enrolledCount; // popular default
      });
  }, [courses, selectedCategory, levelFilter, statusFilter, searchQuery, sortBy, user.enrolledCourses]);

  // Featured Course: e.g. Generative AI or Modern React
  const featuredCourse = courses.find(c => c.id === 'course-8') || courses[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Hero Learning Header & Stats */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF7A00] via-[#FF8C1A] to-[#FF9E3B] p-6 sm:p-8 text-white shadow-xl shadow-orange-500/15">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-12 w-48 h-48 rounded-full bg-orange-400/30 blur-lg pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white">
              <Sparkles className="w-3.5 h-3.5" />
              <span>National Skill & Certification Academy</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Yuva Learning Centre 🎓
            </h1>
            
            <p className="text-xs sm:text-sm text-orange-100 max-w-xl font-medium">
              Free, industry-curated curriculum with video lessons, module test questions, and auto-issued QR verifiable credentials recognized by partner recruiters.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              <span className="bg-black/20 backdrop-blur-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                <span>100% Free Access</span>
              </span>
              <span className="bg-black/20 backdrop-blur-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>Govt & Industry Certified</span>
              </span>
              <span className="bg-black/20 backdrop-blur-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                <span>Earn +350 XP per Course</span>
              </span>
            </div>
          </div>

          {/* Quick Learning Stats Pill */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex sm:flex-col justify-around gap-4 shrink-0 text-center sm:text-left">
            <div>
              <div className="text-[10px] text-orange-100 uppercase tracking-wider font-bold">Your Progress</div>
              <div className="text-2xl font-black">{totalEnrolled} Enrolled</div>
            </div>
            <div className="border-l sm:border-l-0 sm:border-t border-white/20 pl-4 sm:pl-0 sm:pt-2 flex items-center gap-3 text-xs">
              <div>
                <span className="font-bold text-emerald-200">{certifiedCount}</span> Passed
              </div>
              <span>•</span>
              <div>
                <span className="font-bold text-sky-200">{inProgressCount}</span> Active
              </div>
              <span>•</span>
              <div>
                <span className="font-bold text-amber-200">{estimatedHoursLearned}h</span> Studied
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Spotlight Card */}
      {featuredCourse && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/50 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 flex-1">
            <div className="relative w-full sm:w-48 h-32 rounded-2xl overflow-hidden shrink-0 shadow-xs">
              <img
                src={featuredCourse.thumbnail}
                alt={featuredCourse.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 left-2 bg-[#FF7A00] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Trending #1
              </span>
            </div>

            <div className="space-y-1.5 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-[10px] font-bold bg-[#E6F4FF] text-[#0284C7] px-2 py-0.5 rounded-md">
                  {featuredCourse.category}
                </span>
                <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
                  <span>{featuredCourse.rating} ({featuredCourse.enrolledCount} enrolled)</span>
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-black text-slate-900 line-clamp-1">
                {featuredCourse.title}
              </h2>

              <p className="text-xs text-slate-500 line-clamp-2 max-w-2xl">
                {featuredCourse.description}
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-3 text-[11px] text-slate-400 pt-1">
                <span>By <strong className="text-slate-700">{featuredCourse.instructor}</strong></span>
                <span>•</span>
                <span>{featuredCourse.durationHours} Hours</span>
                <span>•</span>
                <span>{featuredCourse.modulesCount} Interactive Modules</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedCourseForPlayer(featuredCourse);
              setActiveTab('course-player');
            }}
            className="w-full lg:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Featured Course</span>
          </button>
        </div>
      )}

      {/* Search, Filter Bar & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        
        {/* Top Search Input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, skills (React, Generative AI, Python, Tally, Aptitude) or instructors..."
              className="w-full pl-9.5 pr-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 border border-slate-200 focus:border-[#FF7A00] rounded-xl outline-hidden transition-all"
            />
          </div>

          {/* Quick Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-hidden focus:border-[#FF7A00]"
            >
              <option value="popular">Most Enrolled (Popular)</option>
              <option value="rating">Top Rated (⭐ 4.8+)</option>
              <option value="duration">Shortest Duration</option>
            </select>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#FF7A00] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Secondary Filter Controls: Status Tabs & Level */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-semibold mr-1">Status:</span>
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                statusFilter === 'All' ? 'bg-orange-100 text-[#FF7A00]' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Courses ({courses.length})
            </button>
            <button
              onClick={() => setStatusFilter('in-progress')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                statusFilter === 'in-progress' ? 'bg-sky-100 text-[#0284C7]' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                statusFilter === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Certified ({certifiedCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Skill Level:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>

      </div>

      {/* Results Count & Quick Help Banner */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-500">
        <div>
          Showing <strong>{filteredCourses.length}</strong> certified learning programs
        </div>
        <div className="flex items-center gap-1.5 text-[#0284C7] font-semibold">
          <Award className="w-3.5 h-3.5" />
          <span>70% Pass Score Required on Final Exam for Certificate</span>
        </div>
      </div>

      {/* Course Cards Grid */}
      {filteredCourses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No courses match your criteria</h3>
          <p className="text-xs text-slate-400">Try adjusting your search query, status, or category filter.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setLevelFilter('All');
              setStatusFilter('All');
            }}
            className="px-4 py-2 rounded-xl bg-orange-50 text-[#FF7A00] font-bold text-xs hover:bg-orange-100 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => {
            const isEnrolled = user.enrolledCourses.some(e => e.courseId === course.id);
            const isPassed = user.enrolledCourses.some(e => e.courseId === course.id && e.passed);
            const enrolledData = user.enrolledCourses.find(e => e.courseId === course.id);
            const completedCount = enrolledData?.completedModuleIds.length || 0;
            const progressPercent = isPassed 
              ? 100 
              : course.modules.length > 0 
              ? Math.round((completedCount / course.modules.length) * 100) 
              : 0;
            const isBookmarked = bookmarkedCourseIds.includes(course.id);

            return (
              <div
                key={course.id}
                onClick={() => {
                  setSelectedCourseForPlayer(course);
                  setActiveTab('course-player');
                }}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:border-[#FF7A00]/40 hover:shadow-xl transition-all flex flex-col overflow-hidden group cursor-pointer"
              >
                {/* Thumbnail Container */}
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Category Pill */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-[#0284C7] shadow-xs">
                    {course.category}
                  </div>

                  {/* Bookmark Button */}
                  <button
                    onClick={(e) => toggleBookmark(e, course.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-600 hover:text-[#FF7A00] shadow-xs transition-colors"
                    title={isBookmarked ? 'Remove Bookmark' : 'Save Course'}
                  >
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-[#FF7A00] text-[#FF7A00]' : ''}`} />
                  </button>

                  {/* Certified / Enrolled Badge */}
                  {isPassed ? (
                    <div className="absolute bottom-3 left-3 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Certified ({enrolledData?.finalScore}%)</span>
                    </div>
                  ) : isEnrolled ? (
                    <div className="absolute bottom-3 left-3 bg-sky-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>In Progress ({progressPercent}%)</span>
                    </div>
                  ) : null}
                </div>

                {/* Course Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    
                    {/* Top rating & duration metadata */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
                        <span>{course.rating}</span>
                        <span className="text-slate-400 font-normal">({course.enrolledCount.toLocaleString()})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm font-semibold">
                          {course.level}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{course.durationHours} hrs</span>
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#FF7A00] transition-colors line-clamp-2 leading-snug">
                      {course.title}
                    </h3>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    {/* Progress Bar for Enrolled Courses */}
                    {isEnrolled && (
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                          <span>Syllabus Progress</span>
                          <span>{progressPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${isPassed ? 'bg-emerald-500' : 'bg-[#FF7A00]'}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[160px]">
                        By <strong className="text-slate-700">{course.instructor.split('(')[0]}</strong>
                      </span>
                      <span className="font-semibold text-slate-600 shrink-0">
                        {course.modulesCount} Modules • Quizzes
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourseForPlayer(course);
                        setActiveTab('course-player');
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isPassed
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : isEnrolled
                          ? 'bg-[#E6F4FF] text-[#0284C7] hover:bg-sky-100 border border-sky-200'
                          : 'bg-[#FF7A00] text-white hover:bg-[#E06900]'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {isPassed
                          ? 'Review & Certificate'
                          : isEnrolled
                          ? 'Continue Learning & Quiz'
                          : 'Start Free Course'}
                      </span>
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Learning Benefits Footer Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-sm">
            National Employability Boost
          </span>
          <h3 className="text-base sm:text-lg font-black tracking-tight">
            Earn Verified Badges & Directly Unlock Recruiter Priority
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            Students with at least 1 verified certificate have a 3.4x higher shortlist rate for paid internships on YuvaMitraa.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('certificates')}
          className="px-5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          View My Earned Certificates
        </button>
      </div>

    </div>
  );
};
