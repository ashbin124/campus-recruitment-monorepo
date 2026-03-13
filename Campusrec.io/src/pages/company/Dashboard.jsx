import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiBriefcase, FiGrid, FiUsers } from 'react-icons/fi';
import api from '../../lib/api.js';
import ApplicationDetails from './ApplicationDetails';
import HeroStats from '../../components/company/dashboard/HeroStats.jsx';
import JobFormPanel from '../../components/company/dashboard/JobFormPanel.jsx';
import JobListingsPanel from '../../components/company/dashboard/JobListingsPanel.jsx';
import CandidatePipelinePanel from '../../components/company/dashboard/CandidatePipelinePanel.jsx';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import InlineAlert from '@/components/ui/InlineAlert.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { getErrorMessage } from '@/lib/errors.js';
import {
  getReviewedApplicationIds,
  markApplicationReviewed,
  markApplicationsReviewed,
} from '@/lib/applicationReview.js';

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [deletingJobId, setDeletingJobId] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [savingJob, setSavingJob] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);
  const [appSearch, setAppSearch] = useState('');
  const [pendingDeleteJob, setPendingDeleteJob] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(() => new Set());
  const [workspaceView, setWorkspaceView] = useState('jobs');
  const reviewStorageId = user?.id ? `company-${user.id}` : 'company-anonymous';

  useEffect(() => {
    setReviewedIds(new Set(getReviewedApplicationIds(reviewStorageId)));
  }, [reviewStorageId]);

  const isEditing = editingJobId !== null;

  const appsWithMeta = useMemo(() => {
    return apps.map((item) => ({
      ...item,
      isNew: !reviewedIds.has(String(item?.id)),
    }));
  }, [apps, reviewedIds]);

  const appCounts = useMemo(() => {
    const pending = appsWithMeta.filter((item) => item.status === 'PENDING').length;
    const interview = appsWithMeta.filter((item) => item.status === 'INTERVIEW').length;
    const accepted = appsWithMeta.filter(
      (item) => item.status === 'ACCEPTED' || item.status === 'APPROVED'
    ).length;
    const fresh = appsWithMeta.filter((item) => item.isNew).length;
    return {
      total: appsWithMeta.length,
      new: fresh,
      pending,
      interview,
      accepted,
    };
  }, [appsWithMeta]);

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
    const newIds = appsWithMeta.filter((item) => item.isNew).map((item) => item.id);
    if (!newIds.length) return;

    const updated = markApplicationsReviewed(reviewStorageId, newIds);
    setReviewedIds(new Set(updated));
  }, [appsWithMeta, reviewStorageId]);

  const matchesSearch = useCallback(
    (item) => {
      const search = appSearch.trim().toLowerCase();
      if (!search) return true;
      return (
        String(item?.job?.title || '')
          .toLowerCase()
          .includes(search) ||
        String(item?.student?.user?.name || '')
          .toLowerCase()
          .includes(search) ||
        String(item?.student?.user?.email || '')
          .toLowerCase()
          .includes(search)
      );
    },
    [appSearch]
  );

  const newApps = useMemo(() => {
    return appsWithMeta.filter((item) => item.isNew && matchesSearch(item));
  }, [appsWithMeta, matchesSearch]);

  const reviewedApps = useMemo(() => {
    return appsWithMeta.filter((item) => !item.isNew && matchesSearch(item));
  }, [appsWithMeta, matchesSearch]);

  const handleSelectApp = useCallback(
    (app) => {
      setSelectedApp(app);
      markAsReviewed(app?.id);
    },
    [markAsReviewed]
  );

  function resetJobForm() {
    setTitle('');
    setLocation('');
    setDescription('');
    setEditingJobId(null);
  }

  async function saveJob(e) {
    e.preventDefault();
    try {
      setSavingJob(true);
      const payload = {
        title: String(title || '').trim(),
        description: String(description || '').trim(),
        location: String(location || '').trim(),
      };

      if (isEditing) {
        await api.put(`/jobs/${editingJobId}`, payload);
        setStatusNotice({ type: 'success', text: 'Job updated successfully.' });
      } else {
        await api.post('/jobs', payload);
        setStatusNotice({ type: 'success', text: 'New job posted successfully.' });
      }

      resetJobForm();
      await Promise.all([loadJobs(), loadApplications()]);
    } catch (e) {
      const message = getErrorMessage(e, isEditing ? 'Failed to update job' : 'Failed to post job');
      setStatusNotice({ type: 'error', text: message });
    } finally {
      setSavingJob(false);
    }
  }

  async function loadJobs() {
    try {
      const { data } = await api.get('/jobs/company');
      setJobs(data);
    } catch (error) {
      console.error('Error loading company jobs:', error);
      setJobs([]);
    }
  }

  async function loadApplications() {
    try {
      const { data } = await api.get('/applications/company');
      setApps(data);
    } catch (error) {
      console.error('Error loading company applications:', error);
      setApps([]);
    }
  }

  async function setStatus(id, status) {
    try {
      let payload = { status };
      if (typeof status === 'object' && status !== null) {
        payload = status;
      }
      const { data } = await api.patch(`/applications/${id}`, payload);
      await loadApplications();

      const updatedApplication = data?.application || data;
      const backendMessage =
        data?.message || `Application marked as ${updatedApplication?.status || 'UPDATED'}.`;
      const emailInfo = data?.emailNotification;
      const noticeText =
        emailInfo?.attempted && !emailInfo?.sent
          ? `${backendMessage} ${emailInfo?.message || ''}`.trim()
          : backendMessage;

      return {
        ok: true,
        message: noticeText,
        application: updatedApplication,
        emailNotification: emailInfo,
        emailDeliveryLogs: Array.isArray(data?.emailDeliveryLogs) ? data.emailDeliveryLogs : [],
      };
    } catch (error) {
      console.error('Error updating application status:', error);
      const message = getErrorMessage(error, 'Failed to update application status.');
      return { ok: false, message };
    }
  }

  async function deleteJob(jobId) {
    try {
      setDeletingJobId(jobId);
      await api.delete(`/jobs/${jobId}`);
      if (editingJobId === jobId) resetJobForm();
      setStatusNotice({ type: 'success', text: 'Job deleted successfully.' });
      await Promise.all([loadJobs(), loadApplications()]);
    } catch (error) {
      console.error('Error deleting job:', error);
      const message = getErrorMessage(error, 'Failed to delete job');
      setStatusNotice({ type: 'error', text: message });
    } finally {
      setDeletingJobId(null);
      setPendingDeleteJob(null);
    }
  }

  function startEditJob(job) {
    setEditingJobId(job.id);
    setTitle(job.title || '');
    setLocation(job.location || '');
    setDescription(job.description || '');
    setWorkspaceView('jobs');
  }

  useEffect(() => {
    loadJobs();
    loadApplications();
  }, []);

  const showJobsWorkspace = workspaceView === 'jobs';
  const showCandidatesWorkspace = workspaceView === 'candidates';

  return (
    <div className="space-y-6">
      <HeroStats jobsCount={jobs.length} appCounts={appCounts} />

      <InlineAlert message={statusNotice?.text} tone={statusNotice?.type || 'info'} />

      <section className="toolbar-shell">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FiGrid className="h-4 w-4 text-brand-600" />
            Workspace
          </div>

          <div className="segmented-switch">
            <button
              type="button"
              onClick={() => setWorkspaceView('jobs')}
              className={`segment-btn flex-1 sm:flex-none ${
                workspaceView === 'jobs' ? 'segment-btn-active' : 'segment-btn-idle'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <FiBriefcase className="h-4 w-4" />
                Jobs ({jobs.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceView('candidates')}
              className={`segment-btn flex-1 sm:flex-none ${
                workspaceView === 'candidates' ? 'segment-btn-active' : 'segment-btn-idle'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <FiUsers className="h-4 w-4" />
                Apps ({newApps.length + reviewedApps.length})
              </span>
            </button>
          </div>
        </div>
      </section>

      <div className={showJobsWorkspace ? 'space-y-6' : ''}>
        {showJobsWorkspace && (
          <section className="space-y-6">
            <JobFormPanel
              isEditing={isEditing}
              savingJob={savingJob}
              title={title}
              location={location}
              description={description}
              onTitleChange={setTitle}
              onLocationChange={setLocation}
              onDescriptionChange={setDescription}
              onSubmit={saveJob}
              onCancel={resetJobForm}
            />

            <JobListingsPanel
              jobs={jobs}
              deletingJobId={deletingJobId}
              onEdit={startEditJob}
              onRequestDelete={(job) => setPendingDeleteJob({ id: job.id, title: job.title })}
            />
          </section>
        )}

        {showCandidatesWorkspace && (
          <div>
            <CandidatePipelinePanel
              newApps={newApps}
              reviewedApps={reviewedApps}
              appSearch={appSearch}
              onSearchChange={setAppSearch}
              onSelectApp={handleSelectApp}
              appCounts={appCounts}
              onMarkAllReviewed={markAllAsReviewed}
            />
          </div>
        )}
      </div>

      {selectedApp && (
        <ApplicationDetails
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onStatusChange={setStatus}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteJob)}
        title="Delete Job Posting"
        description={`Delete "${pendingDeleteJob?.title || 'this job'}"? This also removes linked applications.`}
        confirmText="Delete Job"
        confirmVariant="danger"
        busy={Boolean(deletingJobId)}
        onCancel={() => setPendingDeleteJob(null)}
        onConfirm={async () => {
          if (!pendingDeleteJob?.id) return;
          await deleteJob(pendingDeleteJob.id);
        }}
      />
    </div>
  );
}
