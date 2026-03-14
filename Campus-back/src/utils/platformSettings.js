import prisma from '../connection/prisma.js';

export const GLOBAL_FLEXIBLE_THRESHOLD_KEY = 'GLOBAL_FLEXIBLE_THRESHOLD_PERCENT';
export const DEFAULT_GLOBAL_FLEXIBLE_THRESHOLD = 40;
export const DEFAULT_NEAR_MATCH_WINDOW = 10;

export function clampPercentage(value, fallback = DEFAULT_GLOBAL_FLEXIBLE_THRESHOLD) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return parsed;
}

export async function getGlobalFlexibleThreshold(db = prisma) {
  try {
    const record = await db.platformSetting.findUnique({
      where: { key: GLOBAL_FLEXIBLE_THRESHOLD_KEY },
      select: { valueInt: true },
    });
    return clampPercentage(record?.valueInt, DEFAULT_GLOBAL_FLEXIBLE_THRESHOLD);
  } catch (error) {
    console.error('Failed to load global flexible threshold setting:', error);
    return DEFAULT_GLOBAL_FLEXIBLE_THRESHOLD;
  }
}

export async function setGlobalFlexibleThreshold(value, db = prisma) {
  const nextValue = clampPercentage(value, DEFAULT_GLOBAL_FLEXIBLE_THRESHOLD);
  const saved = await db.platformSetting.upsert({
    where: { key: GLOBAL_FLEXIBLE_THRESHOLD_KEY },
    update: { valueInt: nextValue },
    create: {
      key: GLOBAL_FLEXIBLE_THRESHOLD_KEY,
      valueInt: nextValue,
    },
    select: { valueInt: true },
  });

  return clampPercentage(saved?.valueInt, DEFAULT_GLOBAL_FLEXIBLE_THRESHOLD);
}
