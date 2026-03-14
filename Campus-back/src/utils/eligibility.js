import {
  clampPercentage,
  DEFAULT_GLOBAL_FLEXIBLE_THRESHOLD,
  DEFAULT_NEAR_MATCH_WINDOW,
} from './platformSettings.js';

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeLower(value) {
  return normalizeString(value).toLowerCase();
}

function toSkillKey(value) {
  return normalizeLower(value).replace(/[^a-z0-9]+/g, '');
}

function dedupeSkills(values) {
  if (!Array.isArray(values)) return [];

  const seen = new Set();
  const output = [];
  for (const item of values) {
    const label = normalizeString(item);
    const key = toSkillKey(label);
    if (!label || !key || seen.has(key)) continue;
    seen.add(key);
    output.push(label);
  }
  return output;
}

function normalizeProfileSkillKeys(values) {
  const keys = new Set();
  if (!Array.isArray(values)) return keys;

  for (const value of values) {
    const key = toSkillKey(value);
    if (key) keys.add(key);
  }
  return keys;
}

const BACKEND_FRAMEWORK_KEYS = new Set([
  'django',
  'express',
  'nodejs',
  'nestjs',
  'flask',
  'fastapi',
  'spring',
  'springboot',
  'laravel',
  'rubyonrails',
  'rails',
  'aspnet',
  'adonisjs',
  'koa',
  'hapi',
]);

const DATABASE_KEYS = new Set([
  'mysql',
  'postgresql',
  'postgres',
  'mariadb',
  'mongodb',
  'sqlite',
  'redis',
  'oracle',
  'mssql',
  'sqlserver',
  'cassandra',
  'dynamodb',
  'firebase',
]);

function detectSkillFamily(skill) {
  const key = toSkillKey(skill);
  if (!key) return null;
  if (BACKEND_FRAMEWORK_KEYS.has(key)) return 'backend_framework';
  if (DATABASE_KEYS.has(key)) return 'database';
  return null;
}

function parseSkillAlternatives(value) {
  const source = normalizeString(value);
  if (!source) return [];
  return dedupeSkills(source.split(/\s*(?:\/|\||\bor\b)\s*/i));
}

function parseCommaSkills(value) {
  const rawValues = Array.isArray(value) ? value : String(value || '').split(',');
  return dedupeSkills(rawValues);
}

function buildMandatorySkillGroups(rawSkills) {
  const groups = [];

  for (const rawSkill of Array.isArray(rawSkills) ? rawSkills : []) {
    const alternatives = parseSkillAlternatives(rawSkill);
    if (!alternatives.length) continue;
    groups.push({ options: alternatives });
  }

  return groups;
}

function buildRequiredSkillGroups(rawSkills) {
  const parsedEntries = [];
  const familyCounts = new Map();

  for (const rawSkill of Array.isArray(rawSkills) ? rawSkills : []) {
    const alternatives = parseSkillAlternatives(rawSkill);
    if (!alternatives.length) continue;

    if (alternatives.length > 1) {
      parsedEntries.push({ type: 'group', options: alternatives });
      continue;
    }

    const singleSkill = alternatives[0];
    const family = detectSkillFamily(singleSkill);
    parsedEntries.push({ type: 'single', skill: singleSkill, family });
    if (family) {
      familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
    }
  }

  const groupedFamilySkills = new Map();
  for (const entry of parsedEntries) {
    if (entry.type !== 'single') continue;
    if (!entry.family) continue;
    if ((familyCounts.get(entry.family) || 0) <= 1) continue;

    if (!groupedFamilySkills.has(entry.family)) {
      groupedFamilySkills.set(entry.family, []);
    }
    groupedFamilySkills.get(entry.family).push(entry.skill);
  }

  for (const [family, skills] of groupedFamilySkills.entries()) {
    groupedFamilySkills.set(family, dedupeSkills(skills));
  }

  const emittedFamilies = new Set();
  const groups = [];

  for (const entry of parsedEntries) {
    if (entry.type === 'group') {
      groups.push({ options: entry.options });
      continue;
    }

    if (!entry.family || (familyCounts.get(entry.family) || 0) <= 1) {
      groups.push({ options: [entry.skill] });
      continue;
    }

    if (emittedFamilies.has(entry.family)) continue;
    emittedFamilies.add(entry.family);

    const familyGroup = groupedFamilySkills.get(entry.family) || [entry.skill];
    groups.push({ options: familyGroup });
  }

  return groups;
}

