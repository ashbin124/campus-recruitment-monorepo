import express from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../connection/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendOfferLetter, sendInterviewInvite } from '../utils/mail.js';
import { validate } from '../middleware/validate.js';
import { evaluateJobEligibility } from '../utils/eligibility.js';
import { extractResumeText } from '../utils/resumeScanner.js';
import {
  manualAssignApplicationToInterview,
  recomputeInterviewAssignmentsForJob,
} from '../services/interviewScheduler.js';

const router = express.Router();
const APPLICATION_STATUSES = [
  'PENDING',
  'WAITLIST',
  'INTERVIEW',
  'ACCEPTED',
  'REJECTED',
  'APPROVED',
];
const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
const EMAIL_LOG_ENTITY = 'APPLICATION_EMAIL';

const jobIdParamSchema = z.object({ jobId: z.coerce.number().int().positive() });
const applicationIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
const applyBodySchema = z.object({
  phone: z.string().trim().max(32).optional(),
  resumeUrl: z.string().trim().max(2048).optional(),
});
const updateApplicationSchema = z.object({
  status: z.string().trim().toUpperCase().pipe(applicationStatusSchema).optional(),
  message: z.string().trim().max(1000).optional(),
  interviewDate: z.string().trim().optional(),
});
const retryEmailSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});
const manualAssignSchema = z.object({
  interviewDate: z.string().trim().optional(),
  message: z.string().trim().max(1000).optional(),
});

function toDateKey(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function hasInterviewSchedule(job) {
  const interviewDates = Array.isArray(job?.interviewDates) ? job.interviewDates : [];
  const interviewStartTime = String(job?.interviewStartTime || '').trim();
  const interviewCandidatesPerDay = Number.parseInt(
    String(job?.interviewCandidatesPerDay || ''),
    10
  );

  return Boolean(
    interviewDates.length > 0 &&
    /^([01]\d|2[0-3]):([0-5]\d)$/.test(interviewStartTime) &&
    Number.isInteger(interviewCandidatesPerDay) &&
    interviewCandidatesPerDay > 0
  );
}

function shouldSendStatusEmail(status) {
  return status === 'ACCEPTED' || status === 'INTERVIEW';
}

async function writeAuditLog({ actorId, action, entityType, entityId, metadata }) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        action,
        entityType,
        entityId: entityId != null ? String(entityId) : null,
        metadata: metadata || undefined,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
}

async function getEmailDeliveryLogs(applicationId, limit = 8) {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: EMAIL_LOG_ENTITY,
      entityId: String(applicationId),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(limit, 20)),
    include: {
      actor: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  return logs.map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt,
    actor: entry.actor,
    action: entry.action,
    metadata: entry.metadata || null,
  }));
}

async function sendStatusEmail({ application, company, status, message }) {
  const notification = {
    attempted: false,
    sent: false,
    retryable: false,
    status,
    to: application?.student?.user?.email || null,
    message: 'No email needed for this status change.',
    errorCode: null,
  };

  if (!shouldSendStatusEmail(status)) return notification;

  notification.attempted = true;

  if (!notification.to) {
    notification.message = 'Student email is missing, so notification email could not be sent.';
    return notification;
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    notification.retryable = true;
    notification.message =
      'Email service is not configured. Status was updated, but email was not sent.';
    notification.errorCode = 'EMAIL_NOT_CONFIGURED';
    return notification;
  }

  try {
    const studentName = application?.student?.user?.name || 'Student';
    const companyName = company?.name || company?.user?.name || 'Company';
    const jobTitle = application?.job?.title || 'Job';

    if (status === 'ACCEPTED') {
      await sendOfferLetter(notification.to, studentName, companyName, jobTitle);
    } else {
      const scheduleDetails = [
        application?.interviewDate ? `Date: ${toDateKey(application.interviewDate)}` : null,
        application?.interviewStartTime ? `Start time: ${application.interviewStartTime}` : null,
        Number.isInteger(application?.interviewQueueNumber)
          ? `Queue number: ${application.interviewQueueNumber}`
          : null,
        message || null,
      ]
        .filter(Boolean)
        .join('\n');

      await sendInterviewInvite(
        notification.to,
        studentName,
        companyName,
        jobTitle,
        scheduleDetails
      );
    }

    notification.sent = true;
    notification.message = `Status updated and email sent to ${notification.to}.`;
    return notification;
  } catch (error) {
    notification.retryable = true;
    notification.errorCode = error?.code || 'EMAIL_SEND_FAILED';
    notification.message =
      'Status updated, but email notification failed. You can retry sending it.';
    return notification;
  }
}

