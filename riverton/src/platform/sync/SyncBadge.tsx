import { Cloud, CloudOff, Check } from 'lucide-react';
import { useSync } from './sync';

/** Small status for the student: synced, pending, or offline. Shown only when the teacher turned sync on. */
export function SyncBadge() {
  const { config, status, queue } = useSync(); if (!config) return null;
  const s = status === 'offline' ? { I: CloudOff, t: 'Offline: will send later' } : queue.length ? { I: Cloud, t: `Saving (${queue.length})` } : { I: Check, t: 'Saved' };
  return <span className="chip" title="Your teacher's class sync" role="status"><s.I size={13} /> {s.t}</span>;
}
