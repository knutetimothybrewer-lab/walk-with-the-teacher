// Teacher dashboard (static page; talks to your Apps Script web app with the TEACHER_PASSCODE script property).
// The same view opens inside the app when you type the teacher code in the class-code box (js/teacherview.js).
// This page is intentionally not linked from the student screens. Bookmark its URL.
import { mountTeacher } from '../js/teacherview.js';

const toast = (m) => { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); };
mountTeacher({ main: document.getElementById('main'), toast });
