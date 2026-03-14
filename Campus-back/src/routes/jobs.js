import express from 'express';
import { z } from 'zod';
import prisma from '../connection/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { evaluateJobEligibility, normalizeRequirementGroups } from '../utils/eligibility.js';
import { extractResumeText } from '../utils/resumeScanner.js';
import {
  DEFAULT_NEAR_MATCH_WINDOW,
  getGlobalFlexibleThreshold,
} from '../utils/platformSettings.js';

const router = express.Router();
const jobTypeSchema = z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT']);
const time24Schema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function toDateKey(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseSkillsInput(value) {
  const rawValues = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(rawValues.map((item) => String(item || '').trim()).filter(Boolean))];
}

function parseRequirementGroupsInput(value) {
  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      source = [];
    }
  }

  return normalizeRequirementGroups(source);
}

function parsePercentOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 0 || parsed > 100) return null;
  return parsed;
}

function parseDateTimeInput(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseInterviewDatesInput(value) {
  const rawValues = Array.isArray(value) ? value : String(value || '').split(',');
  const dateKeys = [...new Set(rawValues.map((item) => toDateKey(item)).filter(Boolean))].sort();
  return dateKeys.map((dateKey) => new Date(`${dateKey}T00:00:00.000Z`));
}

function isDeadlineBeforeInterviewDates(deadline, interviewDates) {
  if (!deadline || !Array.isArray(interviewDates) || interviewDates.length === 0) return true;
  const deadlineKey = toDateKey(deadline);
  if (!deadlineKey) return false;
  return interviewDates.every((value) => {
    const interviewKey = toDateKey(value);
    return interviewKey ? interviewKey >= deadlineKey : false;
  });
}

function normalizeInterviewSchedulePayload(payload) {
  const hasStartTime = Object.prototype.hasOwnProperty.call(payload || {}, 'interviewStartTime');
  const hasCandidatesPerDay = Object.prototype.hasOwnProperty.call(
    payload || {},
    'interviewCandidatesPerDay'
  );
  const hasInterviewDates = Object.prototype.hasOwnProperty.call(payload || {}, 'interviewDates');

  const interviewStartTime = hasStartTime
    ? String(payload.interviewStartTime || '').trim()
    : undefined;
  const interviewCandidatesPerDay = hasCandidatesPerDay
    ? Number.parseInt(String(payload.interviewCandidatesPerDay || ''), 10)
    : undefined;
  const interviewDates = hasInterviewDates
    ? parseInterviewDatesInput(payload.interviewDates)
    : undefined;

  return {
    interviewStartTime: hasStartTime
      ? interviewStartTime && time24Schema.safeParse(interviewStartTime).success
        ? interviewStartTime
        : null
      : undefined,
    interviewCandidatesPerDay: hasCandidatesPerDay
      ? Number.isInteger(interviewCandidatesPerDay) && interviewCandidatesPerDay > 0
        ? interviewCandidatesPerDay
        : null
      : undefined,
    interviewDates,
  };
}

function isInterviewScheduleConfigured(source) {
  const interviewDates = Array.isArray(source?.interviewDates) ? source.interviewDates : [];
  const interviewStartTime = String(source?.interviewStartTime || '').trim();
  const interviewCandidatesPerDay = Number.parseInt(
    String(source?.interviewCandidatesPerDay || ''),
    10
  );

  return Boolean(
    interviewDates.length > 0 &&
    time24Schema.safeParse(interviewStartTime).success &&
    Number.isInteger(interviewCandidatesPerDay) &&
    interviewCandidatesPerDay > 0
  );
}

function parseJobPayload(body, { allowPartial = false } = {}) {
  const payload = {};
  const assign = (key, value) => {
    if (allowPartial && value === undefined) return;
    payload[key] = value;
  };

  assign('title', body.title !== undefined ? String(body.title || '').trim() : undefined);
  assign(
    'description',
    body.description !== undefined ? String(body.description || '').trim() : undefined
  );
  assign('location', body.location !== undefined ? String(body.location || '').trim() : undefined);
  assign(
    'type',
    body.type !== undefined
      ? String(body.type || '')
          .trim()
          .toUpperCase()
      : undefined
  );
  assign(
    'mandatorySkills',
    body.mandatorySkills !== undefined ? parseSkillsInput(body.mandatorySkills) : undefined
  );
  assign(
    'requiredSkills',
    body.requiredSkills !== undefined ? parseSkillsInput(body.requiredSkills) : undefined
  );
  assign(
    'requirementGroups',
    body.requirementGroups !== undefined
      ? parseRequirementGroupsInput(body.requirementGroups)
      : undefined
  );
  assign(
    'flexibleMatchThreshold',
    body.flexibleMatchThreshold === null
      ? null
      : body.flexibleMatchThreshold !== undefined && body.flexibleMatchThreshold !== ''
        ? parsePercentOrNull(body.flexibleMatchThreshold)
        : undefined
  );
  assign(
    'requiredDegree',
    body.requiredDegree !== undefined ? String(body.requiredDegree || '').trim() : undefined
  );
  assign(
    'minAge',
    body.minAge === null
      ? null
      : body.minAge !== undefined && body.minAge !== ''
        ? Number.parseInt(String(body.minAge), 10)
        : undefined
  );
  assign(
    'maxAge',
    body.maxAge === null
      ? null
      : body.maxAge !== undefined && body.maxAge !== ''
        ? Number.parseInt(String(body.maxAge), 10)
        : undefined
  );
  assign(
    'minExperienceYears',
    body.minExperienceYears === null
      ? null
      : body.minExperienceYears !== undefined && body.minExperienceYears !== ''
        ? Number.parseInt(String(body.minExperienceYears), 10)
        : undefined
  );

  const schedulePayload = normalizeInterviewSchedulePayload(body || {});
  assign('interviewDates', schedulePayload.interviewDates);
  assign('interviewStartTime', schedulePayload.interviewStartTime);
  assign('interviewCandidatesPerDay', schedulePayload.interviewCandidatesPerDay);
  assign(
    'applicationDeadline',
    body.applicationDeadline !== undefined
      ? parseDateTimeInput(body.applicationDeadline)
      : undefined
  );

  return payload;
}

const listJobsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  title: z.string().trim().max(120).optional(),
  position: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  companyId: z.coerce.number().int().positive().optional(),
  includeIneligible: z.string().trim().optional(),
});

