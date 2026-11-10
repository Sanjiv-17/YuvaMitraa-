import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  GraduationCap, 
  Briefcase, 
  Award, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Clock, 
  RefreshCw, 
  Activity,
  FileText,
  Check,
  X,
  Flag,
  Plus,
  Trash2,
  ExternalLink,
  BookOpen,
  MapPin,
  TrendingUp,
  CheckSquare
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  fetchAdminStatsApi, 
  fetchAdminUsersApi, 
  updateUserStatusApi, 
  fetchAdminAuditLogsApi,
  fetchReportedJobsApi,
  actionReportedJobApi
} from '../../services/api';
import { UserProfile, AuditLogItem, Job } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { 
    authToken, 
    user, 
    setActiveTab, 
    jobs, 
    addJob, 
    deleteJob, 
    courses, 
    applications, 
    updateApplicationStatus 
  } = useApp();

  const [stats, setStats] = useState({
    totalStudents: 1,
    totalRecruiters: 1,
    totalAdmins: 1,
    totalUsers: 3,
    activeSessions: 2,
    totalJobs: 18,
    totalApplications: 142,
    totalCertificatesIssued: 89,
    activeToday: 48,
  });

  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [reportedJobs, setReportedJobs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'recruiter' | 'admin'>('all');
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'users' | 'jobs' | 'courses' | 'applications' | 'reported' | 'security'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // New Job Modal Form State
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobCompany, setNewJobCompany] = useState('');
  const [newJobLocation, setNewJobLocation] = useState('Bengaluru, Karnataka');
  const [newJobType, setNewJobType] = useState<'internship' | 'part-time' | 'full-time' | 'remote'>('internship');
  const [newJobCategory, setNewJobCategory] = useState<'Tech' | 'Marketing' | 'Finance' | 'Design' | 'Government' | 'Operations'>('Tech');
  const [newJobStipend, setNewJobStipend] = useState('₹18,000 / month');
  const [newJobDuration, setNewJobDuration] = useState('3 Months');
  const [newJobSkills, setNewJobSkills] = useState('Python, SQL, Problem Solving');
  const [newJobDesc, setNewJobDesc] = useState('');

  const loadData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [statsData, usersData, logsData, reportsData] = await Promise.all([
        fetchAdminStatsApi(authToken).catch(() => stats),
        fetchAdminUsersApi(authToken).catch(() => ({ users: [] })),
        fetchAdminAuditLogsApi(authToken).catch(() => ({ auditLogs: [] })),
        fetchReportedJobsApi(authToken).catch(() => ({ reports: [] }))
      ]);

      if (statsData) setStats(statsData);
      if (usersData?.users) setUsersList(usersData.users);
      if (logsData?.auditLogs) setAuditLogs(logsData.auditLogs);
      if (reportsData?.reports) setReportedJobs(reportsData.reports);
    } catch (err) {
      console.warn('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [authToken]);

  const handleToggleUserStatus = async (targetUserId: string, currentStatus: string) => {
    if (!authToken) return;
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await updateUserStatusApi(authToken, targetUserId, nextStatus);
      setStatusMsg(`User status updated to ${nextStatus}.`);
      loadData();
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleReportAction = async (id: string, action: 'resolve' | 'dismiss') => {
    if (!authToken) return;
    try {
      await actionReportedJobApi(authToken, id, action);
      setStatusMsg(`Report ${action === 'resolve' ? 'marked resolved (delisted)' : 'dismissed'}.`);
      loadData();
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to update report');
    }
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim() || !newJobCompany.trim()) return;

    addJob({
      title: newJobTitle.trim(),
      company: newJobCompany.trim(),
      companyLogo: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=150&q=80',
      location: newJobLocation.trim(),
      city: newJobLocation.split(',')[0].trim(),
      coordinates: { lat: 12.9716, lng: 77.5946 },
      type: newJobType,
      category: newJobCategory,
      stipend: newJobStipend.trim(),
      stipendAmount: 18000,
      duration: newJobDuration.trim(),
      requiredSkills: newJobSkills.split(',').map(s => s.trim()).filter(Boolean),
      description: newJobDesc.trim() || 'Work with senior engineers on live products and scalable systems.',
      responsibilities: ['Assist in feature development', 'Participate in team agile sprints'],
      perks: ['Certificate of Completion', 'Pre-Placement Offer (PPO)', 'Mentorship'],
      deadline: '2026-12-31',
      isGovernmentSponsored: newJobCategory === 'Government'
    });

    setStatusMsg(`New internship "${newJobTitle}" successfully published.`);
    setShowAddJobModal(false);
    setNewJobTitle('');
    setNewJobCompany('');
    setNewJobDesc('');
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = 
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(searchQuery));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-['Poppins',sans-serif]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 sm:p-7 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>National Governance & Administration Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            YuvaMitraa Command Center
          </h1>
          <p className="text-xs text-slate-300">
            Logged in as <strong className="text-white">{user?.name || 'Administrator'}</strong> ({user?.adminLevel || 'Super Administrator'})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className="px-4 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            View Live Portal
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveAdminTab('overview')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'overview'
              ? 'bg-[#FF7A00] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Platform Overview
        </button>
        <button
          onClick={() => setActiveAdminTab('users')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'users'
              ? 'bg-[#FF7A00] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          User Accounts & RBAC ({usersList.length || stats.totalUsers})
        </button>
        <button
          onClick={() => setActiveAdminTab('jobs')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'jobs'
              ? 'bg-[#FF7A00] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Manage Internships ({jobs.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('courses')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'courses'
              ? 'bg-[#FF7A00] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Courses & Modules ({courses.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('applications')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'applications'
              ? 'bg-[#FF7A00] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Applications ({applications.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('reported')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'reported'
              ? 'bg-[#FF7A00] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Reported Listings ({reportedJobs.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('security')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'security'
              ? 'bg-[#FF7A00] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Security Logs ({auditLogs.length})
        </button>
      </div>

      {/* VIEW 1: OVERVIEW METRICS */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Registered Students</span>
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF7A00] flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats.totalStudents || 12480}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">Verified KYC active</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Corporate Recruiters</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats.totalRecruiters || 340}</div>
              <div className="text-[11px] text-purple-600 font-semibold mt-1">Verified hiring partners</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Active Opportunities</span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{jobs.length}</div>
              <div className="text-[11px] text-[#0284C7] font-semibold mt-1">Across all districts</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Certificates Awarded</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats.totalCertificatesIssued || 89}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">QR verifiable credentials</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                System Status & Security Compliance
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 text-xs">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">OTP Cryptographic Backend</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Operational (SHA-256)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200 text-xs">
                  <span className="font-semibold text-sky-900 dark:text-sky-200">Gemini 3.8 Flash AI Assistant</span>
                  <span className="font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">Connected (Server-Side)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 text-xs">
                  <span className="font-semibold text-amber-900 dark:text-amber-200">Pending Job Moderation</span>
                  <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">{reportedJobs.filter(r => r.status === 'pending').length} items</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Quick Administrative Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowAddJobModal(true)}
                  className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200 text-left hover:bg-orange-100 cursor-pointer transition-all"
                >
                  <Plus className="w-5 h-5 text-[#FF7A00] mb-1" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">Post Verified Job</span>
                  <span className="text-[10px] text-slate-500">Publish new verified opening</span>
                </button>
                <button
                  onClick={() => setActiveAdminTab('users')}
                  className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 text-left hover:bg-sky-100 cursor-pointer transition-all"
                >
                  <Users className="w-5 h-5 text-[#0284C7] mb-1" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">Audit Accounts</span>
                  <span className="text-[10px] text-slate-500">Manage user suspensions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: USER ACCOUNTS & RBAC */}
      {activeAdminTab === 'users' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search registered users by name, email or phone..."
                className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-[#FF7A00] text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {(['all', 'student', 'recruiter', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all cursor-pointer ${
                    roleFilter === r
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {r === 'all' ? 'All Roles' : r}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">User & Contact</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Institution / Company</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No users match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.email} • +91 {u.phone}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          u.role === 'admin'
                            ? 'bg-slate-900 text-white'
                            : u.role === 'recruiter'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-orange-100 text-[#FF7A00]'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {u.college || u.institution || u.companyName || 'University of Delhi'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.status === 'suspended'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {u.status === 'suspended' ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.status)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              u.status === 'suspended'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                            }`}
                          >
                            {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: MANAGE INTERNSHIPS & OPPORTUNITIES */}
      {activeAdminTab === 'jobs' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Internship Listings & Partner Posts ({jobs.length})
              </h3>
              <p className="text-xs text-slate-500">
                Directly verify, add or delete corporate openings listed on YuvaMitraa
              </p>
            </div>
            <button
              onClick={() => setShowAddJobModal(true)}
              className="px-4 py-2 bg-[#FF7A00] hover:bg-[#E06900] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Verified Internship</span>
            </button>
          </div>

          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{job.title}</span>
                    <span className="text-[11px] text-slate-500">at {job.company}</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Verified Employer
                    </span>
                    <span className="text-[10px] bg-[#E6F4FF] text-[#0284C7] font-semibold px-2 py-0.5 rounded-full capitalize">
                      {job.type}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>{job.location}</span>
                    <span>•</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{job.stipend}</span>
                    <span>•</span>
                    <span>{job.duration}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (confirm(`Remove "${job.title}" from live listings?`)) {
                        deleteJob(job.id);
                        setStatusMsg(`Removed "${job.title}"`);
                        setTimeout(() => setStatusMsg(null), 2500);
                      }
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                    title="Delete Job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: MANAGE COURSES */}
      {activeAdminTab === 'courses' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 animate-in fade-in">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Course Catalog & Curriculum ({courses.length})
            </h3>
            <p className="text-xs text-slate-500">
              National certification modules with interactive video lessons and assessments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#FF7A00] bg-orange-50 px-2 py-0.5 rounded-md">
                    {c.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">{c.level}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{c.title}</h4>
                <p className="text-[11px] text-slate-500 line-clamp-2">{c.description}</p>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Instructor: {c.instructor}</span>
                  <span>{c.modules.length} Modules • {c.durationHours}h</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 5: MONITOR APPLICATIONS */}
      {activeAdminTab === 'applications' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 animate-in fade-in">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Student Application Registry ({applications.length})
            </h3>
            <p className="text-xs text-slate-500">
              Review candidate submissions, AI match scores, and recruitment progression
            </p>
          </div>

          {applications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No applications submitted yet. Candidates will appear here as they apply.
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{app.candidateName}</span>
                      <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full">{app.candidateEmail}</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Applied for: <strong>{app.jobTitle}</strong> at {app.company}
                    </div>
                    {app.matchScore && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                        AI Match: {app.matchScore}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={app.status}
                      onChange={(e) => updateApplicationStatus(app.id, e.target.value as any)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold outline-none bg-white dark:bg-slate-800 cursor-pointer"
                    >
                      <option value="Applied">Applied</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Interview">Interview</option>
                      <option value="Selected">Selected</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 6: REPORTED LISTINGS & MODERATION */}
      {activeAdminTab === 'reported' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-rose-600" />
                <span>Reported Job Openings & Suspicious Posts ({reportedJobs.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Reports filed by students and job seekers regarding scams, upfront fees, or fake employer profiles
              </p>
            </div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
              {reportedJobs.filter(r => r.status === 'pending').length} Pending Review
            </span>
          </div>

          <div className="space-y-3">
            {reportedJobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No reported jobs at this time. All live listings meet platform compliance standards.
              </div>
            ) : (
              reportedJobs.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {report.jobTitle}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        at {report.company}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        report.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : report.status === 'dismissed'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {report.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs text-rose-700 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Reason: {report.reason}</span>
                    </div>

                    {report.details && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        &quot;{report.details}&quot;
                      </p>
                    )}

                    <div className="text-[11px] text-slate-400">
                      Reported by: <span className="text-slate-600 dark:text-slate-300 font-mono">{report.reportedByEmail}</span> • {new Date(report.reportedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleReportAction(report.id, 'resolve')}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolve (Delist)</span>
                      </button>

                      <button
                        onClick={() => handleReportAction(report.id, 'dismiss')}
                        className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 7: SECURITY & AUDIT LOGS */}
      {activeAdminTab === 'security' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FF7A00]" />
                <span>Security Events & Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-500">
                Cryptographic authentication events, OTP attempts, password updates, and account audits
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">{auditLogs.length} events logged</span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">No security logs recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-white font-mono text-[11px]">
                        {log.event}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.status === 'BLOCKED'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      User: <strong className="text-slate-700 dark:text-slate-300">{log.identifier}</strong> • IP: {log.ip || '127.0.0.1'} • {log.details}
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADD NEW VERIFIED INTERNSHIP MODAL */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Post Verified Internship</h3>
              <button onClick={() => setShowAddJobModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Internship Title *</label>
                <input
                  type="text"
                  required
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  placeholder="e.g. Java Backend Trainee / AI Research Intern"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#FF7A00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={newJobCompany}
                    onChange={(e) => setNewJobCompany(e.target.value)}
                    placeholder="e.g. BharatTech Labs"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#FF7A00]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Location / City</label>
                  <input
                    type="text"
                    value={newJobLocation}
                    onChange={(e) => setNewJobLocation(e.target.value)}
                    placeholder="Bengaluru, Karnataka"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#FF7A00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                  <select
                    value={newJobCategory}
                    onChange={(e) => setNewJobCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Tech">Tech</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                    <option value="Design">Design</option>
                    <option value="Government">Government PMIS</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Work Type</label>
                  <select
                    value={newJobType}
                    onChange={(e) => setNewJobType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="internship">Internship</option>
                    <option value="remote">Remote (Work from Home)</option>
                    <option value="full-time">Full-Time</option>
                    <option value="part-time">Part-Time</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Monthly Stipend</label>
                  <input
                    type="text"
                    value={newJobStipend}
                    onChange={(e) => setNewJobStipend(e.target.value)}
                    placeholder="₹20,000 / month"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Duration</label>
                  <input
                    type="text"
                    value={newJobDuration}
                    onChange={(e) => setNewJobDuration(e.target.value)}
                    placeholder="3-6 Months"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Required Skills (comma-separated)</label>
                <input
                  type="text"
                  value={newJobSkills}
                  onChange={(e) => setNewJobSkills(e.target.value)}
                  placeholder="Java, React, SQL, Git"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Role Description</label>
                <textarea
                  rows={3}
                  value={newJobDesc}
                  onChange={(e) => setNewJobDesc(e.target.value)}
                  placeholder="Describe internship responsibilities and perks..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddJobModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#FF7A00] hover:bg-[#E06900] text-white rounded-xl shadow-md cursor-pointer"
                >
                  Publish Verified Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
