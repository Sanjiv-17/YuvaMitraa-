import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  SlidersHorizontal, 
  List, 
  Map as MapIcon, 
  Bookmark, 
  Share2, 
  Sparkles, 
  Clock, 
  Building2, 
  Compass, 
  Check, 
  X,
  Navigation,
  ExternalLink,
  ChevronRight,
  Mic,
  MicOff,
  ShieldCheck,
  Flag,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Job } from '../../types';
import { reportJobApi } from '../../services/api';

export const JobFinder: React.FC = () => {
  const { 
    jobs, 
    user, 
    savedJobIds, 
    toggleSaveJob, 
    setSelectedJobForDetail, 
    userLocation, 
    refreshUserLocation, 
    calculateDistance,
    t 
  } = useApp();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [minStipend, setMinStipend] = useState<number>(0);
  const [maxRadiusKm, setMaxRadiusKm] = useState<number>(50);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isLocating, setIsLocating] = useState(false);
  const [selectedMapPinJob, setSelectedMapPinJob] = useState<Job | null>(null);

  // Voice Search State
  const [isListening, setIsListening] = useState(false);

  // Report Job Modal State
  const [reportingJob, setReportingJob] = useState<Job | null>(null);
  const [reportReason, setReportReason] = useState('Asked for money / registration fee');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  const categories = ['All', 'Tech', 'Marketing', 'Finance', 'Design', 'Government', 'Operations'];
  const types = ['All', 'internship', 'part-time', 'full-time', 'remote'];
  const radiusOptions = [5, 10, 25, 50, 100];

  const handleUseLocation = async () => {
    setIsLocating(true);
    await refreshUserLocation();
    setIsLocating(false);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice search is not supported in this browser. Please type your search keywords.');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchKeyword(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  const handleShareWhatsapp = (job: Job) => {
    const text = `Hey! Found this verified opening on YuvaMitraa: *${job.title}* at *${job.company}* (${job.stipend}). Location: ${job.location}. Check it out on YuvaMitraa!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Submit Job Report to moderation
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingJob) return;
    setIsSubmittingReport(true);
    try {
      await reportJobApi({
        jobId: reportingJob.id,
        jobTitle: reportingJob.title,
        company: reportingJob.company,
        reason: reportReason,
        details: reportDetails,
        userEmail: user?.email || 'student@user'
      });
      setReportNotice(`Report received for "${reportingJob.title}". Our trust & safety team will review it.`);
      setReportingJob(null);
      setReportDetails('');
      setTimeout(() => setReportNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Keyword filter
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesCompany = job.company.toLowerCase().includes(q);
        const matchesSkills = (job.requiredSkills || []).some(s => s.toLowerCase().includes(q));
        const matchesLocation = job.location.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCompany && !matchesSkills && !matchesLocation) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'All' && job.category !== selectedCategory) {
        return false;
      }

      // Type filter
      if (selectedType !== 'All' && job.type !== selectedType) {
        return false;
      }

      // Stipend filter
      if (job.stipendAmount < minStipend) {
        return false;
      }

      // Radius filter: Remote jobs always pass, else calculate distance
      if (job.type !== 'remote' && maxRadiusKm < 100) {
        const distance = calculateDistance(job.coordinates);
        if (distance > maxRadiusKm) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, searchKeyword, selectedCategory, selectedType, minStipend, maxRadiusKm, calculateDistance]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-['Poppins',sans-serif]">
      
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Internship & Job Finder
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Verified youth opportunities with distance radius filtering, verified employer badges, and AI eligibility matching
          </p>
        </div>

        {/* View Switcher: List vs Map */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <List className="w-4 h-4" />
            <span>List View</span>
          </button>

          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === 'map'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>Map View</span>
          </button>
        </div>
      </div>

      {/* Global Success / Report Banner */}
      {reportNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{reportNotice}</span>
        </div>
      )}

      {/* Search & Location Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Main Keyword Input with Voice Search */}
          <div className="md:col-span-6 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search by role, skills (e.g. React, Python) or company..."
              className="w-full pl-9.5 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 focus:bg-white text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-[#FF7A00] rounded-xl outline-hidden transition-all"
            />
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`absolute right-2.5 p-1.5 rounded-lg transition-colors cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-400 hover:text-[#FF7A00] hover:bg-orange-50'
              }`}
              title="Voice Search"
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* GPS Location Button */}
          <div className="md:col-span-3 flex items-center">
            <button
              onClick={handleUseLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#E6F4FF] dark:bg-sky-950/60 hover:bg-[#D4EDFF] text-[#0284C7] dark:text-sky-300 font-semibold text-xs border border-sky-200/60 dark:border-sky-800 transition-colors cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Locating GPS...' : 'Use My GPS Location'}</span>
            </button>
          </div>

          {/* Work Type Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full py-2.5 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-700 dark:text-slate-200 capitalize cursor-pointer"
            >
              <option value="All">All Job Types</option>
              <option value="internship">Internships Only</option>
              <option value="full-time">Full-Time Jobs</option>
              <option value="remote">Remote (Work from Home)</option>
            </select>
          </div>

        </div>

        {/* Categories Bar & Quick Radius Filter Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
          
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#FF7A00] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Location Radius Selector Buttons (5km, 10km, 25km, 50km, All) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
              <Compass className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>Distance Radius:</span>
            </span>
            {radiusOptions.map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => setMaxRadiusKm(radius)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  maxRadiusKm === radius
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {radius === 100 ? 'All' : `${radius} km`}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Main View: List or Map */}
      {viewMode === 'map' ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Showing verified opportunities mapped within {maxRadiusKm} km of your location</span>
            <span className="font-bold text-[#FF7A00]">{filteredJobs.length} active pins</span>
          </div>

          {/* Interactive Simulated Map Canvas */}
          <div className="relative w-full h-[450px] bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            {/* Grid Map Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] opacity-70"></div>
            
            {/* User Center Pulse */}
            <div className="absolute flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center animate-ping"></div>
              <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md -mt-5"></div>
              <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-xs mt-1">
                Your GPS
              </span>
            </div>

            {/* Job Map Pins */}
            {filteredJobs.slice(0, 10).map((job, idx) => {
              const offsets = [
                { x: -140, y: -70 },
                { x: 120, y: -90 },
                { x: -90, y: 110 },
                { x: 160, y: 80 },
                { x: -180, y: 40 },
                { x: 80, y: -130 },
                { x: -40, y: -120 },
                { x: 190, y: -20 },
                { x: -150, y: -140 },
                { x: 50, y: 130 },
              ];
              const pos = offsets[idx % offsets.length];
              const isSelected = selectedMapPinJob?.id === job.id;

              return (
                <div
                  key={job.id}
                  style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                  className="absolute cursor-pointer group"
                  onClick={() => setSelectedMapPinJob(job)}
                >
                  <div className={`p-1.5 rounded-2xl border-2 transition-transform shadow-md flex items-center gap-1.5 ${
                    isSelected 
                      ? 'bg-[#FF7A00] border-white text-white scale-110 z-30 ring-4 ring-orange-300' 
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white hover:scale-105 z-10'
                  }`}>
                    <img src={job.companyLogo} alt="" className="w-4 h-4 rounded-full object-cover" />
                    <span className="text-[11px] font-bold max-w-[90px] truncate">{job.title}</span>
                  </div>
                </div>
              );
            })}

            {/* Selected Pin Popover Detail */}
            {selectedMapPinJob && (
              <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-orange-200 dark:border-slate-700 shadow-xl z-40 animate-fadeIn">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <img src={selectedMapPinJob.companyLogo} alt="" className="w-8 h-8 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{selectedMapPinJob.title}</h4>
                      <p className="text-[11px] text-slate-500">{selectedMapPinJob.company}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedMapPinJob(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#FF7A00]">{selectedMapPinJob.stipend}</span>
                  <button
                    onClick={() => setSelectedJobForDetail(selectedMapPinJob)}
                    className="px-3 py-1 bg-[#FF7A00] text-white rounded-lg font-bold text-[11px]"
                  >
                    View Details
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-3.5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
            <span>Showing {filteredJobs.length} verified opportunities</span>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Recruiter Verified</span>
            </span>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-500">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">No jobs match your criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try increasing your search radius or selecting &quot;All&quot; categories.</p>
              <button
                onClick={() => {
                  setSearchKeyword('');
                  setSelectedCategory('All');
                  setSelectedType('All');
                  setMaxRadiusKm(100);
                }}
                className="mt-4 px-4 py-2 bg-orange-50 dark:bg-orange-950/60 text-[#FF7A00] text-xs font-bold rounded-xl hover:bg-orange-100 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const distance = calculateDistance(job.coordinates);
              const isSaved = (savedJobIds || []).includes(job.id);
              const userSkillSet = (user?.skills || []).map(s => s.toLowerCase());
              const matchedCount = (job.requiredSkills || []).filter(s => 
                userSkillSet.some(us => us.includes(s.toLowerCase()) || s.toLowerCase().includes(us))
              ).length;
              const matchPct = Math.min(98, Math.max(45, Math.round((matchedCount / Math.max(1, (job.requiredSkills || []).length)) * 100)));

              return (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-[#FF7A00]/50 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <img
                      src={job.companyLogo}
                      alt={job.company}
                      className="w-13 h-13 rounded-2xl object-cover border border-slate-100 dark:border-slate-700 shrink-0 shadow-xs"
                    />

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#FF7A00] transition-colors cursor-pointer"
                            onClick={() => setSelectedJobForDetail(job)}>
                          {job.title}
                        </h3>

                        {/* Verified Employer Shield Badge */}
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Verified Employer</span>
                        </span>

                        {job.isGovernmentSponsored && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                            Govt PMIS Scheme
                          </span>
                        )}
                        <span className="text-[10px] bg-[#E6F4FF] dark:bg-sky-950 text-[#0284C7] dark:text-sky-300 px-2 py-0.5 rounded-full font-semibold capitalize">
                          {job.type}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                          matchPct >= 75 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : matchPct >= 55 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{matchPct}% AI Match</span>
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{job.company}</p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.location}</span>
                          {distance > 0 && (
                            <span className="text-[#FF7A00] font-bold">({distance} km away)</span>
                          )}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{job.stipend}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.duration}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {(job.requiredSkills || []).map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-2.5 py-0.5 rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full md:w-auto gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShareWhatsapp(job)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                        title="Share on WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => toggleSaveJob(job.id)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          isSaved
                            ? 'bg-orange-50 text-[#FF7A00]'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800'
                        }`}
                        title={isSaved ? "Saved" : "Save Job"}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#FF7A00]' : ''}`} />
                      </button>

                      {/* Report Suspicious Job */}
                      <button
                        onClick={() => setReportingJob(job)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Report Suspicious Job"
                      >
                        <Flag className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setSelectedJobForDetail(job)}
                        className="px-4 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Check Eligibility</span>
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-400">
                      Posted {job.postedDate} • {job.applicantsCount} applied
                    </span>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* REPORT JOB MODAL */}
      {reportingJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Report Listing</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Report <strong className="text-slate-800 dark:text-slate-200">{reportingJob.title}</strong> at {reportingJob.company}. Help us keep YuvaMitraa free of scams.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for reporting *
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#FF7A00]"
                >
                  <option value="Asked for money / registration fee">Asked for money / registration fee (Scam)</option>
                  <option value="Fake company / misleading details">Fake company or misleading details</option>
                  <option value="Incorrect stipend or job description">Incorrect stipend or job description</option>
                  <option value="Inappropriate communication">Inappropriate communication</option>
                  <option value="Other suspicious activity">Other suspicious activity</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe what occurred (e.g. asked for ₹500 fee on WhatsApp)..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#FF7A00]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingJob(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingReport ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Report</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
