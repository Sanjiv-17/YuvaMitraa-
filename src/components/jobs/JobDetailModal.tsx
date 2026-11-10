import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  BookOpen, 
  Building2, 
  MapPin, 
  Clock, 
  Send, 
  Loader2, 
  FileText,
  Share2,
  Bookmark,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Job, EligibilityResult } from '../../types';
import { checkEligibility } from '../../services/api';

export const JobDetailModal: React.FC = () => {
  const { 
    selectedJobForDetail, 
    setSelectedJobForDetail, 
    user, 
    applyForJob, 
    savedJobIds, 
    toggleSaveJob,
    calculateDistance,
    setSelectedCourseForPlayer,
    courses,
    setActiveTab
  } = useApp();

  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState(
    `Hello ${selectedJobForDetail?.company || 'Team'}, I am excited to apply for the ${selectedJobForDetail?.title} position. With my background in ${user?.education || 'relevant coursework'} and skills in ${(user?.skills || []).slice(0, 3).join(', ') || 'practical technologies'}, I am confident in adding real value to your projects.`
  );
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  if (!selectedJobForDetail) return null;

  const job = selectedJobForDetail;
  const isSaved = savedJobIds.includes(job.id);
  const distance = calculateDistance(job.coordinates);

  const handleRunEligibility = async () => {
    setIsCheckingAI(true);
    try {
      const result = await checkEligibility(job, user);
      setEligibilityResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingAI(false);
    }
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = applyForJob(job, coverLetter, eligibilityResult?.matchScore || 85);
    if (success) {
      setAppliedSuccess(true);
      setTimeout(() => {
        setAppliedSuccess(false);
        setIsApplying(false);
      }, 1500);
    } else {
      alert('You have already applied for this position!');
    }
  };

  const handleShareWhatsapp = () => {
    const text = `Check out this opening on YuvaMitraa: ${job.title} at ${job.company} (${job.stipend}). Location: ${job.location}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/80 shrink-0">
          <div className="flex items-start gap-3.5">
            <img
              src={job.companyLogo}
              alt={job.company}
              className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{job.title}</h2>
              </div>
              <p className="text-xs font-semibold text-slate-600">{job.company}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{job.location}</span>
                  {distance > 0 && <span className="text-[#FF7A00] font-bold">({distance} km)</span>}
                </span>
                <span>•</span>
                <span className="font-bold text-[#FF7A00]">{job.stipend}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleShareWhatsapp}
              className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
              title="Share on WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleSaveJob(job.id)}
              className={`p-2 rounded-xl transition-colors ${
                isSaved ? 'text-[#FF7A00] bg-orange-50' : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="Save Job"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#FF7A00]' : ''}`} />
            </button>
            <button
              onClick={() => setSelectedJobForDetail(null)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* AI Eligibility Section */}
          <div className="bg-gradient-to-br from-orange-50/90 via-amber-50/50 to-sky-50/60 p-5 rounded-2xl border border-orange-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FF7A00] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    AI Resume & Skill Eligibility Checker
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Instant comparison against resume: <span className="font-semibold text-slate-700">{user.resumeFileName}</span>
                  </p>
                </div>
              </div>

              {!eligibilityResult && (
                <button
                  onClick={handleRunEligibility}
                  disabled={isCheckingAI}
                  className="px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCheckingAI ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Check My Eligibility</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* AI Result Card */}
            {eligibilityResult && (
              <div className="space-y-4 pt-2 border-t border-orange-200/60 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-orange-100 shadow-2xs">
                  
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-slate-50 border-4 border-orange-400">
                      <span className="text-sm font-black text-slate-800">
                        {eligibilityResult.matchScore}%
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          eligibilityResult.status === 'Eligible'
                            ? 'bg-emerald-100 text-emerald-800'
                            : eligibilityResult.status === 'Partially Eligible'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {eligibilityResult.status}
                        </span>
                        <span className="text-[11px] text-slate-400">Match Verdict</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 max-w-md">
                        {eligibilityResult.summary}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleRunEligibility}
                    disabled={isCheckingAI}
                    className="text-xs text-[#FF7A00] hover:underline self-end sm:self-auto font-semibold"
                  >
                    Re-check
                  </button>
                </div>

                {/* Matched vs Missing Skills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Matched Skills ({eligibilityResult.matchedSkills.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {eligibilityResult.matchedSkills.map((s, i) => (
                        <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>Missing Skills to Learn ({eligibilityResult.missingSkills.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {eligibilityResult.missingSkills.map((s, i) => (
                        <span key={i} className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Improvement Suggestions */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 mb-1.5">
                    💡 Gemini AI Actionable Suggestions:
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                    {eligibilityResult.suggestions.map((sug, sIdx) => (
                      <li key={sIdx}>{sug}</li>
                    ))}
                  </ul>
                </div>

                {/* Bridge Courses Recommendation */}
                <div className="bg-sky-50/80 p-3.5 rounded-xl border border-sky-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-5 h-5 text-[#0284C7] shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Fill the Gap with YuvaMitraa Certified Courses</h4>
                      <p className="text-[11px] text-slate-500">Earn a certificate in 2-3 hours to boost your score.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedJobForDetail(null);
                      setActiveTab('courses');
                    }}
                    className="px-3 py-1.5 bg-[#0284C7] hover:bg-sky-600 text-white text-xs font-bold rounded-lg shrink-0 shadow-xs cursor-pointer"
                  >
                    View Courses
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Job Overview & Responsibilities */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">About the Role</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{job.description}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Key Responsibilities</h3>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {job.responsibilities.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A00] mt-1.5 shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Required Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.requiredSkills.map((sk, i) => (
                <span key={i} className="text-xs font-medium bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
                  {sk}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Perks & Benefits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {job.perks.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Application Form Drawer / Inline Section */}
          {isApplying && (
            <form onSubmit={handleApplySubmit} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-200">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#FF7A00]" />
                <span>Submit Your Application to {job.company}</span>
              </h4>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Attached Resume:
                </label>
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                  <span className="font-medium text-slate-800">{user.resumeFileName}</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-sm">
                    Verified ATS Ready
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Cover Note / Pitch:
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApplying(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={appliedSuccess}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                >
                  {appliedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Application Submitted!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirm & Apply</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Deadline: <span className="font-semibold text-slate-700">{job.deadline}</span>
          </div>

          <div className="flex items-center gap-2">
            {!isApplying && (
              <button
                onClick={() => setIsApplying(true)}
                className="px-6 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Apply for this Position</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
