import LabeledInput from './LabeledInput.jsx';

export default function PasswordTab({
  formData,
  formInputClass,
  onInputChange,
  onSubmit,
  isSavingPassword,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5 p-6 md:max-w-xl">
      <h2 className="text-main text-lg font-semibold">Update Password</h2>
      <p className="text-soft text-sm">Use a strong password with letters, numbers, and symbols.</p>

      <LabeledInput label="Current Password">
        <input
          type="password"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={onInputChange}
          className={formInputClass}
          required
        />
      </LabeledInput>

      <LabeledInput label="New Password">
        <input
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={onInputChange}
          className={formInputClass}
          required
        />
      </LabeledInput>

      <LabeledInput label="Confirm New Password">
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={onInputChange}
          className={formInputClass}
          required
        />
      </LabeledInput>

      <button type="submit" disabled={isSavingPassword} className="btn-brand disabled:opacity-60">
        {isSavingPassword ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
}
