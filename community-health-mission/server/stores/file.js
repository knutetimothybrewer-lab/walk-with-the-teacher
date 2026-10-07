'use strict';
// File-backed store for the local dev server (JSON on disk). NOT used in production (Google Sheets is).
const fs = require('fs');
const path = require('path');
const MemoryStore = require('./memory');

class FileStore extends MemoryStore {
  constructor(dir, opts) {
    super(opts);
    this.dir = dir; fs.mkdirSync(dir, { recursive: true }); this.file = path.join(dir, 'state.json');
    if (fs.existsSync(this.file)) {
      const d = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const k of ['classes', 'roster', 'sessions', 'previews', 'responses', 'gradebook', 'audit', 'tests']) if (d[k]) this[k] = d[k];
    }
  }
  save() { fs.writeFileSync(this.file + '.tmp', JSON.stringify({ classes: this.classes, roster: this.roster, sessions: this.sessions, previews: this.previews, responses: this.responses, gradebook: this.gradebook, audit: this.audit, tests: this.tests })); fs.renameSync(this.file + '.tmp', this.file); }
  withLock(fn) { const r = super.withLock(fn); this.save(); return r; }
}
module.exports = FileStore;