export function normalizeRequirementGroups(rawGroups) {
  if (!Array.isArray(rawGroups)) return [];

  const output = [];

  for (const rawGroup of rawGroups) {
    if (!rawGroup || typeof rawGroup !== 'object') continue;

    const rawRuleType = String(rawGroup.ruleType || 'FLEXIBLE')
      .trim()
      .toUpperCase();
    const ruleType = rawRuleType === 'MANDATORY' ? 'MANDATORY' : 'FLEXIBLE';

    const rawMatchType = String(rawGroup.matchType || 'ANY')
      .trim()
      .toUpperCase();
    const matchType = rawMatchType === 'ALL' ? 'ALL' : 'ANY';

    const category = normalizeLower(rawGroup.category || 'custom') || 'custom';

    const baseSkills = parseCommaSkills(rawGroup.skills);
    const expandedSkills = [];
    for (const skill of baseSkills) {
      const alternatives = parseSkillAlternatives(skill);
      if (alternatives.length > 1 && matchType === 'ANY') {
        expandedSkills.push(...alternatives);
      } else {
        expandedSkills.push(...alternatives);
      }
    }

    const skills = dedupeSkills(expandedSkills);
    if (!skills.length) continue;

    output.push({
      category,
      ruleType,
      matchType,
      skills,
    });
  }

  return output;
}

function buildLegacyRequirementGroups(job) {
  const mandatorySkillGroups = buildMandatorySkillGroups(job?.mandatorySkills || []);
  const requiredSkillGroups = buildRequiredSkillGroups(job?.requiredSkills || []);

  const legacyMandatoryGroups = mandatorySkillGroups.map((group) => ({
    category: 'custom',
    ruleType: 'MANDATORY',
    matchType: 'ANY',
    skills: dedupeSkills(group.options || []),
  }));

  const legacyFlexibleGroups = requiredSkillGroups.map((group) => ({
    category: 'custom',
    ruleType: 'FLEXIBLE',
    matchType: 'ANY',
    skills: dedupeSkills(group.options || []),
  }));

  return [...legacyMandatoryGroups, ...legacyFlexibleGroups].filter((group) => group.skills.length);
}

function getEffectiveRequirementGroups(job) {
  const normalizedGroups = normalizeRequirementGroups(job?.requirementGroups);
  if (normalizedGroups.length) return normalizedGroups;
  return buildLegacyRequirementGroups(job);
}

function evaluateRequirementGroups(groups, matcher) {
  const matchedSkills = [];
  const missingGroups = [];
  let matchedGroupCount = 0;

  for (const group of groups) {
    const matchedInGroup = group.skills.filter((skill) => matcher(skill));
    const isMatched =
      group.matchType === 'ALL'
        ? matchedInGroup.length === group.skills.length
        : matchedInGroup.length > 0;

    if (isMatched) {
      matchedGroupCount += 1;
      if (group.matchType === 'ALL') {
        matchedSkills.push(...matchedInGroup);
      } else if (matchedInGroup[0]) {
        matchedSkills.push(matchedInGroup[0]);
      }
      continue;
    }

    if (group.matchType === 'ALL') {
      const missingAll = group.skills.filter((skill) => !matchedInGroup.includes(skill));
      missingGroups.push(`[ALL] ${missingAll.join(' + ')}`);
    } else {
      missingGroups.push(`(${group.skills.join(' or ')})`);
    }
  }

  return {
    matchedSkills: dedupeSkills(matchedSkills),
    missingGroups,
    matchedGroupCount,
  };
}

function matchesSkillInResume(skill, resumeLower, resumeSkillKeyText) {
  const normalizedSkill = normalizeLower(skill);
  const skillKey = toSkillKey(skill);
  if (!skillKey) return false;

  return (
    (normalizedSkill && resumeLower.includes(normalizedSkill)) ||
    (resumeSkillKeyText && resumeSkillKeyText.includes(skillKey))
  );
}

