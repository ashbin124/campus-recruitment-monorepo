import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiExternalLink,
  FiFilter,
  FiRefreshCw,
  FiSearch,
} from 'react-icons/fi';
import api from '../../lib/api.js';
import InlineAlert from '@/components/ui/InlineAlert.jsx';
import StatusBadge from '@/components/ui/StatusBadge.jsx';

function toDateLabel(value, fallback = '-') {
  if (!value) return fallback;
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return fallback;
  }
}

function toDateTimeLabel(value, fallback = '-') {
  if (!value) return fallback;
  try {
    return new Date(value).toLocaleString();
  } catch {
    return fallback;
  }
}

function toTimestamp(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function toPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'INTERVIEW', 'ACCEPTED', 'APPROVED', 'REJECTED'];

export default function StudentApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('LATEST');
  const [interviewOnly, setInterviewOnly] = useState(false);

  const loadApplications = useCallback(async () => {
    try {
      setLoadingApps(true);
      const { data } = await api.get('/applications/me');
      setApplications(Array.isArray(data) ? data : []);
      setError('');
    } catch (loadError) {
      console.error('Error loading applications:', loadError);
      setApplications([]);
      setError('Failed to load applications. Please try again.');
    } finally {
      setLoadingApps(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const { data } = await api.get('/notifications/me', { params: { limit: 12 } });
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(Number(data?.unreadCount || 0));
    } catch (loadError) {
      console.error('Error loading notifications:', loadError);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  async function markNotificationRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      await loadNotifications();
    } catch (readError) {
      console.error('Error marking notification as read:', readError);
    }
  }

  async function markAllNotificationsRead() {
    try {
      await api.post('/notifications/read-all');
      await loadNotifications();
    } catch (readError) {
      console.error('Error marking all notifications as read:', readError);
    }
  }

  useEffect(() => {
    loadApplications();
    loadNotifications();
  }, [loadApplications, loadNotifications]);

  const stats = useMemo(() => {
    const pending = applications.filter((app) => app.status === 'PENDING').length;
    const interview = applications.filter((app) => app.status === 'INTERVIEW').length;
    const accepted = applications.filter(
      (app) => app.status === 'ACCEPTED' || app.status === 'APPROVED'
    ).length;
    const rejected = applications.filter((app) => app.status === 'REJECTED').length;

    return {
      total: applications.length,
      pending,
      interview,
      accepted,
      rejected,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    const scoped = applications.filter((app) => {
      const matchesSearch =
        !search ||
        String(app?.job?.title || '')
          .toLowerCase()
          .includes(search) ||
        String(app?.job?.company?.name || '')
          .toLowerCase()
          .includes(search);
      const matchesStatus = statusFilter === 'ALL' || String(app?.status || '') === statusFilter;
      const matchesInterviewOnly = !interviewOnly || String(app?.status || '') === 'INTERVIEW';
      return matchesSearch && matchesStatus && matchesInterviewOnly;
    });

    return [...scoped].sort((left, right) => {
      if (sortBy === 'OLDEST') return toTimestamp(left.createdAt) - toTimestamp(right.createdAt);
      if (sortBy === 'MATCH') {
        const leftScore = Number(left?.matchScore || 0);
        const rightScore = Number(right?.matchScore || 0);
        if (rightScore !== leftScore) return rightScore - leftScore;
      }
      if (sortBy === 'INTERVIEW') {
        const leftInterview = toTimestamp(left.interviewDate);
        const rightInterview = toTimestamp(right.interviewDate);
        if (leftInterview && rightInterview) return leftInterview - rightInterview;
        if (leftInterview) return -1;
        if (rightInterview) return 1;
      }
      return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
    });
  }, [applications, searchText, statusFilter, sortBy, interviewOnly]);

  return (
    <div className="page-wrap space-y-6 pb-10">
      <section className="hero-shell relative overflow-hidden">
        <div className="absolute -left-16 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-brand-300/20 blur-2xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          Application Center
        </p>
        <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
          Track Applications And Interviews
        </h1>
        <p className="mt-2 text-sm text-white/85">
          Follow your application pipeline, interview slots, and in-app updates in one place.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:w-max md:grid-cols-5">
          <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
            {stats.total} total
          </div>
          <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
            {stats.pending} pending
          </div>
          <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
            {stats.interview} interview
          </div>
          <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
            {stats.accepted} accepted
          </div>
          <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
            {stats.rejected} rejected
          </div>
        </div>
      </section>

      <InlineAlert message={error} tone="error" />

      <section className="toolbar-shell">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto_auto]">
          <label className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by role or company"
              className="input-field pl-9"
            />
          </label>

          <label className="inline-flex items-center gap-2">
            <FiFilter className="h-4 w-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="select-field"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'All Statuses' : status}
                </option>
              ))}
            </select>
          </label>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="select-field"
          >
            <option value="LATEST">Sort: Latest</option>
            <option value="OLDEST">Sort: Oldest</option>
            <option value="MATCH">Sort: Best Match</option>
            <option value="INTERVIEW">Sort: Interview Date</option>
          </select>

          <button
            type="button"
            onClick={() => setInterviewOnly((prev) => !prev)}
            className={`btn-soft px-4 py-2 text-sm ${
              interviewOnly ? 'border-brand-400 bg-brand-100 text-brand-800' : ''
            }`}
          >
            {interviewOnly ? 'Interview Only: On' : 'Interview Only'}
          </button>

          <button
            type="button"
            onClick={() => {
              loadApplications();
              loadNotifications();
            }}
            className="btn-brand px-4 py-2 text-sm"
          >
            <FiRefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-head border-b border-slate-200 pb-4">
          <div>
            <p className="section-kicker">My Pipeline</p>
            <h2 className="section-title mt-2 text-xl">
              Applications ({filteredApplications.length})
            </h2>
          </div>
        </div>

        {loadingApps ? (
          <div className="mt-5 text-sm text-slate-500">Loading applications...</div>
        ) : filteredApplications.length === 0 ? (
          <div className="empty-shell mt-5">
            No applications match your current filters. Try changing search, status, or sort.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {filteredApplications.map((application) => {
              const matchPercent = toPercent(application?.matchScore);
              const company = application?.job?.company;
              const isInterview = String(application?.status || '') === 'INTERVIEW';

              return (
                <article key={application.id} className="surface-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-main text-lg font-semibold">
                        {application?.job?.title || 'Untitled role'}
                      </h3>
                      <p className="text-soft mt-1 text-sm">{company?.name || 'Company'}</p>
                    </div>
                    <StatusBadge status={application?.status || 'PENDING'} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700">
                      <FiCalendar className="h-3.5 w-3.5" />
                      Applied {toDateLabel(application.createdAt)}
                    </span>
                    {matchPercent != null && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
                        {matchPercent}% match
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-100 px-2.5 py-1 text-sky-800">
                      <FiBriefcase className="h-3.5 w-3.5" />
                      {application?.job?.type || 'FULL_TIME'}
                    </span>
                  </div>

                  {isInterview && (
                    <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/70 p-3 text-sm">
                      <p className="font-semibold text-brand-900">Interview Assigned</p>
                      <div className="mt-1 space-y-1 text-brand-800">
                        <p>
                          <span className="font-medium">Date:</span>{' '}
                          {toDateLabel(application.interviewDate)}
                        </p>
                        <p>
                          <span className="font-medium">Start Time:</span>{' '}
                          {application.interviewStartTime || '-'}
                        </p>
                        <p>
                          <span className="font-medium">Queue Number:</span>{' '}
                          {application.interviewQueueNumber || '-'}
                        </p>
                      </div>
                    </div>
                  )}

                  {application.interviewNote && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-800">Interview Note</p>
                      <p className="mt-1">{application.interviewNote}</p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {company?.id && (
                      <button
                        type="button"
                        onClick={() => navigate(`/companies/${company.id}`)}
                        className="btn-soft px-3 py-2 text-xs"
                      >
                        <FiExternalLink className="h-3.5 w-3.5" />
                        View Company
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/student/jobs?title=${encodeURIComponent(
                            String(application?.job?.title || '')
                          )}`
                        )
                      }
                      className="btn-soft px-3 py-2 text-xs"
                    >
                      Similar Jobs
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="section-shell">
        <div className="section-head border-b border-slate-200 pb-4">
          <div>
            <p className="section-kicker">Notifications</p>
            <h2 className="section-title mt-2 text-xl">Updates ({unreadCount} unread)</h2>
          </div>
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="btn-soft px-4 py-2 text-sm"
          >
            Mark all read
          </button>
        </div>

        {loadingNotifications ? (
          <div className="mt-5 text-sm text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="empty-shell mt-5">No notifications yet.</div>
        ) : (
          <div className="mt-5 space-y-2">
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => markNotificationRead(item.id)}
                className={`w-full rounded-lg border p-3 text-left ${
                  item.readAt
                    ? 'border-slate-200 bg-white text-slate-700'
                    : 'border-brand-200 bg-brand-50/70 text-slate-900'
                }`}
              >
                <p className="flex items-start justify-between gap-3 text-sm font-semibold">
                  <span>{item.title}</span>
                  {!item.readAt && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[10px] uppercase tracking-wide text-brand-700">
                      <FiBell className="h-3 w-3" />
                      New
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm">{item.message}</p>
                <p className="text-soft mt-1 inline-flex items-center gap-1 text-xs">
                  <FiClock className="h-3.5 w-3.5" />
                  {toDateTimeLabel(item.createdAt)}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