async function getCompanyApplicationContext(applicationId, userId) {
  const company = await prisma.companyProfile.findUnique({
    where: { userId },
    include: { user: true },
  });

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
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

  return { company, application };
}

// Student applies to a job
router.post(
  '/jobs/:jobId/apply',
  authenticate,
  authorize('STUDENT'),
  validate(jobIdParamSchema, 'params'),
  validate(applyBodySchema),
  async (req, res) => {
    try {
      const jobId = req.params.jobId;

      const student = await prisma.studentProfile.findUnique({
        where: { userId: req.user.id },
        include: { user: true },
      });
      if (!student) return res.status(400).json({ message: 'Student profile missing' });

      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          company: {
            include: {
              user: true,
            },
          },
        },
      });
      if (!job) return res.status(404).json({ message: 'Job not found' });
      if (!hasInterviewSchedule(job)) {
        return res.status(400).json({
          message:
            'This job is not accepting applications yet because interview schedule is not configured.',
        });
      }

      const { phone, resumeUrl } = req.body || {};
      let effectiveResumeUrl = student.resumeUrl;

      if (phone || resumeUrl) {
        const updatedStudent = await prisma.studentProfile.update({
          where: { id: student.id },
          data: {
            phone: phone ?? undefined,
            resumeUrl: resumeUrl ?? undefined,
          },
        });
        effectiveResumeUrl = updatedStudent.resumeUrl;
      }

      const resumeText = await extractResumeText(effectiveResumeUrl);
      const evaluation = evaluateJobEligibility({
        job,
        student: {
          ...student,
          resumeUrl: effectiveResumeUrl,
        },
        resumeText,
      });

      if (!evaluation.eligible) {
        return res.status(400).json({
          message: 'You do not meet this job requirement.',
          reasons: evaluation.reasons,
          matchScore: evaluation.score,
        });
      }

      try {
        const appRec = await prisma.application.create({
          data: {
            jobId,
            studentId: student.id,
            status: 'PENDING',
            matchScore: evaluation.score,
            matchSummary: {
              eligible: true,
              reasons: [],
              matchedSkills: evaluation.matchedSkills,
              details: evaluation.details,
            },
          },
        });

        await recomputeInterviewAssignmentsForJob(jobId, {
          reason: 'NEW_APPLICATION',
          actorId: req.user.id,
        });

        const latest = await prisma.application.findUnique({
          where: { id: appRec.id },
        });

        return res.status(201).json(
          latest || {
            ...appRec,
            status: 'PENDING',
          }
        );
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return res.status(409).json({ message: 'Already applied' });
        }
        throw error;
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// Student: list my applications
router.get('/me', authenticate, authorize('STUDENT'), async (req, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(400).json({ message: 'Student profile missing' });

    const apps = await prisma.application.findMany({
      where: { studentId: student.id },
      include: { job: { include: { company: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(apps);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Company: list applications for my jobs
router.get('/company', authenticate, authorize('COMPANY'), async (req, res) => {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user.id } });
    if (!company) return res.status(400).json({ message: 'Company profile missing' });

    const configuredBase = String(process.env.API_URL || '')
      .trim()
      .replace(/\/+$/, '');
    const requestBase = `${req.protocol}://${req.get('host')}`;
    const base = configuredBase || requestBase;

    const apps = await prisma.application.findMany({
      where: { job: { companyId: company.id } },
      include: {
        job: true,
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { matchScore: 'desc' }, { createdAt: 'asc' }],
    });

    const toAbsoluteResumeUrl = (resumeUrl) => {
      if (!resumeUrl) return null;
      if (/^https?:\/\//i.test(resumeUrl)) return resumeUrl;
      const normalizedPath = resumeUrl.startsWith('/') ? resumeUrl : `/${resumeUrl}`;
      return `${base}${normalizedPath}`;
    };

    return res.json(
      apps.map((app) => ({
        ...app,
        student: {
          ...app.student,
          resumeUrl: toAbsoluteResumeUrl(app.student.resumeUrl),
        },
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Company: manual assign or reschedule interview with override
router.post(
  '/:id/manual-assign',
  authenticate,
  authorize('COMPANY'),
  validate(applicationIdParamSchema, 'params'),
  validate(manualAssignSchema),
  async (req, res) => {
    try {
      const id = req.params.id;
      const interviewDate = req.body?.interviewDate;
      const message = req.body?.message;

      const result = await manualAssignApplicationToInterview({
        applicationId: id,
        actorId: req.user.id,
        interviewDate,
        note: message,
      });

      if (!result.ok) {
        return res.status(result.status || 400).json({ message: result.message || 'Failed' });
      }

      await writeAuditLog({
        actorId: req.user.id,
        action: 'MANUAL_INTERVIEW_ASSIGNMENT',
        entityType: 'APPLICATION',
        entityId: id,
        metadata: {
          interviewDate: toDateKey(result?.application?.interviewDate),
          interviewStartTime: result?.application?.interviewStartTime || null,
          interviewQueueNumber: result?.application?.interviewQueueNumber || null,
          note: String(message || '').trim() || null,
        },
      });

      return res.json({
        message: 'Interview assigned manually.',
        application: result.application,
      });
    } catch (error) {
      console.error('Error in manual interview assignment:', error);
      return res.status(500).json({ message: 'Failed to assign interview' });
    }
  }
);

// Company: update application status
router.patch(
  '/:id',
  authenticate,
  authorize('COMPANY'),
  validate(applicationIdParamSchema, 'params'),
  validate(updateApplicationSchema),
  async (req, res) => {
    try {
      const id = req.params.id;
      const actorId = req.user.id;
      const nextStatus =
        typeof req.body?.status === 'string' ? req.body.status.trim().toUpperCase() : '';
      const note = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      const interviewDate =
        typeof req.body?.interviewDate === 'string' ? req.body.interviewDate : '';

      const { company, application: currentApplication } = await getCompanyApplicationContext(
        id,
        actorId
      );

      if (!currentApplication) return res.status(404).json({ message: 'Application not found' });
      if (!company || currentApplication.job.companyId !== company.id) {
        return res.status(403).json({ message: 'Not authorized to update this application' });
      }

      if (nextStatus === 'INTERVIEW') {
        const result = await manualAssignApplicationToInterview({
          applicationId: id,
          actorId,
          interviewDate,
          note,
        });
        if (!result.ok) {
          return res.status(result.status || 400).json({ message: result.message || 'Failed' });
        }

        await writeAuditLog({
          actorId,
          action: 'UPDATE_APPLICATION_STATUS',
          entityType: 'APPLICATION',
          entityId: id,
          metadata: {
            fromStatus: currentApplication.status,
            toStatus: 'INTERVIEW',
            companyId: company.id,
            note: note || null,
            interviewDate: toDateKey(result.application.interviewDate),
            interviewStartTime: result.application.interviewStartTime || null,
            interviewQueueNumber: result.application.interviewQueueNumber || null,
          },
        });

        return res.json({
          message: 'Interview assigned successfully.',
          application: result.application,
          emailNotification: {
            attempted: true,
            sent: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
            retryable: !Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
            to: result.application?.student?.user?.email || null,
          },
          emailDeliveryLogs: await getEmailDeliveryLogs(id),
        });
      }

      const statusToPersist = nextStatus || currentApplication.status;
      const updateData = {
        status: statusToPersist,
        manualInterviewOverride: statusToPersist === 'INTERVIEW',
      };

      if (statusToPersist !== 'INTERVIEW') {
        updateData.interviewDate = null;
        updateData.interviewStartTime = null;
        updateData.interviewQueueNumber = null;
        updateData.interviewNote = note || currentApplication.interviewNote || null;
        if (statusToPersist !== 'WAITLIST') {
          updateData.waitlistRank = null;
        }
      } else if (note) {
        updateData.interviewNote = note;
      }

      const updatedApplication = await prisma.application.update({
        where: { id },
        data: updateData,
        include: {
          job: true,
          student: {
            include: {
              user: true,
            },
          },
        },
      });

      await writeAuditLog({
        actorId,
        action: 'UPDATE_APPLICATION_STATUS',
        entityType: 'APPLICATION',
        entityId: id,
        metadata: {
          fromStatus: currentApplication.status,
          toStatus: statusToPersist,
          companyId: company.id,
          note: note || null,
        },
      });

      const emailNotification = await sendStatusEmail({
        application: updatedApplication,
        company,
        status: statusToPersist,
        message: note,
      });

      if (emailNotification.attempted) {
        await writeAuditLog({
          actorId,
          action: 'APPLICATION_EMAIL_STATUS_UPDATE',
          entityType: EMAIL_LOG_ENTITY,
          entityId: id,
          metadata: {
            attemptType: 'status_update',
            status: statusToPersist,
            sent: emailNotification.sent,
            retryable: emailNotification.retryable,
            to: emailNotification.to,
            message: emailNotification.message,
            errorCode: emailNotification.errorCode,
          },
        });
      }

      if (
        statusToPersist === 'REJECTED' ||
        statusToPersist === 'ACCEPTED' ||
        statusToPersist === 'APPROVED'
      ) {
        await recomputeInterviewAssignmentsForJob(currentApplication.jobId, {
          reason: 'STATUS_CHANGED',
          actorId,
        });
      }

      return res.json({
        message: `Application marked as ${statusToPersist}.`,
        application: updatedApplication,
        emailNotification,
        emailDeliveryLogs: await getEmailDeliveryLogs(id),
      });
    } catch (error) {
      console.error('Error updating application status:', error);
      return res.status(500).json({ message: 'Failed to update application status' });
    }
  }
);

// Company: retry sending status email for accepted/interview applications
router.post(
  '/:id/retry-email',
  authenticate,
  authorize('COMPANY'),
  validate(applicationIdParamSchema, 'params'),
  validate(retryEmailSchema),
  async (req, res) => {
    try {
      const id = req.params.id;
      const actorId = req.user.id;
      const note = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

      const { company, application } = await getCompanyApplicationContext(id, actorId);

      if (!application) return res.status(404).json({ message: 'Application not found' });
      if (!company || application.job.companyId !== company.id) {
        return res.status(403).json({ message: 'Not authorized to update this application' });
      }

      if (!shouldSendStatusEmail(application.status)) {
        return res.status(400).json({
          message: 'Email retries are only available for INTERVIEW or ACCEPTED applications.',
        });
      }

      const emailNotification = await sendStatusEmail({
        application,
        company,
        status: application.status,
        message: note,
      });

      await writeAuditLog({
        actorId,
        action: 'APPLICATION_EMAIL_RETRY',
        entityType: EMAIL_LOG_ENTITY,
        entityId: id,
        metadata: {
          attemptType: 'manual_retry',
          status: application.status,
          sent: emailNotification.sent,
          retryable: emailNotification.retryable,
          to: emailNotification.to,
          message: emailNotification.message,
          errorCode: emailNotification.errorCode,
          note: note || null,
        },
      });

      return res.json({
        message: emailNotification.sent
          ? 'Email notification sent successfully.'
          : 'Email retry failed. Please review delivery logs and retry.',
        application,
        emailNotification,
        emailDeliveryLogs: await getEmailDeliveryLogs(id),
      });
    } catch (error) {
      console.error('Error retrying application email:', error);
      return res.status(500).json({ message: 'Failed to retry email notification' });
    }
  }
);

export default router;
