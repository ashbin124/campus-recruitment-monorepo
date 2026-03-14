import { useMemo, useState } from 'react';
import {
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiSearch,
  FiUser,
} from 'react-icons/fi';

function statusBadgeClass(status) {
  if (status === 'PENDING') return 'bg-amber-100 text-amber-800';
  if (status === 'INTERVIEW') return 'bg-blue-100 text-blue-800';
  if (status === 'ACCEPTED' || status === 'APPROVED') return 'bg-emerald-100 text-emerald-800';
  return 'bg-red-100 text-red-800';
}

function statusLabel(value) {
  return String(value || 'PENDING')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '-';
  }
}

function toTimestamp(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function toScore(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusSortRank(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'PENDING') return 0;
  if (normalized === 'INTERVIEW') return 1;
  if (normalized === 'ACCEPTED' || normalized === 'APPROVED') return 2;
  if (normalized === 'REJECTED') return 3;
  return 9;
}

export default function CandidatePipelinePanel({
  newApps,
  reviewedApps,
  appSearch,
  onSearchChange,
  onSelectApp,
  appCounts,
  onMarkAllReviewed,
}) {
  const [activeQueue, setActiveQueue] = useState('new');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [jobFilter, setJobFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('MATCH_DESC');

  const queueItems = activeQueue === 'new' ? newApps : reviewedApps;
  const queueTitle = activeQueue === 'new' ? 'New Queue' : 'Reviewed Queue';

  const alternateQueueCount = useMemo(
    () => (activeQueue === 'new' ? reviewedApps.length : newApps.length),
    [activeQueue, newApps.length, reviewedApps.length]
  );

  const totalVisible = newApps.length + reviewedApps.length;
  const jobOptions = useMemo(() => {
    const map = new Map();
    for (const item of [...newApps, ...reviewedApps]) {
      const jobId = String(item?.job?.id || '').trim();
      if (!jobId) continue;
      if (!map.has(jobId)) {
        map.set(jobId, item?.job?.title || `Job #${jobId}`);
      }
    }
    return [...map.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((left, right) => left.title.localeCompare(right.title));
  }, [newApps, reviewedApps]);

  const filteredQueueItems = useMemo(() => {
    const scoped = queueItems.filter((item) => {
      const status = String(item?.status || 'PENDING').toUpperCase();
      const jobId = String(item?.job?.id || '').trim();
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      const matchesJob = jobFilter === 'ALL' || jobId === jobFilter;
      return matchesStatus && matchesJob;
    });

    return [...scoped].sort((left, right) => {
      if (sortBy === 'NEWEST') return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
      if (sortBy === 'OLDEST') return toTimestamp(left.createdAt) - toTimestamp(right.createdAt);
      if (sortBy === 'STATUS') {
        const rankDiff = statusSortRank(left.status) - statusSortRank(right.status);
        if (rankDiff !== 0) return rankDiff;
      }

      const scoreDiff = toScore(right.matchScore) - toScore(left.matchScore);
      if (scoreDiff !== 0) return scoreDiff;
      return toTimestamp(left.createdAt) - toTimestamp(right.createdAt);
    });
  }, [queueItems, statusFilter, jobFilter, sortBy]);

  return (
    <aside className="section-shell">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-kicker">Candidates</p>
          <h3 className="section-title mt-2 text-xl">Candidate Pipeline</h3>
        </div>
        <div className="flex items-center gap-2">
          {appCounts.new > 0 && (
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">
              {appCounts.new} new
            </span>
          )}
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            {totalVisible}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={appSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            className="input-field py-2 pl-9 pr-3"
          />
        </div>
        <button
          type="button"
          onClick={onMarkAllReviewed}
          disabled={appCounts.new === 0}
          className="btn-soft px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark all reviewed
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <select
          value={jobFilter}
          onChange={(event) => setJobFilter(event.target.value)}
          className="select-field"
        >
          <option value="ALL">All Jobs</option>
          {jobOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="select-field"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="INTERVIEW">Interview</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="select-field"
        >
          <option value="MATCH_DESC">Sort: Best Match</option>
          <option value="NEWEST">Sort: Newest</option>
          <option value="OLDEST">Sort: Oldest</option>
          <option value="STATUS">Sort: Status</option>
        </select>
      </div>

      <div className="segmented-switch mt-4">
        <button
          type="button"
          onClick={() => setActiveQueue('new')}
          className={`segment-btn flex-1 ${
            activeQueue === 'new' ? 'segment-btn-active text-sky-900' : 'segment-btn-idle'
          }`}
        >
          New ({newApps.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveQueue('reviewed')}
          className={`segment-btn flex-1 ${
            activeQueue === 'reviewed' ? 'segment-btn-active text-slate-900' : 'segment-btn-idle'
          }`}
        >
          Reviewed ({reviewedApps.length})
        </button>
      </div>

      <div
        className={`mt-4 rounded-xl border p-3 ${
          activeQueue === 'new' ? 'border-sky-200 bg-sky-50/50' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
              activeQueue === 'new' ? 'text-sky-900' : 'text-gray-700'
            }`}
          >
            {queueTitle}
          </p>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              activeQueue === 'new' ? 'bg-sky-100 text-sky-900' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {filteredQueueItems.length}
          </span>
        </div>

        <div className="max-h-[26rem] space-y-2 overflow-auto pr-1">
          {filteredQueueItems.map((item) => {
            const needsReview = Boolean(item?.matchSummary?.details?.needsReview);

            return (
              <button
                key={item.id}
                type="button"
                className={`w-full cursor-pointer rounded-lg border p-3 text-left transition ${
                  activeQueue === 'new'
                    ? 'border-sky-200 bg-white hover:border-sky-300'
                    : 'border-gray-200 bg-white hover:border-brand-200 hover:bg-brand-50/30'
                }`}
                onClick={() => onSelectApp(item)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="line-clamp-1 font-medium text-gray-900">
                      {item?.job?.title || 'Untitled role'}
                    </p>
                    <div className="mt-1 flex items-center text-sm text-gray-600">
                      <FiUser className="mr-1.5 h-4 w-4 text-gray-400" />
                      <span className="line-clamp-1">
                        {item?.student?.user?.name || 'Unknown candidate'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {activeQueue === 'new' ? (
                      <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                        New
                      </span>
                    ) : (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(item.status)}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    )}
                    {needsReview && (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        Needs review
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
                  <span className="line-clamp-1">{item?.student?.user?.email || '-'}</span>
                  <div className="inline-flex items-center gap-2 whitespace-nowrap">
                    {Number.isFinite(Number(item?.matchScore)) && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        {Math.round(Number(item.matchScore))}% match
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <FiCalendar className="h-3.5 w-3.5" />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>

                {item?.student?.resumeUrl && (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
                    <FiDownload className="h-3.5 w-3.5" />
                    Resume
                  </div>
                )}
              </button>
            );
          })}

          {filteredQueueItems.length === 0 && (
            <div className="empty-shell px-3 py-6 text-xs">
              {activeQueue === 'new'
                ? 'No new applications match these filters.'
                : 'No reviewed applications match these filters.'}
              {alternateQueueCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveQueue(activeQueue === 'new' ? 'reviewed' : 'new')}
                  className="btn-soft mt-2 block w-full px-2 py-1.5 text-xs"
                >
                  Switch to {activeQueue === 'new' ? 'Reviewed' : 'New'} ({alternateQueueCount})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-sky-50 p-2 text-center" title="New">
          <div className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <FiBell className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-sm font-semibold text-sky-900">{appCounts.new}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-2 text-center" title="Pending">
          <div className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <FiClock className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-sm font-semibold text-amber-900">{appCounts.pending}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-2 text-center" title="Interview">
          <div className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <FiBriefcase className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-sm font-semibold text-blue-900">{appCounts.interview}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2 text-center" title="Accepted">
          <div className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <FiCheckCircle className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-sm font-semibold text-emerald-900">{appCounts.accepted}</p>
        </div>
      </div>
    </aside>
  );
}
