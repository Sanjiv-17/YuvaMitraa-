import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Briefcase, 
  MapPin, 
  Sparkles,
  Check,
  Send,
  Eye,
  Edit3,
  Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Application, Job } from '../../types';

export const RecruiterPortal: React.FC = () => {
  const { jobs, addJob, updateJob, deleteJob, applications, updateApplicationStatus } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'applicants' | 'post-job' | 'manage-jobs'>('applicants');
  const [selectedApplicantResume, setSelectedApplicantResume] = useState<Application | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // Form states for posting a new job
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('TechNext Bharat Solutions');
  const [location, setLocation] = useState('Noida Sector 62');
  const [city, setCity] = useState('Noida');
  const [type, setType] = useState<Job['type']>('internship');
  const [category, setCategory] = useState<Job['category']>('Tech');
  const [stipend, setStipend] = useState('₹18,000 / month');
  const [stipendAmount, setStipendAmount] = useState(18000);
  const [duration, setDuration] = useState('6 Months');
  const [skillsInput, setSkillsInput] = useState('React, JavaScript, Git, CSS');
  const [description, setDescription] = useState('Looking for enthusiastic interns to collaborate on scalable Indian digital products.');
  const [postSuccess, setPostSuccess] = useState(false);

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim()) return;

    if (editingJobId) {
      updateJob(editingJobId, {
        title: title.trim(),
        company: company.trim(),
        location: location.trim(),
        city: city.trim(),
        type,
        category,
        stipend,
        stipendAmount,
        duration,
        requiredSkills: skillsInput.split(',').map(s => s.trim()).filter(Boolean),
        description: description.trim(),
      });
      setPostSuccess(true);
      setTimeout(() => {
        setPostSuccess(false);
        setEditingJobId(null);
        setActiveSubTab('manage-jobs');
        setTitle('');
      }, 1200);
      return;
    }

    addJob({
      title: title.trim(),
      company: company.trim(),
      companyLogo: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=120&q=80',
      location: location.trim(),
      city: city.trim(),
      coordinates: { lat: 28.6280, lng: 77.3649 }, // Default coordinates
      type,
      category,
      stipend,
      stipendAmount,
      duration,
      requiredSkills: skillsInput.split(',').map(s => s.trim()).filter(Boolean),
      description: description.trim(),
      responsibilities: [
        'Collaborate with product and engineering teams on sprint goals',
        'Write clean, modular code with documentation',
        'Participate in peer code reviews'
      ],
      perks: ['Pre-placement Offer (PPO)', 'Mentorship', 'Flexible timings'],
      deadline: '2026-12-31'
    });

    setPostSuccess(true);
    setTimeout(() => {
      setPostSuccess(false);
      setActiveSubTab('manage-jobs');
      setTitle('');
    }, 1200);
  };

  const handleEditJobClick = (job: Job) => {
    setEditingJobId(job.id);
    setTitle(job.title);
    setCompany(job.company);
    setLocation(job.location);
    setCity(job.city);
    setType(job.type);
    setCategory(job.category);
    setStipend(job.stipend);
    setStipendAmount(job.stipendAmount || 15000);
    setDuration(job.duration);
    setSkillsInput(job.requiredSkills.join(', '));
    setDescription(job.description);
    setActiveSubTab('post-job');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-600" />
            <span>Employer & Recruiter Portal</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Post and update youth internships, inspect AI candidate match scores, and shortlist talent directly
          </p>
        </div>

        {/* Tab switch: View Applicants vs Manage Openings vs Post New Job */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            onClick={() => setActiveSubTab('applicants')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === 'applicants'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Review Candidates ({applications.length})
          </button>
          <button
            onClick={() => setActiveSubTab('manage-jobs')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === 'manage-jobs'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manage Openings ({jobs.length})
          </button>
          <button
            onClick={() => {
              setEditingJobId(null);
              setTitle('');
              setActiveSubTab('post-job');
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'post-job'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingJobId ? 'Edit Opening' : 'Post Opening'}</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'post-job' ? (
        /* Post Job Form */
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs max-w-3xl space-y-5 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Publish a New Internship or Job
            </h2>
            <p className="text-xs text-slate-500">
              Your opening will immediately appear in the YuvaMitraa Job Finder with proximity calculations
            </p>
          </div>

          <form onSubmit={handleCreateJob} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Job / Internship Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Backend Node.js Intern"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-purple-600 text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-purple-600 text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-purple-600 text-slate-700"
                >
                  <option value="Tech">Tech</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Finance">Finance</option>
                  <option value="Design">Design</option>
                  <option value="Government">Government</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Job Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-purple-600 text-slate-700 capitalize"
                >
                  <option value="internship">Internship</option>
                  <option value="full-time">Full-Time</option>
                  <option value="part-time">Part-Time</option>
                  <option value="remote">Remote (WFH)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Monthly Stipend
                </label>
                <input
                  type="text"
                  value={stipend}
                  onChange={(e) => setStipend(e.target.value)}
                  placeholder="e.g. ₹20,000 / month"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-purple-600 text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Location (City / Area)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Whitefield, Bengaluru"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-purple-600 text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Required Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="e.g. React, JavaScript, SQL, Git"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-purple-600 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Role Description & Requirements
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-purple-600 text-slate-800"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                disabled={postSuccess}
                className="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {postSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{editingJobId ? 'Changes Saved!' : 'Job Posted Successfully!'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{editingJobId ? 'Update Opening Details' : 'Publish Opening'}</span>
                  </>
                )}
              </button>

              {editingJobId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingJobId(null);
                    setTitle('');
                    setActiveSubTab('manage-jobs');
                  }}
                  className="px-4 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      ) : activeSubTab === 'manage-jobs' ? (
        /* Manage My Openings View */
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Active Job & Internship Listings ({jobs.length})
            </div>
            <button
              onClick={() => {
                setEditingJobId(null);
                setTitle('');
                setActiveSubTab('post-job');
              }}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Opening</span>
            </button>
          </div>

          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-purple-200 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {job.title}
                    </h3>
                    <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                      {job.type}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                      {job.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium">
                    {job.company} • {job.location} • <strong className="text-slate-800">{job.stipend}</strong>
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {job.requiredSkills.slice(0, 4).map((s, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {s}
                      </span>
                    ))}
                    {job.requiredSkills.length > 4 && (
                      <span className="text-[10px] text-slate-400">+{job.requiredSkills.length - 4} more</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => handleEditJobClick(job)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Update</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to remove "${job.title}"?`)) {
                        deleteJob(job.id);
                      }
                    }}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                    title="Delete Job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Candidates List */
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Candidate Submissions ({applications.length})
          </div>

          <div className="space-y-3.5">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {app.candidateName}
                      </h3>
                      {app.matchScore && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>{app.matchScore}% Match</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Applied for: <strong className="text-slate-700">{app.jobTitle}</strong> • {app.appliedDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
                    <button
                      onClick={() => updateApplicationStatus(app.id, 'Shortlisted')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        app.status === 'Shortlisted'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      Shortlist
                    </button>
                    <button
                      onClick={() => updateApplicationStatus(app.id, 'Interview')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        app.status === 'Interview'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      Interview
                    </button>
                    <button
                      onClick={() => updateApplicationStatus(app.id, 'Selected')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        app.status === 'Selected'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      Select 🎉
                    </button>
                    <button
                      onClick={() => updateApplicationStatus(app.id, 'Rejected')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        app.status === 'Rejected'
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {app.coverLetter && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-700">
                    <strong className="text-slate-800 block mb-0.5">Candidate Note:</strong>
                    &quot;{app.coverLetter}&quot;
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {app.candidateSkills && (
                      <>
                        <span className="text-slate-400 font-semibold text-[11px]">Skills:</span>
                        {app.candidateSkills.map((sk, sIdx) => (
                          <span key={sIdx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            {sk}
                          </span>
                        ))}
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedApplicantResume(app)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Resume</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recruiter Resume Viewer Modal */}
      {selectedApplicantResume && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedApplicantResume.candidateName} - Resume
                </h3>
                <p className="text-xs text-slate-500">
                  Applied for: {selectedApplicantResume.jobTitle} • {selectedApplicantResume.candidateEmail}
                </p>
              </div>
              <button
                onClick={() => setSelectedApplicantResume(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 font-mono text-xs whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed max-h-96 overflow-y-auto">
              {selectedApplicantResume.candidateResumeText || `CANDIDATE PROFILE: ${selectedApplicantResume.candidateName}
Email: ${selectedApplicantResume.candidateEmail}
Phone: ${selectedApplicantResume.candidatePhone || '+91 98765 43210'}
Verified Skills: ${selectedApplicantResume.candidateSkills?.join(', ') || 'React, TypeScript, CSS, Node.js'}

EDUCATION & BACKGROUND:
B.Tech / Bachelor's in Technology (Honors)
Key Coursework: Data Structures, Web Applications, Full-Stack Architecture, Database Systems

EXPERIENCE & PROJECTS:
• Interactive Web Applications: Built responsive web applications using React, Tailwind CSS, and RESTful APIs.
• AI Mentorship Portal: Designed candidate matching algorithms and automated skill assessment modules.
• Open Source Contributor: Active GitHub contributor with clean git hygiene and peer code reviews.`}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedApplicantResume(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
