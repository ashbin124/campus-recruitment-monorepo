import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import { useToast } from '@/context/ToastContext.jsx';

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

  useEffect(() => {
    setNameForm({ name: user?.name || '', email: user?.email || '' });
    setEmailForm({ email: user?.email || '' });
  }, [user]);

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
          </div>
        </>
      )}
    </div>
  );
}
