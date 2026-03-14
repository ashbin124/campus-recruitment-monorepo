import { useMemo, useState } from 'react';
import { FiClock, FiEdit2, FiMapPin, FiSearch, FiTrash2 } from 'react-icons/fi';

function toJobTypeLabel(value) {
  const raw = String(value || 'FULL_TIME')
    .replace(/_/g, ' ')
    .toLowerCase();
  return raw.replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDateLabel(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '';
  }
}

function toDateTimeLabel(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '';
  }
}

function getJobLifecycle(job) {
  if (!job) return 'CLOSED';
  if (job.isClosed) return 'CLOSED';
  if (!job.applicationDeadline) return 'OPEN';
  const deadline = new Date(job.applicationDeadline).getTime();
  if (!Number.isFinite(deadline)) return 'CLOSED';
  return deadline > Date.now() ? 'OPEN' : 'EXPIRED';
}

function toTimestamp(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getJobTypeTheme(value) {
  const normalized = String(value || 'FULL_TIME').toUpperCase();

  if (normalized.includes('INTERNSHIP')) {
    return {
      card: 'border-brand-300 bg-gradient-to-br from-brand-100/95 via-brand-50/90 to-white',
      accent: 'from-brand-500 to-cyan-500',
      badge: 'bg-brand-100 text-brand-800 ring-brand-300',
      applicants: 'border-brand-200 bg-white/90 text-brand-700',
      meta: 'border-brand-200 bg-white/90',
      description: 'border-brand-200 bg-brand-50/70 text-slate-800',
    };
  }

  if (normalized.includes('PART')) {
    return {
      card: 'border-cyan-300 bg-gradient-to-br from-cyan-100/95 via-cyan-50/90 to-white',
      accent: 'from-cyan-500 to-brand-500',
      badge: 'bg-cyan-100 text-cyan-800 ring-cyan-300',
      applicants: 'border-cyan-200 bg-white/90 text-cyan-700',
      meta: 'border-cyan-200 bg-white/90',
      description: 'border-cyan-200 bg-cyan-50/70 text-slate-800',
    };
  }

  if (normalized.includes('CONTRACT')) {
    return {
      card: 'border-indigo-300 bg-gradient-to-br from-indigo-100/95 via-indigo-50/90 to-white',
      accent: 'from-indigo-500 to-brand-500',
      badge: 'bg-indigo-100 text-indigo-800 ring-indigo-300',
      applicants: 'border-indigo-200 bg-white/90 text-indigo-700',
      meta: 'border-indigo-200 bg-white/90',
      description: 'border-indigo-200 bg-indigo-50/70 text-slate-800',
    };
  }

  return {
    card: 'border-slate-300 bg-gradient-to-br from-slate-100/95 via-slate-50/90 to-white',
    accent: 'from-slate-500 to-brand-500',
    badge: 'bg-slate-200 text-slate-700 ring-slate-300',
    applicants: 'border-slate-300 bg-white/90 text-slate-700',
    meta: 'border-slate-300 bg-white/90',
    description: 'border-slate-300 bg-slate-100/70 text-slate-800',
  };
}

function hasInterviewSchedule(job) {
  const interviewDates = Array.isArray(job?.interviewDates) ? job.interviewDates : [];
  const interviewStartTime = String(job?.interviewStartTime || '').trim();
  const interviewCandidatesPerDay = Number.parseInt(
    String(job?.interviewCandidatesPerDay || ''),
    10
  );

  return Boolean(
    interviewDates.length > 0 &&
    /^([01]\d|2[0-3]):([0-5]\d)$/.test(interviewStartTime) &&
    Number.isInteger(interviewCandidatesPerDay) &&
    interviewCandidatesPerDay > 0
  );
}

export default function JobListingsPanel({ jobs, deletingJobId, onEdit, onRequestDelete }) {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [scheduleFilter, setScheduleFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('DEADLINE');

  const lifecycleCounts = useMemo(() => {
    const counts = { OPEN: 0, CLOSED: 0, EXPIRED: 0 };
    for (const job of jobs) {
      const lifecycle = getJobLifecycle(job);
      counts[lifecycle] = Number(counts[lifecycle] || 0) + 1;
    }
    return counts;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    const scoped = jobs.filter((job) => {
      const lifecycle = getJobLifecycle(job);
      const scheduleReady = hasInterviewSchedule(job);
      const matchesSearch =
        !search ||
        String(job.title || '')
          .toLowerCase()
          .includes(search) ||
        String(job.location || '')
          .toLowerCase()
          .includes(search);
      const matchesStatus = statusFilter === 'ALL' || lifecycle === statusFilter;
      const matchesSchedule =
        scheduleFilter === 'ALL' || (scheduleFilter === 'READY' ? scheduleReady : !scheduleReady);
      return matchesSearch && matchesStatus && matchesSchedule;
    });

    return [...scoped].sort((left, right) => {
      if (sortBy === 'NEWEST') return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
      if (sortBy === 'APPLICANTS') {
        return Number(right.applicationCount || 0) - Number(left.applicationCount || 0);
      }

      if (sortBy === 'STATUS') {
        const rank = { OPEN: 0, EXPIRED: 1, CLOSED: 2 };
        const leftRank = rank[getJobLifecycle(left)] ?? 99;
        const rightRank = rank[getJobLifecycle(right)] ?? 99;
        if (leftRank !== rightRank) return leftRank - rightRank;
      }

      const leftDeadline = toTimestamp(left.applicationDeadline);
      const rightDeadline = toTimestamp(right.applicationDeadline);
      if (leftDeadline && rightDeadline) return leftDeadline - rightDeadline;
      if (leftDeadline) return -1;
      if (rightDeadline) return 1;
      return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
    });
  }, [jobs, searchText, statusFilter, scheduleFilter, sortBy]);

  return (
    <div className="section-shell">
      <div className="section-head border-b border-slate-200 pb-4">
        <div>
          <p className="section-kicker">Openings</p>
          <h3 className="section-title mt-2 text-xl">My Job Listings</h3>
          <p className="section-description">
            {lifecycleCounts.OPEN} open / {lifecycleCounts.EXPIRED} expired /{' '}
            {lifecycleCounts.CLOSED} closed
          </p>
        </div>
      </div>

      <div className="toolbar-shell mt-4 grid gap-3 md:grid-cols-[1fr_150px_170px_170px]">
        <label className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by title or location"
            className="input-field pl-9"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="select-field"
        >
          <option value="ALL">All Status</option>
          <option value="OPEN">Open</option>
          <option value="EXPIRED">Expired</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={scheduleFilter}
          onChange={(event) => setScheduleFilter(event.target.value)}
          className="select-field"
        >
          <option value="ALL">All Schedule</option>
          <option value="READY">Auto-interview Ready</option>
          <option value="MISSING">Schedule Missing</option>
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="select-field"
        >
          <option value="DEADLINE">Sort: Deadline</option>
          <option value="NEWEST">Sort: Newest</option>
          <option value="APPLICANTS">Sort: Applicants</option>
          <option value="STATUS">Sort: Status</option>
        </select>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {filteredJobs.map((job) => {
          const typeTheme = getJobTypeTheme(job.type);
          const isRemoteRole = String(job.location || '')
            .toLowerCase()
            .includes('remote');
          const scheduleReady = hasInterviewSchedule(job);
          const lifecycle = getJobLifecycle(job);
          const interviewDays = Array.isArray(job.interviewDates) ? job.interviewDates.length : 0;
          const candidatesPerDay = Number.parseInt(String(job.interviewCandidatesPerDay || ''), 10);
          const totalSlots =
            interviewDays > 0 && Number.isInteger(candidatesPerDay) && candidatesPerDay > 0
              ? interviewDays * candidatesPerDay
              : 0;

          return (
            <article
              key={job.id}
              data-job-type={String(job.type || 'FULL_TIME').toUpperCase()}
              className={`company-job-card group relative flex h-full flex-col rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${typeTheme.card}`}
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${typeTheme.accent}`}
              />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="company-job-title text-base font-semibold text-gray-900">
                    {job.title}
                  </h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="company-job-chip company-job-chip-location inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">
                      <FiMapPin className="h-3.5 w-3.5 text-sky-600" />
                      {job.location || 'Remote'}
                    </span>
                    <span
                      className={`company-job-type-badge inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${typeTheme.badge}`}
                    >
                      {toJobTypeLabel(job.type)}
                    </span>
                    {job.createdAt && (
                      <span className="company-job-chip company-job-chip-date inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                        <FiClock className="h-3.5 w-3.5 text-amber-700" />
                        {toDateLabel(job.createdAt)}
                      </span>
                    )}
                    {job.applicationDeadline && (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
                        Deadline {toDateTimeLabel(job.applicationDeadline)}
                      </span>
                    )}
                    <span
                      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${
                        lifecycle === 'OPEN'
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                          : lifecycle === 'EXPIRED'
                            ? 'border-amber-200 bg-amber-100 text-amber-800'
                            : 'border-rose-200 bg-rose-100 text-rose-800'
                      }`}
                    >
                      {lifecycle === 'OPEN'
                        ? 'Open'
                        : lifecycle === 'EXPIRED'
                          ? 'Expired'
                          : 'Closed'}
                    </span>
                  </div>
                </div>
                <span className={`company-job-applicants status-pill ${typeTheme.applicants}`}>
                  {Number(job.applicationCount || 0)} applicant(s)
                </span>
              </div>

              <div className={`company-job-meta mt-4 rounded-xl border p-3 ${typeTheme.meta}`}>
                <span
                  className={`company-job-chip company-job-chip-mode inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${
                    isRemoteRole
                      ? 'border-cyan-200 bg-cyan-100 text-cyan-800'
                      : 'border-slate-300 bg-slate-100 text-slate-700'
                  }`}
                >
                  {isRemoteRole ? 'Remote friendly' : 'On-site / Hybrid'}
                </span>
                <span
                  className={`ml-2 inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${
                    scheduleReady
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                      : 'border-rose-200 bg-rose-100 text-rose-800'
                  }`}
                >
                  {scheduleReady ? 'Auto-interview ready' : 'Schedule missing'}
                </span>
                <span className="ml-2 inline-flex rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  Slots: {totalSlots > 0 ? totalSlots : '-'}
                </span>
              </div>

              <div
                className={`company-job-description mt-4 rounded-xl border px-3 py-3 text-sm leading-6 ${typeTheme.description}`}
              >
                <p className="company-job-description-label text-[11px] font-semibold uppercase tracking-wide text-current/70">
                  Role Summary
                </p>
                <p className="mt-1 line-clamp-3">
                  {job.description || 'No description added yet.'}
                </p>
              </div>

              <div className="company-job-actions mt-auto grid grid-cols-2 gap-2 pt-5">
                <button
                  type="button"
                  onClick={() => onEdit(job)}
                  className="btn-soft w-full px-3 py-2 text-xs"
                  title="Edit job"
                >
                  <FiEdit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDelete(job)}
                  disabled={deletingJobId === job.id}
                  className="btn-danger w-full px-3 py-2 text-xs disabled:opacity-50"
                  title="Delete job"
                >
                  <FiTrash2 className="h-3.5 w-3.5" />
                  {deletingJobId === job.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </article>
          );
        })}

        {filteredJobs.length === 0 && (
          <div className="empty-shell md:col-span-2">No jobs match the current filters.</div>
        )}
      </div>
    </div>
  );
}
