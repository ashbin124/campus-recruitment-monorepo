import { BsGithub, BsGlobe, BsLinkedin } from 'react-icons/bs';
import { FiFileText, FiMapPin, FiPhone } from 'react-icons/fi';
import LabeledInput from './LabeledInput.jsx';

export default function ProfileDetailsTab({
  formData,
  isEditing,
  formInputClass,
  onInputChange,
  onFileChange,
  toExternalHref,
}) {
  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>

          <LabeledInput label="Full Name">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onInputChange}
              disabled={!isEditing}
              className={`${formInputClass} ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
            />
          </LabeledInput>

          <LabeledInput label="Email Address">
            <input
              type="email"
              value={formData.email}
              disabled
              className={`${formInputClass} bg-gray-100 text-gray-600`}
            />
          </LabeledInput>

          <LabeledInput label="Phone Number">
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={onInputChange}
              disabled={!isEditing}
              className={`${formInputClass} ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
            />
          </LabeledInput>

          <LabeledInput label="Location">
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={onInputChange}
              disabled={!isEditing}
              className={`${formInputClass} ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
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
              className={`${formInputClass} ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
            />
          </LabeledInput>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-base font-semibold text-gray-900">Professional Summary</h2>

          <LabeledInput label="Bio">
            <textarea
              name="bio"
              value={formData.bio}
              onChange={onInputChange}
              disabled={!isEditing}
              rows={4}
              className={`${formInputClass} ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
            />
          </LabeledInput>

          <LabeledInput label="Education">
            <textarea
              name="education"
              value={formData.education}
              onChange={onInputChange}
              disabled={!isEditing}
              rows={3}
              className={`${formInputClass} ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
            />
          </LabeledInput>

          <LabeledInput label="Degree">
            <input
              type="text"
              name="degree"
              value={formData.degree}
              onChange={onInputChange}
              disabled={!isEditing}
              className={`${formInputClass} ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
            />
          </LabeledInput>

          <LabeledInput label="Experience">
            <textarea
              name="experience"
              value={formData.experience}
              onChange={onInputChange}
              disabled={!isEditing}
              rows={3}
              className={`${formInputClass} ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
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
              className={`${formInputClass} ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
            />
          </LabeledInput>

          <LabeledInput label="Skills (comma separated)">
            <textarea
              name="skills"
              value={formData.skills}
              onChange={onInputChange}
              disabled={!isEditing}
              rows={3}
              className={`${formInputClass} ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
            />
          </LabeledInput>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-base font-semibold text-gray-900">Social Links</h2>

          <LabeledInput label="LinkedIn URL">
            <div className="relative">
              <BsLinkedin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="linkedin"
                value={formData.linkedin}
                onChange={onInputChange}
                disabled={!isEditing}
                className={`${formInputClass} pl-9 ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
              />
            </div>
          </LabeledInput>

          <LabeledInput label="GitHub URL">
            <div className="relative">
              <BsGithub className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="github"
                value={formData.github}
                onChange={onInputChange}
                disabled={!isEditing}
                className={`${formInputClass} pl-9 ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
              />
            </div>
          </LabeledInput>

          <LabeledInput label="Website URL">
            <div className="relative">
              <BsGlobe className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={onInputChange}
                disabled={!isEditing}
                className={`${formInputClass} pl-9 ${!isEditing ? 'bg-gray-100 text-gray-600' : ''}`}
              />
            </div>
          </LabeledInput>

          {!isEditing && (
            <div className="space-y-2 border-t border-gray-200 pt-3 text-sm">
              {formData.linkedin && (
                <a
                  href={toExternalHref(formData.linkedin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-brand-700 hover:underline"
                >
                  Open LinkedIn
                </a>
              )}
              {formData.github && (
                <a
                  href={toExternalHref(formData.github)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-brand-700 hover:underline"
                >
                  Open GitHub
                </a>
              )}
              {formData.website && (
                <a
                  href={toExternalHref(formData.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-brand-700 hover:underline"
                >
                  Open Website
                </a>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-base font-semibold text-gray-900">Documents</h2>

          <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
            <p className="font-medium text-gray-800">Current Resume</p>
            <p className="mt-1 text-gray-600">
              {formData.resumeUrl ? 'Resume uploaded' : 'No resume uploaded yet'}
            </p>
            {formData.resumeUrl && (
              <a
                href={formData.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-brand-700 hover:underline"
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
                  className={formInputClass}
                />
              </LabeledInput>

              <LabeledInput label="Resume / CV (max 10MB)">
                <input
                  type="file"
                  name="resume"
                  onChange={onFileChange}
                  className={formInputClass}
                />
              </LabeledInput>
            </>
          )}

          <div className="space-y-2 border-t border-gray-200 pt-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <FiPhone className="mt-0.5 h-4 w-4 text-gray-400" />
              <span>{formData.phone || 'Phone not set'}</span>
            </div>
            <div className="flex items-start gap-2">
              <FiMapPin className="mt-0.5 h-4 w-4 text-gray-400" />
              <span>{formData.location || 'Location not set'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
