import { FiBriefcase } from 'react-icons/fi';

export default function JobFormPanel({
  isEditing,
  savingJob,
  title,
  location,
  description,
  onTitleChange,
  onLocationChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
}) {
  const descriptionCount = String(description || '').trim().length;

  return (
    <div className="section-shell">
      <div className="section-head mb-4">
        <div>
          <p className="section-kicker">Publishing</p>
          <h2 className="section-title mt-2 text-xl">
            {isEditing ? 'Edit Job Posting' : 'Create New Job'}
          </h2>
        </div>
        <span className="status-pill border-slate-200 bg-slate-100 text-slate-700">
          <FiBriefcase className="h-3.5 w-3.5" />
          Job Form
        </span>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Job Title</span>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="input-field"
            placeholder="Senior Frontend Engineer"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Location</span>
          <input
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            className="input-field"
            placeholder="Bengaluru / Remote"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-700">Role Description</span>
            <span className="text-xs text-gray-500">{descriptionCount} chars</span>
          </div>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className="textarea-field"
            rows="5"
            placeholder="Responsibilities, required skills, and expectations"
            required
          />
        </label>

        <div className="sm:col-span-2 flex flex-wrap gap-3">
          <button type="submit" disabled={savingJob} className="btn-brand disabled:opacity-60">
            {savingJob
              ? isEditing
                ? 'Saving...'
                : 'Publishing...'
              : isEditing
                ? 'Save Changes'
                : 'Publish Job'}
          </button>
          {isEditing && (
            <button type="button" onClick={onCancel} className="btn-soft">
              Cancel Edit
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
