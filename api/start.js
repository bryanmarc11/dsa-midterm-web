import { randomBytes } from 'node:crypto';
import { cleanText, durationMinutes, hashToken, json, supabaseAdmin } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  try {
    const fullName = cleanText(req.body?.fullName, 100);
    const studentId = cleanText(req.body?.studentId, 40).toUpperCase();
    const section = cleanText(req.body?.section, 60);
    const consent = req.body?.consent === true;
    if (fullName.length < 3 || studentId.length < 2 || section.length < 1 || !consent) {
      return json(res, 400, { error: 'Complete all fields and confirm the declaration.' });
    }

    const token = randomBytes(32).toString('hex');
    const db = supabaseAdmin();
    const { data, error } = await db.from('exam_attempts').insert({
      full_name: fullName,
      student_id: studentId,
      section,
      access_token_hash: hashToken(token)
    }).select('id, started_at, status').single();

    if (error?.code === '23505') return json(res, 409, { error: 'An attempt already exists for this student ID.' });
    if (error) throw error;
    return json(res, 201, { ...data, token, durationMinutes: durationMinutes() });
  } catch (error) {
    const reference = randomBytes(6).toString("hex");

    console.error("START_EXAM_ERROR", {
      reference,
      code: error?.code || "START_FAILED",
      message: error?.message || "Unknown startup error",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
    });

    return json(res, 500, {
      error: `Could not start the exam. Reference: ${reference}`
    });
  }
}
