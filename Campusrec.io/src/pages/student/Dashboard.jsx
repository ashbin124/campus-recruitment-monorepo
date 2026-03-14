import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import studentA from '../../assets/user/you.png';
import studentB from '../../assets/user/s3.png';
import api from '../../lib/api.js';

export default function StudentDashboard() {
  const [titleQuery, setTitleQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const navigate = useNavigate();

  const heroImage = useMemo(() => {
    const images = [studentA, studentB].filter(Boolean);
    return images[0] || null;
  }, []);

  function goToJobs() {
    const searchTitle = String(titleQuery || '').trim();
    const searchLocation = String(locationQuery || '').trim();
    const combinedQuery = searchTitle;

    const params = new URLSearchParams();
    if (combinedQuery) params.set('q', combinedQuery);
    if (searchTitle) params.set('title', searchTitle);
    if (searchLocation) params.set('location', searchLocation);

    navigate(`/student/jobs${params.toString() ? `?${params.toString()}` : ''}`);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    goToJobs();
  }

  function showAllJobs() {
    setTitleQuery('');
    setLocationQuery('');
    navigate('/student/jobs');
  }

  async function loadNotifications() {
    try {
      setNotificationsLoading(true);
      const { data } = await api.get('/notifications/me', { params: { limit: 8 } });
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(Number(data?.unreadCount || 0));
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function markNotificationRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllNotificationsRead() {
    try {
      await api.post('/notifications/read-all');
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <div className="page-wrap space-y-8 pb-10">
      <section className="hero-shell relative overflow-hidden">
        <div className="absolute -left-16 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-brand-300/20 blur-2xl" />

        <div className="grid gap-10 md:grid-cols-[1.25fr_1fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Student Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">
              Find Jobs Fast
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-white/80 md:text-base">
              Search, apply, and track from one simple workspace.
            </p>

            <form
              onSubmit={handleSearchSubmit}
              className="mt-7 rounded-2xl border border-white/20 bg-white/95 p-3 text-slate-900 shadow-lg"
            >
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                <input
                  value={titleQuery}
                  onChange={(event) => setTitleQuery(event.target.value)}
                  placeholder="Job title or keyword"
                  className="input-field"
                />
                <input
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.target.value)}
                  placeholder="Preferred location"
                  className="input-field"
                />
                <button type="submit" className="btn-brand px-5 py-2">
                  Find Jobs
                </button>
                <button type="button" onClick={showAllJobs} className="btn-soft px-5 py-2">
                  Show All
                </button>
              </div>
            </form>
          </div>

          <div className="hidden md:block">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt="Student dashboard"
                  className="mx-auto h-[360px] w-full max-w-sm object-contain"
                />
              ) : (
                <div className="grid h-[360px] place-items-center text-white/80">Student image</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => navigate('/student/profile')}
          className="surface-panel p-5 text-left"
        >
          <p className="metric-label">Step 1</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Complete Profile</h3>
          <p className="mt-1 text-sm text-slate-600">Add skills and resume once.</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/student/jobs')}
          className="surface-panel p-5 text-left"
        >
          <p className="metric-label">Step 2</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Find Roles</h3>
          <p className="mt-1 text-sm text-slate-600">Use title and location filters.</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/student/applications')}
          className="surface-panel p-5 text-left"
        >
          <p className="metric-label">Step 3</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Apply And Track</h3>
          <p className="mt-1 text-sm text-slate-600">View status, interview slot, and queue.</p>
        </button>
      </section>

      <section className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="metric-label">In-App Notifications</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Interview & Application Updates
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
              {unreadCount} unread
            </span>
            <button
              type="button"
              onClick={() => navigate('/student/applications')}
              className="btn-soft px-3 py-2 text-xs"
            >
              Open Application Center
            </button>
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="btn-soft px-3 py-2 text-xs"
            >
              Mark all read
            </button>
          </div>
        </div>

        {notificationsLoading ? (
          <div className="mt-4 text-sm text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="mt-4 text-sm text-slate-500">No notifications yet.</div>
        ) : (
          <div className="mt-4 space-y-2">
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => markNotificationRead(item.id)}
                className={`w-full rounded-lg border p-3 text-left ${
                  item.readAt
                    ? 'border-slate-200 bg-white text-slate-700'
                    : 'border-sky-200 bg-sky-50 text-slate-900'
                }`}
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-sm">{item.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
