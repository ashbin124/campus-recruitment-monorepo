import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import InlineAlert from '@/components/ui/InlineAlert.jsx';
import {
  FiBarChart2,
  FiBriefcase,
  FiCheckCircle,
  FiGlobe,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShield,
  FiUsers,
} from 'react-icons/fi';

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

function baseProfileState() {
  return {
    id: null,
    companyName: '',
    website: '',
    location: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    about: '',
    imageUrl: '',
    joinedAt: null,
    stats: {
      totalJobs: 0,
      totalApplications: 0,
      acceptedApplications: 0,
      interviews: 0,
    },
    recentJobs: [],
  };
}

function toFormState(profile) {
  return {
    companyName: profile.companyName || '',
    contactName: profile.contactName || '',
    website: profile.website || '',
    location: profile.location || '',
    contactPhone: profile.contactPhone || '',
    about: profile.about || '',
    companyImage: null,
  };
}

export default function CompanyProfile() {
  const { setUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const [notice, setNotice] = useState({ type: '', message: '' });
  const [profile, setProfile] = useState(baseProfileState());
  const [profileForm, setProfileForm] = useState(toFormState(baseProfileState()));
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  const [pwd, setPwd] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const hasPublicProfileId = Number.isInteger(profile?.id) && profile.id > 0;
  const publicProfilePath = hasPublicProfileId ? `/companies/${profile.id}` : '';
  const publicWebsite = normalizeWebsite(profile?.website || '');

  const heroImageUrl = useMemo(() => {
    if (imagePreviewUrl) return imagePreviewUrl;
    return profile.imageUrl || '';
  }, [imagePreviewUrl, profile.imageUrl]);

  const initials = useMemo(() => {
    return String(profile.companyName || 'Company')
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [profile.companyName]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  async function loadProfile() {
    try {
      setLoading(true);
      const { data } = await api.get('/companies/me/profile');
      const normalized = {
        ...baseProfileState(),
        ...data,
      };

      setProfile(normalized);
      setProfileForm(toFormState(normalized));
      setImagePreviewUrl('');
      setNotice({ type: '', message: '' });
    } catch (error) {
      console.error('Error loading company profile:', error);
      setNotice({
        type: 'error',
        message: error?.response?.data?.message || 'Failed to load company profile.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function saveProfile() {
    try {
      setSavingProfile(true);
      setNotice({ type: '', message: '' });

      const formData = new FormData();
      formData.append('companyName', String(profileForm.companyName || '').trim());
      formData.append('contactName', String(profileForm.contactName || '').trim());
      formData.append('website', String(profileForm.website || '').trim());
      formData.append('location', String(profileForm.location || '').trim());
      formData.append('contactPhone', String(profileForm.contactPhone || '').trim());
      formData.append('about', String(profileForm.about || '').trim());
      if (profileForm.companyImage) {
        formData.append('companyImage', profileForm.companyImage);
      }

      const { data } = await api.put('/companies/me/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data?.profile) {
        const normalized = { ...baseProfileState(), ...data.profile };
        setProfile(normalized);
        setProfileForm(toFormState(normalized));
      }

      if (data?.user) setUser?.(data.user);

      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl('');
      setEditingProfile(false);
      setNotice({
        type: 'success',
        message: data?.message || 'Company profile updated successfully.',
      });
    } catch (error) {
      console.error('Error saving company profile:', error);
      setNotice({
        type: 'error',
        message: error?.response?.data?.message || 'Failed to update company profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    try {
      setNotice({ type: '', message: '' });

      if (!pwd.currentPassword || !pwd.newPassword || !pwd.confirmPassword) {
        setNotice({ type: 'error', message: 'All password fields are required.' });
        return;
      }

      if (pwd.newPassword !== pwd.confirmPassword) {
        setNotice({ type: 'error', message: 'New password and confirm password must match.' });
        return;
      }

      setSavingPassword(true);
      const { data } = await api.put('/auth/update', {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });

      if (data?.user) setUser?.(data.user);
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice({ type: 'success', message: 'Password updated successfully.' });
    } catch (error) {
      console.error('Error updating password:', error);
      setNotice({
        type: 'error',
        message: error?.response?.data?.message || 'Failed to update password.',
      });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-36 rounded-2xl bg-gray-200" />
        <div className="metric-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-xl bg-gray-200" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="hero-shell relative overflow-hidden">
        <div className="absolute -right-16 top-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-brand-300/15 blur-2xl" />
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/30 bg-white/10">
              {heroImageUrl ? (
                <img
                  src={heroImageUrl}
                  alt={profile.companyName || 'Company'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-xl font-bold">
                  {initials}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Company Workspace</p>
              <h1 className="mt-1 text-2xl font-semibold">
                {profile.companyName || 'Company Profile'}
              </h1>
              <p className="text-sm text-white/80">
                Keep your public company profile complete and trusted.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              {hasPublicProfileId ? (
                <Link to={publicProfilePath} className="btn-brand px-3 py-2 text-sm">
                  View Public Profile
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-soft cursor-not-allowed border-white/20 bg-white/10 px-3 py-2 text-sm text-white/70"
                  title="Public profile link will appear after profile loads."
                >
                  Public Profile Unavailable
                </button>
              )}
              <button
                type="button"
                onClick={loadProfile}
                className="btn-soft border-white/30 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
              >
                Refresh
              </button>
            </div>
            <p className="text-xs text-white/70">
              {hasPublicProfileId
                ? `Public URL: ${window.location.origin}${publicProfilePath}`
                : 'Loading public URL...'}
            </p>
          </div>
        </div>
      </section>

      <InlineAlert
        message={notice.message}
        tone={notice.type === 'success' ? 'success' : 'error'}
      />

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

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <section className="section-shell">
          <div className="section-head mb-5 border-b border-slate-200 pb-4">
            <div>
              <p className="section-kicker">Profile</p>
              <h2 className="section-title mt-2 text-xl">Public Company Details</h2>
              <p className="section-description">
                This information appears to students and other visitors.
              </p>
            </div>

            {!editingProfile ? (
              <button
                type="button"
                onClick={() => {
                  setEditingProfile(true);
                  setNotice({ type: '', message: '' });
                }}
                className="btn-soft px-3 py-2 text-sm"
              >
                Edit Details
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(false);
                    setProfileForm(toFormState(profile));
                    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                    setImagePreviewUrl('');
                    setNotice({ type: '', message: '' });
                  }}
                  className="btn-soft px-3 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="btn-brand px-3 py-2 text-sm disabled:opacity-60"
                >
                  {savingProfile ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Company Name</span>
              <input
                type="text"
                value={profileForm.companyName}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, companyName: event.target.value }))
                }
                readOnly={!editingProfile}
                className={`input-field ${!editingProfile ? 'bg-slate-100 text-slate-500' : ''}`}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Contact Person</span>
              <input
                type="text"
                value={profileForm.contactName}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, contactName: event.target.value }))
                }
                readOnly={!editingProfile}
                className={`input-field ${!editingProfile ? 'bg-slate-100 text-slate-500' : ''}`}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Location</span>
              <input
                type="text"
                value={profileForm.location}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, location: event.target.value }))
                }
                readOnly={!editingProfile}
                placeholder="City, Country"
                className={`input-field ${!editingProfile ? 'bg-slate-100 text-slate-500' : ''}`}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Contact Phone</span>
              <input
                type="text"
                value={profileForm.contactPhone}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, contactPhone: event.target.value }))
                }
                readOnly={!editingProfile}
                placeholder="+1 ..."
                className={`input-field ${!editingProfile ? 'bg-slate-100 text-slate-500' : ''}`}
              />
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Website</span>
              <input
                type="text"
                value={profileForm.website}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, website: event.target.value }))
                }
                readOnly={!editingProfile}
                placeholder="https://example.com"
                className={`input-field ${!editingProfile ? 'bg-slate-100 text-slate-500' : ''}`}
              />
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">About Company</span>
              <textarea
                rows={5}
                value={profileForm.about}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, about: event.target.value }))
                }
                readOnly={!editingProfile}
                placeholder="Describe what your company does, culture, and hiring focus."
                className={`textarea-field ${!editingProfile ? 'bg-slate-100 text-slate-500' : ''}`}
              />
            </label>

            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-gray-700">Company Image</p>
              <div className="mt-2 flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {heroImageUrl ? (
                    <img
                      src={heroImageUrl}
                      alt={profile.companyName || 'Company'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-gray-400">
                      No image
                    </div>
                  )}
                </div>

                {editingProfile ? (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setProfileForm((prev) => ({ ...prev, companyImage: file }));
                      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                      if (file) setImagePreviewUrl(URL.createObjectURL(file));
                      else setImagePreviewUrl('');
                    }}
                    className="input-field text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-500">
                    Upload a logo or office image to improve trust.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 surface-panel p-4">
            <h3 className="text-sm font-semibold text-gray-900">Security</h3>
            <p className="mt-1 text-xs text-gray-500">Update password for this company account.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-sm text-gray-700">Current Password</span>
                <input
                  type="password"
                  value={pwd.currentPassword}
                  onChange={(event) =>
                    setPwd((prev) => ({ ...prev, currentPassword: event.target.value }))
                  }
                  className="input-field"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-700">New Password</span>
                <input
                  type="password"
                  value={pwd.newPassword}
                  onChange={(event) =>
                    setPwd((prev) => ({ ...prev, newPassword: event.target.value }))
                  }
                  className="input-field"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-700">Confirm Password</span>
                <input
                  type="password"
                  value={pwd.confirmPassword}
                  onChange={(event) =>
                    setPwd((prev) => ({ ...prev, confirmPassword: event.target.value }))
                  }
                  className="input-field"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={savePassword}
              disabled={savingPassword}
              className="btn-dark mt-4 disabled:opacity-60"
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="section-shell p-5">
            <h3 className="section-title text-xl">Public Summary</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start gap-2 text-gray-700">
                <FiMail className="mt-0.5 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-gray-500">Public Email</p>
                  <p className="break-words font-medium text-gray-900">
                    {profile.contactEmail || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <FiPhone className="mt-0.5 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-gray-500">Public Phone</p>
                  <p className="font-medium text-gray-900">{profile.contactPhone || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <FiMapPin className="mt-0.5 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{profile.location || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <FiGlobe className="mt-0.5 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-gray-500">Website</p>
                  {publicWebsite ? (
                    <a
                      href={publicWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {profile.website}
                    </a>
                  ) : (
                    <p className="font-medium text-gray-900">Not set</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <FiShield className="mt-0.5 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-gray-500">Member Since</p>
                  <p className="font-medium text-gray-900">{toDateLabel(profile.joinedAt)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section-shell p-5">
            <h3 className="section-title text-xl">Recent Jobs</h3>
            <div className="mt-3 space-y-3">
              {profile.recentJobs.length > 0 ? (
                profile.recentJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="surface-panel p-3">
                    <p className="text-sm font-medium text-gray-900">{job.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {job.location || 'Remote'} • {job.type || 'FULL_TIME'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {job.applicationCount} application(s)
                    </p>
                  </div>
                ))
              ) : (
                <div className="empty-shell p-4 text-sm">No jobs posted yet.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
