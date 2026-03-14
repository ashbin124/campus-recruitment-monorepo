import { useMemo, useState } from 'react';
import { FiBriefcase } from 'react-icons/fi';

const SKILL_LIBRARY = {
  frontend: [
    'HTML',
    'CSS',
    'JavaScript',
    'TypeScript',
    'React',
    'Next.js',
    'Vue',
    'Angular',
    'Tailwind CSS',
    'Redux',
  ],
  backend: [
    'Node.js',
    'Express',
    'Django',
    'Flask',
    'FastAPI',
    'Spring Boot',
    'Laravel',
    'NestJS',
    'REST API',
    'GraphQL',
  ],
  database: [
    'MySQL',
    'PostgreSQL',
    'MongoDB',
    'Redis',
    'SQLite',
    'SQL Server',
    'Firebase',
    'DynamoDB',
  ],
  tools: ['Git', 'GitHub', 'GitLab', 'VS Code', 'Postman', 'Docker', 'Jira', 'Figma', 'Linux'],
  language: ['English', 'Hindi', 'Tamil', 'Malayalam', 'Kannada', 'Telugu', 'Arabic'],
  office: [
    'MS Excel',
    'MS Word',
    'PowerPoint',
    'Email Communication',
    'Data Entry',
    'Customer Support',
    'Report Writing',
    'Scheduling',
  ],
};

const ROLE_TEMPLATES = [
  {
    id: 'frontend_dev',
    label: 'Frontend Developer',
    mandatory: ['JavaScript', 'React', 'HTML', 'CSS'],
    required: ['Next.js/Vue/Angular', 'TypeScript', 'Git', 'VS Code'],
  },
  {
    id: 'backend_dev',
    label: 'Backend Developer',
    mandatory: ['Node.js/Express/Django/FastAPI', 'MySQL/PostgreSQL'],
    required: ['REST API/GraphQL', 'Redis/MongoDB', 'Git', 'Docker'],
  },
  {
    id: 'fullstack_dev',
    label: 'Full Stack Developer',
    mandatory: ['React/Vue/Angular', 'Node.js/Express/Django', 'MySQL/PostgreSQL'],
    required: ['TypeScript', 'REST API', 'Git', 'Docker'],
  },
  {
    id: 'office_staff',
    label: 'Office Staff',
    mandatory: ['MS Excel', 'MS Word', 'Email Communication'],
    required: ['PowerPoint', 'Scheduling', 'English/Hindi'],
  },
  {
    id: 'custom',
    label: 'Custom',
    mandatory: [],
    required: [],
  },
];

const CATEGORY_LABELS = {
  frontend: 'Front End',
  backend: 'Back End',
  database: 'Database',
  tools: 'Tools',
  language: 'Language',
  office: 'Office',
};

function normalizeSkill(value) {
  return String(value || '').trim();
}

function skillKey(value) {
  return normalizeSkill(value).toLowerCase();
}

function parseSkills(value) {
  const rawValues = Array.isArray(value) ? value : String(value || '').split(',');
  const seen = new Set();
  const output = [];

  for (const raw of rawValues) {
    const skill = normalizeSkill(raw);
    const key = skillKey(skill);
    if (!skill || !key || seen.has(key)) continue;
    seen.add(key);
    output.push(skill);
  }

  return output;
}

function toSkillsText(skills) {
  return parseSkills(skills).join(', ');
}

function mergeSkills(baseValue, nextSkills) {
  return toSkillsText([...parseSkills(baseValue), ...parseSkills(nextSkills)]);
}

