import { useEffect, useMemo, useState } from 'react';
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
    'Bootstrap',
    'Web Accessibility',
    'Responsive Design',
    'Material UI',
  ],
  backend: [
    'Node.js',
    'Express',
    'NestJS',
    'Spring Boot',
    'Laravel',
    'ASP.NET Core',
    'Ruby on Rails',
    'REST API',
    'GraphQL',
    'Microservices',
    'Authentication & JWT',
    'Server-side Caching',
  ],
  python: [
    'Python',
    'Django',
    'Flask',
    'FastAPI',
    'Pandas',
    'NumPy',
    'Celery',
    'PyTest',
    'SQLAlchemy',
    'Airflow',
  ],
  database: [
    'MySQL',
    'PostgreSQL',
    'MongoDB',
    'Redis',
    'SQLite',
    'SQL Server',
    'Oracle',
    'Cassandra',
    'Firebase',
    'DynamoDB',
    'Elasticsearch',
  ],
  devops: [
    'Linux',
    'Docker',
    'Kubernetes',
    'CI/CD',
    'GitHub Actions',
    'GitLab CI',
    'Jenkins',
    'Terraform',
    'Ansible',
    'Monitoring',
  ],
  cloud: ['AWS', 'Azure', 'GCP', 'Serverless', 'IAM', 'Cloud Storage', 'Cloud Networking'],
  mobile: ['Android', 'Kotlin', 'Java', 'iOS', 'Swift', 'React Native', 'Flutter', 'Mobile UI/UX'],
  qa: [
    'Manual Testing',
    'Automation Testing',
    'Test Cases',
    'API Testing',
    'Selenium',
    'Cypress',
    'Playwright',
    'Bug Tracking',
  ],
  cybersecurity: [
    'Network Security',
    'Vulnerability Assessment',
    'SIEM',
    'Incident Response',
    'Penetration Testing',
    'OWASP',
    'IAM',
    'Security Auditing',
  ],
  data: [
    'SQL',
    'Python',
    'Power BI',
    'Tableau',
    'Data Cleaning',
    'Statistics',
    'Machine Learning',
    'Data Visualization',
    'ETL',
    'MS Excel',
  ],
  design: [
    'Figma',
    'Adobe XD',
    'Wireframing',
    'Prototyping',
    'UX Research',
    'UI Design',
    'Design Systems',
    'Interaction Design',
  ],
  product: [
    'Product Roadmapping',
    'User Stories',
    'Agile',
    'Scrum',
    'Stakeholder Management',
    'KPI Tracking',
    'Market Research',
    'PRD Writing',
  ],
  sales: [
    'Lead Generation',
    'CRM',
    'Negotiation',
    'B2B Sales',
    'B2C Sales',
    'Cold Calling',
    'Pipeline Management',
    'Follow-up',
  ],
  marketing: [
    'SEO',
    'SEM',
    'Social Media Marketing',
    'Content Marketing',
    'Google Analytics',
    'Email Marketing',
    'Campaign Reporting',
    'Brand Management',
  ],
  accounting: [
    'Bookkeeping',
    'Financial Reporting',
    'GST Filing',
    'VAT',
    'Payroll',
    'Tax Compliance',
    'Bank Reconciliation',
    'Tally',
    'QuickBooks',
    'Zoho Books',
    'MS Excel',
  ],
  hr: [
    'Recruitment',
    'Onboarding',
    'Interview Coordination',
    'Employee Relations',
    'Payroll Processing',
    'Compliance',
    'HRMS',
    'Performance Management',
  ],
  operations: [
    'Inventory Management',
    'Vendor Management',
    'Procurement',
    'Logistics Coordination',
    'Scheduling',
    'Process Improvement',
    'Report Writing',
    'MS Excel',
  ],
  support: [
    'Customer Support',
    'Ticketing Systems',
    'CRM',
    'Email Communication',
    'Call Handling',
    'Problem Solving',
    'Conflict Resolution',
    'Follow-up',
  ],
  tools: [
    'Git',
    'GitHub',
    'GitLab',
    'VS Code',
    'Postman',
    'Docker',
    'Jira',
    'Notion',
    'Slack',
    'Linux',
  ],
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
    category: 'frontend',
    mandatory: ['JavaScript/TypeScript', 'React/Next.js/Vue/Angular', 'HTML', 'CSS'],
    required: ['Tailwind CSS/Bootstrap/Material UI', 'Redux', 'Git/GitHub', 'REST API'],
  },
  {
    id: 'backend_dev',
    label: 'Backend Developer',
    category: 'backend',
    mandatory: ['Node.js/Express/NestJS/Spring Boot/Laravel', 'MySQL/PostgreSQL/MongoDB'],
    required: ['REST API/GraphQL', 'Redis', 'Docker', 'Git'],
  },
  {
    id: 'python_dev',
    label: 'Python Developer',
    category: 'python',
    mandatory: ['Python', 'Django/Flask/FastAPI', 'MySQL/PostgreSQL'],
    required: ['REST API', 'Pandas/NumPy', 'PyTest', 'Git'],
  },
  {
    id: 'fullstack_dev',
    label: 'Full Stack Developer',
    category: 'frontend',
    mandatory: ['React/Vue/Angular', 'Node.js/Express/Django', 'MySQL/PostgreSQL'],
    required: ['TypeScript', 'REST API/GraphQL', 'Git', 'Docker'],
  },
  {
    id: 'data_analyst',
    label: 'Data Analyst',
    category: 'data',
    mandatory: ['SQL', 'MS Excel/Google Sheets', 'Power BI/Tableau'],
    required: ['Python', 'Data Cleaning', 'Statistics', 'Presentation Skills'],
  },
  {
    id: 'devops_engineer',
    label: 'DevOps Engineer',
    category: 'devops',
    mandatory: ['Linux', 'Docker', 'CI/CD'],
    required: ['Kubernetes', 'AWS/Azure/GCP', 'Terraform', 'Monitoring'],
  },
  {
    id: 'qa_engineer',
    label: 'QA Engineer',
    category: 'qa',
    mandatory: ['Manual Testing', 'Test Cases', 'API Testing'],
    required: ['Selenium/Cypress/Playwright', 'Bug Tracking', 'Postman', 'SQL'],
  },
  {
    id: 'uiux_designer',
    label: 'UI/UX Designer',
    category: 'design',
    mandatory: ['Figma', 'UI Design', 'Wireframing'],
    required: ['Prototyping', 'UX Research', 'Design Systems', 'Interaction Design'],
  },
  {
    id: 'product_manager',
    label: 'Product Manager',
    category: 'product',
    mandatory: ['Product Roadmapping', 'User Stories', 'Agile/Scrum'],
    required: ['Stakeholder Management', 'KPI Tracking', 'Market Research', 'Jira'],
  },
  {
    id: 'accountant',
    label: 'Accountant',
    category: 'accounting',
    mandatory: ['Bookkeeping', 'Financial Reporting', 'GST Filing/VAT', 'MS Excel'],
    required: ['Tally/QuickBooks/Zoho Books', 'Payroll', 'Bank Reconciliation', 'Tax Compliance'],
  },
  {
    id: 'hr_executive',
    label: 'HR Executive',
    category: 'hr',
    mandatory: ['Recruitment', 'Onboarding', 'Interview Coordination'],
    required: ['Employee Relations', 'Payroll Processing', 'Compliance', 'HRMS'],
  },
  {
    id: 'sales_executive',
    label: 'Sales Executive',
    category: 'sales',
    mandatory: ['Lead Generation', 'CRM', 'Negotiation'],
    required: ['B2B Sales/B2C Sales', 'Pipeline Management', 'Follow-up', 'Communication'],
  },
  {
    id: 'digital_marketer',
    label: 'Digital Marketer',
    category: 'marketing',
    mandatory: ['SEO', 'Social Media Marketing', 'Content Marketing'],
    required: ['SEM', 'Google Analytics', 'Email Marketing', 'Campaign Reporting'],
  },
  {
    id: 'operations_executive',
    label: 'Operations Executive',
    category: 'operations',
    mandatory: ['Inventory Management', 'Vendor Management', 'Scheduling'],
    required: ['Procurement', 'Logistics Coordination', 'MS Excel', 'Report Writing'],
  },
  {
    id: 'customer_support',
    label: 'Customer Support',
    category: 'support',
    mandatory: ['Customer Support', 'Email Communication', 'Problem Solving'],
    required: ['Ticketing Systems', 'CRM', 'Conflict Resolution', 'English'],
  },
  {
    id: 'office_staff',
    label: 'Office Staff',
    category: 'office',
    mandatory: ['MS Excel', 'MS Word', 'Email Communication'],
    required: ['PowerPoint', 'Scheduling', 'English/Hindi'],
  },
  {
    id: 'custom',
    label: 'Custom',
    category: 'custom',
    mandatory: [],
    required: [],
  },
];

