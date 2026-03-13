import express from 'express';
import { z } from 'zod';
import prisma from '../connection/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();
const jobTypeSchema = z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT']);

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

const listJobsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  title: z.string().trim().max(120).optional(),
  position: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  companyId: z.coerce.number().int().positive().optional(),
});

const createJobSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(4000),
  location: z.string().trim().max(120).optional(),
  type: jobTypeSchema.optional(),
});

const updateJobSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(4000).optional(),
    location: z.string().trim().max(120).optional(),
    type: jobTypeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.title && !value.description && !value.location && !value.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No updates provided',
        path: ['root'],
      });
    }
  });

// GET /api/jobs - public list with filters
router.get('/', validate(listJobsQuerySchema, 'query'), async (req, res) => {
  try {
    const { q, title, position, location, companyId } = req.query;

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

    const where = {
      AND: [
        textMatch,
        locationValue ? { location: { contains: locationValue, mode: 'insensitive' } } : {},
        typeof companyId === 'number' ? { companyId } : {},
      ],
    };
    const jobs = await prisma.job.findMany({
      where,
      include: { company: { select: { id: true, name: true, userId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(jobs);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/jobs/company - list jobs posted by current company
router.get('/company', authenticate, authorize('COMPANY'), async (req, res) => {
  try {
    const userId = req.user.id;
    const company = await prisma.companyProfile.findUnique({ where: { userId } });
    if (!company) return res.status(400).json({ message: 'Company profile missing' });

    const jobs = await prisma.job.findMany({
      where: { companyId: company.id },
      include: { company: { select: { id: true, name: true, userId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(jobs);
  } catch (e) {
    console.error(e);
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
  } catch (e) {
    console.error(e);
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
      const userId = req.user.id;
      const company = await prisma.companyProfile.findUnique({ where: { userId } });
      if (!company) return res.status(400).json({ message: 'Company profile missing' });
      const { title, description, location, type } = req.body;
      const job = await prisma.job.create({
        data: { title, description, location, type, companyId: company.id },
      });
      return res.status(201).json(job);
    } catch (e) {
      console.error(e);
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

      const userId = req.user.id;
      const company = await prisma.companyProfile.findUnique({ where: { userId } });
      const job = await prisma.job.findUnique({ where: { id } });
      if (!job) return res.status(404).json({ message: 'Not found' });
      if (!company || company.id !== job.companyId)
        return res.status(403).json({ message: 'Forbidden' });
      const { title, description, location, type } = req.body;
      const updated = await prisma.job.update({
        where: { id },
        data: { title, description, location, type },
      });
      return res.json(updated);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// DELETE /api/jobs/:id - company deletes own job
router.delete('/:id', authenticate, authorize('COMPANY'), async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid job id' });

    const userId = req.user.id;
    const company = await prisma.companyProfile.findUnique({ where: { userId } });
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ message: 'Not found' });
    if (!company || company.id !== job.companyId)
      return res.status(403).json({ message: 'Forbidden' });
    await prisma.application.deleteMany({ where: { jobId: id } });
    await prisma.job.delete({ where: { id } });
    return res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
