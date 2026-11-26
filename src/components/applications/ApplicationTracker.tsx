import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Briefcase,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Sparkles,
  Award,
  Video,
  ExternalLink,
  BellRing,
  CalendarClock,
  MapPin,
  FileText,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Application } from '../../types';
import { openExternalUrl } from '../../utils/navigation';

const PIPELINE_STEPS: Array<{ key: Application['status']; label: string }> = [
  { key: 'Applied', label: 'Applied' },
  { key: 'Shortlisted', label: 'Shortlisted' },
  { key: 'Interview', label: 'Interview Scheduled' },
  { key: 'Selected', label: 'Offer Received' },
];

const getInterviewCountdownLabel = (dateStr?: string): { label: string; urgent: boolean } | null => {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (isNaN(parsed.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((parsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Completed / Past', urgent: false };
  if (diffDays === 0) return { label: 'Today', urgent: true };
  if (diffDays === 1) return { label: 'Tomorrow', urgent: true };
  if (diffDays <= 7) return { label: `In ${diffDays} days`, urgent: true };
  return { label: `In ${diffDays} days`, urgent: false };
};

export const ApplicationTracker: React.FC = () => {
  const { applications, setActiveTab, updateApplicationSchedule } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [calendarAlert, setCalendarAlert] = useState<{ message: string; googleUrl: string } | null>(null);
  const [scheduleToast, setScheduleToast] = useState<string | null>(null);

  // Schedule Editor Modal State
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [formStatus, setFormStatus] = useState<Application['status']>('Interview');
  const [formDate, setFormDate] = useState<string>('');
  const [formTime, setFormTime] = useState<string>('');
  const [formMode, setFormMode] = useState<'Online (Google Meet/Zoom)' | 'In-Person / Campus'>('Online (Google Meet/Zoom)');
  const [formLinkOrVenue, setFormLinkOrVenue] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const statuses = ['All', 'Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

  const filteredApps = applications.filter((app) => {
    if (filterStatus === 'All') return true;
    return app.status === filterStatus;
  });

  const upcomingInterviews = useMemo(() => {
    const todayIso = new Date().toISOString().split('T')[0];
    return applications
      .filter((app) => app.status !== 'Rejected' && Boolean(app.interviewDate))
      .sort((a, b) => (a.interviewDate || '').localeCompare(b.interviewDate || ''))
      .filter((app) => (app.interviewDate || '') >= todayIso || app.status === 'Interview');
  }, [applications]);

  const countByStatus = (status: string) => {
    if (status === 'All') return applications.length;
    return applications.filter((a) => a.status === status).length;
  };

  const openScheduleModal = (app: Application) => {
    setEditingApp(app);
    setFormStatus(app.status === 'Applied' ? 'Interview' : app.status);
    setFormDate(app.interviewDate || '');
    setFormTime(app.interviewTime || '');
    setFormMode(app.interviewMode || 'Online (Google Meet/Zoom)');
    setFormLinkOrVenue(app.interviewLinkOrVenue || '');
    setFormNotes(app.notes || '');
    setScheduleError(null);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;
    setIsSavingSchedule(true);
    setScheduleError(null);
    try {
      await updateApplicationSchedule(editingApp.id, {
        status: formStatus,
        interviewDate: formDate.trim() || undefined,
        interviewTime: formTime.trim() || undefined,
        interviewMode: formMode,
        interviewLinkOrVenue: formLinkOrVenue.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
      setScheduleToast(
        formDate.trim()
          ? `Interview schedule saved for ${editingApp.jobTitle} (${formDate}${formTime ? ` at ${formTime}` : ''}). Reminder added to your notifications.`
          : `Application tracking details updated for ${editingApp.jobTitle}.`
      );
      setEditingApp(null);
      setTimeout(() => setScheduleToast(null), 5000);
    } catch (err: any) {
      setScheduleError(err?.message || 'Could not save interview schedule. Please try again.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleAddToCalendar = (app: Application) => {
    const timePart = app.interviewTime && /^\d{2}:\d{2}/.test(app.interviewTime)
      ? `${app.interviewTime.slice(0, 5)}:00`
      : '10:00:00';
    const baseDate = app.interviewDate
      ? new Date(`${app.interviewDate}T${timePart}`)
      : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const start = isNaN(baseDate.getTime()) ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) : baseDate;
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = `Interview: ${app.jobTitle} at ${app.company}`;
    const detailsParts = [
      app.interviewMode ? `Mode: ${app.interviewMode}` : '',
      app.interviewLinkOrVenue ? `Venue/Link: ${app.interviewLinkOrVenue}` : '',
      app.notes ? `Notes: ${app.notes}` : '',
    ].filter(Boolean);
    const details = detailsParts.length > 0 ? detailsParts.join(' | ') : 'YuvaMitraa Interview Reminder';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//YuvaMitraa//ApplicationTracker//EN',
      'BEGIN:VEVENT',
      `UID:ym-${app.id}@yuvamitraa.in`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Interview_${app.company.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(details)}`;
    setCalendarAlert({
      message: `Calendar invite (.ics) downloaded for ${app.jobTitle} with ${app.company}.`,
      googleUrl,
    });
  };

  const getStepProgressIndex = (status: Application['status']) => {
    switch (status) {
      case 'Applied': return 0;
      case 'Shortlisted': return 1;
      case 'Interview': return 2;
      case 'Selected': return 3;
      case 'Rejected': return -1;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#FF7A00] text-xs font-bold mb-1.5">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Career Pipeline Tracking</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>My Application Tracker</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Track applied internships, manage interview schedules, and stay ahead with reminders
          </p>
        </div>

        <button
          onClick={() => setActiveTab('jobs')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#E06900] text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
        >
          <Briefcase className="w-4 h-4" />
          <span>Explore More Openings</span>
        </button>
      </div>

      {/* Save Confirmation Toast */}
      {scheduleToast && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{scheduleToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setScheduleToast(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:underline font-semibold text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Calendar Alert Banner */}
      {calendarAlert && (
        <div className="p-3.5 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-sky-900 dark:text-sky-200 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-4 h-4 text-[#0284C7] shrink-0" />
            <span className="font-semibold">{calendarAlert.message}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openExternalUrl(calendarAlert.googleUrl)}
              className="px-3 py-1 rounded-lg bg-[#0284C7] text-white font-bold text-[11px] hover:bg-sky-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Open Google Calendar</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setCalendarAlert(null)}
              className="text-sky-700 dark:text-sky-300 hover:underline font-semibold text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Interviews & Reminders Banner */}
      {upcomingInterviews.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-orange-50/50 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 p-4 sm:p-5 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/70 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  Upcoming Interview Schedule & Reminders ({upcomingInterviews.length})
                </h2>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Saved securely to your account with calendar export and mock practice access
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('interview')}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Practice Mock Interview</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingInterviews.slice(0, 4).map((item) => {
              const countdown = getInterviewCountdownLabel(item.interviewDate);
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl border border-indigo-100 dark:border-slate-700 flex flex-col justify-between gap-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {item.jobTitle}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                        {item.company}
                      </p>
                    </div>
                    {countdown && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        countdown.urgent
                          ? 'bg-orange-100 dark:bg-orange-950/70 text-[#FF7A00]'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {countdown.label}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      {item.interviewDate}
                    </span>
                    {item.interviewTime && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.interviewTime}
                      </span>
                    )}
                    {item.interviewMode && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                        {item.interviewMode}
                      </span>
                    )}
                  </div>

                  {item.interviewLinkOrVenue && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 text-[#0284C7] shrink-0" />
                      {/^https?:\/\//i.test(item.interviewLinkOrVenue) ? (
                        <button
                          type="button"
                          onClick={() => openExternalUrl(item.interviewLinkOrVenue!)}
                          className="text-[#0284C7] hover:underline truncate text-left cursor-pointer font-medium"
                        >
                          {item.interviewLinkOrVenue}
                        </button>
                      ) : (
                        <span className="truncate">{item.interviewLinkOrVenue}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/70">
                    <button
                      type="button"
                      onClick={() => openScheduleModal(item)}
                      className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#FF7A00] cursor-pointer"
                    >
                      Edit Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddToCalendar(item)}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#0284C7] dark:text-sky-300 text-[11px] font-bold hover:bg-sky-100 dark:hover:bg-sky-900/60 flex items-center gap-1 cursor-pointer"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Calendar (.ics)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pipeline Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Applied</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{applications.length}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Active submissions</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Shortlisted</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{countByStatus('Shortlisted')}</div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300">Passed resume review</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Interviews</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{countByStatus('Interview')}</div>
          <span className="text-[10px] text-purple-700 dark:text-purple-300">Practice with AI Mock tool</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-[#FF7A00] uppercase tracking-wider block">Offers</span>
          <div className="text-2xl font-black text-[#FF7A00] mt-1">{countByStatus('Selected')}</div>
          <span className="text-[10px] text-orange-600 dark:text-orange-400">Selection verified</span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs no-scrollbar">
        {statuses.map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === st
                ? 'bg-[#FF7A00] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{st}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              filterStatus === st ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}>
              {countByStatus(st)}
            </span>
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 space-y-3">
          <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No applications in &quot;{filterStatus}&quot; stage</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Apply to verified openings on YuvaMitraa to track statuses, save interview schedules, and receive reminders.
          </p>
          <button
            onClick={() => setActiveTab('jobs')}
            className="mt-2 px-4 py-2 bg-orange-50 dark:bg-orange-950/60 text-[#FF7A00] text-xs font-bold rounded-xl hover:bg-orange-100 dark:hover:bg-orange-950 transition-colors cursor-pointer"
          >
            Browse Verified Internships
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const isShortlisted = app.status === 'Shortlisted';
            const isInterview = app.status === 'Interview';
            const isSelected = app.status === 'Selected';
            const isRejected = app.status === 'Rejected';
            const stepIdx = getStepProgressIndex(app.status);
            const hasSchedule = Boolean(app.interviewDate || app.interviewLinkOrVenue);
            const countdown = getInterviewCountdownLabel(app.interviewDate);

            return (
              <div
                key={app.id}
                className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-[#FF7A00]/50 transition-all space-y-4"
              >
                {/* Top Row: Title, Company, Status Badge & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                        {app.jobTitle}
                      </h3>

                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : isShortlisted
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : isInterview
                          ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                          : isRejected
                          ? 'bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
                          : 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      }`}>
                        {app.status}
                      </span>

                      {app.matchScore && (
                        <span className="text-[10px] bg-orange-50 dark:bg-orange-950/60 text-[#FF7A00] border border-orange-200 dark:border-orange-800/70 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{app.matchScore}% Match</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{app.company}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-slate-400 font-normal">Applied on {app.appliedDate}</span>
                    </div>
                  </div>

                  {/* Context Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => openScheduleModal(app)}
                      className="px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-950 text-[#FF7A00] text-xs font-bold border border-orange-200 dark:border-orange-800/70 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      <span>{hasSchedule ? 'Edit Schedule' : 'Schedule Interview'}</span>
                    </button>

                    {(isShortlisted || isInterview) && (
                      <button
                        onClick={() => setActiveTab('interview')}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800/70 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Mock Interview</span>
                      </button>
                    )}

                    {(isInterview || hasSchedule) && (
                      <button
                        onClick={() => handleAddToCalendar(app)}
                        className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-950 text-[#0284C7] dark:text-sky-300 text-xs font-bold border border-sky-200 dark:border-sky-800/70 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Add Reminder</span>
                      </button>
                    )}

                    {isSelected && (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/70 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        <span>Offer Verified</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scheduled Interview Details Box */}
                {hasSchedule && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                          Interview Schedule
                        </span>
                        {countdown && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            countdown.urgent
                              ? 'bg-[#FF7A00] text-white'
                              : 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                          }`}>
                            {countdown.label}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 dark:text-slate-200 font-semibold">
                        {app.interviewDate && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            {app.interviewDate}
                          </span>
                        )}
                        {app.interviewTime && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            {app.interviewTime}
                          </span>
                        )}
                        {app.interviewMode && (
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            ({app.interviewMode})
                          </span>
                        )}
                      </div>
                      {app.interviewLinkOrVenue && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                          {/^https?:\/\//i.test(app.interviewLinkOrVenue) ? (
                            <button
                              type="button"
                              onClick={() => openExternalUrl(app.interviewLinkOrVenue!)}
                              className="text-[#0284C7] hover:underline font-medium break-all text-left cursor-pointer"
                            >
                              {app.interviewLinkOrVenue}
                            </button>
                          ) : (
                            <span>{app.interviewLinkOrVenue}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pipeline Progression Stepper */}
                {!isRejected ? (
                  <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/70">
                    <div className="grid grid-cols-4 gap-2 text-center relative">
                      {PIPELINE_STEPS.map((step, sIdx) => {
                        const isDone = stepIdx >= sIdx;
                        const isCurrent = stepIdx === sIdx;

                        return (
                          <div key={step.key} className="flex flex-col items-center space-y-1 relative z-10">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isCurrent
                                ? 'bg-[#FF7A00] text-white ring-4 ring-orange-200 dark:ring-orange-900/60 scale-105'
                                : isDone
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            }`}>
                              {isDone ? <CheckCircle2 className="w-4 h-4" /> : sIdx + 1}
                            </div>
                            <span className={`text-[10px] font-bold ${
                              isCurrent ? 'text-[#FF7A00]' : isDone ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50/70 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Application not advanced for this cycle. Build the missing skills in Learn & Courses and apply to your next match.</span>
                  </div>
                )}

                {/* Recruiter Feedback / Prep Notes / Cover Note */}
                {(app.recruiterFeedback || app.notes || app.coverLetter) && (
                  <div className="space-y-2">
                    {app.recruiterFeedback && (
                      <div className="text-[11px] text-emerald-800 dark:text-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-2">
                        <span className="font-bold shrink-0">Recruiter Feedback:</span>
                        <span>{app.recruiterFeedback}</span>
                      </div>
                    )}
                    {app.notes && (
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/70 dark:border-amber-900/50 flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-800 dark:text-amber-300 mr-1.5">Interview Prep Notes:</span>
                          <span>{app.notes}</span>
                        </div>
                      </div>
                    )}
                    {app.coverLetter && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50/60 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-start gap-2">
                        <span className="font-bold text-slate-700 dark:text-slate-200 shrink-0">Your Cover Note:</span>
                        <span className="italic line-clamp-2">{app.coverLetter}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Interview Schedule & Tracking Modal */}
      {editingApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-[#FF7A00]" />
                  <span>Interview Schedule & Stage</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-sm">
                  {editingApp.jobTitle} • {editingApp.company}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-5 space-y-4">
              {scheduleError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-medium">
                  {scheduleError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Application Stage
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as Application['status'])}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#FF7A00] outline-hidden"
                >
                  <option value="Applied">Applied</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Interview">Interview Scheduled</option>
                  <option value="Selected">Offer Received</option>
                  <option value="Rejected">Not Selected</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Interview Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#FF7A00] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Interview Time
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#FF7A00] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Interview Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Online (Google Meet/Zoom)', 'In-Person / Campus'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormMode(mode)}
                      className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                        formMode === mode
                          ? 'bg-orange-50 dark:bg-orange-950/60 border-[#FF7A00] text-[#FF7A00]'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Meeting Link or Campus Venue
                </label>
                <input
                  type="text"
                  value={formLinkOrVenue}
                  onChange={(e) => setFormLinkOrVenue(e.target.value)}
                  placeholder="https://meet.google.com/... or Placement Cell Room 204"
                  maxLength={300}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#FF7A00] outline-hidden placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Preparation Notes / Topics to Revise
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Key DSA topics, project architecture talking points, documents to carry..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#FF7A00] outline-hidden placeholder:text-slate-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E06900] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {isSavingSchedule ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Schedule & Reminder</span>
                    </>
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
