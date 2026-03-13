import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiBarChart2,
  FiBriefcase,
  FiCheckCircle,
  FiGlobe,
  FiMail,
  FiMapPin,
  FiPhone,
  FiUsers,
} from 'react-icons/fi';
import api from '../../lib/api.js';

function normalizeWebsite(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function toDateLabel(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '-';
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
      card: 'border-brand-200 bg-gradient-to-br from-white via-brand-50/40 to-slate-50',
      accent: 'from-brand-500 to-cyan-500',
      badge: 'bg-brand-100 text-brand-800 ring-brand-200',
      applicants: 'bg-brand-100 text-brand-800',
    };
  }

  if (normalized.includes('PART')) {
    return {
      card: 'border-cyan-200 bg-gradient-to-br from-white via-cyan-50/45 to-slate-50',
      accent: 'from-cyan-500 to-brand-500',
      badge: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
      applicants: 'bg-cyan-100 text-cyan-800',
    };
  }

  if (normalized.includes('CONTRACT')) {
    return {
      card: 'border-indigo-200 bg-gradient-to-br from-white via-indigo-50/40 to-slate-50',
      accent: 'from-indigo-500 to-brand-500',
      badge: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
      applicants: 'bg-indigo-100 text-indigo-800',
    };
  }

  return {
    card: 'border-slate-200 bg-gradient-to-br from-white via-slate-50/60 to-slate-100/60',
    accent: 'from-slate-500 to-brand-500',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200',
    applicants: 'bg-slate-100 text-slate-700',
  };
}

export default function CompanyProfilePublic() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const { data } = await api.get(`/companies/${id}`);
        if (mounted) setProfile(data);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Failed to load company profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const websiteHref = useMemo(() => normalizeWebsite(profile?.website || ''), [profile?.website]);

  if (loading) {
    return (
      <div className="page-wrap space-y-6">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
        <div className="metric-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-gray-200" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-wrap">
        <div className="section-shell border-red-200 bg-red-50 text-sm text-red-700">
          {error || 'Company not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap space-y-6">
      <section className="hero-shell relative overflow-hidden">
        <div className="absolute -right-16 top-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-brand-300/15 blur-2xl" />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-xl border border-white/30 bg-white/10">
              {profile.imageUrl ? (
                <img
                  src={profile.imageUrl}
                  alt={profile.companyName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-xl font-semibold">
                  {String(profile.companyName || 'C')
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Company Profile</p>
              <h1 className="mt-1 text-3xl font-semibold">{profile.companyName}</h1>
              <p className="mt-2 text-sm text-white/80">
                Explore company details, active roles, and hiring progress at a glance.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to={`/student/jobs?companyId=${profile.id}`}
              className="btn-brand px-4 py-2 text-sm"
            >
              View Open Roles
            </Link>
            {websiteHref && (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-soft border-white/30 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
              >
                Visit Website
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <div className="metric-tile">
          <div className="flex items-center gap-2 text-gray-500">
            <FiBriefcase className="h-4 w-4" />
            <span className="metric-label">Open Jobs</span>
          </div>
          <p className="metric-value">{profile.stats.totalJobs}</p>
        </div>
        <div className="metric-tile">
          <div className="flex items-center gap-2 text-gray-500">
            <FiUsers className="h-4 w-4" />
            <span className="metric-label">Applications</span>
          </div>
          <p className="metric-value">{profile.stats.totalApplications}</p>
        </div>
        <div className="metric-tile">
          <div className="flex items-center gap-2 text-gray-500">
            <FiCheckCircle className="h-4 w-4" />
            <span className="metric-label">Accepted</span>
          </div>
          <p className="metric-value">{profile.stats.acceptedApplications}</p>
        </div>
        <div className="metric-tile">
          <div className="flex items-center gap-2 text-gray-500">
            <FiBarChart2 className="h-4 w-4" />
            <span className="metric-label">Interviews</span>
          </div>
          <p className="metric-value">{profile.stats.interviews}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="section-shell">
          <p className="section-kicker">Overview</p>
          <h2 className="section-title mt-2 text-xl">About Company</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-gray-700">
            {profile.about || 'No company description provided yet.'}
          </p>

          <h3 className="mt-6 text-xl font-semibold text-gray-900">Active Hiring Roles</h3>
          <p className="mt-1 text-sm text-gray-500">Recent openings from this company.</p>

          <div className="mt-4 space-y-3">
            {profile.recentJobs.length > 0 ? (
              profile.recentJobs.map((job) => {
                const typeTheme = getJobTypeTheme(job.type);
                const isRemoteRole = String(job.location || '')
                  .toLowerCase()
                  .includes('remote');

                return (
                  <article
                    key={job.id}
                    className={`group relative rounded-xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${typeTheme.card}`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r ${typeTheme.accent}`}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="line-clamp-2 font-semibold text-gray-900 group-hover:text-brand-700">
                          {job.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-md border border-sky-200 bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">
                            {job.location || 'Remote'}
                          </span>
                          <span
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${typeTheme.badge}`}
                          >
                            {toJobTypeLabel(job.type)}
                          </span>
                          <span className="rounded-md border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                            Posted {toDateLabel(job.createdAt)}
                          </span>
                          <span
                            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                              isRemoteRole
                                ? 'border-cyan-200 bg-cyan-100 text-cyan-800'
                                : 'border-slate-300 bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isRemoteRole ? 'Remote friendly' : 'On-site / Hybrid'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeTheme.applicants}`}
                      >
                        {job.applicationCount} application(s)
                      </span>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-shell p-6">No jobs posted yet.</div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="section-shell p-5">
            <h3 className="section-title text-xl">Contact Details</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start gap-2 text-gray-700">
                <FiMail className="mt-0.5 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-gray-500">Contact Person</p>
                  <p className="font-medium text-gray-900">{profile.contactName || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <FiMail className="mt-0.5 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="break-words font-medium text-gray-900">
                    {profile.contactEmail || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <FiPhone className="mt-0.5 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">
                    {profile.contactPhone || 'Not provided'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <FiMapPin className="mt-0.5 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{profile.location || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <FiGlobe className="mt-0.5 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-gray-500">Website</p>
                  {websiteHref ? (
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {profile.website}
                    </a>
                  ) : (
                    <p className="font-medium text-gray-900">Not provided</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <FiBriefcase className="mt-0.5 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-gray-500">Member Since</p>
                  <p className="font-medium text-gray-900">{toDateLabel(profile.joinedAt)}</p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
