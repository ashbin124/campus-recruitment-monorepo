import { FiSave } from 'react-icons/fi';

export default function ProfileHero({
  activeTab,
  isEditing,
  isSavingProfile,
  profilePreviewUrl,
  displayName,
  displayEmail,
  initials,
  onStartEdit,
  onCancelEdit,
  onSaveProfile,
}) {
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
