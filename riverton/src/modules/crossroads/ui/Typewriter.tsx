import { useEffect, useState } from 'react';
import { useSettings } from '../../../platform/settings';

/** Dialogue text that types itself. Click to finish. Instant when Reduce motion is on. */
export function Typewriter({ text, onDone, speed = 16 }: { text: string; onDone?: () => void; speed?: number }) {
  const reduce = useSettings((s) => s.reduceMotion);
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => { setN(reduce ? text.length : 0); }, [text, reduce]);
  useEffect(() => { if (n >= text.length) { onDone?.(); return; } const t = setTimeout(() => setN((x) => Math.min(text.length, x + 2)), speed); return () => clearTimeout(t); }, [n, text, speed, onDone]);
  return <span onClick={() => setN(text.length)} aria-label={text}>{text.slice(0, n)}<span aria-hidden style={{ opacity: n < text.length ? 1 : 0 }}>▍</span></span>;
}
