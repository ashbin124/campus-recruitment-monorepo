import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const mimeToExt = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
};

function getFileExtension(file) {
  const byName = path.extname(file?.originalname || '').toLowerCase();
  if (byName) return byName;
  return mimeToExt[file?.mimetype] || '';
}

async function uploadLocally(file, folder) {
  const safeFolder = String(folder || 'campus_uploads').replace(/[^a-zA-Z0-9_-]/g, '_');
  const uploadsDir = path.join(process.cwd(), 'uploads', safeFolder);
  await mkdir(uploadsDir, { recursive: true });

  const ext = getFileExtension(file);
  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  const absolutePath = path.join(uploadsDir, filename);
  await writeFile(absolutePath, file.buffer);

  const base = String(process.env.API_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const relativeUrl = `/uploads/${safeFolder}/${filename}`;
  return {
    url: base ? `${base}${relativeUrl}` : relativeUrl,
    public_id: `local/${safeFolder}/${filename}`,
    format: ext.replace('.', '') || null,
  };
}

export const uploadToCloudinary = async (file, folder = 'campus_uploads') => {
  if (!cloudinaryConfigured) {
    return uploadLocally(file, folder);
  }

  return new Promise((resolve, reject) => {
    // For PDFs, Cloudinary works best when resource_type is 'image'
    const isPDF =
      file.mimetype === 'application/pdf' ||
      (file.originalname && file.originalname.toLowerCase().endsWith('.pdf'));

    const uploadOptions = {
      folder: folder,
      resource_type: isPDF ? 'image' : 'auto',
      access_mode: 'public',
      type: 'upload',
    };

    if (file.mimetype.startsWith('image/')) {
      uploadOptions.quality = 80;
      uploadOptions.fetch_format = 'auto';
    }

    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
        });
      })
      .end(file.buffer);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return false;
    if (String(publicId).startsWith('local/')) {
      const localPath = path.join(
        process.cwd(),
        'uploads',
        String(publicId).replace(/^local\//, '')
      );
      await unlink(localPath).catch(() => {});
      return true;
    }
    if (!cloudinaryConfigured) return false;
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    return false;
  }
};

export default cloudinary;
