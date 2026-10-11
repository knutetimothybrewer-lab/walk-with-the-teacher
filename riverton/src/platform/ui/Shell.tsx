import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Home, Search, Sparkles, Settings as Cog, LifeBuoy, Sun, Moon, Users, BookOpen, GraduationCap } from 'lucide-react';
import { useSettings } from '../settings';
import { useProfiles } from '../profile/profileStore';
import { SettingsPanel } from './SettingsPanel';
import { GlossarySearch } from './GlossarySearch';
import { QuizMe } from './QuizMe';
import { ProfileMenu } from '../profile/ProfileMenu';
import './shell.css';

export function Shell() {
  const { theme, set } = useSettings();
  const me = useProfiles((s) => s.active());
  const [dlg, setDlg] = useState<null | 'settings' | 'glossary' | 'quiz' | 'profile'>(null);
  const close = () => setDlg(null);
  return (
    <>
      <header className="topbar">
        <Link to="/" className="btn ghost" aria-label="Home"><Home size={18} /></Link>
        <Link to="/" className="brand display">Riverton</Link>
        <button className="chip" onClick={() => setDlg('profile')}><Users size={14} /> {me ? me.name : 'Add a student'}</button>
        <span className="grow" />
        <button className="btn ghost" aria-label="Glossary search" onClick={() => setDlg('glossary')}><Search size={18} /></button>
        <button className="btn ghost" onClick={() => setDlg('quiz')} disabled={!me}><Sparkles size={18} /> Quiz me</button>
        <Link className="btn ghost" to="/notebook" aria-label="Notebook"><BookOpen size={18} /></Link>
        <Link className="btn ghost" to="/teacher" aria-label="Teacher mode"><GraduationCap size={18} /></Link>
        <button className="btn ghost" aria-label="Toggle theme" onClick={() => set('theme', theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button className="btn ghost" aria-label="Settings" onClick={() => setDlg('settings')}><Cog size={18} /></button>
        <a className="btn ghost" href="https://988lifeline.org" target="_blank" rel="noreferrer"><LifeBuoy size={18} /> Need to talk?</a>
      </header>
      <Outlet />
      <SettingsPanel open={dlg === 'settings'} onClose={close} />
      <GlossarySearch open={dlg === 'glossary'} onClose={close} />
      <QuizMe open={dlg === 'quiz'} onClose={close} />
      <ProfileMenu open={dlg === 'profile'} onClose={close} />
    </>
  );
}
