import prisma from '../connection/prisma.js';
import { evaluateJobEligibility } from '../utils/eligibility.js';
import { sendApplicationRejection, sendInterviewInvite } from '../utils/mail.js';
import { createNotification } from '../utils/notifications.js';
import { extractResumeText } from '../utils/resumeScanner.js';
import {
  DEFAULT_NEAR_MATCH_WINDOW,
  getGlobalFlexibleThreshold,
} from '../utils/platformSettings.js';

const TERMINAL_STATUSES = new Set(['ACCEPTED', 'APPROVED', 'REJECTED']);
const DEADLINE_REJECTION_REASON = 'Interview slots are full for this job cycle.';
const FINALIZATION_IN_PROGRESS = new Set();

let deadlineFinalizerTimer = null;
let deadlineFinalizerBusy = false;

function toDateKey(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function fromDateKey(dateKey) {
  if (!dateKey) return null;
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeStartTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? raw : '';
}

function normalizeSchedule(job) {
  const capacity = Number.parseInt(String(job?.interviewCandidatesPerDay || ''), 10);
  const interviewCandidatesPerDay = Number.isInteger(capacity) && capacity > 0 ? capacity : null;
  const interviewStartTime = normalizeStartTime(job?.interviewStartTime);

  const dateKeys = [...new Set((job?.interviewDates || []).map(toDateKey).filter(Boolean))].sort();

  return {
    interviewCandidatesPerDay,
    interviewStartTime,
    dateKeys,
    totalSlots:
      interviewCandidatesPerDay && dateKeys.length
        ? interviewCandidatesPerDay * dateKeys.length
        : 0,
    configured: Boolean(interviewCandidatesPerDay && interviewStartTime && dateKeys.length),
  };
}

function toTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isJobOpenForApplications(job, now = new Date()) {
  if (!job || job.isClosed) return false;
  if (!job.applicationDeadline) return true;
  const deadlineTs = toTimestamp(job.applicationDeadline);
  if (deadlineTs == null) return false;
  return deadlineTs > now.getTime();
}

function hasDeadlineReached(job, now = new Date()) {
  if (!job?.applicationDeadline) return false;
  const deadlineTs = toTimestamp(job.applicationDeadline);
  if (deadlineTs == null) return false;
  return deadlineTs <= now.getTime();
}

function buildMatchSummary(evaluation, overrides = {}) {
  const baseReasons = Array.isArray(evaluation?.reasons) ? [...evaluation.reasons] : [];
  const baseAdvisories = Array.isArray(evaluation?.advisories) ? [...evaluation.advisories] : [];

  return {
    eligible: Boolean(evaluation?.eligible),
    nearMatch: Boolean(evaluation?.nearMatch),
    tier: String(evaluation?.tier || 'NOT_ELIGIBLE'),
    reasons: baseReasons,
    advisories: baseAdvisories,
    matchedSkills: Array.isArray(evaluation?.matchedSkills) ? evaluation.matchedSkills : [],
    missingSkills: Array.isArray(evaluation?.missingSkills) ? evaluation.missingSkills : [],
    flexibleMatchPercent: Number(evaluation?.flexibleMatchPercent || 0),
    flexibleMatchThresholdPercent: Number(evaluation?.effectiveFlexibleThresholdPercent || 0),
    details: evaluation?.details || {},
    ...overrides,
  };
}

function formatInterviewLabel({ dateKey, startTime, queueNumber }) {
  const dateLabel = dateKey ? new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString() : 'TBD';
  const queueText = Number.isInteger(queueNumber) ? `Queue #${queueNumber}` : 'Queue TBD';
  return `${dateLabel} at ${startTime || 'TBD'} (${queueText})`;
}

function isInterviewChanged(current, desired) {
  const currentSummary = JSON.stringify(current.matchSummary || {});
  const desiredSummary = JSON.stringify(desired.matchSummary || {});

  return (
    current.status !== desired.status ||
    toDateKey(current.interviewDate) !== desired.interviewDateKey ||
    String(current.interviewStartTime || '') !== String(desired.interviewStartTime || '') ||
    Number(current.interviewQueueNumber || 0) !== Number(desired.interviewQueueNumber || 0) ||
    Number(current.matchScore || 0) !== Number(desired.matchScore || 0) ||
    Boolean(current.manualInterviewOverride) !== Boolean(desired.manualInterviewOverride) ||
    String(current.interviewNote || '') !== String(desired.interviewNote || '') ||
    currentSummary !== desiredSummary
  );
}

async function notifyInterviewAssignment({
  application,
  company,
  dateKey,
  startTime,
  queueNumber,
  note,
}) {
  const studentUser = application?.student?.user;
  if (!studentUser?.id) return;

  const title = `Interview Scheduled: ${application?.job?.title || 'Job'}`;
  const details = formatInterviewLabel({ dateKey, startTime, queueNumber });
  const message = `${company?.name || 'Company'} scheduled your interview on ${details}.`;

  await createNotification({
    userId: studentUser.id,
    type: 'INTERVIEW_ASSIGNED',
    title,
    message,
    metadata: {
      applicationId: application.id,
      jobId: application.jobId,
      companyId: company?.id || null,
      interviewDate: dateKey,
      interviewStartTime: startTime || null,
      interviewQueueNumber: queueNumber || null,
    },
  });

  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && studentUser.email) {
    const scheduleNote = [
      `Interview has been scheduled automatically.`,
      `Date: ${dateKey || 'TBD'}`,
      `Start time: ${startTime || 'TBD'}`,
      Number.isInteger(queueNumber) ? `Queue number: ${queueNumber}` : null,
      note ? `Note: ${note}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await sendInterviewInvite(
        studentUser.email,
        studentUser.name || 'Student',
        company?.name || 'Company',
        application?.job?.title || 'Job',
        scheduleNote
      );
    } catch (error) {
      console.error('Failed to send interview assignment email:', error);
    }
  }
}

async function notifyRejectedAfterFinalization({ application, company, reason }) {
  const studentUser = application?.student?.user;
  if (!studentUser?.id) return;

  const title = `Application Update: ${application?.job?.title || 'Job'}`;
  const message = `${company?.name || 'Company'} closed interview slots for this hiring cycle.${
    reason ? ` ${reason}` : ''
  }`;

  await createNotification({
    userId: studentUser.id,
    type: 'APPLICATION_REJECTED',
    title,
    message,
    metadata: {
      applicationId: application?.id || null,
      jobId: application?.jobId || null,
      reason: reason || null,
    },
  });

  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && studentUser.email) {
    try {
      await sendApplicationRejection(
        studentUser.email,
        studentUser.name || 'Student',
        company?.name || 'Company',
        application?.job?.title || 'Job',
        reason || DEADLINE_REJECTION_REASON
      );
    } catch (error) {
      console.error('Failed to send rejection email:', error);
    }
  }
}

async function buildEvaluations(job, applications, evaluationOptions = {}) {
  return Promise.all(
    applications.map(async (application) => {
      if (application.manualInterviewOverride) {
        return {
          application,
          evaluation: {
            eligible: true,
            nearMatch: false,
            tier: 'ELIGIBLE',
            hardEligible: true,
            flexibleEligible: true,
            reasons: [],
            advisories: [],
            score: Math.max(95, Number(application.matchScore || 0)),
            matchedSkills: [],
            missingSkills: [],
            flexibleMatchPercent: 100,
            effectiveFlexibleThresholdPercent: 0,
            details: { manualOverride: true },
          },
        };
      }

      const resumeText = await extractResumeText(application?.student?.resumeUrl);
      const evaluation = evaluateJobEligibility({
        job,
        student: application?.student || {},
        resumeText,
        ...evaluationOptions,
      });

      return { application, evaluation };
    })
  );
}

async function closeJobAfterFinalization(jobId, now) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      isClosed: true,
      closedAt: now,
      autoFinalizedAt: now,
    },
  });
}

export async function finalizeInterviewAssignmentsForJob(jobId, options = {}) {
  const id = Number.parseInt(String(jobId), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return { finalized: false, skipped: true, reason: 'INVALID_JOB' };
  }

  if (FINALIZATION_IN_PROGRESS.has(id)) {
    return { finalized: false, skipped: true, reason: 'FINALIZATION_ALREADY_RUNNING' };
  }

  FINALIZATION_IN_PROGRESS.add(id);
  try {
    const now = options?.now instanceof Date ? options.now : new Date();
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!job) return { finalized: false, skipped: true, reason: 'JOB_NOT_FOUND' };
    if (job.isClosed) return { finalized: false, skipped: true, reason: 'JOB_ALREADY_CLOSED' };
    if (!hasDeadlineReached(job, now)) {
      return { finalized: false, skipped: true, reason: 'DEADLINE_NOT_REACHED' };
    }

    const schedule = normalizeSchedule(job);
    const activeApplications = await prisma.application.findMany({
      where: {
        jobId: id,
        status: {
          notIn: [...TERMINAL_STATUSES],
        },
      },
      include: {
        job: true,
        student: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!activeApplications.length) {
      await closeJobAfterFinalization(id, now);
      return {
        finalized: true,
        skipped: false,
        updated: 0,
        assigned: 0,
        rejected: 0,
        reason: 'NO_ACTIVE_APPLICATIONS',
      };
    }

    const globalFlexibleThresholdPercent = await getGlobalFlexibleThreshold(prisma);
    const evaluatedEntries = await buildEvaluations(job, activeApplications, {
      defaultFlexibleThresholdPercent: globalFlexibleThresholdPercent,
      nearMatchWindowPercent: DEFAULT_NEAR_MATCH_WINDOW,
      enforceResumeQuality: true,
    });

    const slotUsage = new Map(schedule.dateKeys.map((dateKey) => [dateKey, 0]));
    const lockedInterviewEntries = evaluatedEntries.filter(
      (entry) =>
        entry.application.manualInterviewOverride && entry.application.status === 'INTERVIEW'
    );
    for (const entry of lockedInterviewEntries) {
      const dateKey = toDateKey(entry.application.interviewDate);
      if (!dateKey || !slotUsage.has(dateKey)) continue;
      slotUsage.set(dateKey, (slotUsage.get(dateKey) || 0) + 1);
    }

    const desiredById = new Map();
    const normalizedStartTime = schedule.interviewStartTime || null;

    for (const entry of evaluatedEntries) {
      const baseSummary = buildMatchSummary(entry.evaluation);
      desiredById.set(entry.application.id, {
        status: 'REJECTED',
        matchScore: entry.evaluation.score,
        matchSummary: baseSummary,
        interviewDateKey: null,
        interviewStartTime: null,
        interviewQueueNumber: null,
        manualInterviewOverride: false,
        interviewNote: null,
      });
    }

    for (const entry of lockedInterviewEntries) {
      const app = entry.application;
      desiredById.set(app.id, {
        status: 'INTERVIEW',
        matchScore: Math.max(entry.evaluation.score, Number(app.matchScore || 0)),
        matchSummary: buildMatchSummary(entry.evaluation, {
          details: {
            ...(entry.evaluation.details || {}),
            manualOverride: true,
          },
        }),
        interviewDateKey: toDateKey(app.interviewDate) || schedule.dateKeys[0] || null,
        interviewStartTime: app.interviewStartTime || normalizedStartTime,
        interviewQueueNumber: Number.isInteger(app.interviewQueueNumber)
          ? app.interviewQueueNumber
          : null,
        manualInterviewOverride: true,
        interviewNote: app.interviewNote || null,
      });
    }

    const rankedEligibleEntries = evaluatedEntries
      .filter(
        (entry) =>
          entry.evaluation.eligible &&
          !(entry.application.manualInterviewOverride && entry.application.status === 'INTERVIEW')
      )
      .sort((left, right) => {
        const leftPercent = Number(left.evaluation.flexibleMatchPercent || 0);
        const rightPercent = Number(right.evaluation.flexibleMatchPercent || 0);
        if (rightPercent !== leftPercent) return rightPercent - leftPercent;

        const leftTime = toTimestamp(left.application.createdAt) || 0;
        const rightTime = toTimestamp(right.application.createdAt) || 0;
        if (leftTime !== rightTime) return leftTime - rightTime;

        return left.application.id - right.application.id;
      });

    const noSlotReason = DEADLINE_REJECTION_REASON;

    for (const entry of evaluatedEntries) {
      if (!entry.evaluation.eligible) {
        const desired = desiredById.get(entry.application.id);
        if (!desired || desired.status === 'INTERVIEW') continue;
        desired.matchSummary = buildMatchSummary(entry.evaluation, {
          tier: 'NOT_ELIGIBLE',
        });
        desired.interviewNote = 'Compulsory requirements are not met.';
      }
    }

    for (const entry of rankedEligibleEntries) {
      const app = entry.application;
      const desired = desiredById.get(app.id);
      if (!desired || desired.status === 'INTERVIEW') continue;

      let assignedDateKey = null;
      let queueNumber = null;

      if (schedule.configured) {
        for (const dateKey of schedule.dateKeys) {
          const used = slotUsage.get(dateKey) || 0;
          if (used < schedule.interviewCandidatesPerDay) {
            assignedDateKey = dateKey;
            queueNumber = used + 1;
            slotUsage.set(dateKey, used + 1);
            break;
          }
        }
      }

      if (assignedDateKey) {
        desiredById.set(app.id, {
          status: 'INTERVIEW',
          matchScore: entry.evaluation.score,
          matchSummary: buildMatchSummary(entry.evaluation, {
            eligible: true,
            nearMatch: false,
            tier: 'ELIGIBLE',
          }),
          interviewDateKey: assignedDateKey,
          interviewStartTime: normalizedStartTime,
          interviewQueueNumber: queueNumber,
          manualInterviewOverride: false,
          interviewNote: app.interviewNote || null,
        });
      } else {
        desired.matchSummary = buildMatchSummary(entry.evaluation, {
          reasons: [...entry.evaluation.reasons, noSlotReason],
          tier: 'NOT_ELIGIBLE',
          eligible: false,
          nearMatch: false,
        });
        desired.interviewNote = noSlotReason;
      }
    }

    const updates = [];
    for (const entry of evaluatedEntries) {
      const current = entry.application;
      const desired = desiredById.get(current.id);
      if (!desired) continue;
      if (!isInterviewChanged(current, desired)) continue;
      updates.push({ current, desired });
    }

    let updatedApplications = [];
    if (updates.length) {
      updatedApplications = await prisma.$transaction(
        updates.map(({ current, desired }) =>
          prisma.application.update({
            where: { id: current.id },
            data: {
              status: desired.status,
              matchScore: desired.matchScore,
              matchSummary: desired.matchSummary,
              interviewDate: fromDateKey(desired.interviewDateKey),
              interviewStartTime: desired.interviewStartTime,
              interviewQueueNumber: desired.interviewQueueNumber,
              manualInterviewOverride: desired.manualInterviewOverride,
              interviewNote: desired.interviewNote,
            },
            include: {
              job: true,
              student: {
                include: {
                  user: true,
                },
              },
            },
          })
        )
      );
    }

    let assigned = 0;
    let rejected = 0;

    for (let index = 0; index < updates.length; index += 1) {
      const { current, desired } = updates[index];
      const updated = updatedApplications[index];

      const movedToInterview =
        desired.status === 'INTERVIEW' &&
        (current.status !== 'INTERVIEW' ||
          toDateKey(current.interviewDate) !== desired.interviewDateKey ||
          Number(current.interviewQueueNumber || 0) !== Number(desired.interviewQueueNumber || 0));

      if (movedToInterview) {
        assigned += 1;
        await notifyInterviewAssignment({
          application: updated,
          company: job.company,
          dateKey: desired.interviewDateKey,
          startTime: desired.interviewStartTime,
          queueNumber: desired.interviewQueueNumber,
          note: desired.interviewNote,
        });
        continue;
      }

      const movedToRejected = desired.status === 'REJECTED' && current.status !== 'REJECTED';
      if (movedToRejected) {
        rejected += 1;
        await notifyRejectedAfterFinalization({
          application: updated,
          company: job.company,
          reason: desired.interviewNote || noSlotReason,
        });
      }
    }

    await closeJobAfterFinalization(id, now);

    return {
      finalized: true,
      skipped: false,
      updated: updates.length,
      assigned,
      rejected,
      reason: options?.reason || 'DEADLINE_FINALIZED',
    };
  } finally {
    FINALIZATION_IN_PROGRESS.delete(id);
  }
}

export async function finalizeDueInterviewJobs(options = {}) {
  const now = options?.now instanceof Date ? options.now : new Date();
  const limitRaw = Number.parseInt(String(options?.limit || 20), 10);
  const limit = Number.isInteger(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 20;

  const dueJobs = await prisma.job.findMany({
    where: {
      isClosed: false,
      applicationDeadline: {
        lte: now,
      },
    },
    select: { id: true },
    orderBy: { applicationDeadline: 'asc' },
    take: limit,
  });

  let finalized = 0;
  let assigned = 0;
  let rejected = 0;

  for (const job of dueJobs) {
    const result = await finalizeInterviewAssignmentsForJob(job.id, {
      now,
      reason: options?.reason || 'DEADLINE_AUTO_TICK',
    });

    if (!result.finalized || result.skipped) continue;
    finalized += 1;
    assigned += Number(result.assigned || 0);
    rejected += Number(result.rejected || 0);
  }

  return {
    scanned: dueJobs.length,
    finalized,
    assigned,
    rejected,
  };
}

export function startDeadlineFinalizationWorker({ intervalMs = 60_000 } = {}) {
  if (deadlineFinalizerTimer) return;

  const safeInterval = Number.isInteger(intervalMs) && intervalMs >= 15_000 ? intervalMs : 60_000;
  const runTick = async () => {
    if (deadlineFinalizerBusy) return;
    deadlineFinalizerBusy = true;
    try {
      await finalizeDueInterviewJobs({ reason: 'DEADLINE_AUTO_TICK' });
    } catch (error) {
      console.error('Deadline finalizer tick failed:', error);
    } finally {
      deadlineFinalizerBusy = false;
    }
  };

  runTick().catch((error) => {
    console.error('Initial deadline finalizer tick failed:', error);
  });

  deadlineFinalizerTimer = setInterval(runTick, safeInterval);
  if (typeof deadlineFinalizerTimer.unref === 'function') {
    deadlineFinalizerTimer.unref();
  }
}

export function stopDeadlineFinalizationWorker() {
  if (!deadlineFinalizerTimer) return;
  clearInterval(deadlineFinalizerTimer);
  deadlineFinalizerTimer = null;
}

export async function recomputeInterviewAssignmentsForJob(jobId, options = {}) {
  const result = await finalizeInterviewAssignmentsForJob(jobId, {
    ...options,
    reason: options?.reason || 'RECOMPUTE_COMPAT',
  });

  return {
    updated: Number(result?.updated || 0),
    assigned: Number(result?.assigned || 0),
    rejected: Number(result?.rejected || 0),
    skipped: Boolean(result?.skipped),
    reason: result?.reason || options?.reason || 'RECOMPUTE_COMPAT',
    finalized: Boolean(result?.finalized),
  };
}

export async function manualAssignApplicationToInterview({
  applicationId,
  actorId,
  interviewDate,
  note,
}) {
  const id = Number.parseInt(String(applicationId), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, status: 400, message: 'Invalid application id' };
  }

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      job: {
        include: {
          company: {
            include: {
              user: true,
            },
          },
        },
      },
      student: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!application) return { ok: false, status: 404, message: 'Application not found' };
  if (!application.job?.company || application.job.company.userId !== actorId) {
    return { ok: false, status: 403, message: 'Not authorized to update this application' };
  }
  if (TERMINAL_STATUSES.has(application.status)) {
    return { ok: false, status: 400, message: 'Cannot assign interview for a closed application' };
  }

  const schedule = normalizeSchedule(application.job);
  if (!schedule.configured) {
    return {
      ok: false,
      status: 400,
      message: 'Interview schedule is not configured for this job',
    };
  }

  const selectedDateKey = toDateKey(interviewDate) || schedule.dateKeys[0];
  if (!selectedDateKey || !schedule.dateKeys.includes(selectedDateKey)) {
    return {
      ok: false,
      status: 400,
      message: 'Selected interview date is not available for this job',
    };
  }

  const dateStart = fromDateKey(selectedDateKey);
  const queueAggregate = await prisma.application.aggregate({
    where: {
      jobId: application.jobId,
      status: 'INTERVIEW',
      interviewDate: dateStart,
    },
    _max: {
      interviewQueueNumber: true,
    },
  });

  const queueNumber = Number(queueAggregate?._max?.interviewQueueNumber || 0) + 1;
  const trimmedNote = String(note || '').trim();

  const updated = await prisma.application.update({
    where: { id },
    data: {
      status: 'INTERVIEW',
      interviewDate: dateStart,
      interviewStartTime: schedule.interviewStartTime,
      interviewQueueNumber: queueNumber,
      interviewNote: trimmedNote || null,
      manualInterviewOverride: true,
    },
    include: {
      job: true,
      student: {
        include: {
          user: true,
        },
      },
    },
  });

  await notifyInterviewAssignment({
    application: updated,
    company: application.job.company,
    dateKey: selectedDateKey,
    startTime: schedule.interviewStartTime,
    queueNumber,
    note: trimmedNote || null,
  });

  return { ok: true, application: updated };
}
