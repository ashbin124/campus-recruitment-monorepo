import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { FiArrowUpRight, FiBriefcase, FiClock, FiMapPin } from 'react-icons/fi';
import api from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';

function toDateLabel(value) {
  if (!value) return 'Recent';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return 'Recent';
  }
}

function toJobTypeLabel(value) {
  const raw = String(value || 'FULL_TIME')
    .replace(/_/g, ' ')
    .toLowerCase();
  return raw.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getJobTypeTheme(value) {
  const normalized = String(value || 'FULL_TIME').toUpperCase();

  if (normalized.includes('INTERNSHIP')) {
    return {
      card: 'border-brand-300 bg-gradient-to-br from-brand-100/95 via-brand-50/90 to-white',
      accent: 'from-brand-500 to-cyan-500',
      badge: 'bg-brand-100 text-brand-800 ring-brand-300',
      title: 'border-brand-200 bg-gradient-to-r from-brand-100/90 to-brand-50/80 text-slate-900',
      companyPanel: 'border-brand-200 bg-white/95 hover:border-brand-300 hover:bg-white',
      metaPanel: 'border-brand-200 bg-white/90',
      description: 'border-brand-200 bg-brand-50/70 text-slate-700',
      actionPanel: 'border-brand-200 bg-white/90',
      secondary:
        'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
      cta: 'from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 focus-visible:ring-brand-500',
    };
  }

  if (normalized.includes('PART')) {
    return {
      card: 'border-cyan-300 bg-gradient-to-br from-cyan-100/95 via-cyan-50/90 to-white',
      accent: 'from-cyan-500 to-brand-500',
      badge: 'bg-cyan-100 text-cyan-800 ring-cyan-300',
      title: 'border-cyan-200 bg-gradient-to-r from-cyan-100/90 to-cyan-50/80 text-slate-900',
      companyPanel: 'border-cyan-200 bg-white/95 hover:border-cyan-300 hover:bg-white',
      metaPanel: 'border-cyan-200 bg-white/90',
      description: 'border-cyan-200 bg-cyan-50/70 text-slate-700',
      actionPanel: 'border-cyan-200 bg-white/90',
      secondary:
        'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
      cta: 'from-cyan-600 to-brand-600 hover:from-cyan-700 hover:to-brand-700 focus-visible:ring-cyan-500',
    };
  }

  if (normalized.includes('CONTRACT')) {
    return {
      card: 'border-indigo-300 bg-gradient-to-br from-indigo-100/95 via-indigo-50/90 to-white',
      accent: 'from-indigo-500 to-brand-500',
      badge: 'bg-indigo-100 text-indigo-800 ring-indigo-300',
      title: 'border-indigo-200 bg-gradient-to-r from-indigo-100/90 to-indigo-50/80 text-slate-900',
      companyPanel: 'border-indigo-200 bg-white/95 hover:border-indigo-300 hover:bg-white',
      metaPanel: 'border-indigo-200 bg-white/90',
      description: 'border-indigo-200 bg-indigo-50/70 text-slate-700',
      actionPanel: 'border-indigo-200 bg-white/90',
      secondary:
        'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
      cta: 'from-indigo-600 to-brand-600 hover:from-indigo-700 hover:to-brand-700 focus-visible:ring-indigo-500',
    };
  }

  return {
    card: 'border-slate-300 bg-gradient-to-br from-slate-100/95 via-slate-50/90 to-white',
    accent: 'from-slate-500 to-brand-500',
    badge: 'bg-slate-200 text-slate-700 ring-slate-300',
    title: 'border-slate-300 bg-gradient-to-r from-slate-100/90 to-slate-50/80 text-slate-900',
    companyPanel: 'border-slate-300 bg-white/95 hover:border-slate-400 hover:bg-white',
    metaPanel: 'border-slate-300 bg-white/90',
    description: 'border-slate-300 bg-slate-100/70 text-slate-700',
    actionPanel: 'border-slate-300 bg-white/90',
    secondary: 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
    cta: 'from-slate-700 to-brand-700 hover:from-slate-800 hover:to-brand-800 focus-visible:ring-slate-500',
  };
}

const Jobs = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const fileInputRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [companyIdFilter, setCompanyIdFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicationData, setApplicationData] = useState({
    name: '',
    email: '',
    phone: '',
    cv: null,
  });
  const [applyErrors, setApplyErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasActiveFilters = Boolean(title || location || companyIdFilter);

  const stats = useMemo(() => {
    const remote = jobs.filter((job) =>
      String(job.location || '')
        .toLowerCase()
        .includes('remote')
    ).length;
    return {
      total: jobs.length,
      remote,
      filtered: hasActiveFilters,
    };
  }, [jobs, hasActiveFilters]);

  async function loadJobs(
    pTitle = title,
    pLocation = location,
    pCompanyId = companyIdFilter,
    updateURL = true
  ) {
    const newTitle = String(pTitle !== undefined ? pTitle : title).trim();
    const newLocation = String(pLocation !== undefined ? pLocation : location).trim();
    const normalizedCompanyId = String(pCompanyId || '').trim();

    setTitle(newTitle);
    setLocation(newLocation);
    setCompanyIdFilter(normalizedCompanyId);

    setLoading(true);
    try {
      const q = newTitle;
      const queryParams = {};
      if (q) queryParams.q = q;
      if (newTitle) queryParams.title = newTitle;
      if (newLocation) queryParams.location = newLocation;
      if (/^\d+$/.test(normalizedCompanyId)) queryParams.companyId = Number(normalizedCompanyId);

      const { data } = await api.get('/jobs/eligible', { params: queryParams });
      setJobs(data);

      if (updateURL) {
        const params = new URLSearchParams();
        if (newTitle) params.set('title', newTitle);
        if (newLocation) params.set('location', newLocation);
        if (/^\d+$/.test(normalizedCompanyId)) params.set('companyId', normalizedCompanyId);
        const nextSearch = params.toString();
        navigate(nextSearch ? `/student/jobs?${nextSearch}` : '/student/jobs', { replace: true });
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]);
      toast.apiError(error, 'Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  }

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setApplicationData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      cv: null,
    });
    setApplyErrors({});
    setShowApplyModal(true);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setApplicationData((prev) => ({ ...prev, [name]: value }));
    setApplyErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (event) => {
    if (!event.target.files || !event.target.files[0]) return;
    const file = event.target.files[0];
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit.');
      setApplyErrors((prev) => ({ ...prev, cv: 'File size exceeds 10MB.' }));
      return;
    }
    setApplicationData((prev) => ({ ...prev, cv: file }));
    setApplyErrors((prev) => ({ ...prev, cv: '' }));
  };

  const handleSubmitApplication = async (event) => {
    event.preventDefault();
    if (!selectedJob) return;

    const nextErrors = {};
    if (!String(applicationData.name || '').trim()) nextErrors.name = 'Name is required.';
    if (!String(applicationData.email || '').trim()) nextErrors.email = 'Email is required.';
    if (!String(applicationData.phone || '').trim()) nextErrors.phone = 'Phone number is required.';
    if (!applicationData.cv) nextErrors.cv = 'Please upload your CV.';
    if (Object.keys(nextErrors).length > 0) {
      setApplyErrors(nextErrors);
      toast.warning('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('resume', applicationData.cv);

      const uploadResponse = await api.post('/upload/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.message || 'Failed to upload resume');
      }

      await api.post(`/applications/jobs/${selectedJob.id}/apply`, {
        name: applicationData.name,
        email: applicationData.email,
        phone: applicationData.phone,
        resumeUrl: uploadResponse.data.url,
      });

      toast.success('Application submitted successfully.');
      setApplicationData({ name: '', email: '', phone: '', cv: null });
      setApplyErrors({});
      setShowApplyModal(false);
      setSelectedJob(null);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.apiError(error, 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search);
    const t = params.get('title') || params.get('q') || '';
    const legacyKeyword = params.get('position') || params.get('keyword') || '';
    const l = params.get('location') || '';
    const companyId = params.get('companyId') || '';
    const mergedTitle = [t, legacyKeyword].filter(Boolean).join(' ').trim();
    loadJobs(mergedTitle, l, companyId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.search]);

  return (
    <>
      <div className="page-wrap space-y-8 pb-10">
        <section className="hero-shell relative overflow-hidden">
          <div className="absolute -left-16 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-2xl" />
          <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-brand-300/20 blur-2xl" />

          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Job Search
            </p>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Find Your Next Role</h1>
            <p className="mt-2 text-sm text-white/85">
              Search active opportunities from verified companies.
            </p>

            <div className="student-jobs-search-shell mt-6 rounded-2xl border border-white/20 bg-white/95 p-3 text-slate-900 shadow-lg">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && loadJobs()}
                  placeholder="Job role"
                  className="input-field"
                />
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && loadJobs()}
                  placeholder="Location"
                  className="input-field"
                />
                <button type="button" onClick={() => loadJobs()} className="btn-brand px-5 py-2">
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => loadJobs('', '', '')}
                  className="btn-soft px-5 py-2"
                >
                  Show All
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm md:w-max md:grid-cols-3">
              <div className="student-jobs-stat rounded-lg border border-white/20 bg-white/10 px-3 py-2">
                {stats.total} total jobs
              </div>
              <div className="student-jobs-stat rounded-lg border border-white/20 bg-white/10 px-3 py-2">
                {stats.remote} remote roles
              </div>
              <div className="student-jobs-stat rounded-lg border border-white/20 bg-white/10 px-3 py-2">
                {stats.filtered
                  ? companyIdFilter
                    ? 'Company filter active'
                    : 'Filters active'
                  : 'All listings'}
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell student-jobs-results-shell">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="animate-pulse surface-card p-5 shadow-sm">
                  <div className="h-11 w-11 rounded-xl bg-gray-200" />
                  <div className="mt-4 h-5 w-2/3 rounded bg-gray-200" />
                  <div className="mt-3 h-4 w-1/2 rounded bg-gray-200" />
                  <div className="mt-4 h-16 rounded bg-gray-200" />
                  <div className="mt-5 h-9 w-full rounded bg-gray-200 sm:w-36" />
                </div>
              ))}
            </div>
          ) : jobs.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => {
                const typeTheme = getJobTypeTheme(job.type);
                const isRemoteRole = String(job.location || '')
                  .toLowerCase()
                  .includes('remote');

                return (
                  <article
                    key={job.id}
                    data-job-type={String(job.type || 'FULL_TIME').toUpperCase()}
                    className={`student-job-card group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl ${typeTheme.card}`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 rounded-t-2xl bg-gradient-to-r ${typeTheme.accent}`}
                    />
                    <div className="relative z-10 flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (!job.company?.id) return;
                            navigate(`/companies/${job.company.id}`);
                          }}
                          className={`student-job-company flex items-center gap-3 rounded-xl border p-2 text-left shadow-sm transition ${typeTheme.companyPanel}`}
                          aria-label={`View ${job.company?.name || 'company'} profile`}
                        >
                          <span className="student-job-avatar grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                            {String(job.company?.name || 'C')
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                          <span>
                            <span className="student-job-company-label inline-flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500">
                              <FiBriefcase className="h-3.5 w-3.5" />
                              Company
                            </span>
                            <span className="student-job-company-name mt-0.5 block line-clamp-1 text-sm font-semibold text-slate-800 group-hover:text-brand-700">
                              {job.company?.name || 'Company'}
                            </span>
                          </span>
                        </button>

                        <span
                          className={`student-job-type-badge inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${typeTheme.badge}`}
                        >
                          {toJobTypeLabel(job.type)}
                        </span>
                        {Number.isFinite(Number(job.matchScore)) && (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                            {Math.round(Number(job.matchScore))}% match
                          </span>
                        )}
                      </div>

                      <h3
                        className={`student-job-title mt-4 line-clamp-2 rounded-xl border px-3 py-3 text-lg font-semibold leading-tight shadow-sm ${typeTheme.title}`}
                      >
                        {job.title}
                      </h3>

                      <div
                        className={`student-job-meta mt-3 flex flex-wrap gap-2 rounded-xl border p-2.5 ${typeTheme.metaPanel}`}
                      >
                        <span className="student-job-chip student-job-chip-location inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">
                          <FiMapPin className="h-3.5 w-3.5 text-sky-600" />
                          {job.location || 'Remote'}
                        </span>
                        <span className="student-job-chip student-job-chip-date inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          <FiClock className="h-3.5 w-3.5 text-amber-700" />
                          Posted {toDateLabel(job.createdAt)}
                        </span>
                        <span
                          className={`student-job-chip student-job-chip-mode inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${
                            isRemoteRole
                              ? 'border-cyan-200 bg-cyan-100 text-cyan-800'
                              : 'border-slate-300 bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isRemoteRole ? 'Remote friendly' : 'On-site / Hybrid'}
                        </span>
                      </div>

                      <div
                        className={`student-job-description mt-4 rounded-xl border px-3 py-3 ${typeTheme.description}`}
                      >
                        <p className="student-job-description-label text-[11px] font-semibold uppercase tracking-wide text-current/70">
                          Role Snapshot
                        </p>
                        <p className="mt-1 line-clamp-3 text-sm leading-6">
                          {job.description || 'No description added for this role yet.'}
                        </p>
                      </div>

                      <div
                        className={`student-job-actions mt-5 flex flex-col gap-2 rounded-xl border p-2 sm:flex-row sm:items-center sm:justify-between ${typeTheme.actionPanel}`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (!job.company?.id) return;
                            navigate(`/companies/${job.company.id}`);
                          }}
                          className={`student-job-view-btn inline-flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 ${typeTheme.secondary}`}
                        >
                          View Company
                          <FiArrowUpRight className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyClick(job)}
                          className={`student-job-apply-btn inline-flex items-center justify-center rounded-lg bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${typeTheme.cta}`}
                        >
                          Apply Now
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-shell">
              <h3 className="text-lg font-semibold text-gray-900">No jobs found</h3>
              <p className="mt-1 text-sm text-gray-600">
                No eligible jobs match your profile right now. Update profile skills, degree, age,
                experience, and resume, then try again.
              </p>
              <button type="button" onClick={() => loadJobs('', '', '')} className="btn-brand mt-4">
                Clear Filters
              </button>
            </div>
          )}
        </section>
      </div>

      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="surface-card w-full max-w-2xl shadow-2xl">
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between border-b pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Apply for {selectedJob.title}
                  </h3>
                  <p className="mt-1 text-gray-600">{selectedJob.company?.name || 'Company'}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedJob.company?.id) return;
                      navigate(`/companies/${selectedJob.company.id}`);
                    }}
                    className="btn-soft mt-2 px-3 py-1.5 text-sm"
                  >
                    View Company Profile
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmitApplication} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-gray-700">Full Name</span>
                    <input
                      type="text"
                      name="name"
                      value={applicationData.name}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border bg-white p-3 text-[rgb(15,23,42)] caret-[rgb(15,23,42)] placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${
                        applyErrors.name ? 'border-red-300 bg-red-50/40' : 'border-gray-300'
                      }`}
                      required
                    />
                    {applyErrors.name && (
                      <span className="text-xs text-red-600">{applyErrors.name}</span>
                    )}
                  </label>

                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-gray-700">Email</span>
                    <input
                      type="email"
                      name="email"
                      value={applicationData.email}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border bg-white p-3 text-[rgb(15,23,42)] caret-[rgb(15,23,42)] placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${
                        applyErrors.email ? 'border-red-300 bg-red-50/40' : 'border-gray-300'
                      }`}
                      required
                    />
                    {applyErrors.email && (
                      <span className="text-xs text-red-600">{applyErrors.email}</span>
                    )}
                  </label>

                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-gray-700">Phone Number</span>
                    <input
                      type="tel"
                      name="phone"
                      value={applicationData.phone}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border bg-white p-3 text-[rgb(15,23,42)] caret-[rgb(15,23,42)] placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${
                        applyErrors.phone ? 'border-red-300 bg-red-50/40' : 'border-gray-300'
                      }`}
                      required
                    />
                    {applyErrors.phone && (
                      <span className="text-xs text-red-600">{applyErrors.phone}</span>
                    )}
                  </label>

                  <div className="space-y-2">
                    <span className="block text-sm font-medium text-gray-700">Resume / CV</span>
                    <div
                      className={`flex items-center justify-between rounded-lg border-2 border-dashed px-4 py-3 ${
                        applyErrors.cv ? 'border-red-300 bg-red-50/40' : 'border-gray-300'
                      }`}
                    >
                      <span className="truncate text-sm text-gray-600">
                        {applicationData.cv ? applicationData.cv.name : 'No file selected'}
                      </span>
                      <label className="btn-soft cursor-pointer px-3 py-1.5 text-sm text-brand-700">
                        Upload
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="sr-only"
                          required={!applicationData.cv}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">Any file type, max 10MB.</p>
                    {applyErrors.cv && <p className="text-xs text-red-600">{applyErrors.cv}</p>}
                  </div>
                </div>

                <label className="flex items-start gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="terms"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600"
                    required
                  />
                  <span>
                    I agree to the{' '}
                    <a href="/terms" className="text-brand-700 hover:underline">
                      Terms
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-brand-700 hover:underline">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="btn-soft px-5 py-2.5 text-sm"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-brand min-w-[130px] px-5 py-2.5 text-sm disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Jobs;
