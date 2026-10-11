import { useRef, useState } from 'react';
import { Download, Upload, UserPlus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useProfiles } from './profileStore';

export function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ProfileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const st = useProfiles();
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(''); const [period, setPeriod] = useState(''); const [msg, setMsg] = useState('');
  const me = st.active();
  return (
    <Modal open={open} onClose={onClose} title="Students on this device">
      {Object.values(st.profiles).map((p) => (
        <div key={p.id} className="toggle">
          <button className={`btn ${p.id === st.activeId ? '' : 'ghost'}`} onClick={() => st.switchTo(p.id)}>{p.name}{p.period && ` (period ${p.period})`}</button>
          <button className="btn ghost" aria-label={`Delete ${p.name}`} onClick={() => confirm(`Delete ${p.name}'s data from this device?`) && st.remove(p.id)}><Trash2 size={16} /></button>
        </div>
      ))}
      <h3 style={{ marginTop: '1rem' }}>Add a student</h3>
      <div className="row" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <input aria-label="Name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input aria-label="Class period" placeholder="Period (optional)" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 150 }} />
        <button className="btn" disabled={!name.trim()} onClick={() => { st.create(name, period); setName(''); setPeriod(''); }}><UserPlus size={16} /> Add</button>
      </div>
      <h3 style={{ marginTop: '1rem' }}>Backup</h3>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <button className="btn ghost" disabled={!me} onClick={() => { const b = st.exportBackup(); if (b) download(`riverton-${me!.name.replace(/\W+/g, '_')}.json`, b); }}><Download size={16} /> Export my work</button>
        <button className="btn ghost" onClick={() => file.current?.click()}><Upload size={16} /> Import a backup</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          const r = st.importBackup(await f.text()); setMsg(r.ok ? 'Backup restored.' : r.error ?? 'Failed.'); e.target.value = '';
        }} />
      </div>
      {msg && <p role="status">{msg}</p>}
    </Modal>
  );
}
