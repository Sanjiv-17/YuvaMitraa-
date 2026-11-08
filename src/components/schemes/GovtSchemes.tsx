import React, { useState } from 'react';
import { 
  Landmark, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  Building, 
  ShieldCheck, 
  Clock, 
  Award,
  ChevronRight
} from 'lucide-react';
import { SAMPLE_GOVT_SCHEMES } from '../../data/mockData';

export const GovtSchemes: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Internship', 'Skill Training', 'Scholarship', 'Loan & Support'];

  const filteredSchemes = SAMPLE_GOVT_SCHEMES.filter((scheme) => {
    const matchesCategory = selectedCategory === 'All' || scheme.category === selectedCategory;
    const matchesSearch = scheme.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          scheme.ministry.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          scheme.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-emerald-600" />
            <span>Government Schemes & Youth Scholarships</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Official government initiatives offering monthly stipends, 100% free skill training, and direct grants
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" />
          <span>Govt of India Verified Portals</span>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3.5">
        
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schemes by name, ministry, or benefits (e.g. PM Internship, PMKVY, Mudra)..."
            className="w-full pl-9.5 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-800"
          />
        </div>

        {/* Category Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredSchemes.map((scheme) => (
          <div
            key={scheme.id}
            className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {scheme.badgeText || scheme.category}
                </span>

                {scheme.stipendInfo && (
                  <span className="text-xs font-bold text-[#FF7A00] bg-orange-50 px-2.5 py-0.5 rounded-full">
                    {scheme.stipendInfo}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2">
                  {scheme.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {scheme.ministry}
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {scheme.description}
              </p>

              {/* Eligibility checklist */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700">
                  Eligibility Criteria:
                </span>
                <ul className="space-y-1 text-xs text-slate-600">
                  {scheme.eligibility.map((el, eIdx) => (
                    <li key={eIdx} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{el}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Benefits highlight */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                <span className="font-bold text-slate-800 block mb-0.5">
                  Financial & Placement Benefits:
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {scheme.benefits}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Deadline: <strong className="text-slate-700">{scheme.applicationDeadline}</strong>
              </span>

              <a
                href={scheme.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Apply on Official Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
