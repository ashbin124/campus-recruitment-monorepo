import { FiAlertTriangle, FiCheckCircle, FiFileText, FiSave } from 'react-icons/fi';

export default function ProfileHero({
  activeTab,
  isEditing,
  isSavingProfile,
  profilePreviewUrl,
  displayName,
  displayEmail,
  initials,
  completionPercent = 0,
  hasResume = false,
  missingCount = 0,
  onStartEdit,
  onCancelEdit,
  onSaveProfile,
}) {
  const profileReady = completionPercent >= 85 && missingCount === 0;
  const profileNearReady = !profileReady && completionPercent >= 60;
  const progressTone = profileReady
    ? 'bg-emerald-400'
    : profileNearReady
      ? 'bg-amber-300'
      : 'bg-rose-300';

  return (
    <section className="hero-shell">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl border border-white/30 bg-white/10 text-xl font-bold">
            {profilePreviewUrl ? (
              <img
                src={profilePreviewUrl}
                alt={displayName || 'Student'}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/80">Student Account</p>
            <h1 className="mt-1 text-2xl font-semibold">{displayName || 'Student Profile'}</h1>
            <p className="text-sm text-white/80">{displayEmail || ''}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center rounded-full border border-white/30 bg-white/15 px-2.5 py-1 font-semibold">
                {completionPercent}% complete
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${
                  hasResume
                    ? 'border-emerald-200/70 bg-emerald-400/20 text-emerald-50'
                    : 'border-amber-200/70 bg-amber-400/25 text-amber-50'
                }`}
              >
                {hasResume ? (
                  <FiFileText className="h-3.5 w-3.5" />
                ) : (
                  <FiAlertTriangle className="h-3.5 w-3.5" />
                )}
                {hasResume ? 'Resume uploaded' : 'Resume missing'}
              </span>
              {missingCount > 0 && (
                <span className="inline-flex items-center rounded-full border border-rose-200/60 bg-rose-400/20 px-2.5 py-1 font-semibold text-rose-50">
                  {missingCount} fields missing
                </span>
              )}
              {profileReady && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-400/20 px-2.5 py-1 font-semibold text-emerald-50">
                  <FiCheckCircle className="h-3.5 w-3.5" />
                  Ready to apply
                </span>
              )}
            </div>

            <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
              <div
                className={`h-full rounded-full transition-all ${progressTone}`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {activeTab === 'profile' && (
          <div className="flex flex-wrap items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={onStartEdit}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="rounded-md border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveProfile}
                  disabled={isSavingProfile}
                  className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
                >
                  <FiSave className="h-4 w-4" />
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
