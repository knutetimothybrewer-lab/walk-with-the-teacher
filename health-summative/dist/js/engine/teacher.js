/* teacher.js — Teacher mode: a private code that lets the teacher click through
   the whole assessment without answering anything. Nothing is scored for a real
   student, nothing is sent to the Sheet. The code is stored as a SHA-256 hash in
   config.js (teacherCodeHash); make a new one with `node tools/teacher-code.js "NEW CODE"`.
   This is a classroom gate, not real security: the app runs in the browser. */

const enc = new TextEncoder();
export const TEACHER_SALT = 'wwt-teacher:';

export async function hashTeacherCode(raw) {
  const norm = String(raw || '').trim().toUpperCase();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(TEACHER_SALT + norm));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

export async function isTeacherCode(cfg, raw) {
  if (!cfg.teacherCodeHash || !raw || !String(raw).trim()) return false;
  try { return (await hashTeacherCode(raw)) === cfg.teacherCodeHash; } catch { return false; }
}

export const TEACHER_STUDENT = { first: 'Teacher', last: 'Preview', period: 'Other', code: 'TEACHER-MODE' };
