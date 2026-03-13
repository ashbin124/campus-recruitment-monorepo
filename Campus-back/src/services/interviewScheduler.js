import prisma from '../connection/prisma.js';
import { evaluateJobEligibility } from '../utils/eligibility.js';
import { sendInterviewInvite } from '../utils/mail.js';
import { createNotification } from '../utils/notifications.js';
import { extractResumeText } from '../utils/resumeScanner.js';

const TERMINAL_STATUSES = new Set(['ACCEPTED', 'APPROVED', 'REJECTED']);

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

function formatInterviewLabel({ dateKey, startTime, queueNumber }) {
  const dateLabel = dateKey ? new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString() : 'TBD';
  const queueText = Number.isInteger(queueNumber) ? `Queue #${queueNumber}` : 'Queue TBD';
  return `${dateLabel} at ${startTime || 'TBD'} (${queueText})`;
}

function isInterviewChanged(current, desired) {
  return (
    current.status !== desired.status ||
    toDateKey(current.interviewDate) !== desired.interviewDateKey ||
    String(current.interviewStartTime || '') !== String(desired.interviewStartTime || '') ||
    Number(current.interviewQueueNumber || 0) !== Number(desired.interviewQueueNumber || 0) ||
    Number(current.waitlistRank || 0) !== Number(desired.waitlistRank || 0) ||
    Number(current.matchScore || 0) !== Number(desired.matchScore || 0) ||
    Boolean(current.manualInterviewOverride) !== Boolean(desired.manualInterviewOverride)
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

async function notifyWaitlist({ application, company, rank }) {
  const studentUser = application?.student?.user;
  if (!studentUser?.id) return;

  await createNotification({
    userId: studentUser.id,
    type: 'INTERVIEW_WAITLIST',
    title: `Waitlisted: ${application?.job?.title || 'Job'}`,
    message: `${company?.name || 'Company'} placed your application on interview waitlist${
      Number.isInteger(rank) ? ` (#${rank})` : ''
    }.`,
    metadata: {
      applicationId: application.id,
      jobId: application.jobId,
      waitlistRank: Number.isInteger(rank) ? rank : null,
    },
  });
}

async function buildEvaluations(job, applications) {
  return Promise.all(
    applications.map(async (application) => {
      if (application.manualInterviewOverride) {
        return {
          application,
          evaluation: {
            eligible: true,
            reasons: [],
            score: Math.max(95, Number(application.matchScore || 0)),
            matchedSkills: [],
            missingSkills: [],
            details: { manualOverride: true },
          },
        };
      }

      const resumeText = await extractResumeText(application?.student?.resumeUrl);
      const evaluation = evaluateJobEligibility({
        job,
        student: application?.student || {},
        resumeText,
      });

      return { application, evaluation };
    })
  );
}

export async function recomputeInterviewAssignmentsForJob(jobId, options = {}) {
  const id = Number.parseInt(String(jobId), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return { updated: 0, assigned: 0, waitlisted: 0, skipped: true, reason: 'INVALID_JOB' };
  }

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

  if (!job)
    return { updated: 0, assigned: 0, waitlisted: 0, skipped: true, reason: 'JOB_NOT_FOUND' };

  const schedule = normalizeSchedule(job);
  if (!schedule.configured) {
    return {
      updated: 0,
      assigned: 0,
      waitlisted: 0,
      skipped: true,
      reason: 'SCHEDULE_NOT_CONFIGURED',
    };
  }

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
    return {
      updated: 0,
      assigned: 0,
      waitlisted: 0,
      skipped: false,
      reason: 'NO_ACTIVE_APPLICATIONS',
    };
  }

  const evaluatedEntries = await buildEvaluations(job, activeApplications);

  const lockedInterviewEntries = evaluatedEntries.filter(
    (entry) =>
      entry.application.manualInterviewOverride === true && entry.application.status === 'INTERVIEW'
  );

  const slotUsage = new Map(schedule.dateKeys.map((dateKey) => [dateKey, 0]));
  for (const entry of lockedInterviewEntries) {
    const dateKey = toDateKey(entry.application.interviewDate);
    if (!dateKey || !slotUsage.has(dateKey)) continue;
    slotUsage.set(dateKey, slotUsage.get(dateKey) + 1);
  }

  const eligibleQueue = evaluatedEntries
    .filter(
      (entry) =>
        entry.evaluation.eligible &&
        !(
          entry.application.manualInterviewOverride === true &&
          entry.application.status === 'INTERVIEW'
        )
    )
    .sort((left, right) => {
      if (right.evaluation.score !== left.evaluation.score) {
        return right.evaluation.score - left.evaluation.score;
      }
      const leftTime = new Date(left.application.createdAt).getTime();
      const rightTime = new Date(right.application.createdAt).getTime();
      if (leftTime !== rightTime) return leftTime - rightTime;
      return left.application.id - right.application.id;
    });

  let waitlistRankCursor = 1;
  const desiredById = new Map();

  for (const entry of evaluatedEntries) {
    const { application, evaluation } = entry;
    desiredById.set(application.id, {
      status: 'PENDING',
      matchScore: evaluation.score,
      matchSummary: {
        eligible: evaluation.eligible,
        reasons: evaluation.reasons,
        matchedSkills: evaluation.matchedSkills,
        missingSkills: evaluation.missingSkills,
        details: evaluation.details,
      },
      interviewDateKey: null,
      interviewStartTime: null,
      interviewQueueNumber: null,
      waitlistRank: null,
      manualInterviewOverride: Boolean(application.manualInterviewOverride),
      interviewNote: application.interviewNote || null,
    });
  }

  for (const entry of lockedInterviewEntries) {
    const app = entry.application;
    const dateKey = toDateKey(app.interviewDate) || schedule.dateKeys[0] || null;
    const queueNumber = Number.isInteger(app.interviewQueueNumber)
      ? app.interviewQueueNumber
      : null;

    desiredById.set(app.id, {
      status: 'INTERVIEW',
      matchScore: Math.max(entry.evaluation.score, Number(app.matchScore || 0)),
      matchSummary: {
        eligible: true,
        reasons: [],
        matchedSkills: [],
        missingSkills: [],
        details: { manualOverride: true },
      },
      interviewDateKey: dateKey,
      interviewStartTime: app.interviewStartTime || schedule.interviewStartTime,
      interviewQueueNumber: queueNumber,
      waitlistRank: null,
      manualInterviewOverride: true,
      interviewNote: app.interviewNote || null,
    });
  }

  for (const entry of eligibleQueue) {
    const app = entry.application;

    let assignedDateKey = null;
    let queueNumber = null;

    for (const dateKey of schedule.dateKeys) {
      const used = slotUsage.get(dateKey) || 0;
      if (used < schedule.interviewCandidatesPerDay) {
        assignedDateKey = dateKey;
        queueNumber = used + 1;
        slotUsage.set(dateKey, used + 1);
        break;
      }
    }

    if (assignedDateKey) {
      desiredById.set(app.id, {
        status: 'INTERVIEW',
        matchScore: entry.evaluation.score,
        matchSummary: {
          eligible: true,
          reasons: [],
          matchedSkills: entry.evaluation.matchedSkills,
          missingSkills: [],
          details: entry.evaluation.details,
        },
        interviewDateKey: assignedDateKey,
        interviewStartTime: schedule.interviewStartTime,
        interviewQueueNumber: queueNumber,
        waitlistRank: null,
        manualInterviewOverride: false,
        interviewNote: app.interviewNote || null,
      });
    } else {
      desiredById.set(app.id, {
        status: 'WAITLIST',
        matchScore: entry.evaluation.score,
        matchSummary: {
          eligible: true,
          reasons: [],
          matchedSkills: entry.evaluation.matchedSkills,
          missingSkills: [],
          details: entry.evaluation.details,
        },
        interviewDateKey: null,
        interviewStartTime: null,
        interviewQueueNumber: null,
        waitlistRank: waitlistRankCursor,
        manualInterviewOverride: false,
        interviewNote: app.interviewNote || null,
      });
      waitlistRankCursor += 1;
    }
  }

  const updates = [];
  for (const entry of evaluatedEntries) {
    const current = entry.application;
    const desired = desiredById.get(current.id);
    if (!desired) continue;
    if (!isInterviewChanged(current, desired)) continue;

    updates.push({
      current,
      desired,
    });
  }

  if (!updates.length) {
    return {
      updated: 0,
      assigned: 0,
      waitlisted: waitlistRankCursor - 1,
      skipped: false,
      reason: 'NO_CHANGES',
    };
  }

  const updatedApplications = await prisma.$transaction(
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
          waitlistRank: desired.waitlistRank,
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

  let assigned = 0;
  let waitlisted = 0;

  for (let index = 0; index < updates.length; index += 1) {
    const change = updates[index];
    const updated = updatedApplications[index];
    const desired = change.desired;
    const movedToInterview =
      desired.status === 'INTERVIEW' &&
      (change.current.status !== 'INTERVIEW' ||
        toDateKey(change.current.interviewDate) !== desired.interviewDateKey ||
        Number(change.current.interviewQueueNumber || 0) !==
          Number(desired.interviewQueueNumber || 0));

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

    const movedToWaitlist = desired.status === 'WAITLIST' && change.current.status !== 'WAITLIST';
    if (movedToWaitlist) {
      waitlisted += 1;
      await notifyWaitlist({
        application: updated,
        company: job.company,
        rank: desired.waitlistRank,
      });
    }
  }

  return {
    updated: updates.length,
    assigned,
    waitlisted: waitlistRankCursor - 1,
    skipped: false,
    reason: options?.reason || 'AUTO',
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
      waitlistRank: null,
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

  await recomputeInterviewAssignmentsForJob(application.jobId, {
    reason: 'MANUAL_OVERRIDE',
    actorId,
  });

  return { ok: true, application: updated };
}
