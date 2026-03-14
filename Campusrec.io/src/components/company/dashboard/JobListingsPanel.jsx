import { FiClock, FiEdit2, FiMapPin, FiTrash2 } from 'react-icons/fi';

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

function isJobOpen(job) {
  if (!job || job.isClosed) return false;
  if (!job.applicationDeadline) return true;
  const deadline = new Date(job.applicationDeadline).getTime();
  if (!Number.isFinite(deadline)) return false;
  return deadline > Date.now();
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
  const openJobs = jobs.filter((job) => isJobOpen(job)).length;

  return (
    <div className="section-shell">
      <div className="section-head border-b border-slate-200 pb-4">
        <div>
          <p className="section-kicker">Openings</p>
          <h3 className="section-title mt-2 text-xl">My Job Listings</h3>
          <p className="section-description">
            {openJobs} open listing(s) / {jobs.length} total
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {jobs.map((job) => {
          const typeTheme = getJobTypeTheme(job.type);
          const isRemoteRole = String(job.location || '')
            .toLowerCase()
            .includes('remote');
          const scheduleReady = hasInterviewSchedule(job);
          const jobOpen = isJobOpen(job);

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
                        jobOpen
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                          : 'border-rose-200 bg-rose-100 text-rose-800'
                      }`}
                    >
                      {jobOpen ? 'Open' : 'Closed'}
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

        {jobs.length === 0 && (
          <div className="empty-shell md:col-span-2">
            No jobs posted yet. Publish your first role to start receiving applications.
          </div>
        )}
      </div>
    </div>
  );
}
