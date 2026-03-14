import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateJobEligibility } from '../src/utils/eligibility.js';

test('evaluateJobEligibility passes when all hard requirements are met', () => {
  const result = evaluateJobEligibility({
    job: {
      requiredSkills: ['React', 'Node.js'],
      requiredDegree: 'Computer Science',
      minAge: 21,
      maxAge: 30,
      minExperienceYears: 2,
    },
    student: {
      skills: ['React', 'Node.js', 'PostgreSQL'],
      degree: 'B.Tech Computer Science',
      age: 24,
      experienceYears: 3,
    },
    resumeText: 'Built React dashboards and Node.js APIs for campus placement workflows.',
  });

  assert.equal(result.eligible, true);
  assert.equal(result.reasons.length, 0);
  assert.ok(result.score >= 70);
});

test('evaluateJobEligibility allows apply when only flexible skills are missing', () => {
  const result = evaluateJobEligibility({
    job: {
      requiredSkills: ['React', 'Node.js'],
    },
    student: {
      skills: ['React'],
    },
    resumeText: 'Strong frontend background',
  });

  assert.equal(result.eligible, true);
  assert.equal(result.reasons.length, 0);
  assert.ok(result.advisories.some((item) => item.includes('Missing flexible skills')));
  assert.ok(result.missingSkills.some((item) => item.includes('Node.js')));
});

test('evaluateJobEligibility uses experience years for ranking score', () => {
  const basePayload = {
    job: {
      requiredSkills: ['React'],
      minExperienceYears: 1,
    },
    student: {
      skills: ['React'],
    },
  };

  const lower = evaluateJobEligibility({
    ...basePayload,
    student: {
      ...basePayload.student,
      experienceYears: 1,
    },
    resumeText: 'React projects',
  });

  const higher = evaluateJobEligibility({
    ...basePayload,
    student: {
      ...basePayload.student,
      experienceYears: 5,
    },
    resumeText: 'React projects and team leadership',
  });

  assert.equal(lower.eligible, true);
  assert.equal(higher.eligible, true);
  assert.ok(higher.score >= lower.score);
});

test('evaluateJobEligibility supports explicit one-of skill groups', () => {
  const result = evaluateJobEligibility({
    job: {
      requiredSkills: ['django/express/node js', 'mysql/postgresql'],
    },
    student: {
      skills: ['Express', 'PostgreSQL'],
    },
    resumeText: 'Built APIs and data models for internal tooling.',
  });

  assert.equal(result.eligible, true);
  assert.equal(result.reasons.length, 0);
});

test('evaluateJobEligibility treats backend frameworks and databases as alternatives', () => {
  const result = evaluateJobEligibility({
    job: {
      requiredSkills: ['django', 'express', 'node js', 'mysql', 'postgresql'],
    },
    student: {
      skills: ['node.js', 'mysql'],
    },
    resumeText: 'Node.js backend with MySQL in production.',
  });

  assert.equal(result.eligible, true);
  assert.equal(result.reasons.length, 0);
});

test('evaluateJobEligibility treats unmatched flexible skills as ranking gaps only', () => {
  const result = evaluateJobEligibility({
    job: {
      requiredSkills: ['React', 'TypeScript', 'Redux'],
    },
    student: {
      skills: ['React', 'TypeScript'],
    },
    resumeText: 'Built dashboards with React and TypeScript.',
  });

  assert.equal(result.eligible, true);
  assert.equal(result.reasons.length, 0);
  assert.ok(result.advisories.some((item) => item.includes('Missing flexible skills')));
  assert.ok(result.missingSkills.some((item) => item.includes('Redux')));
});

test('evaluateJobEligibility blocks apply when flexible match percent is below threshold', () => {
  const result = evaluateJobEligibility({
    job: {
      requiredSkills: ['React', 'TypeScript', 'Redux', 'Node.js', 'PostgreSQL'],
      flexibleMatchThreshold: 40,
    },
    student: {
      skills: ['React'],
    },
    resumeText: 'React profile',
  });

  assert.equal(result.eligible, false);
  assert.equal(result.flexibleMatchPercent, 20);
  assert.equal(result.effectiveFlexibleThresholdPercent, 40);
  assert.ok(result.reasons.some((item) => item.includes('Flexible skill match is 20%')));
  assert.equal(result.nearMatch, false);
});

test('evaluateJobEligibility supports advanced requirement groups with ALL and ANY rules', () => {
  const result = evaluateJobEligibility({
    job: {
      requirementGroups: [
        {
          category: 'tools',
          ruleType: 'MANDATORY',
          matchType: 'ALL',
          skills: ['Git', 'Communication'],
        },
        {
          category: 'backend',
          ruleType: 'FLEXIBLE',
          matchType: 'ANY',
          skills: ['Django', 'Express'],
        },
        {
          category: 'database',
          ruleType: 'FLEXIBLE',
          matchType: 'ANY',
          skills: ['MySQL', 'PostgreSQL'],
        },
      ],
      flexibleMatchThreshold: 50,
    },
    student: {
      skills: ['Git', 'Communication', 'Express', 'PostgreSQL'],
    },
    resumeText: 'Worked with Git, Express and PostgreSQL in production systems.',
  });

  assert.equal(result.eligible, true);
  assert.equal(result.reasons.length, 0);
  assert.equal(result.flexibleMatchPercent, 100);
});

test('evaluateJobEligibility enforces mandatory skills separately', () => {
  const result = evaluateJobEligibility({
    job: {
      mandatorySkills: ['Git', 'Communication'],
      requiredSkills: ['django/express/node js', 'mysql/postgresql'],
    },
    student: {
      skills: ['Express', 'PostgreSQL', 'Git'],
    },
    resumeText: 'Built APIs using Express and PostgreSQL.',
  });

  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((item) => item.includes('Missing compulsory skills')));
});

test('evaluateJobEligibility does not hard block when resume text is unreadable but profile has signal', () => {
  const result = evaluateJobEligibility({
    job: {
      requiredSkills: ['React'],
    },
    student: {
      skills: ['React'],
    },
    resumeText: '',
    enforceResumeQuality: true,
  });

  assert.equal(result.eligible, true);
  assert.ok(result.advisories.some((item) => item.includes('Resume note:')));
});

test('evaluateJobEligibility blocks when both resume and profile have no verifiable details', () => {
  const result = evaluateJobEligibility({
    job: {},
    student: {
      skills: [],
      education: '',
      experience: '',
    },
    resumeText: '',
    enforceResumeQuality: true,
  });

  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((item) => item.includes('Resume quality:')));
});
