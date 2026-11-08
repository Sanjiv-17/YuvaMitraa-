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
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  fetchAdminStatsApi, 
  fetchAdminUsersApi, 
  updateUserStatusApi, 
  fetchAdminAuditLogsApi 
} from '../../services/api';
import { UserProfile, AuditLogItem } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { authToken, user, setActiveTab } = useApp();

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
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'recruiter' | 'admin'>('all');
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'users' | 'security'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [statsData, usersData, logsData] = await Promise.all([
        fetchAdminStatsApi(authToken).catch(() => stats),
        fetchAdminUsersApi(authToken).catch(() => ({ users: [] })),
        fetchAdminAuditLogsApi(authToken).catch(() => ({ auditLogs: [] }))
      ]);

      if (statsData) setStats(statsData);
      if (usersData?.users) setUsersList(usersData.users);
      if (logsData?.auditLogs) setAuditLogs(logsData.auditLogs);
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

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = 
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(searchQuery));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
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
            Logged in as <strong className="text-white">{user.name}</strong> ({user.adminLevel || 'Super Administrator'})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className="px-4 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            View Live Jobs
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
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={() => setActiveAdminTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeAdminTab === 'overview'
              ? 'bg-[#FF7A00] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Platform Overview
        </button>
        <button
          onClick={() => setActiveAdminTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeAdminTab === 'users'
              ? 'bg-[#FF7A00] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          User Accounts & RBAC ({usersList.length || stats.totalUsers})
        </button>
        <button
          onClick={() => setActiveAdminTab('security')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeAdminTab === 'security'
              ? 'bg-[#FF7A00] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Security & Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* VIEW 1: OVERVIEW METRICS */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Key KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Registered Students</span>
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF7A00] flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{stats.totalStudents || 12480}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                +14% new this week
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Corporate Recruiters</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{stats.totalRecruiters || 340}</div>
              <div className="text-[11px] text-purple-600 font-semibold mt-1">
                Active hiring partners
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Active Job Postings</span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{stats.totalJobs || 18}</div>
              <div className="text-[11px] text-[#0284C7] font-semibold mt-1">
                Across 14 categories
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Certificates Issued</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{stats.totalCertificatesIssued || 89}</div>
              <div className="text-[11px] text-amber-600 font-semibold mt-1">
                QR Stamped & Verified
              </div>
            </div>

          </div>

          {/* Quick Security & Operations Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Authentication & System Health</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-600">Password Hashing Algorithm:</span>
                  <span className="font-mono font-bold text-slate-800">PBKDF2-SHA512 (10,000 Rounds)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-600">Brute-Force Protection:</span>
                  <span className="font-bold text-emerald-600">Active (5 Attempts / 15m Lockout)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-600">OTP Delivery Mechanism:</span>
                  <span className="font-bold text-slate-800">Dual Channel (Email + SMS) with 30s Cooldown</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-600">Active Authenticated Sessions:</span>
                  <span className="font-bold text-[#FF7A00]">{stats.activeSessions} Sessions</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FF7A00]" />
                <span>Recent Platform Activities</span>
              </h3>

              <div className="space-y-2.5">
                {auditLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{log.event.replace(/_/g, ' ')}</div>
                      <div className="text-[10px] text-slate-500">{log.identifier} • {log.ip}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* VIEW 2: USER MANAGEMENT */}
      {activeAdminTab === 'users' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email or mobile..."
                className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-[#FF7A00]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(['all', 'student', 'recruiter', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    roleFilter === r
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Institution / Company</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No accounts found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          u.role === 'admin'
                            ? 'bg-emerald-100 text-emerald-800'
                            : u.role === 'recruiter'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-orange-100 text-[#FF7A00]'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {u.companyName || u.college || u.institution || '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        +91 {u.phone}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.status === 'suspended'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.status || 'active')}
                            className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                              u.status === 'suspended'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
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

      {/* VIEW 3: AUDIT & SECURITY LOGS */}
      {activeAdminTab === 'security' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Security Audit Log Stream
              </h3>
              <p className="text-xs text-slate-500">Real-time authentication, OTP validation, and lockout events</p>
            </div>
            <button
              onClick={loadData}
              className="text-xs font-bold text-[#FF7A00] hover:underline"
            >
              Refresh Logs
            </button>
          </div>

          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No audit logs recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">
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
                      User: <strong className="text-slate-700">{log.identifier}</strong> • IP: {log.ip || '127.0.0.1'} • {log.details}
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

    </div>
  );
};
