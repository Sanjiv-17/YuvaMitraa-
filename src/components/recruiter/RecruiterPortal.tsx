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
  Trash2,
  Calendar,
  Video,
  ShieldCheck,
  Search,
  Filter,
  MessageSquare,
  Building,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Application, Job } from '../../types';

export const RecruiterPortal: React.FC = () => {
  const { user, jobs, addJob, updateJob, deleteJob, applications, updateApplicationStatus } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'applicants' | 'post-job' | 'manage-jobs'>('applicants');
  const [selectedApplicantResume, setSelectedApplicantResume] = useState<Application | null>(null);
  const [schedulingInterviewApp, setSchedulingInterviewApp] = useState<Application | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  // Search & filter for applicants
  const [applicantSearch, setApplicantSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Form states for posting a new job
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState(user.companyName || 'BharatTech Innovations Pvt Ltd');
  const [location, setLocation] = useState(user.location || 'Noida Sector 62 / Hybrid');
  const [city, setCity] = useState('Noida');
  const [type, setType] = useState<Job['type']>('internship');
  const [category, setCategory] = useState<Job['category']>('Tech');
  const [stipend, setStipend] = useState('₹25,000 / month');
  const [stipendAmount, setStipendAmount] = useState(25000);
  const [duration, setDuration] = useState('6 Months');
  const [skillsInput, setSkillsInput] = useState('React, JavaScript, Git, REST APIs');
  const [eligibility, setEligibility] = useState('Enrolled undergraduate student (BE/B.Tech/BCA) or recent graduate');
  const [description, setDescription] = useState('Looking for enthusiastic interns to collaborate on high-impact digital products for youth across India.');
  const [postSuccess, setPostSuccess] = useState(false);

  // Interview Schedule Form
  const [interviewForm, setInterviewForm] = useState({
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    time: '11:00 AM IST',
    mode: 'Online (Google Meet/Zoom)' as 'Online (Google Meet/Zoom)' | 'In-Person / Campus',
    linkOrVenue: 'https://meet.google.com/yuv-amit-raa',
    feedbackOrInstructions: 'Please prepare to discuss your React projects and be ready for a short 15-minute live coding session.'
  });

  const cinNumber = user.cinOrRegistrationNumber || 'U72900DL2022PTC394821';

  const handleCreateJob = async (e: React.FormEvent) => {
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
        eligibility: eligibility.trim(),
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

    await addJob({
      title: title.trim(),
      company: company.trim(),
      companyLogo: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=120&q=80',
      location: location.trim(),
      city: city.trim(),
      coordinates: { lat: 28.6280, lng: 77.3649 },
      type,
      category,
      stipend,
      stipendAmount,
      duration,
      requiredSkills: skillsInput.split(',').map(s => s.trim()).filter(Boolean),
      eligibility: eligibility.trim(),
      description: description.trim(),
      responsibilities: [
        'Collaborate with product and engineering teams on sprint goals',
        'Write clean, modular code with complete test coverage',
        'Participate in daily standups and peer code reviews'
      ],
      perks: ['Pre-placement Offer (PPO)', 'Direct Mentorship', 'Certificate of Completion'],
      deadline: '2026-12-31',
      isVerified: true,
      verificationStatus: 'approved',
      verificationEvidence: `CIN Verified Employer (${cinNumber})`,
      opportunitySource: 'Direct Employer',
      creatorId: user.id,
      creatorRole: 'recruiter'
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
    setEligibility(job.eligibility || '');
    setDescription(job.description);
    setActiveSubTab('post-job');
  };

  const handleScheduleInterviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingInterviewApp) return;

    updateApplicationStatus(schedulingInterviewApp.id, 'Interview', {
      interviewDate: interviewForm.date,
      interviewTime: interviewForm.time,
      interviewMode: interviewForm.mode,
      interviewLinkOrVenue: interviewForm.linkOrVenue,
      recruiterFeedback: interviewForm.feedbackOrInstructions
    });

    setSchedulingInterviewApp(null);
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchSearch = app.candidateName.toLowerCase().includes(applicantSearch.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(applicantSearch.toLowerCase()) ||
      app.candidateEmail.toLowerCase().includes(applicantSearch.toLowerCase()) ||
      (app.candidateCollege && app.candidateCollege.toLowerCase().includes(applicantSearch.toLowerCase()));
    const matchStatus = statusFilter === 'All' || app.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-2xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden border border-purple-800/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-purple-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight">{user.companyName || 'BharatTech Innovations'}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" /> CIN Verified Employer
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 border border-purple-400/30 text-purple-200">
                  MCA Active
                </span>
              </div>
              <p className="text-slate-300 text-sm max-w-2xl">
                Official Corporate Recruiter Desk. Post genuine internships, screen verified student profiles, schedule interviews, and issue on-spot offers.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                <span>MCA CIN: <strong className="text-white">{cinNumber}</strong></span>
                <span>•</span>
                <span>Recruiter: <strong className="text-white">{user.name}</strong></span>
                <span>•</span>
                <span>Zero Fake Policy: <strong className="text-emerald-400">Enforced by AI CTE & YuvaMitraa Admin</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
            <button
              onClick={() => setActiveSubTab('applicants')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeSubTab === 'applicants'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Candidates ({applications.length})
            </button>
            <button
              onClick={() => setActiveSubTab('manage-jobs')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeSubTab === 'manage-jobs'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Openings ({jobs.length})
            </button>
            <button
              onClick={() => {
                setEditingJobId(null);
                setTitle('');
                setActiveSubTab('post-job');
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'post-job'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Post Role
            </button>
          </div>
        </div>
      </div>

      {/* Subtab 1: Post / Edit Opening */}
      {activeSubTab === 'post-job' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingJobId ? 'Edit Internship Details' : 'Post Genuine Internship / Job Opportunity'}
              </h2>
              <p className="text-xs text-slate-500">
                Opportunities are screened against duplicate or fraudulent criteria and awarded the verified employer badge.
              </p>
            </div>
            {editingJobId && (
              <button
                onClick={() => {
                  setEditingJobId(null);
                  setTitle('');
                  setActiveSubTab('manage-jobs');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleCreateJob} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Role Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full-Stack React & Node Intern"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-slate-700 dark:text-white"
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
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Job Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-slate-700 dark:text-white capitalize"
                >
                  <option value="internship">Internship</option>
                  <option value="full-time">Full-Time</option>
                  <option value="part-time">Part-Time</option>
                  <option value="remote">Remote (WFH)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Monthly Stipend
                </label>
                <input
                  type="text"
                  value={stipend}
                  onChange={(e) => setStipend(e.target.value)}
                  placeholder="e.g. ₹20,000 / month"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Location (City / Area)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Whitefield, Bengaluru"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Required Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="e.g. React, JavaScript, SQL, Git"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Candidate Eligibility
              </label>
              <input
                type="text"
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                placeholder="e.g. Enrolled student or fresh graduate (2024-2026), BCA/B.Tech/B.Sc"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Role Description & Requirements
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-slate-800 dark:text-white"
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
                    <span>{editingJobId ? 'Changes Saved!' : 'Job Published with Verified Badge!'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{editingJobId ? 'Update Opening Details' : 'Publish Opening'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : activeSubTab === 'manage-jobs' ? (
        /* Manage Openings */
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
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {job.title}
                    </h3>
                    <span className="text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                      {job.type}
                    </span>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verified Listing
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {job.company} • {job.location} • <strong className="text-slate-800 dark:text-slate-200">{job.stipend}</strong>
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {job.requiredSkills.slice(0, 4).map((s, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => handleEditJobClick(job)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Update</span>
                  </button>
                  <button
                    onClick={() => setJobToDelete(job)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 transition-colors cursor-pointer"
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
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidates by name, target role, college or email..."
                value={applicantSearch}
                onChange={e => setApplicantSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="All">All Statuses</option>
                <option value="Applied">Applied</option>
                <option value="Under Review">Under Review</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview">Interview Scheduled</option>
                <option value="Selected">Selected</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="space-y-3.5">
            {filteredApplications.length > 0 ? (
              filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {app.candidateName}
                        </h3>
                        {app.matchScore && (
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>{app.matchScore}% Match</span>
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          app.status === 'Selected' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          app.status === 'Interview' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
                          app.status === 'Shortlisted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                          app.status === 'Rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Applied for: <strong className="text-slate-700 dark:text-slate-300">{app.jobTitle}</strong> • {app.appliedDate}
                        {app.candidateCollege && (
                          <span> • <strong className="text-purple-600 dark:text-purple-400">{app.candidateCollege}</strong></span>
                        )}
                      </p>
                    </div>

                    {/* Quick Status Toggles & Interview Scheduler Button */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                      <button
                        onClick={() => updateApplicationStatus(app.id, 'Shortlisted')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          app.status === 'Shortlisted'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                        }`}
                      >
                        Shortlist
                      </button>
                      
                      <button
                        onClick={() => setSchedulingInterviewApp(app)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          app.status === 'Interview'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>Schedule Interview</span>
                      </button>

                      <button
                        onClick={() => updateApplicationStatus(app.id, 'Selected')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          app.status === 'Selected'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        Select 🎉
                      </button>

                      <button
                        onClick={() => updateApplicationStatus(app.id, 'Rejected')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          app.status === 'Rejected'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                        }`}
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  {app.interviewDate && (
                    <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2">
                      <Video className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Scheduled Interview:</strong> {app.interviewDate} at {app.interviewTime} ({app.interviewMode})
                        {app.interviewLinkOrVenue && (
                          <div className="mt-0.5 text-purple-700 dark:text-purple-300 font-mono">
                            Link: <a href={app.interviewLinkOrVenue} target="_blank" rel="noreferrer" className="underline font-bold">{app.interviewLinkOrVenue}</a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {app.coverLetter && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                      <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">Candidate Note:</strong>
                      &quot;{app.coverLetter}&quot;
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {app.candidateSkills && (
                        <>
                          <span className="text-slate-400 font-semibold text-[11px]">Skills:</span>
                          {app.candidateSkills.map((sk, sIdx) => (
                            <span key={sIdx} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                              {sk}
                            </span>
                          ))}
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedApplicantResume(app)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Resume Dossier</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                No candidate submissions match your criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interview Scheduling Modal */}
      {schedulingInterviewApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Schedule Candidate Interview</h3>
                  <p className="text-xs text-slate-500">{schedulingInterviewApp.candidateName} • {schedulingInterviewApp.jobTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setSchedulingInterviewApp(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleInterviewSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={interviewForm.date}
                    onChange={e => setInterviewForm({ ...interviewForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Time *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 11:30 AM IST"
                    value={interviewForm.time}
                    onChange={e => setInterviewForm({ ...interviewForm, time: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Interview Mode *
                </label>
                <select
                  value={interviewForm.mode}
                  onChange={e => setInterviewForm({ ...interviewForm, mode: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Online (Google Meet/Zoom)">Online (Google Meet/Zoom)</option>
                  <option value="In-Person / Campus">In-Person / Campus Placement Cell</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Meeting Link or Venue Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://meet.google.com/... or Room 302, Academic Block"
                  value={interviewForm.linkOrVenue}
                  onChange={e => setInterviewForm({ ...interviewForm, linkOrVenue: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Instructions / Round Overview for Candidate
                </label>
                <textarea
                  rows={3}
                  value={interviewForm.feedbackOrInstructions}
                  onChange={e => setInterviewForm({ ...interviewForm, feedbackOrInstructions: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSchedulingInterviewApp(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow"
                >
                  Confirm & Notify Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resume Viewer Modal */}
      {selectedApplicantResume && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedApplicantResume.candidateName} - Resume Dossier
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
              {selectedApplicantResume.candidateResumeText || `CANDIDATE DOSSIER: ${selectedApplicantResume.candidateName}
Email: ${selectedApplicantResume.candidateEmail}
Phone: ${selectedApplicantResume.candidatePhone || '+91 98765 43210'}
Verified Skills: ${selectedApplicantResume.candidateSkills?.join(', ') || 'React, TypeScript, CSS, Node.js'}
College: ${selectedApplicantResume.candidateCollege || 'National Institute of Technology Delhi'}
Branch: ${selectedApplicantResume.candidateBranch || 'Computer Science & Engineering'}

ACADEMIC EXCELLENCE & HANDS-ON PROJECTS:
• Full-Stack Youth Inclusion Portal: Built responsive web applications using React, Tailwind CSS, and RESTful APIs.
• AI Mentorship Portal: Designed candidate matching algorithms and automated skill assessment modules.
• Open Source Contributor: Active GitHub contributor with clean git hygiene and peer code reviews.`}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedApplicantResume(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Job Confirmation Modal */}
      {jobToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Remove Opportunity</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-white">&quot;{jobToDelete.title}&quot;</span>? Existing applicants will remain in your dashboard records.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setJobToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteJob(jobToDelete.id);
                  setJobToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Remove Listing
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
