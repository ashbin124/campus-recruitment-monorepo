import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import ProfileHero from '../../components/student/profile/ProfileHero.jsx';
import StatsGrid from '../../components/student/profile/StatsGrid.jsx';
import ProfileDetailsTab from '../../components/student/profile/ProfileDetailsTab.jsx';
import PasswordTab from '../../components/student/profile/PasswordTab.jsx';
import InlineAlert from '@/components/ui/InlineAlert.jsx';

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  location: '',
  education: '',
  degree: '',
  age: '',
  skills: '',
  bio: '',
  linkedin: '',
  github: '',
  website: '',
  experience: '',
  experienceYears: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  profileImage: null,
  profileImageUrl: '',
  resume: null,
  resumeUrl: '',
};

function toExternalHref(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function Profile() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [profilePreviewUrl, setProfilePreviewUrl] = useState('');

  const [stats, setStats] = useState({
    applications: 0,
    interviews: 0,
    offers: 0,
    skills: 0,
  });

  const [formData, setFormData] = useState(initialFormData);

  const fetchUserProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/student/profile');
      const userData = response.data || {};

      const normalizedSkills = Array.isArray(userData.skills)
        ? userData.skills.join(', ')
        : String(userData.skills || '');

      setFormData((prev) => ({
        ...prev,
        name: userData.name || user?.name || '',
        email: userData.email || user?.email || '',
        phone: userData.phone || '',
        location: userData.location || '',
        education: userData.education || '',
        degree: userData.degree || '',
        age: userData.age != null ? String(userData.age) : '',
        skills: normalizedSkills,
        bio: userData.bio || '',
        linkedin: userData.linkedin || '',
        github: userData.github || '',
        website: userData.website || '',
        experience: userData.experience || '',
        experienceYears: userData.experienceYears != null ? String(userData.experienceYears) : '',
        profileImage: null,
        profileImageUrl: userData.profileImageUrl || '',
        resume: null,
        resumeUrl: userData.resumeUrl || '',
      }));

      const skillsCount = normalizedSkills
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean).length;

      setStats({
        applications: Number(userData.stats?.applications || 0),
        interviews: Number(userData.stats?.interviews || 0),
        offers: Number(userData.stats?.offers || 0),
        skills: skillsCount,
      });
    } catch (error) {
      console.error('Error fetching student profile:', error);
      setFormData((prev) => ({
        ...prev,
        name: user?.name || '',
        email: user?.email || '',
      }));
      setNotice({
        type: 'error',
        message: 'Failed to load full profile. Showing basic account info.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (!formData.profileImage) {
      setProfilePreviewUrl(formData.profileImageUrl || '');
      return;
    }

    const objectUrl = URL.createObjectURL(formData.profileImage);
    setProfilePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [formData.profileImage, formData.profileImageUrl]);

  const initials = String(formData.name || user?.name || 'S')
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const profileReadiness = useMemo(() => {
    const skillCount = String(formData.skills || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean).length;

    const checks = [
      { key: 'phone', label: 'Phone number', done: Boolean(String(formData.phone || '').trim()) },
      { key: 'location', label: 'Location', done: Boolean(String(formData.location || '').trim()) },
      { key: 'degree', label: 'Degree', done: Boolean(String(formData.degree || '').trim()) },
      {
        key: 'experienceYears',
        label: 'Experience years',
        done: formData.experienceYears !== '' && Number(formData.experienceYears) >= 0,
      },
      { key: 'skills', label: 'Skills', done: skillCount > 0 },
      {
        key: 'resume',
        label: 'Resume / CV',
        done: Boolean(formData.resume || String(formData.resumeUrl || '').trim()),
      },
      { key: 'bio', label: 'Short bio', done: Boolean(String(formData.bio || '').trim()) },
    ];

    const completedCount = checks.filter((item) => item.done).length;
    const completionPercent = Math.round((completedCount / checks.length) * 100);
    return {
      checks,
      completedCount,
      totalCount: checks.length,
      completionPercent,
      missingLabels: checks.filter((item) => !item.done).map((item) => item.label),
      hasResume: checks.find((item) => item.key === 'resume')?.done || false,
    };
  }, [
    formData.phone,
    formData.location,
    formData.degree,
    formData.experienceYears,
    formData.skills,
    formData.resume,
    formData.resumeUrl,
    formData.bio,
  ]);

  const formInputClass = 'w-full input-field';

  function onInputChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function onFileChange(event) {
    const { name, files } = event.target;
    const file = files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      setNotice({ type: 'error', message: 'File size exceeds 10MB limit.' });
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: file }));
  }

  function resetEditState() {
    setIsEditing(false);
    setNotice({ type: '', message: '' });
    fetchUserProfile();
  }

  async function saveProfile() {
    try {
      setIsSavingProfile(true);
      setNotice({ type: '', message: '' });

      const payload = new FormData();
      payload.append('name', formData.name || '');
      payload.append('phone', formData.phone || '');
      payload.append('location', formData.location || '');
      payload.append('education', formData.education || '');
      payload.append('degree', formData.degree || '');
      payload.append('age', formData.age || '');
      payload.append('bio', formData.bio || '');
      payload.append('skills', formData.skills || '');
      payload.append('linkedin', formData.linkedin || '');
      payload.append('github', formData.github || '');
      payload.append('website', formData.website || '');
      payload.append('experience', formData.experience || '');
      payload.append('experienceYears', formData.experienceYears || '');

      if (formData.profileImage) payload.append('profileImage', formData.profileImage);
      if (formData.resume) payload.append('resume', formData.resume);

      await api.put('/student/profile', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setNotice({ type: 'success', message: 'Profile updated successfully.' });
      setIsEditing(false);
      await fetchUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      const message = error?.response?.data?.message || 'Failed to update profile.';
      setNotice({ type: 'error', message });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setNotice({ type: 'error', message: 'All password fields are required.' });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setNotice({ type: 'error', message: 'New password and confirm password must match.' });
      return;
    }

    try {
      setIsSavingPassword(true);
      setNotice({ type: '', message: '' });

      await api.put('/auth/update', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      setNotice({ type: 'success', message: 'Password updated successfully.' });
    } catch (error) {
      console.error('Error updating password:', error);
      const message = error?.response?.data?.message || 'Failed to update password.';
      setNotice({ type: 'error', message });
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <ProfileHero
        activeTab={activeTab}
        isEditing={isEditing}
        isSavingProfile={isSavingProfile}
        profilePreviewUrl={profilePreviewUrl}
        displayName={formData.name || 'Student Profile'}
        displayEmail={formData.email || user?.email || ''}
        initials={initials}
        completionPercent={profileReadiness.completionPercent}
        hasResume={profileReadiness.hasResume}
        missingCount={profileReadiness.missingLabels.length}
        onStartEdit={() => {
          setIsEditing(true);
          setNotice({ type: '', message: '' });
        }}
        onCancelEdit={resetEditState}
        onSaveProfile={saveProfile}
      />

      <InlineAlert
        message={notice.message}
        tone={notice.type === 'success' ? 'success' : 'error'}
      />

      <section className="surface-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-kicker">Profile Readiness</p>
            <h2 className="text-main mt-1 text-xl font-semibold">
              {profileReadiness.completionPercent}% complete
            </h2>
            <p className="text-soft mt-1 text-sm">
              Completed {profileReadiness.completedCount}/{profileReadiness.totalCount} required
              sections for better matching.
            </p>
          </div>
          <div className="w-full max-w-md">
            <div className="h-3 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  profileReadiness.completionPercent >= 85
                    ? 'bg-emerald-500'
                    : profileReadiness.completionPercent >= 60
                      ? 'bg-brand-500'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${profileReadiness.completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="surface-panel p-4">
            <p className="text-main text-sm font-semibold">Checklist</p>
            <div className="mt-2 space-y-1.5 text-sm">
              {profileReadiness.checks.map((item) => (
                <p
                  key={item.key}
                  className={`rounded-md border px-2.5 py-1.5 ${
                    item.done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {item.done ? 'Done' : 'Missing'}: {item.label}
                </p>
              ))}
            </div>
          </div>

          <div className="surface-panel p-4">
            <p className="text-main text-sm font-semibold">CV Guidance</p>
            <p className="text-soft mt-2 text-sm">
              Keep your CV clear and machine-readable for better matching.
            </p>
            <ul className="text-muted mt-2 space-y-1 text-sm">
              <li>Include phone and email inside the CV.</li>
              <li>List skills as plain text (not image-only).</li>
              <li>Add degree and total experience years clearly.</li>
              <li>Keep file under 10MB, preferably PDF.</li>
            </ul>
            {formData.resumeUrl && (
              <a
                href={formData.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="app-link mt-3 inline-flex text-sm font-medium"
              >
                View current uploaded resume
              </a>
            )}
          </div>
        </div>
      </section>

      <StatsGrid stats={stats} />

      <section className="surface-card shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <nav className="segmented-switch flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                setNotice({ type: '', message: '' });
              }}
              className={`segment-btn ${
                activeTab === 'profile' ? 'segment-btn-active' : 'segment-btn-idle'
              }`}
            >
              Profile Details
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setIsEditing(false);
                setNotice({ type: '', message: '' });
              }}
              className={`segment-btn ${
                activeTab === 'password' ? 'segment-btn-active' : 'segment-btn-idle'
              }`}
            >
              Change Password
            </button>
          </nav>
        </div>

        {activeTab === 'profile' ? (
          <ProfileDetailsTab
            formData={formData}
            isEditing={isEditing}
            formInputClass={formInputClass}
            onInputChange={onInputChange}
            onFileChange={onFileChange}
            toExternalHref={toExternalHref}
            profileReadiness={profileReadiness}
          />
        ) : (
          <PasswordTab
            formData={formData}
            formInputClass={formInputClass}
            onInputChange={onInputChange}
            onSubmit={savePassword}
            isSavingPassword={isSavingPassword}
          />
        )}
      </section>
    </div>
  );
}