export default function JobFormPanel({
  isEditing,
  savingJob,
  title,
  location,
  description,
  mandatorySkills,
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
  onMandatorySkillsChange,
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
  const exampleToneClass = 'placeholder:text-slate-400/90';
  const fieldClass = `input-field ${exampleToneClass} border-slate-300 bg-white text-slate-900 shadow-sm`;
  const textareaClass = `textarea-field ${exampleToneClass} border-slate-300 bg-white text-slate-900 shadow-sm`;
  const sectionLabelClass = 'text-sm font-semibold text-slate-800';
  const [selectedTemplateId, setSelectedTemplateId] = useState('backend_dev');
  const [selectedCategory, setSelectedCategory] = useState('backend');

  const selectedTemplate = useMemo(
    () => ROLE_TEMPLATES.find((item) => item.id === selectedTemplateId) || ROLE_TEMPLATES[0],
    [selectedTemplateId]
  );
  const categorySkills = SKILL_LIBRARY[selectedCategory] || [];

  function applyTemplate(mode) {
    if (!selectedTemplate) return;

    if (mode === 'replace') {
      onMandatorySkillsChange(toSkillsText(selectedTemplate.mandatory || []));
      onRequiredSkillsChange(toSkillsText(selectedTemplate.required || []));
      return;
    }

    onMandatorySkillsChange(mergeSkills(mandatorySkills, selectedTemplate.mandatory || []));
    onRequiredSkillsChange(mergeSkills(requiredSkills, selectedTemplate.required || []));
  }

  function addSkillToMandatory(skill) {
    onMandatorySkillsChange(mergeSkills(mandatorySkills, [skill]));
  }

  function addSkillToRequired(skill) {
    onRequiredSkillsChange(mergeSkills(requiredSkills, [skill]));
  }

  return (
    <div className="section-shell border-slate-300 bg-gradient-to-br from-white via-slate-50 to-blue-50/35 shadow-lg">
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
          <span className={sectionLabelClass}>Job Title</span>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className={fieldClass}
            placeholder="eg: Senior Frontend Engineer"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={sectionLabelClass}>Location</span>
          <input
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            className={fieldClass}
            placeholder="eg: Bengaluru / Remote"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <span className={sectionLabelClass}>Role Description</span>
            <span className="text-xs font-medium text-slate-600">{descriptionCount} chars</span>
          </div>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className={textareaClass}
            rows="5"
            placeholder="eg: Responsibilities, required skills, and expectations"
            required
          />
        </label>

        <div className="sm:col-span-2 rounded-xl border border-slate-300 bg-gradient-to-br from-slate-100 via-white to-sky-50/40 p-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Advanced Skill Builder</p>
          <p className="mt-1 text-xs text-slate-600">
            Choose a role template and quickly add skills by category.
          </p>

          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="select-field border-slate-300 bg-white text-slate-900 shadow-sm"
            >
              {ROLE_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-soft border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-100"
              onClick={() => applyTemplate('merge')}
            >
              Merge Template
            </button>
            <button
              type="button"
              className="btn-soft border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-100"
              onClick={() => applyTemplate('replace')}
            >
              Replace Skills
            </button>
            <button
              type="button"
              className="btn-soft border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-100"
              onClick={() => {
                onMandatorySkillsChange('');
                onRequiredSkillsChange('');
              }}
            >
              Clear Skills
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {Object.keys(SKILL_LIBRARY).map((categoryKey) => (
              <button
                key={categoryKey}
                type="button"
                onClick={() => setSelectedCategory(categoryKey)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  selectedCategory === categoryKey
                    ? 'border-brand-500 bg-brand-100 text-brand-800 shadow-sm'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                {CATEGORY_LABELS[categoryKey]}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {categorySkills.map((skill) => (
              <div
                key={`${selectedCategory}-${skill}`}
                className="flex items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm"
              >
                <span className="text-sm font-medium text-slate-800">{skill}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                    onClick={() => addSkillToMandatory(skill)}
                  >
                    + Compulsory
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700"
                    onClick={() => addSkillToRequired(skill)}
                  >
                    + Flexible
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={sectionLabelClass}>
            Compulsory Skills (all must match, use / for alternatives)
          </span>
          <textarea
            value={mandatorySkills}
            onChange={(event) => onMandatorySkillsChange(event.target.value)}
            className={textareaClass}
            rows="2"
            placeholder="eg: Git, Communication, Node.js/Express"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={sectionLabelClass}>
            Flexible Skill Pool (screening, use / for alternatives)
          </span>
          <textarea
            value={requiredSkills}
            onChange={(event) => onRequiredSkillsChange(event.target.value)}
            className={textareaClass}
            rows="2"
            placeholder="eg: django/express/node js, mysql/postgresql"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={sectionLabelClass}>Required Degree (optional)</span>
          <input
            value={requiredDegree}
            onChange={(event) => onRequiredDegreeChange(event.target.value)}
            className={fieldClass}
            placeholder="eg: B.Tech Computer Science"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={sectionLabelClass}>Min Experience (years)</span>
          <input
            type="number"
            min="0"
            value={minExperienceYears}
            onChange={(event) => onMinExperienceYearsChange(event.target.value)}
            className={fieldClass}
            placeholder="eg: 2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={sectionLabelClass}>Min Age (optional)</span>
          <input
            type="number"
            min="1"
            value={minAge}
            onChange={(event) => onMinAgeChange(event.target.value)}
            className={fieldClass}
            placeholder="eg: 21"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={sectionLabelClass}>Max Age (optional)</span>
          <input
            type="number"
            min="1"
            value={maxAge}
            onChange={(event) => onMaxAgeChange(event.target.value)}
            className={fieldClass}
            placeholder="eg: 30"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={sectionLabelClass}>
            Interview Dates (required, comma separated YYYY-MM-DD)
          </span>
          <textarea
            value={interviewDates}
            onChange={(event) => onInterviewDatesChange(event.target.value)}
            className={textareaClass}
            rows="2"
            placeholder="eg: 2026-03-20, 2026-03-27, 2026-04-03"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={sectionLabelClass}>Interview Start Time (required)</span>
          <input
            type="time"
            value={interviewStartTime}
            onChange={(event) => onInterviewStartTimeChange(event.target.value)}
            className={fieldClass}
            required
          />
          <span className="text-xs text-slate-500">eg: 09:30</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className={sectionLabelClass}>Candidates Per Day (required)</span>
          <input
            type="number"
            min="1"
            value={interviewCandidatesPerDay}
            onChange={(event) => onInterviewCandidatesPerDayChange(event.target.value)}
            className={fieldClass}
            placeholder="eg: 10"
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
