import { categories } from '../../database/model/product.model.js';

function parsePositiveInteger(value, fallback, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= max ? parsed : null;
}

export function parseProductQuery(query) {
  const page = parsePositiveInteger(query.page, 1, 10000);
  const limit = parsePositiveInteger(query.limit, 12, 48);
  const { category } = query;

  if (page === null || limit === null || (category !== undefined && !categories.includes(category))) {
    return null;
  }

  // Only validated scalar values can reach the database query.
  return { page, limit, category };
}

export function isValidProductSlug(slug) {
  return typeof slug === 'string' && slug.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
