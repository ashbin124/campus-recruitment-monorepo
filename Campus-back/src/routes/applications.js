import express from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../connection/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendOfferLetter, sendInterviewInvite } from '../utils/mail.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();
const APPLICATION_STATUSES = ['PENDING', 'INTERVIEW', 'ACCEPTED', 'REJECTED', 'APPROVED'];
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
});
const retryEmailSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});

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
      await sendInterviewInvite(notification.to, studentName, companyName, jobTitle, message || '');
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
      job: true,
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

      const userId = req.user.id;
      const student = await prisma.studentProfile.findUnique({ where: { userId } });
      if (!student) return res.status(400).json({ message: 'Student profile missing' });
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) return res.status(404).json({ message: 'Job not found' });

      const { phone, resumeUrl } = req.body || {};
      if (phone || resumeUrl) {
        await prisma.studentProfile.update({
          where: { id: student.id },
          data: { phone: phone ?? undefined, resumeUrl: resumeUrl ?? undefined },
        });
      }

      try {
        const appRec = await prisma.application.create({ data: { jobId, studentId: student.id } });
        return res.status(201).json(appRec);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return res.status(409).json({ message: 'Already applied' });
        }
        throw error;
      }
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// Student: list my applications
router.get('/me', authenticate, authorize('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const student = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!student) return res.status(400).json({ message: 'Student profile missing' });
    const apps = await prisma.application.findMany({
      where: { studentId: student.id },
      include: { job: { include: { company: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(apps);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Company: list applications for my jobs
router.get('/company', authenticate, authorize('COMPANY'), async (req, res) => {
  try {
    const userId = req.user.id;
    const company = await prisma.companyProfile.findUnique({ where: { userId } });
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
      orderBy: { createdAt: 'desc' },
    });

    const toAbsoluteResumeUrl = (resumeUrl) => {
      if (!resumeUrl) return null;
      if (/^https?:\/\//i.test(resumeUrl)) return resumeUrl;
      const normalizedPath = resumeUrl.startsWith('/') ? resumeUrl : `/${resumeUrl}`;
      return `${base}${normalizedPath}`;
    };

    const appsWithResumeUrl = apps.map((app) => ({
      ...app,
      student: {
        ...app.student,
        resumeUrl: toAbsoluteResumeUrl(app.student.resumeUrl),
      },
    }));

    return res.json(appsWithResumeUrl);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Company: update application status (e.g., ACCEPTED/REJECTED)
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
      const rawStatus =
        typeof req.body?.status === 'string' ? req.body.status.trim().toUpperCase() : '';
      const note = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

      const { company, application: currentApplication } = await getCompanyApplicationContext(
        id,
        actorId
      );

      if (!currentApplication) return res.status(404).json({ message: 'Application not found' });
      if (!company || currentApplication.job.companyId !== company.id) {
        return res.status(403).json({ message: 'Not authorized to update this application' });
      }

      const nextStatus = rawStatus || currentApplication.status;
      const updatedApplication = await prisma.application.update({
        where: { id },
        data: { status: nextStatus },
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
          toStatus: nextStatus,
          companyId: company.id,
          note: note || null,
        },
      });

      const emailNotification = await sendStatusEmail({
        application: updatedApplication,
        company,
        status: nextStatus,
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
            status: nextStatus,
            sent: emailNotification.sent,
            retryable: emailNotification.retryable,
            to: emailNotification.to,
            message: emailNotification.message,
            errorCode: emailNotification.errorCode,
          },
        });
      }

      const emailDeliveryLogs = await getEmailDeliveryLogs(id);

      return res.json({
        message: `Application marked as ${nextStatus}.`,
        application: updatedApplication,
        emailNotification,
        emailDeliveryLogs,
      });
    } catch (e) {
      console.error('Error updating application status:', e);
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

      const emailDeliveryLogs = await getEmailDeliveryLogs(id);

      return res.json({
        message: emailNotification.sent
          ? 'Email notification sent successfully.'
          : 'Email retry failed. Please review delivery logs and retry.',
        application,
        emailNotification,
        emailDeliveryLogs,
      });
    } catch (e) {
      console.error('Error retrying application email:', e);
      return res.status(500).json({ message: 'Failed to retry email notification' });
    }
  }
);

export default router;
