import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import { useToast } from '@/context/ToastContext.jsx';
import { getAdminSettings, updateEligibilitySettings } from '@/services/adminService.js';

export default function AdminProfile() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [nameEdit, setNameEdit] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameForm, setNameForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [nameError, setNameError] = useState('');

  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailForm, setEmailForm] = useState({ email: user?.email || '' });

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [flexibleThresholdDefaultPercent, setFlexibleThresholdDefaultPercent] = useState(40);

  useEffect(() => {
    setNameForm({ name: user?.name || '', email: user?.email || '' });
    setEmailForm({ email: user?.email || '' });
  }, [user]);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      setSettingsLoading(true);
      setSettingsError('');
      try {
        const data = await getAdminSettings();
        if (!mounted) return;
        const nextValue = Number(data?.eligibility?.flexibleThresholdDefaultPercent ?? 40);
        setFlexibleThresholdDefaultPercent(
          Number.isFinite(nextValue) ? Math.max(0, Math.min(100, Math.round(nextValue))) : 40
        );
      } catch (error) {
        if (!mounted) return;
        const message = error?.response?.data?.message || 'Failed to load platform settings';
        setSettingsError(message);
      } finally {
        if (mounted) setSettingsLoading(false);
      }
    }

    loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const initials = (user?.name || 'A')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const buttonPrimaryClass = 'btn-brand disabled:opacity-60';
  const buttonSecondaryClass = 'btn-soft';

  const saveName = async () => {
    if (!String(nameForm.name || '').trim()) {
      setNameError('Name is required');
      toast.warning('Name is required.');
      return;
    }
    setNameError('');
    setNameSaving(true);
    try {
      const { data } = await api.put('/auth/update', { name: nameForm.name });
      setUser?.(data.user);
      setNameEdit(false);
      toast.success('Name updated successfully.');
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to update name';
      setNameError(message);
      toast.error(message);
    } finally {
      setNameSaving(false);
    }
  };

  const saveEmail = async () => {
    const emailValue = String(emailForm.email || '').trim();
    if (!emailValue) {
      setEmailError('Email is required');
      toast.warning('Email is required.');
      return;
    }
    setEmailError('');
    setEmailSaving(true);
    try {
      const { data } = await api.put('/auth/update', { email: emailValue });
      setUser?.(data.user);
      toast.success('Email updated successfully.');
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to update email';
      setEmailError(message);
      toast.error(message);
    } finally {
      setEmailSaving(false);
    }
  };

  const savePassword = async () => {
    setPwdError('');
    if (!pwd.newPassword) {
      setPwdError('New password is required');
      toast.warning('New password is required.');
      return;
    }
    if (pwd.newPassword !== pwd.confirmPassword) {
      setPwdError('New passwords do not match');
      toast.warning('New passwords do not match.');
      return;
    }
    setPwdSaving(true);
    try {
      await api.put('/auth/update', {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully.');
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to update password';
      setPwdError(message);
      toast.error(message);
    } finally {
      setPwdSaving(false);
    }
  };

  const saveEligibilitySettings = async () => {
    const parsed = Number.parseInt(String(flexibleThresholdDefaultPercent || ''), 10);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      setSettingsError('Flexible threshold must be between 0 and 100.');
      toast.warning('Flexible threshold must be between 0 and 100.');
      return;
    }

    setSettingsSaving(true);
    setSettingsError('');
    try {
      const data = await updateEligibilitySettings({
        flexibleThresholdDefaultPercent: parsed,
      });
      const saved = Number(data?.eligibility?.flexibleThresholdDefaultPercent ?? parsed);
      setFlexibleThresholdDefaultPercent(saved);
      toast.success('Eligibility settings updated.');
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to update eligibility settings';
      setSettingsError(message);
      toast.error(message);
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!user ? (
        <div className="section-shell text-center text-gray-600">Loading profile...</div>
      ) : (
        <>
          <section className="hero-shell relative overflow-hidden">
            <div className="absolute -right-16 top-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-2xl" />
            <div className="absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-brand-300/15 blur-2xl" />
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-white/15 text-xl font-bold">
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  Admin Workspace
                </p>
                <h1 className="mt-1 text-2xl font-semibold">Admin Profile</h1>
                <p className="text-white/85">Manage account identity and security settings.</p>
              </div>
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="section-shell">
              <div className="section-head mb-4">
                <h2 className="section-title text-xl">Account</h2>
                {!nameEdit ? (
                  <button
                    type="button"
                    className={buttonSecondaryClass}
                    onClick={() => setNameEdit(true)}
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={buttonSecondaryClass}
                      onClick={() => {
                        setNameEdit(false);
                        setNameForm({ name: user?.name || '', email: user?.email || '' });
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={nameSaving}
                      className={buttonPrimaryClass}
                      onClick={saveName}
                    >
                      {nameSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              {nameError && <div className="mb-3 text-sm text-red-600">{nameError}</div>}

              {!nameEdit ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">Name</div>
                    <div className="font-medium">{user?.name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <div className="font-medium">{user?.email || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Role</div>
                    <div className="font-medium">{user?.role || '-'}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-gray-700">Name</span>
                    <input
                      className="input-field"
                      value={nameForm.name}
                      onChange={(e) => setNameForm((s) => ({ ...s, name: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-gray-700">Email</span>
                    <input
                      className="input-field bg-slate-100 text-slate-500"
                      value={nameForm.email}
                      readOnly
                    />
                  </label>
                </div>
              )}
            </section>

            <section className="section-shell">
              <h2 className="section-title text-xl">Update Email</h2>
              {emailError && <div className="mb-3 text-sm text-red-600">{emailError}</div>}
              <div className="space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-gray-700">New email</span>
                  <input
                    className="input-field"
                    type="email"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm({ email: e.target.value })}
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={emailSaving}
                    className={buttonPrimaryClass}
                    onClick={saveEmail}
                  >
                    {emailSaving ? 'Saving...' : 'Save Email'}
                  </button>
                </div>
              </div>
            </section>

            <section className="section-shell md:col-span-2">
              <h2 className="section-title text-xl">Change Password</h2>
              {pwdError && <div className="mb-3 text-sm text-red-600">{pwdError}</div>}
              <div className="space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-gray-700">Current password</span>
                  <input
                    className="input-field"
                    type="password"
                    value={pwd.currentPassword}
                    onChange={(e) => setPwd((s) => ({ ...s, currentPassword: e.target.value }))}
                  />
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-gray-700">New password</span>
                    <input
                      className="input-field"
                      type="password"
                      value={pwd.newPassword}
                      onChange={(e) => setPwd((s) => ({ ...s, newPassword: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-gray-700">Confirm new password</span>
                    <input
                      className="input-field"
                      type="password"
                      value={pwd.confirmPassword}
                      onChange={(e) => setPwd((s) => ({ ...s, confirmPassword: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={pwdSaving}
                    className={buttonPrimaryClass}
                    onClick={savePassword}
                  >
                    {pwdSaving ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </section>

            <section className="section-shell md:col-span-2">
              <h2 className="section-title text-xl">Eligibility Settings</h2>
              <p className="section-description mt-1">
                Global default for flexible skill group threshold. Company can override this per
                job.
              </p>
              {settingsError && <div className="mt-3 text-sm text-red-600">{settingsError}</div>}
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,220px)_auto] sm:items-end">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-gray-700">Flexible threshold default (%)</span>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    max="100"
                    value={flexibleThresholdDefaultPercent}
                    onChange={(event) => setFlexibleThresholdDefaultPercent(event.target.value)}
                    disabled={settingsLoading || settingsSaving}
                  />
                </label>
                <div className="flex">
                  <button
                    type="button"
                    disabled={settingsLoading || settingsSaving}
                    className={buttonPrimaryClass}
                    onClick={saveEligibilitySettings}
                  >
                    {settingsLoading
                      ? 'Loading...'
                      : settingsSaving
                        ? 'Saving...'
                        : 'Save Eligibility Settings'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
