import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../connection/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getGlobalFlexibleThreshold,
  setGlobalFlexibleThreshold,
} from '../utils/platformSettings.js';

const router = express.Router();

function getLimit(value, fallback = 5) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 50);
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeUserIds(value) {
  if (!Array.isArray(value)) return [];
  const ids = value.map(parsePositiveInt).filter(Boolean);
  return [...new Set(ids)];
}

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const updateUserBodySchema = z
  .object({
    role: z.enum(['ADMIN', 'STUDENT', 'COMPANY']).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (typeof value.role === 'undefined' && typeof value.isActive === 'undefined') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No updates provided',
        path: ['root'],
      });
    }
  });
const bulkDeleteBodySchema = z.object({
  userIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
});
const createCompanyBodySchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  contactName: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(254),
  password: z.string().min(6).max(128),
  website: z.string().trim().max(2048).optional(),
});
const eligibilitySettingsSchema = z.object({
  flexibleThresholdDefaultPercent: z.coerce.number().int().min(0).max(100),
});

async function logAudit(db, { actorId, action, entityType, entityId = null, metadata = null }) {
  try {
    await db.auditLog.create({
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
  }
}

async function deleteUserDependencies(tx, targetUser) {
  if (targetUser.student?.id) {
    await tx.application.deleteMany({ where: { studentId: targetUser.student.id } });
    await tx.studentProfile.delete({ where: { id: targetUser.student.id } });
  }

  if (targetUser.company?.id) {
    const companyJobs = await tx.job.findMany({
      where: { companyId: targetUser.company.id },
      select: { id: true },
    });
    const companyJobIds = companyJobs.map((job) => job.id);
    if (companyJobIds.length > 0) {
      await tx.application.deleteMany({ where: { jobId: { in: companyJobIds } } });
    }
    await tx.job.deleteMany({ where: { companyId: targetUser.company.id } });
    await tx.companyProfile.delete({ where: { id: targetUser.company.id } });
  }
}

// Get admin dashboard statistics
router.get('/stats', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const [totalUsers, totalJobs, totalApplications, approvedApplications] = await Promise.all([
      prisma.user.count(),
      prisma.job.count(),
      prisma.application.count(),
      prisma.application.count({
        where: { status: { in: ['APPROVED', 'ACCEPTED'] } },
      }),
    ]);

    res.json({
      totalUsers,
      totalJobs,
      totalApplications,
      approvedApplications,
    });
  } catch (error) {
    console.error('Error in /stats endpoint:', error);
    res.status(500).json({ message: 'Failed to fetch admin statistics' });
  }
});

