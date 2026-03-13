import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import prisma from '../connection/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed for company profile images.'), false);
  },
});

const companyIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
const updateCompanyProfileSchema = z.object({
  companyName: z.string().trim().min(1).max(120).optional(),
  contactName: z.string().trim().min(1).max(120).optional(),
  website: z.string().trim().max(2048).optional(),
  location: z.string().trim().max(120).optional(),
  contactPhone: z.string().trim().max(32).optional(),
  about: z.string().trim().max(4000).optional(),
});

async function buildCompanyProfile(companyId) {
  const [company, totalJobs, totalApplications, acceptedApplications, interviews] =
    await Promise.all([
      prisma.companyProfile.findUnique({
        where: { id: companyId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.job.count({ where: { companyId } }),
      prisma.application.count({ where: { job: { companyId } } }),
      prisma.application.count({
        where: {
          job: { companyId },
          status: { in: ['ACCEPTED', 'APPROVED'] },
        },
      }),
      prisma.application.count({
        where: {
          job: { companyId },
          status: 'INTERVIEW',
        },
      }),
    ]);

  if (!company) return null;

  const recentJobs = await prisma.job.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  return {
    id: company.id,
    companyName: company.name,
    website: company.website || '',
    location: company.location || '',
    contactName: company.user?.name || '',
    contactEmail: company.user?.email || '',
    contactPhone: company.contactPhone || '',
    about: company.about || '',
    imageUrl: company.imageUrl || '',
    joinedAt: company.user?.createdAt || null,
    stats: {
      totalJobs,
      totalApplications,
      acceptedApplications,
      interviews,
    },
    recentJobs: recentJobs.map((job) => ({
      id: job.id,
      title: job.title,
      type: job.type,
      location: job.location,
      createdAt: job.createdAt,
      applicationCount: job._count?.applications || 0,
    })),
  };
}

// Company self profile
router.get('/me/profile', authenticate, authorize('COMPANY'), async (req, res) => {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user.id } });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });

    const profile = await buildCompanyProfile(company.id);
    if (!profile) return res.status(404).json({ message: 'Company profile not found' });
    return res.json(profile);
  } catch (error) {
    console.error('Error fetching company self profile:', error);
    return res.status(500).json({ message: 'Failed to fetch company profile' });
  }
});

// Company update own profile basics
router.put(
  '/me/profile',
  authenticate,
  authorize('COMPANY'),
  upload.single('companyImage'),
  validate(updateCompanyProfileSchema),
  async (req, res) => {
    try {
      const company = await prisma.companyProfile.findUnique({ where: { userId: req.user.id } });
      if (!company) return res.status(404).json({ message: 'Company profile not found' });

      const hasCompanyName = Object.prototype.hasOwnProperty.call(req.body || {}, 'companyName');
      const hasContactName = Object.prototype.hasOwnProperty.call(req.body || {}, 'contactName');
      const hasWebsite = Object.prototype.hasOwnProperty.call(req.body || {}, 'website');
      const hasLocation = Object.prototype.hasOwnProperty.call(req.body || {}, 'location');
      const hasContactPhone = Object.prototype.hasOwnProperty.call(req.body || {}, 'contactPhone');
      const hasAbout = Object.prototype.hasOwnProperty.call(req.body || {}, 'about');

      const companyName = hasCompanyName ? String(req.body.companyName || '').trim() : '';
      const contactName = hasContactName ? String(req.body.contactName || '').trim() : '';
      const website = hasWebsite ? String(req.body.website || '').trim() : '';
      const location = hasLocation ? String(req.body.location || '').trim() : '';
      const contactPhone = hasContactPhone ? String(req.body.contactPhone || '').trim() : '';
      const about = hasAbout ? String(req.body.about || '').trim() : '';

      let companyImageUrl = null;
      if (req.file) {
        const uploaded = await uploadToCloudinary(req.file, 'campus_company_images');
        companyImageUrl = uploaded.url;
      }

      const hasAnyUpdate =
        hasCompanyName ||
        hasContactName ||
        hasWebsite ||
        hasLocation ||
        hasContactPhone ||
        hasAbout ||
        Boolean(companyImageUrl);

      if (!hasAnyUpdate) {
        return res.status(400).json({ message: 'No changes provided' });
      }

      await prisma.$transaction(async (tx) => {
        const companyData = {
          ...(hasCompanyName ? { name: companyName } : {}),
          ...(hasWebsite ? { website: website || null } : {}),
          ...(hasLocation ? { location: location || null } : {}),
          ...(hasContactPhone ? { contactPhone: contactPhone || null } : {}),
          ...(hasAbout ? { about: about || null } : {}),
          ...(companyImageUrl ? { imageUrl: companyImageUrl } : {}),
        };

        if (Object.keys(companyData).length > 0) {
          await tx.companyProfile.update({
            where: { id: company.id },
            data: companyData,
          });
        }

        if (hasContactName) {
          await tx.user.update({
            where: { id: req.user.id },
            data: { name: contactName },
          });
        }
      });

      const profile = await buildCompanyProfile(company.id);
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });

      return res.json({
        message: 'Company profile updated successfully',
        profile,
        user,
      });
    } catch (error) {
      console.error('Error updating company profile:', error);
      return res.status(500).json({ message: 'Failed to update company profile' });
    }
  }
);

// Public company profile
router.get('/:id', validate(companyIdParamSchema, 'params'), async (req, res) => {
  try {
    const companyId = req.params.id;
    const profile = await buildCompanyProfile(companyId);
    if (!profile) return res.status(404).json({ message: 'Company not found' });
    return res.json(profile);
  } catch (error) {
    console.error('Error fetching public company profile:', error);
    return res.status(500).json({ message: 'Failed to fetch company profile' });
  }
});

export default router;
