function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeLower(value) {
  return normalizeString(value).toLowerCase();
}

function normalizeSkills(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => normalizeLower(item))
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);
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
  const requiredSkills = normalizeSkills(job?.requiredSkills || []);
  const profileSkills = normalizeSkills(student?.skills || []);

  const requiredDegree = normalizeString(job?.requiredDegree);
  const minAge = parseNumber(job?.minAge);
  const maxAge = parseNumber(job?.maxAge);
  const minExperienceYears = parseNumber(job?.minExperienceYears);

  const resumeLower = normalizeLower(resumeText);
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

  const matchedSkills = requiredSkills.filter(
    (skill) => profileSkills.includes(skill) || resumeLower.includes(skill)
  );

  const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));
  const degreeMatched = requiredDegree ? degreeText.includes(normalizeLower(requiredDegree)) : true;

  const reasons = [];

  if (requiredSkills.length && missingSkills.length) {
    reasons.push(`Missing required skills: ${missingSkills.join(', ')}`);
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

  if (requiredSkills.length > 0) {
    score += Math.round((matchedSkills.length / requiredSkills.length) * 70);
  } else {
    score += Math.min(profileSkills.length * 5, 25);
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

  if (requiredSkills.length > 0 && resumeLower) {
    const resumeMatches = requiredSkills.filter((skill) => resumeLower.includes(skill)).length;
    score += Math.min(10, Math.round((resumeMatches / requiredSkills.length) * 10));
  }

  score = Math.max(0, Math.min(100, score));

  return {
    eligible: reasons.length === 0,
    reasons,
    score,
    matchedSkills,
    missingSkills,
    details: {
      requiredSkills,
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