const INDUSTRY_OPTIONS = [
  { id: 'all', label: 'All Industries' },
  { id: 'technology', label: 'Technology' },
  { id: 'finance_accounting', label: 'Finance & Accounting' },
  { id: 'sales_marketing', label: 'Sales & Marketing' },
  { id: 'people_hr', label: 'People / HR' },
  { id: 'design_product', label: 'Design & Product' },
  { id: 'operations_admin', label: 'Operations & Admin' },
  { id: 'support', label: 'Customer Support' },
];

const INDUSTRY_TEMPLATE_MAP = {
  technology: [
    'frontend_dev',
    'backend_dev',
    'python_dev',
    'fullstack_dev',
    'data_analyst',
    'devops_engineer',
    'qa_engineer',
  ],
  finance_accounting: ['accountant'],
  sales_marketing: ['sales_executive', 'digital_marketer'],
  people_hr: ['hr_executive'],
  design_product: ['uiux_designer', 'product_manager'],
  operations_admin: ['operations_executive', 'office_staff'],
  support: ['customer_support'],
};

const CATEGORY_LABELS = {
  frontend: 'Front End',
  backend: 'Back End',
  python: 'Python',
  database: 'Database',
  devops: 'DevOps',
  cloud: 'Cloud',
  mobile: 'Mobile',
  qa: 'QA',
  cybersecurity: 'Cybersecurity',
  data: 'Data',
  design: 'Design',
  product: 'Product',
  sales: 'Sales',
  marketing: 'Marketing',
  accounting: 'Accounting',
  hr: 'HR',
  operations: 'Operations',
  support: 'Support',
  tools: 'Tools',
  language: 'Language',
  office: 'Office',
  custom: 'Custom',
};

