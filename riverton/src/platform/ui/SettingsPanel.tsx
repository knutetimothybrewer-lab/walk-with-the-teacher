import { Modal } from './Modal';
import { useSettings } from '../settings';

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();
  const T = ({ k, label }: { k: 'sound' | 'reduceMotion' | 'readAloud' | 'colorblind' | 'projector'; label: string }) => (
    <label className="toggle">{label}<input type="checkbox" checked={s[k]} onChange={(e) => s.set(k, e.target.checked)} /></label>
  );
  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <T k="sound" label="Sound (off by default)" />
      <T k="reduceMotion" label="Reduce motion" />
      <T k="readAloud" label="Read-aloud" />
      <T k="colorblind" label="Colorblind-safe palette" />
      <T k="projector" label="Projector mode (bigger text)" />
      <label className="field">Text size
        <select value={s.textSize} onChange={(e) => s.set('textSize', Number(e.target.value) as 0 | 1 | 2)}>
          <option value={0}>Normal</option><option value={1}>Large</option><option value={2}>Extra large</option>
        </select>
      </label>
    </Modal>
  );
}
