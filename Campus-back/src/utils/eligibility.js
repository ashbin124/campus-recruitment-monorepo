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

function evaluateSkillGroups(groups, matcher) {
  const matchedSkills = [];
  const missingSkills = [];
  let matchedGroupCount = 0;

  for (const group of groups) {
    const matchedOption = group.options.find((skill) => matcher(skill));

    if (matchedOption) {
      matchedSkills.push(matchedOption);
      matchedGroupCount += 1;
      continue;
    }

    missingSkills.push(
      group.options.length > 1 ? `(${group.options.join(' or ')})` : group.options[0]
    );
  }

  return {
    matchedSkills: dedupeSkills(matchedSkills),
    missingSkills,
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

export function evaluateJobEligibility({ job, student, resumeText }) {
  const mandatorySkillGroups = buildMandatorySkillGroups(job?.mandatorySkills || []);
  const requiredSkillGroups = buildRequiredSkillGroups(job?.requiredSkills || []);
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

  const mandatoryMatch = evaluateSkillGroups(mandatorySkillGroups, skillMatcher);
  const requiredMatch = evaluateSkillGroups(requiredSkillGroups, skillMatcher);

  const matchedSkills = dedupeSkills([
    ...mandatoryMatch.matchedSkills,
    ...requiredMatch.matchedSkills,
  ]);
  const missingSkills = [...mandatoryMatch.missingSkills, ...requiredMatch.missingSkills];
  const totalSkillGroups = mandatorySkillGroups.length + requiredSkillGroups.length;
  const matchedSkillGroupCount = mandatoryMatch.matchedGroupCount + requiredMatch.matchedGroupCount;

  const degreeMatched = requiredDegree ? degreeText.includes(normalizeLower(requiredDegree)) : true;

  const reasons = [];

  if (mandatorySkillGroups.length && mandatoryMatch.missingSkills.length) {
    reasons.push(`Missing compulsory skills: ${mandatoryMatch.missingSkills.join(', ')}`);
  }

  if (requiredSkillGroups.length && requiredMatch.missingSkills.length) {
    reasons.push(`Missing required skills: ${requiredMatch.missingSkills.join(', ')}`);
  }

  if (requiredDegree && !degreeMatched) {
    reasons.push(`Required degree "${requiredDegree}" not found`);
  }

  if (minAge != null && (ageValue == null || ageValue < minAge)) {
    reasons.push(`Minimum age requirement is ${minAge}`);
  }

  if (maxAge != null && (ageValue == null || ageValue > maxAge)) {
    reasons.push(`Maximum age requirement is ${maxAge}`);
  }

  if (
    minExperienceYears != null &&
    (experienceYears == null || experienceYears < minExperienceYears)
  ) {
    reasons.push(`Minimum experience requirement is ${minExperienceYears} year(s)`);
  }

  let score = 0;

  if (totalSkillGroups > 0) {
    score += Math.round((matchedSkillGroupCount / totalSkillGroups) * 70);
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

  if (totalSkillGroups > 0 && resumeLower) {
    const allSkillGroups = [...mandatorySkillGroups, ...requiredSkillGroups];
    const resumeMatches = allSkillGroups.filter((group) =>
      group.options.some((skill) => matchesSkillInResume(skill, resumeLower, resumeSkillKeyText))
    ).length;
    score += Math.min(10, Math.round((resumeMatches / allSkillGroups.length) * 10));
  }

  score = Math.max(0, Math.min(100, score));

  return {
    eligible: reasons.length === 0,
    reasons,
    score,
    matchedSkills,
    missingSkills,
    details: {
      mandatorySkills: mandatorySkillGroups.map((group) =>
        group.options.length > 1 ? group.options.join(' or ') : group.options[0]
      ),
      mandatorySkillGroups: mandatorySkillGroups.map((group) => [...group.options]),
      requiredSkills: requiredSkillGroups.map((group) =>
        group.options.length > 1 ? group.options.join(' or ') : group.options[0]
      ),
      requiredSkillGroups: requiredSkillGroups.map((group) => [...group.options]),
      requiredDegree,
      minAge,
      maxAge,
      minExperienceYears,
      ageValue,
      experienceYears,
      degreeMatched,
    },
  };
}