const requirementGroupSchema = z.object({
  category: z.string().trim().min(1).max(40).optional(),
  ruleType: z.enum(['MANDATORY', 'FLEXIBLE']),
  matchType: z.enum(['ANY', 'ALL']).optional(),
  skills: z.union([z.array(z.string().trim().min(1).max(80)).min(1).max(30), z.string()]),
});

const createJobSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(4000),
  location: z.string().trim().max(120).optional(),
  type: jobTypeSchema.optional(),
  mandatorySkills: z.union([z.array(z.string().trim().min(1).max(80)), z.string()]).optional(),
  requiredSkills: z.union([z.array(z.string().trim().min(1).max(80)), z.string()]).optional(),
  requirementGroups: z.union([z.array(requirementGroupSchema).max(60), z.string()]).optional(),
  flexibleMatchThreshold: z.union([z.coerce.number().int().min(0).max(100), z.null()]).optional(),
  requiredDegree: z.string().trim().max(120).optional(),
  minAge: z.union([z.coerce.number().int().positive().max(120), z.null()]).optional(),
  maxAge: z.union([z.coerce.number().int().positive().max(120), z.null()]).optional(),
  minExperienceYears: z.union([z.coerce.number().int().min(0).max(60), z.null()]).optional(),
  interviewDates: z.union([z.array(z.string().trim()), z.string()]).optional(),
  interviewStartTime: z.union([time24Schema, z.null()]).optional(),
  interviewCandidatesPerDay: z
    .union([z.coerce.number().int().positive().max(500), z.null()])
    .optional(),
  applicationDeadline: z.union([z.string().trim().min(1), z.date()]),
});

const updateJobSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(4000).optional(),
    location: z.string().trim().max(120).optional(),
    type: jobTypeSchema.optional(),
    mandatorySkills: z.union([z.array(z.string().trim().min(1).max(80)), z.string()]).optional(),
    requiredSkills: z.union([z.array(z.string().trim().min(1).max(80)), z.string()]).optional(),
    requirementGroups: z.union([z.array(requirementGroupSchema).max(60), z.string()]).optional(),
    flexibleMatchThreshold: z.union([z.coerce.number().int().min(0).max(100), z.null()]).optional(),
    requiredDegree: z.string().trim().max(120).optional(),
    minAge: z.union([z.coerce.number().int().positive().max(120), z.null()]).optional(),
    maxAge: z.union([z.coerce.number().int().positive().max(120), z.null()]).optional(),
    minExperienceYears: z.union([z.coerce.number().int().min(0).max(60), z.null()]).optional(),
    interviewDates: z.union([z.array(z.string().trim()), z.string()]).optional(),
    interviewStartTime: z.union([time24Schema, z.null()]).optional(),
    interviewCandidatesPerDay: z
      .union([z.coerce.number().int().positive().max(500), z.null()])
      .optional(),
    applicationDeadline: z.union([z.string().trim().min(1), z.date(), z.null()]).optional(),
  })
  .superRefine((value, ctx) => {
    if (!Object.keys(value || {}).length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No updates provided',
        path: ['root'],
      });
    }
  });

function buildJobSearchWhere(query, options = {}) {
  const { q, title, position, location, companyId } = query;
  const onlyOpen = Boolean(options?.onlyOpen);
  const now = new Date();
  const qValue = String(q || '').trim();
  const titleValue = String(title || '').trim();
  const positionValue = String(position || '').trim();
  const locationValue = String(location || '').trim();

  const keywords = [
    ...new Set(
      [titleValue, positionValue, ...qValue.split(/\s+/)]
        .map((term) => String(term || '').trim())
        .filter(Boolean)
    ),
  ];

  const textMatch =
    keywords.length > 0
      ? {
          OR: keywords.flatMap((term) => [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ]),
        }
      : {};

  return {
    AND: [
      ...(onlyOpen
        ? [
            {
              isClosed: false,
            },
            {
              OR: [{ applicationDeadline: null }, { applicationDeadline: { gt: now } }],
            },
          ]
        : []),
      textMatch,
      locationValue ? { location: { contains: locationValue, mode: 'insensitive' } } : {},
      typeof companyId === 'number' ? { companyId } : {},
    ],
  };
}

