import { BsGithub, BsGlobe, BsLinkedin } from 'react-icons/bs';
import { FiAlertTriangle, FiCheckCircle, FiFileText, FiMapPin, FiPhone } from 'react-icons/fi';
import LabeledInput from './LabeledInput.jsx';

export default function ProfileDetailsTab({
  formData,
  isEditing,
  formInputClass,
  onInputChange,
  onFileChange,
  toExternalHref,
  profileReadiness,
}) {
  const disabledInputClass = !isEditing ? 'opacity-80' : '';
  const completionPercent = Number(profileReadiness?.completionPercent || 0);
  const missingLabels = Array.isArray(profileReadiness?.missingLabels)
    ? profileReadiness.missingLabels
    : [];

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="surface-panel space-y-4 p-4">
          <h2 className="text-main text-base font-semibold">Basic Information</h2>

          <LabeledInput label="Full Name">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onInputChange}
              disabled={!isEditing}
              className={`${formInputClass} ${disabledInputClass}`}
            />
          </LabeledInput>

          <LabeledInput label="Email Address">
            <input
              type="email"
              value={formData.email}
              disabled
              className={`${formInputClass} opacity-80`}
            />
          </LabeledInput>

          <LabeledInput label="Phone Number">
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={onInputChange}
              disabled={!isEditing}
              className={`${formInputClass} ${disabledInputClass}`}
            />
          </LabeledInput>

          <LabeledInput label="Location">
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={onInputChange}
              disabled={!isEditing}
              className={`${formInputClass} ${disabledInputClass}`}
            />
          </LabeledInput>

          <LabeledInput label="Age">
            <input
              type="number"
              min="1"
              name="age"
              value={formData.age}
              onChange={onInputChange}
              disabled={!isEditing}
              className={`${formInputClass} ${disabledInputClass}`}
            />
          </LabeledInput>
        </div>

        <div className="surface-panel space-y-4 p-4">
          <h2 className="text-main text-base font-semibold">Professional Summary</h2>

          <LabeledInput label="Bio">
            <textarea
              name="bio"
              value={formData.bio}
              onChange={onInputChange}
              disabled={!isEditing}
              rows={4}
              className={`${formInputClass} ${disabledInputClass}`}
            />
          </LabeledInput>

          <LabeledInput label="Education">
            <textarea
              name="education"
              value={formData.education}
              onChange={onInputChange}
              disabled={!isEditing}
              rows={3}
              className={`${formInputClass} ${disabledInputClass}`}
            />
          </LabeledInput>

          <LabeledInput label="Degree">
            <input
              type="text"
              name="degree"
              value={formData.degree}
              onChange={onInputChange}
              disabled={!isEditing}
              className={`${formInputClass} ${disabledInputClass}`}
            />
          </LabeledInput>

          <LabeledInput label="Experience">
            <textarea
              name="experience"
              value={formData.experience}
              onChange={onInputChange}
              disabled={!isEditing}
              rows={3}
              className={`${formInputClass} ${disabledInputClass}`}
            />
          </LabeledInput>

          <LabeledInput label="Experience Years">
            <input
              type="number"
              min="0"
              name="experienceYears"
              value={formData.experienceYears}
              onChange={onInputChange}
              disabled={!isEditing}
              className={`${formInputClass} ${disabledInputClass}`}
            />
          </LabeledInput>

          <LabeledInput label="Skills (comma separated)">
            <textarea
              name="skills"
              value={formData.skills}
              onChange={onInputChange}
              disabled={!isEditing}
              rows={3}
              className={`${formInputClass} ${disabledInputClass}`}
            />
          </LabeledInput>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="surface-panel space-y-4 p-4">
          <h2 className="text-main text-base font-semibold">Social Links</h2>

          <LabeledInput label="LinkedIn URL">
            <div className="relative">
              <BsLinkedin className="text-soft pointer-events-none absolute left-3 top-3.5 h-4 w-4" />
              <input
                type="text"
                name="linkedin"
                value={formData.linkedin}
                onChange={onInputChange}
                disabled={!isEditing}
                className={`${formInputClass} pl-9 ${disabledInputClass}`}
              />
            </div>
          </LabeledInput>

          <LabeledInput label="GitHub URL">
            <div className="relative">
              <BsGithub className="text-soft pointer-events-none absolute left-3 top-3.5 h-4 w-4" />
              <input
                type="text"
                name="github"
                value={formData.github}
                onChange={onInputChange}
                disabled={!isEditing}
                className={`${formInputClass} pl-9 ${disabledInputClass}`}
              />
            </div>
          </LabeledInput>

          <LabeledInput label="Website URL">
            <div className="relative">
              <BsGlobe className="text-soft pointer-events-none absolute left-3 top-3.5 h-4 w-4" />
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={onInputChange}
                disabled={!isEditing}
                className={`${formInputClass} pl-9 ${disabledInputClass}`}
              />
            </div>
          </LabeledInput>

          {!isEditing && (
            <div className="space-y-2 border-t border-slate-200/80 pt-3 text-sm">
              {formData.linkedin && (
                <a
                  href={toExternalHref(formData.linkedin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="app-link block"
                >
                  Open LinkedIn
                </a>
              )}
              {formData.github && (
                <a
                  href={toExternalHref(formData.github)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="app-link block"
                >
                  Open GitHub
                </a>
              )}
              {formData.website && (
                <a
                  href={toExternalHref(formData.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="app-link block"
                >
                  Open Website
                </a>
              )}
            </div>
          )}
        </div>

        <div className="surface-panel space-y-4 p-4">
          <h2 className="text-main text-base font-semibold">Documents</h2>

          <div className="panel-muted p-3 text-sm">
            <p className="text-main font-medium">Current Resume</p>
            <p className="text-soft mt-1">
              {formData.resumeUrl ? 'Resume uploaded' : 'No resume uploaded yet'}
            </p>
            {formData.resumeUrl && (
              <a
                href={formData.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="app-link mt-2 inline-flex items-center gap-1"
              >
                <FiFileText className="h-4 w-4" /> View resume
              </a>
            )}
          </div>

          {isEditing && (
            <>
              <LabeledInput label="Profile Photo (optional)">
                <input
                  type="file"
                  name="profileImage"
                  onChange={onFileChange}
                  accept="image/*"
                  className={formInputClass}
                />
              </LabeledInput>

              <LabeledInput label="Resume / CV (max 10MB)">
                <input
                  type="file"
                  name="resume"
                  onChange={onFileChange}
                  accept=".pdf,.doc,.docx"
                  className={formInputClass}
                />
              </LabeledInput>
            </>
          )}

          <div className="space-y-2 border-t border-slate-200/80 pt-3 text-sm">
            <div className="flex items-start gap-2">
              <FiPhone className="text-soft mt-0.5 h-4 w-4" />
              <span className="text-soft">{formData.phone || 'Phone not set'}</span>
            </div>
            <div className="flex items-start gap-2">
              <FiMapPin className="text-soft mt-0.5 h-4 w-4" />
              <span className="text-soft">{formData.location || 'Location not set'}</span>
            </div>
          </div>

          <div
            className={`rounded-lg border px-3 py-3 text-sm ${
              missingLabels.length === 0
                ? 'border-emerald-200 bg-emerald-50/70'
                : 'border-amber-200 bg-amber-50/70'
            }`}
          >
            <p
              className={`font-semibold ${
                missingLabels.length === 0 ? 'text-emerald-900' : 'text-amber-900'
              }`}
            >
              Application Readiness {completionPercent}%
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
              <div
                className={`h-full rounded-full ${
                  completionPercent >= 85
                    ? 'bg-emerald-500'
                    : completionPercent >= 60
                      ? 'bg-brand-500'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            {missingLabels.length === 0 ? (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-800">
                <FiCheckCircle className="h-3.5 w-3.5" />
                Profile is ready for job applications.
              </p>
            ) : (
              <>
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-amber-800">
                  <FiAlertTriangle className="h-3.5 w-3.5" />
                  Add missing details to improve matching.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-amber-900">
                  {missingLabels.map((label) => (
                    <li key={label}>Missing: {label}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
