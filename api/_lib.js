import { createClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'node:crypto';

export const supabaseAdmin = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server is missing Supabase configuration.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

export const json = (res, status, body) => {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.json(body);
};

export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export const validToken = (token, storedHash) => {
  if (!token || !storedHash) return false;
  const actual = Buffer.from(hashToken(token));
  const expected = Buffer.from(storedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const cleanText = (value, max = 100) => String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
export const durationMinutes = () => Math.max(10, Number(process.env.EXAM_DURATION_MINUTES || 150));
export const isAdmin = (req) => {
  const supplied = String(req.headers['x-admin-key'] || '');
  const expected = String(process.env.ADMIN_KEY || '');
  if (!supplied || !expected) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};
