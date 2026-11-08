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
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Job } from '../../types';

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

  const categories = ['All', 'Tech', 'Marketing', 'Finance', 'Design', 'Government', 'Operations'];
  const types = ['All', 'internship', 'part-time', 'full-time', 'remote'];

  const handleUseLocation = async () => {
    setIsLocating(true);
    await refreshUserLocation();
    setIsLocating(false);
  };

  const handleShareWhatsapp = (job: Job) => {
    const text = `Hey! Found this great opening on YuvaMitraa: *${job.title}* at *${job.company}* (${job.stipend}). Location: ${job.location}. Apply on YuvaMitraa app!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Keyword filter
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesCompany = job.company.toLowerCase().includes(q);
        const matchesSkills = job.requiredSkills.some(s => s.toLowerCase().includes(q));
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
      if (job.type !== 'remote') {
        const distance = calculateDistance(job.coordinates);
        if (distance > maxRadiusKm) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, searchKeyword, selectedCategory, selectedType, minStipend, maxRadiusKm, calculateDistance]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Internship & Job Finder
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Verified youth opportunities with distance calculations and AI eligibility checking
          </p>
        </div>

        {/* View Switcher: List vs Map */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>List View</span>
          </button>

          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'map'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>Map View</span>
          </button>
        </div>
      </div>

      {/* Search & Location Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Main Keyword Input */}
          <div className="md:col-span-6 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search by role, skills (e.g. React, Python, Tally) or company..."
              className="w-full pl-9.5 pr-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 border border-slate-200 focus:border-[#FF7A00] rounded-xl outline-hidden transition-all"
            />
          </div>

          {/* GPS Location Button */}
          <div className="md:col-span-3 flex items-center">
            <button
              onClick={handleUseLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#E6F4FF] hover:bg-[#D4EDFF] text-[#0284C7] font-semibold text-xs border border-sky-200/60 transition-colors cursor-pointer"
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
              className="w-full py-2.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-700 capitalize"
            >
              <option value="All">All Job Types</option>
              <option value="internship">Internships Only</option>
              <option value="full-time">Full-Time Jobs</option>
              <option value="remote">Remote (Work from Home)</option>
            </select>
          </div>

        </div>

        {/* Categories Bar & Quick Radius Filter Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-slate-100">
          
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#FF7A00] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Radius Filter Pills (5km, 10km, 25km, 50km, 100km) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
              <Compass className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>Radius:</span>
            </span>
            {[5, 10, 25, 50, 100].map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => setMaxRadiusKm(radius)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  maxRadiusKm === radius
                    ? 'bg-[#FF7A00] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {radius === 100 ? 'All (100km+)' : `${radius} km`}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Content Area: Map View vs List View */}
      {viewMode === 'map' ? (
        <div className="space-y-4">
          
          {/* Visual Interactive Map Canvas */}
          <div className="relative h-[480px] bg-slate-100 rounded-3xl border border-slate-200 overflow-hidden shadow-inner">
            
            {/* Visual map background grid with radar */}
            <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
            
            {/* Current user location radar marker */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-20">
              <div className="w-16 h-16 rounded-full border-2 border-orange-400 bg-orange-400/20 animate-ping absolute" />
              <div className="w-8 h-8 rounded-full bg-[#FF7A00] border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                You
              </div>
              <span className="bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded-full mt-1 backdrop-blur-xs font-semibold">
                Your GPS Center
              </span>
            </div>

            {/* Simulated Pin Positions for Jobs */}
            {filteredJobs.map((job, idx) => {
              // Calculate deterministic offset on map for visual distribution
              const offsets = [
                { top: '35%', left: '55%' },
                { top: '60%', left: '42%' },
                { top: '40%', left: '38%' },
                { top: '25%', left: '48%' },
                { top: '65%', left: '60%' },
                { top: '30%', left: '65%' },
                { top: '70%', left: '45%' },
                { top: '50%', left: '68%' },
              ];
              const pos = offsets[idx % offsets.length];
              const distance = calculateDistance(job.coordinates);
              const isSelected = selectedMapPinJob?.id === job.id;

              return (
                <div
                  key={job.id}
                  style={{ top: pos.top, left: pos.left }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
                >
                  <button
                    onClick={() => setSelectedMapPinJob(job)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-lg border-2 transition-all transform hover:scale-110 ${
                      isSelected
                        ? 'bg-[#FF7A00] text-white border-white scale-110 ring-4 ring-orange-300'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-[#FF7A00]'
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#FF7A00]'}`} />
                    <span className="text-[11px] font-bold truncate max-w-[100px]">
                      {job.company.split(' ')[0]}
                    </span>
                    <span className={`text-[10px] font-semibold px-1 rounded-sm ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {distance > 0 ? `${distance}km` : 'Remote'}
                    </span>
                  </button>
                </div>
              );
            })}

            {/* Map Controls Overlay */}
            <div className="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-sm border border-slate-200 text-xs">
              <span className="font-bold text-slate-800">YuvaMitraa Geo Radar</span>
              <p className="text-[10px] text-slate-500">Showing {filteredJobs.length} opportunities within {maxRadiusKm} km</p>
            </div>

            {/* Bottom Floating Preview Card when a pin is selected */}
            {selectedMapPinJob && (
              <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-40 bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <img
                      src={selectedMapPinJob.companyLogo}
                      alt={selectedMapPinJob.company}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-100"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {selectedMapPinJob.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">{selectedMapPinJob.company}</p>
                      <div className="text-[10px] text-[#FF7A00] font-semibold mt-1">
                        {selectedMapPinJob.stipend} • {calculateDistance(selectedMapPinJob.coordinates)} km away
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedMapPinJob(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleShareWhatsapp(selectedMapPinJob)}
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs"
                    title="Share on WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedJobForDetail(selectedMapPinJob)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold shadow-xs transition-colors text-center"
                  >
                    Check Eligibility & Apply
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* List View */
        <div className="space-y-3.5">
          <div className="text-xs font-semibold text-slate-500 px-1">
            Showing {filteredJobs.length} active opportunities
          </div>

          {filteredJobs.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-500">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-sm text-slate-700">No jobs match your criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try increasing your search radius or selecting &quot;All&quot; categories.</p>
              <button
                onClick={() => {
                  setSearchKeyword('');
                  setSelectedCategory('All');
                  setSelectedType('All');
                  setMaxRadiusKm(100);
                }}
                className="mt-4 px-4 py-2 bg-orange-50 text-[#FF7A00] text-xs font-bold rounded-xl hover:bg-orange-100"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const distance = calculateDistance(job.coordinates);
              const isSaved = savedJobIds.includes(job.id);
              const userSkillSet = user.skills.map(s => s.toLowerCase());
              const matchedCount = job.requiredSkills.filter(s => 
                userSkillSet.some(us => us.includes(s.toLowerCase()) || s.toLowerCase().includes(us))
              ).length;
              const matchPct = Math.min(98, Math.max(45, Math.round((matchedCount / Math.max(1, job.requiredSkills.length)) * 100)));

              return (
                <div
                  key={job.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#FF7A00]/50 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <img
                      src={job.companyLogo}
                      alt={job.company}
                      className="w-13 h-13 rounded-2xl object-cover border border-slate-100 shrink-0 shadow-xs"
                    />

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 hover:text-[#FF7A00] transition-colors cursor-pointer"
                            onClick={() => setSelectedJobForDetail(job)}>
                          {job.title}
                        </h3>
                        {job.isGovernmentSponsored && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                            Govt PMIS Scheme
                          </span>
                        )}
                        <span className="text-[10px] bg-[#E6F4FF] text-[#0284C7] px-2 py-0.5 rounded-full font-semibold capitalize">
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

                      <p className="text-xs font-semibold text-slate-600">{job.company}</p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.location}</span>
                          {distance > 0 && (
                            <span className="text-[#FF7A00] font-bold">({distance} km)</span>
                          )}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-slate-800">{job.stipend}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.duration}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {job.requiredSkills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] bg-slate-100 text-slate-700 font-medium px-2.5 py-0.5 rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full md:w-auto gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShareWhatsapp(job)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors"
                        title="Share on WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => toggleSaveJob(job.id)}
                        className={`p-2 rounded-xl transition-colors ${
                          isSaved
                            ? 'bg-orange-50 text-[#FF7A00]'
                            : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                        }`}
                        title={isSaved ? "Saved" : "Save Job"}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#FF7A00]' : ''}`} />
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

    </div>
  );
};
