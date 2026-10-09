// Single shared client state.  The server is authoritative; this is only a cache of what it last told us.
export const S = {
  cfg: null,          // public config from the server (outline, blocks)
  sess: null,         // { sid, token } for the student (or the preview session)
  state: null,        // latest public state: status, deadline, items{}, position, labs, final
  content: {},        // chapter number -> chapter (steps with public items)
  pos: { ch: 1, step: 0 },
  sims: {},           // simulation progress counters (also reported to the server with each heartbeat)
  preview: false,     // true while a teacher is previewing (uses the teacher token, never touches student records)
  teacher: null,      // { token }
  key: null           // cached answer key (teacher preview only)
};
/** Authentication fields for any call that concerns the current session. */
export function payload(extra) {
  const p = { sessionId: S.sess.sid, token: S.sess.token };
  if (S.preview && S.teacher) p.teacherToken = S.teacher.token;
  return Object.assign(p, extra || {});
}
/** Screen navigation; main.js fills it in (avoids circular imports). */
export const nav = { go: null };