// GET /api/jobs - public list with filters
router.get('/', validate(listJobsQuerySchema, 'query'), async (req, res) => {
  try {
    const where = buildJobSearchWhere(req.query, { onlyOpen: true });
    const jobs = await prisma.job.findMany({
      where,
      include: { company: { select: { id: true, name: true, userId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(jobs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/jobs/eligible - student-only eligible jobs
router.get(
  '/eligible',
  authenticate,
  authorize('STUDENT'),
  validate(listJobsQuerySchema, 'query'),
  async (req, res) => {
    try {
      const includeIneligible = String(req.query?.includeIneligible || '').toLowerCase() === 'true';

      const student = await prisma.studentProfile.findUnique({
        where: { userId: req.user.id },
        include: { user: true },
      });
      if (!student) return res.status(400).json({ message: 'Student profile missing' });

      const where = buildJobSearchWhere(req.query, { onlyOpen: true });
      const jobs = await prisma.job.findMany({
        where,
        include: { company: { select: { id: true, name: true, userId: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const resumeText = await extractResumeText(student.resumeUrl);
      const globalFlexibleThresholdPercent = await getGlobalFlexibleThreshold(prisma);
      const evaluatedJobs = jobs.map((job) => {
        const evaluation = evaluateJobEligibility({
          job,
          student,
          resumeText,
          defaultFlexibleThresholdPercent: globalFlexibleThresholdPercent,
          nearMatchWindowPercent: DEFAULT_NEAR_MATCH_WINDOW,
          enforceResumeQuality: true,
        });
        const scheduleConfigured = isInterviewScheduleConfigured(job);
        const reasons = [...evaluation.reasons];
        if (!scheduleConfigured) {
          reasons.push('Interview schedule is not configured by company yet');
        }

        const eligible = evaluation.eligible && scheduleConfigured;
        const nearMatch = Boolean(evaluation.nearMatch && !eligible && scheduleConfigured);
        const tier = eligible ? 'ELIGIBLE' : nearMatch ? 'NEAR_MATCH' : 'NOT_ELIGIBLE';

        return {
          ...job,
          matchScore: evaluation.score,
          matchSummary: {
            eligible,
            nearMatch,
            tier,
            reasons,
            advisories: evaluation.advisories,
            matchedSkills: evaluation.matchedSkills,
            missingSkills: evaluation.missingSkills,
            flexibleMatchPercent: evaluation.flexibleMatchPercent,
            flexibleMatchThresholdPercent: evaluation.effectiveFlexibleThresholdPercent,
            scheduleConfigured,
            details: evaluation.details,
          },
        };
      });

      const responseJobs = includeIneligible
        ? evaluatedJobs
        : evaluatedJobs.filter((job) => job.matchSummary.eligible);

      return res.json(responseJobs);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// GET /api/jobs/company - list jobs posted by current company
router.get('/company', authenticate, authorize('COMPANY'), async (req, res) => {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user.id } });
    if (!company) return res.status(400).json({ message: 'Company profile missing' });

    const jobs = await prisma.job.findMany({
      where: { companyId: company.id },
      include: {
        company: { select: { id: true, name: true, userId: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(
      jobs.map((job) => ({
        ...job,
        applicationCount: Number(job?._count?.applications || 0),
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/jobs/:id - public detail
router.get('/:id', async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid job id' });

    const job = await prisma.job.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true, website: true } } },
    });
    if (!job) return res.status(404).json({ message: 'Not found' });
    return res.json(job);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/jobs - company creates job
router.post(
  '/',
  authenticate,
  authorize('COMPANY'),
  validate(createJobSchema),
  async (req, res) => {
    try {
      const company = await prisma.companyProfile.findUnique({ where: { userId: req.user.id } });
      if (!company) return res.status(400).json({ message: 'Company profile missing' });

      const parsed = parseJobPayload(req.body || {}, { allowPartial: false });

      if (parsed.interviewStartTime === null || parsed.interviewCandidatesPerDay === null) {
        return res.status(400).json({
          message: 'Invalid interview schedule. Use HH:mm start time and positive candidates/day.',
        });
      }
      if (
        Number.isInteger(parsed.minAge) &&
        Number.isInteger(parsed.maxAge) &&
        parsed.minAge > parsed.maxAge
      ) {
        return res.status(400).json({ message: 'minAge cannot be greater than maxAge' });
      }
      if (!isInterviewScheduleConfigured(parsed)) {
        return res.status(400).json({
          message:
            'Interview automation requires interview dates, start time (HH:mm), and candidates/day.',
        });
      }
      if (!parsed.applicationDeadline) {
        return res.status(400).json({
          message: 'Application deadline is required.',
        });
      }
      if (
        !isDeadlineBeforeInterviewDates(parsed.applicationDeadline, parsed.interviewDates || [])
      ) {
        return res.status(400).json({
          message: 'Interview dates must be on/after the application deadline.',
        });
      }

      const job = await prisma.job.create({
        data: {
          title: parsed.title,
          description: parsed.description,
          location: parsed.location || null,
          type: parsed.type || 'FULL_TIME',
          mandatorySkills: parsed.mandatorySkills || [],
          requiredSkills: parsed.requiredSkills || [],
          requirementGroups: parsed.requirementGroups || [],
          flexibleMatchThreshold: parsed.flexibleMatchThreshold ?? null,
          requiredDegree: parsed.requiredDegree || null,
          minAge: parsed.minAge ?? null,
          maxAge: parsed.maxAge ?? null,
          minExperienceYears: parsed.minExperienceYears ?? null,
          interviewDates: parsed.interviewDates || [],
          interviewStartTime: parsed.interviewStartTime || null,
          interviewCandidatesPerDay: parsed.interviewCandidatesPerDay ?? null,
          applicationDeadline: parsed.applicationDeadline,
          isClosed: false,
          closedAt: null,
          autoFinalizedAt: null,
          companyId: company.id,
        },
      });

      return res.status(201).json(job);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// PUT /api/jobs/:id - company updates own job
router.put(
  '/:id',
  authenticate,
  authorize('COMPANY'),
  validate(updateJobSchema),
  async (req, res) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) return res.status(400).json({ message: 'Invalid job id' });

      const company = await prisma.companyProfile.findUnique({ where: { userId: req.user.id } });
      const existing = await prisma.job.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Not found' });
      if (!company || company.id !== existing.companyId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const parsed = parseJobPayload(req.body || {}, { allowPartial: true });
      if (parsed.interviewStartTime === null || parsed.interviewCandidatesPerDay === null) {
        return res.status(400).json({
          message: 'Invalid interview schedule. Use HH:mm start time and positive candidates/day.',
        });
      }
      if (
        Number.isInteger(parsed.minAge) &&
        Number.isInteger(parsed.maxAge) &&
        parsed.minAge > parsed.maxAge
      ) {
        return res.status(400).json({ message: 'minAge cannot be greater than maxAge' });
      }

      const effectiveSchedule = {
        interviewDates:
          parsed.interviewDates !== undefined ? parsed.interviewDates : existing.interviewDates,
        interviewStartTime:
          parsed.interviewStartTime !== undefined
            ? parsed.interviewStartTime
            : existing.interviewStartTime,
        interviewCandidatesPerDay:
          parsed.interviewCandidatesPerDay !== undefined
            ? parsed.interviewCandidatesPerDay
            : existing.interviewCandidatesPerDay,
      };
      if (!isInterviewScheduleConfigured(effectiveSchedule)) {
        return res.status(400).json({
          message:
            'Interview automation requires interview dates, start time (HH:mm), and candidates/day.',
        });
      }
      const effectiveDeadline =
        parsed.applicationDeadline !== undefined
          ? parsed.applicationDeadline
          : existing.applicationDeadline;
      if (effectiveDeadline == null) {
        return res.status(400).json({ message: 'Application deadline is required.' });
      }
      if (!isDeadlineBeforeInterviewDates(effectiveDeadline, effectiveSchedule.interviewDates)) {
        return res.status(400).json({
          message: 'Interview dates must be on/after the application deadline.',
        });
      }

      const updateData = {
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.location !== undefined ? { location: parsed.location || null } : {}),
        ...(parsed.type !== undefined ? { type: parsed.type || existing.type } : {}),
        ...(parsed.mandatorySkills !== undefined
          ? { mandatorySkills: parsed.mandatorySkills }
          : {}),
        ...(parsed.requiredSkills !== undefined ? { requiredSkills: parsed.requiredSkills } : {}),
        ...(parsed.requirementGroups !== undefined
          ? { requirementGroups: parsed.requirementGroups }
          : {}),
        ...(parsed.flexibleMatchThreshold !== undefined
          ? { flexibleMatchThreshold: parsed.flexibleMatchThreshold ?? null }
          : {}),
        ...(parsed.requiredDegree !== undefined
          ? { requiredDegree: parsed.requiredDegree || null }
          : {}),
        ...(parsed.minAge !== undefined ? { minAge: parsed.minAge ?? null } : {}),
        ...(parsed.maxAge !== undefined ? { maxAge: parsed.maxAge ?? null } : {}),
        ...(parsed.minExperienceYears !== undefined
          ? { minExperienceYears: parsed.minExperienceYears ?? null }
          : {}),
        ...(parsed.interviewDates !== undefined ? { interviewDates: parsed.interviewDates } : {}),
        ...(parsed.interviewStartTime !== undefined
          ? { interviewStartTime: parsed.interviewStartTime || null }
          : {}),
        ...(parsed.interviewCandidatesPerDay !== undefined
          ? { interviewCandidatesPerDay: parsed.interviewCandidatesPerDay ?? null }
          : {}),
        ...(parsed.applicationDeadline !== undefined
          ? {
              applicationDeadline: parsed.applicationDeadline,
              isClosed: false,
              closedAt: null,
              autoFinalizedAt: null,
            }
          : {}),
      };

      const updated = await prisma.job.update({
        where: { id },
        data: updateData,
      });

      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// DELETE /api/jobs/:id - company deletes own job
router.delete('/:id', authenticate, authorize('COMPANY'), async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid job id' });

    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user.id } });
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ message: 'Not found' });
    if (!company || company.id !== job.companyId)
      return res.status(403).json({ message: 'Forbidden' });

    await prisma.application.deleteMany({ where: { jobId: id } });
    await prisma.job.delete({ where: { id } });
    return res.json({ message: 'Deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
