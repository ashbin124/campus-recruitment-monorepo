import { FiBriefcase } from 'react-icons/fi';

export default function JobFormPanel({
  isEditing,
  savingJob,
  title,
  location,
  description,
  requiredSkills,
  requiredDegree,
  minAge,
  maxAge,
  minExperienceYears,
  interviewDates,
  interviewStartTime,
  interviewCandidatesPerDay,
  onTitleChange,
  onLocationChange,
  onDescriptionChange,
  onRequiredSkillsChange,
  onRequiredDegreeChange,
  onMinAgeChange,
  onMaxAgeChange,
  onMinExperienceYearsChange,
  onInterviewDatesChange,
  onInterviewStartTimeChange,
  onInterviewCandidatesPerDayChange,
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

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-medium text-gray-700">
            Required Skills (comma separated)
          </span>
          <textarea
            value={requiredSkills}
            onChange={(event) => onRequiredSkillsChange(event.target.value)}
            className="textarea-field"
            rows="2"
            placeholder="React, Node.js, PostgreSQL"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Required Degree (optional)</span>
          <input
            value={requiredDegree}
            onChange={(event) => onRequiredDegreeChange(event.target.value)}
            className="input-field"
            placeholder="B.Tech Computer Science"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Min Experience (years)</span>
          <input
            type="number"
            min="0"
            value={minExperienceYears}
            onChange={(event) => onMinExperienceYearsChange(event.target.value)}
            className="input-field"
            placeholder="2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Min Age (optional)</span>
          <input
            type="number"
            min="1"
            value={minAge}
            onChange={(event) => onMinAgeChange(event.target.value)}
            className="input-field"
            placeholder="21"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Max Age (optional)</span>
          <input
            type="number"
            min="1"
            value={maxAge}
            onChange={(event) => onMaxAgeChange(event.target.value)}
            className="input-field"
            placeholder="30"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-medium text-gray-700">
            Interview Dates (required, comma separated YYYY-MM-DD)
          </span>
          <textarea
            value={interviewDates}
            onChange={(event) => onInterviewDatesChange(event.target.value)}
            className="textarea-field"
            rows="2"
            placeholder="2026-03-20, 2026-03-27, 2026-04-03"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Interview Start Time (required)</span>
          <input
            type="time"
            value={interviewStartTime}
            onChange={(event) => onInterviewStartTimeChange(event.target.value)}
            className="input-field"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Candidates Per Day (required)</span>
          <input
            type="number"
            min="1"
            value={interviewCandidatesPerDay}
            onChange={(event) => onInterviewCandidatesPerDayChange(event.target.value)}
            className="input-field"
            placeholder="10"
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