function matchesSkill({ skill, profileSkillKeys, resumeLower, resumeSkillKeyText }) {
  const skillKey = toSkillKey(skill);
  if (!skillKey) return false;

  if (profileSkillKeys.has(skillKey)) return true;
  return matchesSkillInResume(skill, resumeLower, resumeSkillKeyText);
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractExperienceYears(text) {
  const source = normalizeLower(text);
  if (!source) return null;

  const pattern = /(\d{1,2})\s*\+?\s*(years?|yrs?)/gi;
  let maxYears = null;
  let match = pattern.exec(source);
  while (match) {
    const years = Number.parseInt(match[1], 10);
    if (Number.isFinite(years)) {
      maxYears = maxYears == null ? years : Math.max(maxYears, years);
    }
    match = pattern.exec(source);
  }
  return maxYears;
}

function extractAge(text) {
  const source = normalizeLower(text);
  if (!source) return null;

  const explicit = source.match(/\bage\s*[:=-]?\s*(\d{1,2})\b/i);
  if (explicit?.[1]) {
    const age = Number.parseInt(explicit[1], 10);
    return Number.isFinite(age) ? age : null;
  }

  return null;
}

function evaluateResumeQuality(resumeText, student) {
  const source = String(resumeText || '').trim();
  const lower = source.toLowerCase();
  const reasons = [];
  const advisories = [];
  const profileSkillKeys = normalizeProfileSkillKeys(student?.skills || []);
  const hasProfileSkills = profileSkillKeys.size > 0;
  const hasProfileDegreeInfo = Boolean(normalizeString(student?.degree || student?.education));
  const hasProfileExperienceInfo = Boolean(
    normalizeString(student?.experience) || parseNumber(student?.experienceYears) != null
  );
  const hasProfileSignal = hasProfileSkills || hasProfileDegreeInfo || hasProfileExperienceInfo;

  if (!source) {
    advisories.push(
      'Resume text could not be read clearly. Use a text-based PDF for better automatic checks.'
    );
    if (!hasProfileSignal) {
      reasons.push(
        'Add at least skills, education, or experience details in profile/resume for verification.'
      );
    }
  } else if (source.length < 80) {
    if (hasProfileSignal) {
      advisories.push(
        'Resume content looks short. Add clear skills, education, or experience details for better ranking.'
      );
    } else {
      reasons.push(
        'Resume content is too short. Add clear skills, education, or experience details.'
      );
    }
  }

  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(source);
  const hasPhone = /\b(?:\+?\d{1,3}[\s-]?)?(?:\d[\s-]?){8,14}\b/.test(source);
  if (!hasEmail && !hasPhone) {
    advisories.push('Consider adding contact details (email or phone) inside the CV.');
  }

  const hasSkillsSection = /\b(skills?|technical|technology|stack|tooling|tools?)\b/i.test(lower);
  const hasEducation =
    /\b(education|degree|bachelor|master|diploma|university|college|b\.?tech)\b/i.test(lower);
  const hasExperience = /\b(experience|employment|worked|internship|project|projects)\b/i.test(
    lower
  );

  if (source && !hasSkillsSection && !hasEducation && !hasExperience) {
    if (hasProfileSignal) {
      advisories.push(
        'Resume structure looks unclear. Add dedicated sections for skills, education, or experience.'
      );
    } else {
      reasons.push('Resume should include at least skills or education/experience details.');
    }
  }

  if (source) {
    if (!hasSkillsSection) {
      advisories.push('Consider adding a dedicated skills section for better matching.');
    }
    if (!hasEducation && !hasExperience) {
      advisories.push('Consider adding education or experience details.');
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
    advisories,
  };
}

function formatGroup(group) {
  if (group.matchType === 'ALL') return `[ALL] ${group.skills.join(' + ')}`;
  return group.skills.length > 1 ? group.skills.join(' or ') : group.skills[0];
}

export function evaluateJobEligibility({
  job,
  student,
  resumeText,
  defaultFlexibleThresholdPercent = DEFAULT_GLOBAL_FLEXIBLE_THRESHOLD,
  nearMatchWindowPercent = DEFAULT_NEAR_MATCH_WINDOW,
  enforceResumeQuality = false,
} = {}) {
  const requirementGroups = getEffectiveRequirementGroups(job);
  const mandatoryGroups = requirementGroups.filter((group) => group.ruleType === 'MANDATORY');
  const flexibleGroups = requirementGroups.filter((group) => group.ruleType !== 'MANDATORY');

  const profileSkillKeys = normalizeProfileSkillKeys(student?.skills || []);

  const requiredDegree = normalizeString(job?.requiredDegree);
  const minAge = parseNumber(job?.minAge);
  const maxAge = parseNumber(job?.maxAge);
  const minExperienceYears = parseNumber(job?.minExperienceYears);

  const resumeLower = normalizeLower(resumeText);
  const resumeSkillKeyText = toSkillKey(resumeText);
  const degreeText = [
    normalizeLower(student?.degree),
    normalizeLower(student?.education),
    resumeLower,
  ]
    .filter(Boolean)
    .join(' ');

  const ageFromProfile = parseNumber(student?.age);
  const ageFromResume = extractAge(resumeText);
  const ageValue = ageFromProfile ?? ageFromResume;

  const experienceFromProfile = parseNumber(student?.experienceYears);
  const experienceFromText = extractExperienceYears(
    `${student?.experience || ''} ${resumeText || ''}`
  );
  const experienceYears = experienceFromProfile ?? experienceFromText;

  const skillMatcher = (skill) =>
    matchesSkill({
      skill,
      profileSkillKeys,
      resumeLower,
      resumeSkillKeyText,
    });

  const mandatoryMatch = evaluateRequirementGroups(mandatoryGroups, skillMatcher);
  const flexibleMatch = evaluateRequirementGroups(flexibleGroups, skillMatcher);

  const matchedSkills = dedupeSkills([
    ...mandatoryMatch.matchedSkills,
    ...flexibleMatch.matchedSkills,
  ]);
  const missingSkills = [...mandatoryMatch.missingGroups, ...flexibleMatch.missingGroups];

  const totalFlexibleGroups = flexibleGroups.length;
  const matchedFlexibleGroups = flexibleMatch.matchedGroupCount;
  const flexibleMatchPercent =
    totalFlexibleGroups > 0 ? Math.round((matchedFlexibleGroups / totalFlexibleGroups) * 100) : 100;

  const effectiveFlexibleThresholdPercent = clampPercentage(
    job?.flexibleMatchThreshold,
    clampPercentage(defaultFlexibleThresholdPercent, DEFAULT_GLOBAL_FLEXIBLE_THRESHOLD)
  );

  const degreeMatched = requiredDegree ? degreeText.includes(normalizeLower(requiredDegree)) : true;

  const hardReasons = [];
  const advisories = [];

  if (mandatoryGroups.length && mandatoryMatch.missingGroups.length) {
    hardReasons.push(`Missing compulsory skills: ${mandatoryMatch.missingGroups.join(', ')}`);
  }

  if (flexibleGroups.length && flexibleMatch.missingGroups.length) {
    advisories.push(`Missing flexible skills: ${flexibleMatch.missingGroups.join(', ')}`);
  }

  if (requiredDegree && !degreeMatched) {
    hardReasons.push(`Required degree "${requiredDegree}" not found`);
  }

  if (minAge != null && (ageValue == null || ageValue < minAge)) {
    hardReasons.push(`Minimum age requirement is ${minAge}`);
  }

  if (maxAge != null && (ageValue == null || ageValue > maxAge)) {
    hardReasons.push(`Maximum age requirement is ${maxAge}`);
  }

  if (
    minExperienceYears != null &&
    (experienceYears == null || experienceYears < minExperienceYears)
  ) {
    hardReasons.push(`Minimum experience requirement is ${minExperienceYears} year(s)`);
  }

  const resumeQuality = evaluateResumeQuality(resumeText, student);
  if (enforceResumeQuality) {
    if (!resumeQuality.passed) {
      hardReasons.push(...resumeQuality.reasons.map((reason) => `Resume quality: ${reason}`));
    }
    if (resumeQuality.advisories.length) {
      advisories.push(...resumeQuality.advisories.map((reason) => `Resume note: ${reason}`));
    }
  }

  const hardEligible = hardReasons.length === 0;
  const flexibleEligible =
    totalFlexibleGroups === 0 || flexibleMatchPercent >= effectiveFlexibleThresholdPercent;
  const eligible = hardEligible && flexibleEligible;

  const reasons = [...hardReasons];
  if (hardEligible && !flexibleEligible) {
    reasons.push(
      `Flexible skill match is ${flexibleMatchPercent}%. Required minimum is ${effectiveFlexibleThresholdPercent}%.`
    );
  }

  const nearWindow = clampPercentage(nearMatchWindowPercent, DEFAULT_NEAR_MATCH_WINDOW);
  const nearLowerBound = Math.max(0, effectiveFlexibleThresholdPercent - nearWindow);
  const nearMatch = !eligible && hardEligible && flexibleMatchPercent >= nearLowerBound;

  const tier = eligible ? 'ELIGIBLE' : nearMatch ? 'NEAR_MATCH' : 'NOT_ELIGIBLE';

  let score = 0;

  if (requirementGroups.length > 0) {
    const matchedGroupCount = mandatoryMatch.matchedGroupCount + flexibleMatch.matchedGroupCount;
    score += Math.round((matchedGroupCount / requirementGroups.length) * 70);
  } else {
    score += Math.min(profileSkillKeys.size * 5, 25);
  }

  if (minExperienceYears != null) {
    if (experienceYears != null) {
      const baseline = experienceYears >= minExperienceYears ? 10 : 0;
      const bonus = Math.max(0, experienceYears - minExperienceYears) * 2;
      score += Math.min(15, baseline + bonus);
    }
  } else if (experienceYears != null) {
    score += Math.min(15, experienceYears * 2);
  }

  if (requiredDegree) {
    score += degreeMatched ? 10 : 0;
  } else if (normalizeString(student?.degree)) {
    score += 5;
  }

  if ((minAge != null || maxAge != null) && ageValue != null) {
    score += 5;
  }

  if (requirementGroups.length > 0 && resumeLower) {
    const resumeMatches = requirementGroups.filter((group) =>
      group.skills.some((skill) => matchesSkillInResume(skill, resumeLower, resumeSkillKeyText))
    ).length;
    score += Math.min(10, Math.round((resumeMatches / requirementGroups.length) * 10));
  }

  score = Math.max(0, Math.min(100, score));

  return {
    eligible,
    nearMatch,
    tier,
    hardEligible,
    flexibleEligible,
    reasons,
    advisories,
    score,
    matchedSkills,
    missingSkills,
    flexibleMatchPercent,
    effectiveFlexibleThresholdPercent,
    details: {
      requirementGroups,
      mandatorySkills: mandatoryGroups.map((group) => formatGroup(group)),
      mandatorySkillGroups: mandatoryGroups.map((group) => [...group.skills]),
      requiredSkills: flexibleGroups.map((group) => formatGroup(group)),
      requiredSkillGroups: flexibleGroups.map((group) => [...group.skills]),
      mandatoryGroups: mandatoryGroups.map((group) => ({
        ...group,
        label: formatGroup(group),
      })),
      flexibleGroups: flexibleGroups.map((group) => ({
        ...group,
        label: formatGroup(group),
      })),
      requiredDegree,
      minAge,
      maxAge,
      minExperienceYears,
      ageValue,
      experienceYears,
      degreeMatched,
      missingMandatorySkills: [...mandatoryMatch.missingGroups],
      missingFlexibleSkills: [...flexibleMatch.missingGroups],
      missingRequiredSkills: [...flexibleMatch.missingGroups],
      matchedMandatoryGroups: mandatoryMatch.matchedGroupCount,
      totalMandatoryGroups: mandatoryGroups.length,
      matchedFlexibleGroups,
      totalFlexibleGroups,
      flexibleMatchPercent,
      effectiveFlexibleThresholdPercent,
      resumeQuality,
    },
  };
}
