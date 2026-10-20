import { durationMinutes, json, supabaseAdmin, validToken } from './_lib.js';
import { gradeObjective } from './_answer-key.js';

async function loadAttempt(db, id) {
  const { data, error } = await db.from('exam_attempts').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

export default async function handler(req, res) {
  if (!['GET', 'PATCH', 'POST'].includes(req.method)) return json(res, 405, { error: 'Method not allowed.' });
  try {
    const id = String(req.query.id || req.body?.id || '');
    const token = String(req.headers['x-attempt-token'] || req.body?.token || '');
    if (!id || !token) return json(res, 401, { error: 'Attempt credentials are required.' });

    const db = supabaseAdmin();
    const attempt = await loadAttempt(db, id);
    if (!attempt || !validToken(token, attempt.access_token_hash)) return json(res, 403, { error: 'Invalid attempt credentials.' });

    const deadline = new Date(new Date(attempt.started_at).getTime() + durationMinutes() * 60000);
    const publicAttempt = {
      id: attempt.id,
      fullName: attempt.full_name,
      studentId: attempt.student_id,
      section: attempt.section,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
      status: attempt.status,
      answers: attempt.answers,
      objectiveScore: attempt.status === 'graded' ? attempt.objective_score : null,
      manualScore: attempt.status === 'graded' ? attempt.manual_score : null,
      feedback: attempt.status === 'graded' ? attempt.instructor_feedback : null,
      durationMinutes: durationMinutes(),
      deadline: deadline.toISOString()
    };

    if (req.method === 'GET') return json(res, 200, publicAttempt);
    if (attempt.status !== 'in_progress') return json(res, 409, { error: 'This attempt has already been submitted.' });

    const answers = req.body?.answers;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return json(res, 400, { error: 'Invalid answers payload.' });
    const sanitized = Object.fromEntries(Object.entries(answers).slice(0, 60).map(([key, value]) => [String(key), String(value).slice(0, 8000)]));

    if (req.method === 'PATCH') {
      const { error } = await db.from('exam_attempts').update({ answers: sanitized }).eq('id', id).eq('status', 'in_progress');
      if (error) throw error;
      return json(res, 200, { saved: true, savedAt: new Date().toISOString() });
    }

    const objectiveScore = gradeObjective(sanitized);
    const { error } = await db.from('exam_attempts').update({
      answers: sanitized,
      objective_score: objectiveScore,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    }).eq('id', id).eq('status', 'in_progress');
    if (error) throw error;
    return json(res, 200, { submitted: true, status: 'submitted' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'The exam service could not complete this request.' });
  }
}
