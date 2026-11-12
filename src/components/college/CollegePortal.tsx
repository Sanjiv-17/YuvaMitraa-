import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Briefcase, 
  FileCheck2, 
  Award, 
  Search, 
  Plus, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  GraduationCap, 
  Filter, 
  Calendar, 
  MapPin, 
  IndianRupee, 
  Download, 
  ShieldCheck, 
  Building, 
  Sparkles,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Job, Application } from '../../types';
import { 
  fetchCollegeStudentsApi, 
  fetchCollegeAnalyticsApi, 
  postOpportunityApi,
  fetchApplicationsApi
} from '../../services/api';

export const CollegePortal: React.FC = () => {
  const { user, jobs, addJob, authToken, setSelectedJobForDetail } = useApp();
  const [activeTab, setActiveTab] = useState<'analytics' | 'students' | 'drives' | 'applications' | 'profile'>('analytics');
  
  // Data states
  const [students, setStudents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [collegeApplications, setCollegeApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Drive post form modal
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');

  // New Drive Form
  const [driveForm, setDriveForm] = useState({
    title: '',
    company: user.institution || 'Campus Placement Cell',
    location: user.location || 'Campus / Hybrid',
    city: 'New Delhi',
    type: 'internship' as const,
    category: 'Tech' as const,
    stipend: '₹20,000 / month',
    stipendAmount: 20000,
    duration: '6 Months',
    requiredSkills: 'React, Node.js, Problem Solving',
    eligibility: 'Min 65% aggregate or 6.5 CGPA, B.Tech/BCA',
    description: '',
    deadline: '2026-12-15',
    isVerified: true,
    verificationStatus: 'approved' as const,
    verificationEvidence: `Verified by College TPO (${user.institution || 'NIT Delhi'})`,
    opportunitySource: 'College Placement Cell' as const
  });

  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const collegeName = user.institution || user.college || 'National Institute of Technology Delhi (NIT Delhi)';
  const aisheCode = user.collegeAisheCode || 'C-48921';

  // Load college data
  useEffect(() => {
    const loadCollegeData = async () => {
      setIsLoading(true);
      try {
        const [studentsData, analyticsData, appsData] = await Promise.all([
          fetchCollegeStudentsApi(collegeName),
          fetchCollegeAnalyticsApi(collegeName),
          fetchApplicationsApi({ collegeName })
        ]);

        if (studentsData?.students) setStudents(studentsData.students);
        if (analyticsData?.analytics) setAnalytics(analyticsData.analytics);
        if (appsData?.applications) setCollegeApplications(appsData.applications);
      } catch (err) {
        console.warn('Error loading college data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCollegeData();
  }, [collegeName]);

  const collegeDrives = jobs.filter(j => 
    j.opportunitySource === 'College Placement Cell' || 
    j.creatorId === user.id ||
    j.company.toLowerCase().includes(collegeName.toLowerCase()) ||
    j.company.toLowerCase().includes('campus')
  );

  const handlePostDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    const skillsArray = driveForm.requiredSkills.split(',').map(s => s.trim()).filter(Boolean);
    
    await addJob({
      title: driveForm.title,
      company: driveForm.company,
      location: driveForm.location,
      city: driveForm.city,
      coordinates: { lat: 28.6315, lng: 77.2167 },
      type: driveForm.type,
      category: driveForm.category,
      stipend: driveForm.stipend,
      stipendAmount: driveForm.stipendAmount,
      duration: driveForm.duration,
      requiredSkills: skillsArray,
      eligibility: driveForm.eligibility,
      description: driveForm.description,
      responsibilities: [
        'Participate in on-campus technical assessments and screening rounds',
        'Work closely with core technical mentors on active products',
        'Demonstrate continuous learning and team collaboration'
      ],
      perks: ['Pre-Placement Offer (PPO) Eligibility', 'Certificate of Merit', 'Mentor Guidance'],
      deadline: driveForm.deadline,
      isVerified: true,
      verificationStatus: 'approved',
      verificationEvidence: `AISHE ${aisheCode} Placement Drive Approval`,
      opportunitySource: 'College Placement Cell',
      creatorId: user.id,
      creatorRole: 'college'
    });

    setFormSuccess('Campus drive posted and broadcasted to enrolled students successfully!');
    setIsDriveModalOpen(false);
    setTimeout(() => setFormSuccess(null), 4000);
  };

  const filteredStudents = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.branch && s.branch.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchBranch = branchFilter === 'All' || s.branch === branchFilter;
    return matchSearch && matchBranch;
  });

  const branches = ['All', ...Array.from(new Set(students.map(s => s.branch).filter(Boolean)))];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* College Header Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-indigo-950 rounded-2xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-orange-500/20 border-2 border-orange-400 flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight">{collegeName}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" /> AISHE Verified
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 border border-blue-400/30 text-blue-200">
                  NAAC A++ Accredited
                </span>
              </div>
              <p className="text-slate-300 text-sm max-w-2xl">
                Official Institutional Placement Cell & Career Development Portal. Manage registered students, verify credentials, coordinate campus drives, and monitor real-time offers.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                <span>AISHE Code: <strong className="text-white">{aisheCode}</strong></span>
                <span>•</span>
                <span>Officer: <strong className="text-white">{user.name}</strong></span>
                <span>•</span>
                <span>Affiliation: <strong className="text-white">Ministry of Education / AICTE</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" /> Post Campus Drive
            </button>
          </div>
        </div>
      </div>

      {formSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-navy-900 text-white dark:bg-orange-500 shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Overview & Placement Analytics
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'students'
              ? 'bg-navy-900 text-white dark:bg-orange-500 shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> Enrolled Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('drives')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'drives'
              ? 'bg-navy-900 text-white dark:bg-orange-500 shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Campus Drives & Internships ({collegeDrives.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'applications'
              ? 'bg-navy-900 text-white dark:bg-orange-500 shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" /> Student Application Monitor ({collegeApplications.length})
        </button>
      </div>

      {/* Tab 1: Overview & Placement Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Enrolled</span>
                <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {analytics?.totalEnrolledStudents || students.length || 428}
              </div>
              <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <span>↑ 12%</span> from last academic semester
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Placement Rate</span>
                <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {analytics?.placementRatePercentage || 84.6}%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {analytics?.totalPlacedStudents || 162} students with accepted offers
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Campus Drives</span>
                <span className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600">
                  <Briefcase className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {analytics?.activeCampusDrives || collegeDrives.length || 18}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Across IT, Core, and Management
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Highest Package</span>
                <span className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                  <IndianRupee className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                ₹18.5 LPA
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Avg: ₹6.8 LPA | Avg Stipend: ₹25k/mo
              </p>
            </div>
          </div>

          {/* Department Breakdown & Top Recruiters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-orange-500" />
                Branch-Wise Placement Progress
              </h2>
              <div className="space-y-4">
                {[
                  { branch: 'Computer Science & Engineering', placed: 88, total: 95, pct: 92 },
                  { branch: 'Information Technology', placed: 74, total: 85, pct: 87 },
                  { branch: 'Electronics & Communication', placed: 58, total: 75, pct: 77 },
                  { branch: 'Mechanical Engineering', placed: 42, total: 60, pct: 70 },
                  { branch: 'Electrical Engineering', placed: 36, total: 55, pct: 65 },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">{item.branch}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono">
                        {item.placed}/{item.total} Placed ({item.pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                        style={{ width: `${item.pct}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-500" />
                Top Institutional Corporate Partners
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { name: 'BharatTech Innovations', hires: 24, avgStipend: '₹28,000/mo', verified: true },
                  { name: 'Tata Consultancy Services', hires: 32, avgStipend: '₹22,000/mo', verified: true },
                  { name: 'Infosys Springboard', hires: 18, avgStipend: '₹20,000/mo', verified: true },
                  { name: 'National Informatics Centre (NIC)', hires: 12, avgStipend: '₹25,000/mo', verified: true },
                  { name: 'DataVyuha AI Labs', hires: 9, avgStipend: '₹35,000/mo', verified: true }
                ].map((comp, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">{comp.name}</span>
                        {comp.verified && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" /> MoE Partner
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {comp.hires} campus hires this cycle
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                      {comp.avgStipend}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Enrolled Students */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name, roll number, or skills..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Filter className="w-3.5 h-3.5" /> Branch:
              </div>
              <select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Student Name</th>
                    <th className="px-5 py-3">Roll Number</th>
                    <th className="px-5 py-3">Branch & Year</th>
                    <th className="px-5 py-3">CGPA</th>
                    <th className="px-5 py-3">Top Skills</th>
                    <th className="px-5 py-3">Verification</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((st, idx) => (
                      <tr key={st.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-semibold">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold text-xs flex items-center justify-center">
                              {st.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{st.name}</div>
                              <div className="text-xs text-slate-500 font-normal">{st.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs">{st.rollNumber || '2023CSB1042'}</td>
                        <td className="px-5 py-3.5">
                          <div className="text-xs font-semibold">{st.branch || 'CSE'}</div>
                          <div className="text-[11px] text-slate-500">Graduating {st.graduationYear || '2026'}</div>
                        </td>
                        <td className="px-5 py-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {st.cgpa || '8.8'} / 10
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(st.skills || ['React', 'JavaScript', 'Python']).slice(0, 3).map((sk: string, sIdx: number) => (
                              <span key={sIdx} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                                {sk}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5" /> Enrolled
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedStudent(st)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-all"
                          >
                            View Dossier
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-500 text-sm">
                        No students found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Campus Drives & Internships */}
      {activeTab === 'drives' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Campus Drives & Drives</h2>
              <p className="text-xs text-slate-500">Exclusively posted or partnered with {collegeName}</p>
            </div>
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow transition-all"
            >
              <Plus className="w-4 h-4" /> Create Drive
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collegeDrives.map(drive => (
              <div 
                key={drive.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-orange-500/50 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                      <Building2 className="w-3 h-3" /> Placement Drive
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {drive.stipend}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-1">
                    {drive.title}
                  </h3>
                  <div className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1">
                    <span>{drive.company}</span>
                    <span>•</span>
                    <span>{drive.duration}</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                    {drive.description || 'On-campus placement opportunity. Eligibility criteria and assessment rounds managed through institutional TPO.'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {drive.requiredSkills.slice(0, 3).map((sk, idx) => (
                      <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:divide-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Deadline: {drive.deadline}
                  </span>
                  <button
                    onClick={() => setSelectedJobForDetail(drive)}
                    className="font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1"
                  >
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Student Application Monitor */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Live Application Stream
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Real-time tracking of internship and placement applications filed by students of {collegeName}.
            </p>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {collegeApplications.length > 0 ? (
                collegeApplications.map(app => (
                  <div key={app.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{app.candidateName}</span>
                        <span className="text-xs text-slate-500">({app.candidateEmail})</span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Applied for <strong className="text-slate-800 dark:text-slate-200">{app.jobTitle}</strong> at <span className="text-orange-600 dark:text-orange-400 font-semibold">{app.company}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span>Applied on {app.appliedDate}</span>
                        {app.interviewDate && (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Interview: {app.interviewDate} {app.interviewTime}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        app.status === 'Selected' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        app.status === 'Interview' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
                        app.status === 'Shortlisted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                        app.status === 'Rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-500 text-sm">
                  No active student applications recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post Drive Modal */}
      {isDriveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-600 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">Post Campus Placement Drive</h3>
                  <p className="text-xs text-slate-500">Broadcast directly to students of {collegeName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDriveModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePostDrive} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Drive Title / Role Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graduate Software Engineer Trainee (Batch 2026)"
                  value={driveForm.title}
                  onChange={e => setDriveForm({ ...driveForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Recruiting Entity / Partner *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BharatTech / Placement Consortium"
                    value={driveForm.company}
                    onChange={e => setDriveForm({ ...driveForm, company: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Stipend / CTC *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ₹25,000 / month (or 7 LPA PPO)"
                    value={driveForm.stipend}
                    onChange={e => setDriveForm({ ...driveForm, stipend: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="Campus Auditorium / Hybrid"
                    value={driveForm.location}
                    onChange={e => setDriveForm({ ...driveForm, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Application Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={driveForm.deadline}
                    onChange={e => setDriveForm({ ...driveForm, deadline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Eligibility Criteria *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Min 6.5 CGPA, B.Tech CSE/IT/ECE, No active backlogs"
                  value={driveForm.eligibility}
                  onChange={e => setDriveForm({ ...driveForm, eligibility: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Required Skills (comma separated) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="React, Java, Data Structures, Git"
                  value={driveForm.requiredSkills}
                  onChange={e => setDriveForm({ ...driveForm, requiredSkills: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Drive Details & Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail the selection rounds (Aptitude test, technical interview, HR discussion)..."
                  value={driveForm.description}
                  onChange={e => setDriveForm({ ...driveForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                ></textarea>
              </div>

              <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs text-orange-900 dark:text-orange-200 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <span>
                  This drive will carry the official <strong>College Placement Cell</strong> verified badge and will be prioritized in the student discovery feed.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDriveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow transition-all"
                >
                  Publish Campus Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Dossier Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Student Placement Dossier</h3>
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-xl flex items-center justify-center shadow">
                  {selectedStudent.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">{selectedStudent.name}</h4>
                  <p className="text-xs text-slate-500">{selectedStudent.email}</p>
                  <p className="text-xs font-mono font-bold text-emerald-600 mt-0.5">CGPA: {selectedStudent.cgpa || '8.8'} / 10</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold">Roll Number:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.rollNumber || '2023CSB1042'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Branch:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.branch || 'CSE'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Graduation Year:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.graduationYear || '2026'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Status:</span>
                  <p className="font-bold text-emerald-600">Actively Seeking Placement</p>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-2">Verified Skill Stack</h5>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedStudent.skills || ['React', 'JavaScript', 'Node.js', 'Git']).map((sk: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {selectedStudent.resumeText && (
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-1">Resume Summary</h5>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedStudent.resumeText}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-5 py-2 rounded-xl bg-navy-900 text-white font-bold text-xs"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
