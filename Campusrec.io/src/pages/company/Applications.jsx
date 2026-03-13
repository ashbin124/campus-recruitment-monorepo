import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/axios';
import { FiBell, FiSearch, FiUser } from 'react-icons/fi';
import DataTable from '@/components/admin/DataTable';
import ApplicationDetails from './ApplicationDetails';
import { useAuth } from '@/context/AuthContext.jsx';
import { getErrorMessage } from '@/lib/errors.js';
import {
  getReviewedApplicationIds,
  markApplicationReviewed,
  markApplicationsReviewed,
} from '@/lib/applicationReview.js';

export default function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedApp, setSelectedApp] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(() => new Set());
  const reviewStorageId = user?.id ? `company-${user.id}` : 'company-anonymous';

  useEffect(() => {
    setReviewedIds(new Set(getReviewedApplicationIds(reviewStorageId)));
  }, [reviewStorageId]);

  const fetchApplications = useCallback(async () => {
    try {
      const { data } = await api.get('/applications/company');
      setApplications(data);
      setError('');
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(getErrorMessage(err, 'Failed to load applications. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const applicationsWithMeta = useMemo(() => {
    return applications.map((item) => ({
      ...item,
      isNew: !reviewedIds.has(String(item?.id)),
    }));
  }, [applications, reviewedIds]);

  const stats = useMemo(() => {
    return {
      total: applicationsWithMeta.length,
      new: applicationsWithMeta.filter((item) => item.isNew).length,
      pending: applicationsWithMeta.filter((item) => item.status === 'PENDING').length,
      interview: applicationsWithMeta.filter((item) => item.status === 'INTERVIEW').length,
      accepted: applicationsWithMeta.filter(
        (item) => item.status === 'ACCEPTED' || item.status === 'APPROVED'
      ).length,
    };
  }, [applicationsWithMeta]);

  const hasSearchQuery = search.trim().length > 0;
  const matchesSearch = useCallback(
    (item) => {
      const text = search.trim().toLowerCase();
      if (!text) return true;

      return (
        String(item?.student?.user?.name || '')
          .toLowerCase()
          .includes(text) ||
        String(item?.student?.user?.email || '')
          .toLowerCase()
          .includes(text) ||
        String(item?.job?.title || '')
          .toLowerCase()
          .includes(text)
      );
    },
    [search]
  );

  const newApplications = useMemo(() => {
    return applicationsWithMeta.filter((item) => item.isNew && matchesSearch(item));
  }, [applicationsWithMeta, matchesSearch]);

  const filteredApplications = useMemo(() => {
    return applicationsWithMeta.filter((item) => {
      if (item.isNew) return false;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesStatus && matchesSearch(item);
    });
  }, [applicationsWithMeta, matchesSearch, statusFilter]);

  const nextNewApplication = useMemo(() => {
    return newApplications[0] || applicationsWithMeta.find((item) => item.isNew) || null;
  }, [newApplications, applicationsWithMeta]);

  const markAsReviewed = useCallback(
    (applicationId) => {
      const id = String(applicationId || '').trim();
      if (!id || reviewedIds.has(id)) return;

      const updated = markApplicationReviewed(reviewStorageId, id);
      setReviewedIds(new Set(updated));
    },
    [reviewStorageId, reviewedIds]
  );

  const markAllAsReviewed = useCallback(() => {
    const newIds = applicationsWithMeta.filter((item) => item.isNew).map((item) => item.id);
    if (!newIds.length) return;

    const updated = markApplicationsReviewed(reviewStorageId, newIds);
    setReviewedIds(new Set(updated));
  }, [applicationsWithMeta, reviewStorageId]);

  const openApplication = useCallback(
    (item) => {
      setSelectedApp(item);
      markAsReviewed(item?.id);
    },
    [markAsReviewed]
  );

  const setStatus = async (id, status) => {
    try {
      const payload = typeof status === 'object' && status !== null ? status : { status };
      const { data } = await api.patch(`/applications/${id}`, payload);
      await fetchApplications();

      const updatedApplication = data?.application || data;
      const backendMessage =
        data?.message || `Application marked as ${updatedApplication?.status || 'UPDATED'}.`;
      const emailInfo = data?.emailNotification;
      const message =
        emailInfo?.attempted && !emailInfo?.sent
          ? `${backendMessage} ${emailInfo?.message || ''}`.trim()
          : backendMessage;
      return {
        ok: true,
        message,
        application: updatedApplication,
        emailNotification: emailInfo,
        emailDeliveryLogs: Array.isArray(data?.emailDeliveryLogs) ? data.emailDeliveryLogs : [],
      };
    } catch (err) {
      console.error('Error updating application status:', err);
      const message = getErrorMessage(err, 'Failed to update application status.');
      return { ok: false, message };
    }
  };

  const columns = [
    {
      key: 'student.user.name',
      title: 'Candidate',
      render: (_value, row) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {(row.student?.user?.name || 'U').charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="inline-flex items-center gap-2 font-medium text-gray-900">
              <span>{row.student?.user?.name || 'Unknown Student'}</span>
              {row.isNew && (
                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                  New
                </span>
              )}
            </p>
            <p className="inline-flex items-center gap-1 text-xs text-gray-500">
              <FiUser className="h-3.5 w-3.5" />
              {row.student?.user?.email || '-'}
            </p>
          </div>
        </div>
      ),
      sortable: false,
    },
    { key: 'job.title', title: 'Job Role' },
    { key: 'createdAt', title: 'Applied', type: 'date' },
    { key: 'status', title: 'Status', type: 'status' },
    {
      key: 'student.resumeUrl',
      title: 'Resume',
      render: (value) => (value ? 'Uploaded' : 'Not uploaded'),
      sortable: false,
    },
  ];

  if (loading) return <div className="section-shell">Loading applications...</div>;
  if (error) return <div className="section-shell text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <section className="hero-shell relative overflow-hidden">
        <div className="absolute -right-16 top-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-brand-300/15 blur-2xl" />
        <h1 className="text-2xl font-semibold">Applications Pipeline</h1>
        <p className="mt-1 text-sm text-white/80">
          Track incoming candidates, filter by stage, and keep hiring progress organized.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-white/20 bg-white/10 p-3">
            <p className="text-xs uppercase tracking-wide text-white/70">Total</p>
            <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 p-3">
            <p className="text-xs uppercase tracking-wide text-white/70">New</p>
            <p className="mt-2 text-2xl font-semibold">{stats.new}</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 p-3">
            <p className="text-xs uppercase tracking-wide text-white/70">Pending</p>
            <p className="mt-2 text-2xl font-semibold">{stats.pending}</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 p-3">
            <p className="text-xs uppercase tracking-wide text-white/70">Interview</p>
            <p className="mt-2 text-2xl font-semibold">{stats.interview}</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 p-3">
            <p className="text-xs uppercase tracking-wide text-white/70">Accepted</p>
            <p className="mt-2 text-2xl font-semibold">{stats.accepted}</p>
          </div>
        </div>
      </section>

      {stats.new > 0 && (
        <section className="surface-card border-amber-200 bg-amber-50/70 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <FiBell className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-amber-900">
                  New applications need review
                </h2>
                <p className="mt-1 text-sm text-amber-800">
                  {stats.new} new application(s) are waiting. Open one to mark it as reviewed.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => nextNewApplication && openApplication(nextNewApplication)}
                className="btn-soft border-amber-300 bg-white px-3 py-2 text-sm text-amber-900 hover:bg-amber-100"
              >
                Review next new
              </button>
              <button
                type="button"
                onClick={markAllAsReviewed}
                className="btn-brand from-amber-500 to-amber-600 px-3 py-2 text-sm text-white hover:from-amber-600 hover:to-amber-700"
              >
                Mark all reviewed
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="toolbar-shell">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by candidate, email, or job title"
              className="input-field py-2 pl-9 pr-3"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select-field"
          >
            <option value="ALL">All Reviewed Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="INTERVIEW">INTERVIEW</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
            }}
            className="btn-soft px-3 py-2 text-sm"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={markAllAsReviewed}
            disabled={stats.new === 0}
            className="btn-soft px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark all new as reviewed
          </button>
        </div>
      </section>

      <section className="surface-card overflow-hidden border-sky-200 bg-sky-50/70">
        <div className="border-b border-sky-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-sky-950">New Applications Queue</h2>
          <p className="text-sm text-sky-900/80">
            Review these first. Opening a candidate marks it as reviewed and moves it out of this
            queue.
          </p>
        </div>

        {newApplications.length === 0 ? (
          <div className="empty-shell text-sky-900/70">
            {hasSearchQuery
              ? 'No new applications match your search.'
              : 'No new applications right now.'}
          </div>
        ) : (
          <div className="p-6 pt-4">
            <DataTable
              title={`New Applications (${newApplications.length})`}
              columns={columns}
              data={newApplications}
              emptyMessage="No new applications."
              initialPageSize={5}
              defaultSort={{ key: 'createdAt', direction: 'desc' }}
              onRowClick={openApplication}
            />
          </div>
        )}
      </section>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Reviewed Applications</h2>
          <p className="text-sm text-gray-500">
            Showing {filteredApplications.length} reviewed application(s). New candidates stay in a
            separate queue above.
          </p>
        </div>

        {filteredApplications.length === 0 ? (
          <div className="empty-shell">No applications match the current filters.</div>
        ) : (
          <div className="p-6 pt-4">
            <DataTable
              title={`Applications (${filteredApplications.length})`}
              columns={columns}
              data={filteredApplications}
              emptyMessage="No applications match the current filters."
              initialPageSize={10}
              defaultSort={{ key: 'createdAt', direction: 'desc' }}
              onRowClick={openApplication}
            />
          </div>
        )}
      </section>

      {selectedApp && (
        <ApplicationDetails
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onStatusChange={setStatus}
        />
      )}
    </div>
  );
}
