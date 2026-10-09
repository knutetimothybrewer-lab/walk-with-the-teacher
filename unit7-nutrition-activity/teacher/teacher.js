// Teacher Analytics Dashboard (hidden page). The same view opens inside the app when you type the teacher code in the
// class-code box (js/teacherview.js). Not linked from any student screen. Data comes from your Google Sheet (passcode protected
// on the server), or, with no sheet connected, from an offline sandbox of generated DEMO DATA.
import { mountTeacher } from '../js/teacherview.js';

const toast = (m) => { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3200); };
mountTeacher({ main: document.getElementById('main'), dlg: document.getElementById('dlg'), toast });