const RULE_OPTIONS = [
  { value: 'MANDATORY', label: 'Compulsory' },
  { value: 'FLEXIBLE', label: 'Flexible' },
];

const MATCH_OPTIONS = [
  { value: 'ANY', label: 'Any (OR)' },
  { value: 'ALL', label: 'All (AND)' },
];

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

function parseGroupSkills(value) {
  const rawValues = Array.isArray(value) ? value : String(value || '').split(',');
  const seen = new Set();
  const output = [];

  for (const raw of rawValues) {
    const options = String(raw || '')
      .split(/\s*(?:\/|\||\bor\b)\s*/i)
      .map((item) => item.trim())
      .filter(Boolean);

    for (const option of options) {
      const key = skillKey(option);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      output.push(option);
    }
  }

  return output;
}

function normalizeRequirementGroups(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((group) => {
      const ruleType =
        String(group?.ruleType || 'FLEXIBLE')
          .trim()
          .toUpperCase() === 'MANDATORY'
          ? 'MANDATORY'
          : 'FLEXIBLE';
      const matchType =
        String(group?.matchType || 'ANY')
          .trim()
          .toUpperCase() === 'ALL'
          ? 'ALL'
          : 'ANY';
      const category =
        String(group?.category || 'custom')
          .trim()
          .toLowerCase() || 'custom';
      const skills = parseGroupSkills(group?.skills);

      return {
        category,
        ruleType,
        matchType,
        skills,
      };
    })
    .filter(Boolean);
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
  requirementGroups,
  flexibleMatchThreshold,
  requiredDegree,
  minAge,
  maxAge,
  minExperienceYears,
  applicationDeadline,
  interviewDates,
  interviewStartTime,
  interviewCandidatesPerDay,
  onTitleChange,
  onLocationChange,
  onDescriptionChange,
  onMandatorySkillsChange,
  onRequiredSkillsChange,
  onRequirementGroupsChange,
  onFlexibleMatchThresholdChange,
  onRequiredDegreeChange,
  onMinAgeChange,
  onMaxAgeChange,
  onMinExperienceYearsChange,
  onApplicationDeadlineChange,
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
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState('backend_dev');
  const [selectedCategory, setSelectedCategory] = useState('backend');

  const filteredRoleTemplates = useMemo(() => {
    if (selectedIndustry === 'all') return ROLE_TEMPLATES;
    const allowedTemplateIds = new Set(INDUSTRY_TEMPLATE_MAP[selectedIndustry] || []);
    return ROLE_TEMPLATES.filter(
      (template) => template.id === 'custom' || allowedTemplateIds.has(template.id)
    );
  }, [selectedIndustry]);

  const selectedTemplate = useMemo(() => {
    return (
      filteredRoleTemplates.find((item) => item.id === selectedTemplateId) ||
      filteredRoleTemplates[0] ||
      ROLE_TEMPLATES.find((item) => item.id === 'custom') ||
      ROLE_TEMPLATES[0]
    );
  }, [filteredRoleTemplates, selectedTemplateId]);

  useEffect(() => {
    if (filteredRoleTemplates.some((item) => item.id === selectedTemplateId)) return;
    if (filteredRoleTemplates[0]?.id) {
      setSelectedTemplateId(filteredRoleTemplates[0].id);
    }
  }, [filteredRoleTemplates, selectedTemplateId]);

  useEffect(() => {
    const category = String(selectedTemplate?.category || '')
      .trim()
      .toLowerCase();
    if (category && SKILL_LIBRARY[category]) {
      setSelectedCategory(category);
    }
  }, [selectedTemplate]);

  const categorySkills = SKILL_LIBRARY[selectedCategory] || [];
  const normalizedRequirementGroups = useMemo(
    () => normalizeRequirementGroups(requirementGroups),
    [requirementGroups]
  );

  function commitRequirementGroups(nextGroups) {
    onRequirementGroupsChange(normalizeRequirementGroups(nextGroups));
  }

  function addRequirementGroup(initial = {}) {
    const next = [
      ...normalizedRequirementGroups,
      {
        category: String(initial.category || selectedCategory || 'custom').toLowerCase(),
        ruleType: initial.ruleType === 'MANDATORY' ? 'MANDATORY' : 'FLEXIBLE',
        matchType: initial.matchType === 'ALL' ? 'ALL' : 'ANY',
        skills: parseGroupSkills(initial.skills || ''),
      },
    ];
    commitRequirementGroups(next);
  }

  function updateRequirementGroup(index, patch) {
    const next = normalizedRequirementGroups.map((group, groupIndex) => {
      if (groupIndex !== index) return group;
      const rawRuleType = patch?.ruleType ?? group.ruleType;
      const rawMatchType = patch?.matchType ?? group.matchType;
      const rawCategory = patch?.category ?? group.category;
      const rawSkills = patch?.skills ?? group.skills;

      return {
        category: String(rawCategory || 'custom')
          .trim()
          .toLowerCase(),
        ruleType:
          String(rawRuleType || 'FLEXIBLE')
            .trim()
            .toUpperCase() === 'MANDATORY'
            ? 'MANDATORY'
            : 'FLEXIBLE',
        matchType:
          String(rawMatchType || 'ANY')
            .trim()
            .toUpperCase() === 'ALL'
            ? 'ALL'
            : 'ANY',
        skills: parseGroupSkills(rawSkills),
      };
    });
    commitRequirementGroups(next);
  }

  function removeRequirementGroup(index) {
    commitRequirementGroups(
      normalizedRequirementGroups.filter((_, groupIndex) => groupIndex !== index)
    );
  }

  function addSingleSkillGroup({ skill, ruleType, category }) {
    const nextGroups = [...normalizedRequirementGroups];
    const key = skillKey(skill);
    const existing = nextGroups.find((group) => {
      if (group.ruleType !== ruleType || group.matchType !== 'ANY' || group.skills.length !== 1) {
        return false;
      }
      return skillKey(group.skills[0]) === key;
    });
    if (existing) return;

    nextGroups.push({
      category: String(category || selectedCategory || 'custom').toLowerCase(),
      ruleType,
      matchType: 'ANY',
      skills: [skill],
    });
    commitRequirementGroups(nextGroups);
  }

  function applyTemplate(mode) {
    if (!selectedTemplate) return;
    const templateCategory = SKILL_LIBRARY[selectedTemplate.category]
      ? selectedTemplate.category
      : selectedCategory;

    const templateGroups = [
      ...(selectedTemplate.mandatory || []).map((skill) => ({
        category: templateCategory,
        ruleType: 'MANDATORY',
        matchType: 'ANY',
        skills: parseGroupSkills(skill),
      })),
      ...(selectedTemplate.required || []).map((skill) => ({
        category: templateCategory,
        ruleType: 'FLEXIBLE',
        matchType: 'ANY',
        skills: parseGroupSkills(skill),
      })),
    ];

    if (mode === 'replace') {
      onMandatorySkillsChange(toSkillsText(selectedTemplate.mandatory || []));
      onRequiredSkillsChange(toSkillsText(selectedTemplate.required || []));
      commitRequirementGroups(templateGroups);
      return;
    }

    onMandatorySkillsChange(mergeSkills(mandatorySkills, selectedTemplate.mandatory || []));
    onRequiredSkillsChange(mergeSkills(requiredSkills, selectedTemplate.required || []));
    commitRequirementGroups([...normalizedRequirementGroups, ...templateGroups]);
  }

  function addSkillToMandatory(skill) {
    onMandatorySkillsChange(mergeSkills(mandatorySkills, [skill]));
    addSingleSkillGroup({ skill, ruleType: 'MANDATORY', category: selectedCategory });
  }

  function addSkillToRequired(skill) {
    onRequiredSkillsChange(mergeSkills(requiredSkills, [skill]));
    addSingleSkillGroup({ skill, ruleType: 'FLEXIBLE', category: selectedCategory });
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
            Filter by industry, choose a role template, and quickly add skills by category.
          </p>

          <div className="mt-3 grid gap-2 md:grid-cols-[220px_1fr_auto_auto_auto]">
            <select
              value={selectedIndustry}
              onChange={(event) => setSelectedIndustry(event.target.value)}
              className="select-field border-slate-300 bg-white text-slate-900 shadow-sm"
            >
              {INDUSTRY_OPTIONS.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.label}
                </option>
              ))}
            </select>
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="select-field border-slate-300 bg-white text-slate-900 shadow-sm"
            >
              {filteredRoleTemplates.map((template) => (
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
                onRequirementGroupsChange([]);
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

        <div className="sm:col-span-2 rounded-xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-sky-50/40 p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Advanced Requirement Groups</p>
              <p className="mt-1 text-xs text-slate-600">
                Build requirement groups with category, rule type, and ANY/ALL matching.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-soft border-slate-300 bg-white px-3 py-1.5 text-xs"
                onClick={() => addRequirementGroup({ ruleType: 'MANDATORY', matchType: 'ANY' })}
              >
                + Compulsory Group
              </button>
              <button
                type="button"
                className="btn-soft border-slate-300 bg-white px-3 py-1.5 text-xs"
                onClick={() => addRequirementGroup({ ruleType: 'FLEXIBLE', matchType: 'ANY' })}
              >
                + Flexible Group
              </button>
            </div>
          </div>

          {normalizedRequirementGroups.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white/80 px-3 py-2 text-xs text-slate-600">
              No groups yet. Add groups above, or keep using the basic compulsory/flexible skills
              fields.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {normalizedRequirementGroups.map((group, index) => (
                <div
                  key={`group-${index}`}
                  className="grid gap-2 rounded-lg border border-slate-300 bg-white p-2 md:grid-cols-[150px_130px_140px_1fr_auto]"
                >
                  <select
                    value={group.ruleType}
                    onChange={(event) =>
                      updateRequirementGroup(index, { ruleType: event.target.value })
                    }
                    className="select-field border-slate-300 bg-white text-slate-900 text-xs shadow-sm"
                  >
                    {RULE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={group.matchType}
                    onChange={(event) =>
                      updateRequirementGroup(index, { matchType: event.target.value })
                    }
                    className="select-field border-slate-300 bg-white text-slate-900 text-xs shadow-sm"
                  >
                    {MATCH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={group.category}
                    onChange={(event) =>
                      updateRequirementGroup(index, { category: event.target.value })
                    }
                    className="select-field border-slate-300 bg-white text-slate-900 text-xs shadow-sm"
                  >
                    {Object.keys(CATEGORY_LABELS).map((categoryKey) => (
                      <option key={categoryKey} value={categoryKey}>
                        {CATEGORY_LABELS[categoryKey]}
                      </option>
                    ))}
                  </select>
                  <input
                    value={Array.isArray(group.skills) ? group.skills.join(', ') : ''}
                    onChange={(event) =>
                      updateRequirementGroup(index, { skills: event.target.value })
                    }
                    placeholder="eg: Node.js, Express, Django"
                    className="input-field border-slate-300 bg-white text-slate-900 text-xs shadow-sm"
                  />
                  <button
                    type="button"
                    className="btn-danger px-3 py-1.5 text-xs"
                    onClick={() => removeRequirementGroup(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className={sectionLabelClass}>Flexible Match Threshold % (optional)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={flexibleMatchThreshold}
            onChange={(event) => onFlexibleMatchThresholdChange(event.target.value)}
            className={fieldClass}
            placeholder="eg: 40 (blank uses admin default)"
          />
          <span className="text-xs text-slate-500">
            Blank uses the admin global default threshold.
          </span>
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
          <span className={sectionLabelClass}>Application Deadline (required)</span>
          <input
            type="datetime-local"
            value={applicationDeadline}
            onChange={(event) => onApplicationDeadlineChange(event.target.value)}
            className={fieldClass}
            required
          />
          <span className="text-xs text-slate-500">
            Applications close automatically at this date/time.
          </span>
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
