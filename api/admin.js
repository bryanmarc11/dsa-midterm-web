import { cleanText, isAdmin, json, supabaseAdmin } from './_lib.js';

export default async function handler(req, res) {
  if (!isAdmin(req)) return json(res, 401, { error: 'Invalid instructor key.' });
  if (!['GET', 'PATCH'].includes(req.method)) return json(res, 405, { error: 'Method not allowed.' });
  try {
    const db = supabaseAdmin();
    if (req.method === 'GET') {
      const { data, error } = await db.from('exam_attempts')
        .select('id,student_id,full_name,section,started_at,submitted_at,status,answers,objective_score,manual_score,instructor_feedback')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json(res, 200, { attempts: data });
    }

    const id = String(req.body?.id || '');
    const manualScore = Number(req.body?.manualScore);
    const feedback = cleanText(req.body?.feedback, 2000);
    if (!id || !Number.isInteger(manualScore) || manualScore < 0 || manualScore > 50) {
      return json(res, 400, { error: 'Manual score must be an integer from 0 to 50.' });
    }
    const { data, error } = await db.from('exam_attempts').update({
      manual_score: manualScore,
      instructor_feedback: feedback,
      status: 'graded'
    }).eq('id', id).eq('status', 'submitted').select('id,status,objective_score,manual_score').single();
    if (error) throw error;
    return json(res, 200, { attempt: data });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'The instructor request could not be completed.' });
  }
}