router.get('/settings', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const flexibleThresholdDefaultPercent = await getGlobalFlexibleThreshold(prisma);
    return res.json({
      eligibility: {
        flexibleThresholdDefaultPercent,
      },
    });
  } catch (error) {
    console.error('Error in /settings endpoint:', error);
    return res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

router.put(
  '/settings/eligibility',
  authenticate,
  authorize('ADMIN'),
  validate(eligibilitySettingsSchema),
  async (req, res) => {
    try {
      const savedPercent = await setGlobalFlexibleThreshold(
        req.body.flexibleThresholdDefaultPercent,
        prisma
      );

      await logAudit(prisma, {
        actorId: req.user.id,
        action: 'UPDATE_ELIGIBILITY_SETTINGS',
        entityType: 'PLATFORM_SETTING',
        entityId: 'GLOBAL_FLEXIBLE_THRESHOLD_PERCENT',
        metadata: {
          flexibleThresholdDefaultPercent: savedPercent,
        },
      });

      return res.json({
        message: 'Eligibility settings updated',
        eligibility: {
          flexibleThresholdDefaultPercent: savedPercent,
        },
      });
    } catch (error) {
      console.error('Error updating eligibility settings:', error);
      return res.status(500).json({ message: 'Failed to update eligibility settings' });
    }
  }
);

// Get recent users
router.get('/users', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const limit = getLimit(req.query.limit);
    const search = String(req.query.search || '').trim();
    const role = String(req.query.role || '')
      .trim()
      .toUpperCase();

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (['ADMIN', 'STUDENT', 'COMPANY'].includes(role)) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        student: true,
        company: true,
      },
    });

    // Format the response
    const formattedUsers = users.map((user) => {
      const profile = user.student || user.company || {};
      return {
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email || 'No email',
        role: user.role || 'USER',
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        isActive: Boolean(user.isActive),
        createdAt: user.createdAt,
        profile: {
          id: profile.id,
          phone: profile.phone || null,
          companyName: profile.name || null,
        },
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error in /users endpoint:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get recent jobs
router.get('/jobs', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const limit = getLimit(req.query.limit);
    const search = String(req.query.search || '').trim();

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { company: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const jobs = await prisma.job.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          include: {
            user: true,
          },
        },
        applications: {
          select: {
            id: true,
          },
        },
      },
    });

    const nowTs = Date.now();

    const resolveLifecycleStatus = (job) => {
      if (job?.isClosed) {
        return job?.autoFinalizedAt ? 'AUTO_CLOSED' : 'CLOSED';
      }

      const deadlineTs = job?.applicationDeadline
        ? new Date(job.applicationDeadline).getTime()
        : null;
      if (Number.isFinite(deadlineTs) && deadlineTs <= nowTs) return 'EXPIRED';
      return 'OPEN';
    };

    const hasInterviewSchedule = (job) => {
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
    };

    // Format the response with null checks
    const formattedJobs = jobs.map((job) => {
      const company = job.company || {};
      const companyUser = company.user || {};
      const lifecycleStatus = resolveLifecycleStatus(job);

      return {
        id: job.id,
        title: job.title || 'Untitled Job',
        type: job.type,
        status: lifecycleStatus,
        createdAt: job.createdAt,
        applicationDeadline: job.applicationDeadline,
        isClosed: Boolean(job.isClosed),
        closedAt: job.closedAt,
        autoFinalizedAt: job.autoFinalizedAt,
        scheduleConfigured: hasInterviewSchedule(job),
        interviewDates: Array.isArray(job.interviewDates) ? job.interviewDates : [],
        interviewStartTime: job.interviewStartTime || null,
        interviewCandidatesPerDay: job.interviewCandidatesPerDay || null,
        company: {
          id: company.id || 'unknown',
          name: company.name || companyUser.name || 'Unknown Company',
          email: companyUser.email || 'no-email@example.com',
        },
        applicationCount: job.applications?.length || 0,
      };
    });

    res.json(formattedJobs);
  } catch (error) {
    console.error('Error in /jobs endpoint:', error);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// Get recent audit logs
router.get('/audit-logs', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const limit = getLimit(req.query.limit, 20);
    const search = String(req.query.search || '').trim();
    const action = String(req.query.action || '').trim();
    const entityType = String(req.query.entityType || '').trim();

    const where = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (search) {
      where.OR = [
        { entityId: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { actor: { name: { contains: search, mode: 'insensitive' } } },
        { actor: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

// Admin: update user role/status
router.patch(
  '/users/:id',
  authenticate,
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  validate(updateUserBodySchema),
  async (req, res) => {
    try {
      const id = req.params.id;
      if (id === req.user.id) {
        return res.status(400).json({ message: 'You cannot update your own role or status' });
      }

      const nextRole =
        typeof req.body?.role === 'string' ? req.body.role.trim().toUpperCase() : null;
      const hasIsActive = Object.prototype.hasOwnProperty.call(req.body || {}, 'isActive');
      const nextIsActive = hasIsActive ? Boolean(req.body.isActive) : null;

      const current = await prisma.user.findUnique({ where: { id } });
      if (!current) return res.status(404).json({ message: 'User not found' });

      const updated = await prisma.$transaction(async (tx) => {
        if (nextRole === 'STUDENT') {
          const studentProfile = await tx.studentProfile.findUnique({ where: { userId: id } });
          if (!studentProfile) {
            await tx.studentProfile.create({ data: { userId: id } });
          }
        }

        if (nextRole === 'COMPANY') {
          const companyProfile = await tx.companyProfile.findUnique({ where: { userId: id } });
          if (!companyProfile) {
            await tx.companyProfile.create({
              data: {
                userId: id,
                name: current.name || `Company ${id}`,
              },
            });
          }
        }

        return tx.user.update({
          where: { id },
          data: {
            ...(nextRole ? { role: nextRole } : {}),
            ...(hasIsActive ? { isActive: nextIsActive } : {}),
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        });
      });

      await logAudit(prisma, {
        actorId: req.user.id,
        action: 'UPDATE_USER',
        entityType: 'USER',
        entityId: updated.id,
        metadata: {
          before: { role: current.role, isActive: current.isActive },
          after: { role: updated.role, isActive: updated.isActive },
        },
      });

      return res.json({ message: 'User updated', user: updated });
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ message: 'Failed to update user' });
    }
  }
);

// Admin: bulk delete users
router.post(
  '/users/bulk-delete',
  authenticate,
  authorize('ADMIN'),
  validate(bulkDeleteBodySchema),
  async (req, res) => {
    try {
      const userIds = normalizeUserIds(req.body?.userIds);
      if (!userIds.length) return res.status(400).json({ message: 'No valid userIds provided' });

      const filteredIds = userIds.filter((id) => id !== req.user.id);
      if (!filteredIds.length) {
        return res.status(400).json({ message: 'Cannot bulk delete your own account' });
      }

      const targets = await prisma.user.findMany({
        where: { id: { in: filteredIds } },
        include: {
          student: { select: { id: true } },
          company: { select: { id: true } },
        },
      });
      if (!targets.length) return res.status(404).json({ message: 'Users not found' });

      await prisma.$transaction(async (tx) => {
        for (const target of targets) {
          await deleteUserDependencies(tx, target);
          await tx.user.delete({ where: { id: target.id } });
        }

        await logAudit(tx, {
          actorId: req.user.id,
          action: 'BULK_DELETE_USERS',
          entityType: 'USER',
          metadata: { deletedUserIds: targets.map((u) => u.id), count: targets.length },
        });
      });

      return res.json({ message: 'Users deleted', count: targets.length });
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      return res.status(500).json({ message: 'Failed to bulk delete users' });
    }
  }
);

// Admin: delete a user (with dependent profile/app/job records)
router.delete(
  '/users/:id',
  authenticate,
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  async (req, res) => {
    try {
      const id = req.params.id;
      if (id === req.user.id) {
        return res.status(400).json({ message: 'You cannot delete your own account' });
      }

      const target = await prisma.user.findUnique({
        where: { id },
        include: {
          student: { select: { id: true } },
          company: { select: { id: true } },
        },
      });
      if (!target) return res.status(404).json({ message: 'User not found' });

      await prisma.$transaction(async (tx) => {
        await deleteUserDependencies(tx, target);
        await tx.user.delete({ where: { id: target.id } });
        await logAudit(tx, {
          actorId: req.user.id,
          action: 'DELETE_USER',
          entityType: 'USER',
          entityId: target.id,
          metadata: { email: target.email, role: target.role },
        });
      });

      return res.json({ message: 'User deleted' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ message: 'Failed to delete user' });
    }
  }
);

// Admin: delete a job (with dependent applications)
router.delete(
  '/jobs/:id',
  authenticate,
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  async (req, res) => {
    try {
      const id = req.params.id;

      const job = await prisma.job.findUnique({ where: { id } });
      if (!job) return res.status(404).json({ message: 'Job not found' });

      await prisma.$transaction([
        prisma.application.deleteMany({ where: { jobId: id } }),
        prisma.job.delete({ where: { id } }),
      ]);

      await logAudit(prisma, {
        actorId: req.user.id,
        action: 'DELETE_JOB',
        entityType: 'JOB',
        entityId: id,
        metadata: { title: job.title, companyId: job.companyId },
      });

      return res.json({ message: 'Job deleted' });
    } catch (error) {
      console.error('Error deleting job:', error);
      return res.status(500).json({ message: 'Failed to delete job' });
    }
  }
);

// Admin: create company account
router.post(
  '/companies',
  authenticate,
  authorize('ADMIN'),
  validate(createCompanyBodySchema),
  async (req, res) => {
    try {
      const { companyName, contactName, email, password, website } = req.body || {};

      const cleanCompanyName = String(companyName || '').trim();
      const cleanContactName = String(contactName || cleanCompanyName).trim();
      const cleanEmail = String(email || '')
        .trim()
        .toLowerCase();
      const cleanPassword = String(password || '');
      const cleanWebsite = typeof website === 'string' && website.trim() ? website.trim() : null;

      const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use' });
      }

      const hash = await bcrypt.hash(cleanPassword, 10);
      const created = await prisma.user.create({
        data: {
          name: cleanContactName || cleanCompanyName,
          email: cleanEmail,
          password: hash,
          role: 'COMPANY',
          company: {
            create: {
              name: cleanCompanyName,
              website: cleanWebsite,
            },
          },
        },
        include: {
          company: {
            select: { id: true, name: true, website: true },
          },
        },
      });

      await logAudit(prisma, {
        actorId: req.user.id,
        action: 'CREATE_COMPANY_ACCOUNT',
        entityType: 'USER',
        entityId: created.id,
        metadata: { email: created.email, companyId: created.company?.id || null },
      });

      return res.status(201).json({
        message: 'Company account created',
        user: {
          id: created.id,
          name: created.name,
          email: created.email,
          role: created.role,
          isActive: created.isActive,
        },
        company: created.company,
      });
    } catch (error) {
      console.error('Error creating company account:', error);
      return res.status(500).json({ message: 'Failed to create company account' });
    }
  }
);

export default router;
