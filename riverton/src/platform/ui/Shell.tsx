import { Link, Outlet } from 'react-router-dom';
import { Home, Search, Sparkles, Settings as Cog, LifeBuoy, Sun, Moon } from 'lucide-react';
import { useSettings } from '../settings';
import './shell.css';

export function Shell() {
  const { theme, set } = useSettings();
  return (
    <>
      <header className="topbar">
        <Link to="/" className="btn ghost" aria-label="Home"><Home size={18} /></Link>
        <Link to="/" className="brand display">Riverton</Link>
        <span className="chip">Youth Commissioner</span>
        <span className="grow" />
        <button className="btn ghost" aria-label="Glossary search"><Search size={18} /></button>
        <button className="btn ghost"><Sparkles size={18} /> Quiz me</button>
        <button className="btn ghost" aria-label="Toggle theme" onClick={() => set('theme', theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="btn ghost" aria-label="Settings"><Cog size={18} /></button>
        <a className="btn ghost" href="https://988lifeline.org" target="_blank" rel="noreferrer"><LifeBuoy size={18} /> Need to talk?</a>
      </header>
      <Outlet />
    </>
  );
}
