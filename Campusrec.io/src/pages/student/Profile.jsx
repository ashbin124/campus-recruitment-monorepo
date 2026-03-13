import { useCallback, useEffect, useState } from 'react';
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
  skills: '',
  bio: '',
  linkedin: '',
  github: '',
  website: '',
  experience: '',
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
        skills: normalizedSkills,
        bio: userData.bio || '',
        linkedin: userData.linkedin || '',
        github: userData.github || '',
        website: userData.website || '',
        experience: userData.experience || '',
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
      payload.append('bio', formData.bio || '');
      payload.append('skills', formData.skills || '');
      payload.append('linkedin', formData.linkedin || '');
      payload.append('github', formData.github || '');
      payload.append('website', formData.website || '');
      payload.append('experience', formData.experience || '');

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
