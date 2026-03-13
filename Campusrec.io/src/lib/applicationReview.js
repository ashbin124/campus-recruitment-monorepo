const STORAGE_PREFIX = 'company-reviewed-applications-v1';

function storageKey(userId) {
  const normalized = String(userId || 'anonymous').trim();
  return `${STORAGE_PREFIX}:${normalized || 'anonymous'}`;
}

function normalizeId(value) {
  return String(value ?? '').trim();
}

function readReviewedSet(userId) {
  if (typeof window === 'undefined') return new Set();

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(normalizeId).filter(Boolean));
  } catch {
    return new Set();
  }
}

function writeReviewedSet(userId, setValue) {
  if (typeof window === 'undefined') return;

  const list = Array.from(setValue).map(normalizeId).filter(Boolean);
  const bounded = list.slice(-5000);
  window.localStorage.setItem(storageKey(userId), JSON.stringify(bounded));
}

export function getReviewedApplicationIds(userId) {
  return readReviewedSet(userId);
}

export function markApplicationReviewed(userId, applicationId) {
  const id = normalizeId(applicationId);
  const reviewed = readReviewedSet(userId);
  if (!id) return reviewed;
  reviewed.add(id);
  writeReviewedSet(userId, reviewed);
  return reviewed;
}

export function markApplicationsReviewed(userId, applicationIds = []) {
  const reviewed = readReviewedSet(userId);
  for (const value of applicationIds) {
    const id = normalizeId(value);
    if (id) reviewed.add(id);
  }
  writeReviewedSet(userId, reviewed);
  return reviewed;
}
