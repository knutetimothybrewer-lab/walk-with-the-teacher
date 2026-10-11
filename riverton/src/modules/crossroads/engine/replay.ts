import { acceptProposal } from './townHall';
import { availableChoices, choose, current, listenAvailable, listenLimit, listenPick, proceed, rewindTo, submitProposal, submitReason, castVote, type Ctx } from './run';
import type { Proposal } from './cityAdapter';
import type { Run, Scenario } from './types';

/** What-if: rewind to a decision, take a different branch, and replay the student's other answers where they still apply. */
export function replayWith(sc: Scenario, original: Run, historyIndex: number, altChoiceId: string, ctx: Ctx = {}): Run {
  const picks = new Map<string, string>(); original.history.forEach((h) => { if (h.kind === 'choice' && h.pick) picks.set(h.node, h.pick); });
  const reasons = new Map<string, unknown>(); original.reasoning.forEach((r) => { if (r.kind !== 'listen' && r.kind !== 'proposal') reasons.set(r.node, r.payload); });
  const proposal = original.vars.proposal as Proposal | null; const heard = (original.vars.heard as string[] | undefined) ?? [];
  let run = rewindTo(sc, original, historyIndex);
  run = choose(sc, run, altChoiceId, ctx);
  for (let i = 0; i < 400 && !run.done; i++) {
    const n = current(sc, run);
    if (n.type === 'choice') { const av = availableChoices(n, run.vars); const want = picks.get(n.id); run = choose(sc, run, (av.find((c) => c.id === want) ?? av[0]).id, ctx); }
    else if (n.type === 'listen') { const lim = listenLimit(n, run.vars); for (const id of heard) if ((run.vars.heard as string[]).length < lim && listenAvailable(n, run.vars).some((s) => s.id === id)) run = listenPick(sc, run, id); run = proceed(sc, run, ctx); }
    else if (n.type === 'reason') run = submitReason(sc, run, reasons.get(n.id) ?? {}, ctx);
    else if (n.type === 'proposal') { const acc = proposal ? acceptProposal(run.vars, proposal) : null; if (!acc) break; run = submitProposal(sc, run, acc, ctx); }
    else if (n.type === 'vote') run = castVote(sc, run, ctx).run;
    else run = proceed(sc, run, ctx);
  }
  return run;
}
