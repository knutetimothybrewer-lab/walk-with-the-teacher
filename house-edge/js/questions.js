/* THE HOUSE EDGE — question bank + reusable question engine.
   Types: mc | numeric | predict (answer revealed, no retry needed) | poll (opinion, no right answer) | multi.
   Text fields may be functions so numbers always come from the central configuration. */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {}, C = HE.CONFIG, E = HE.Engine, P = HE.Progress, UI = HE.UI;
  var fm = function (x, d) { return E.fmt(x, d); };
  var slots = function () { return E.game('slots'); };

  var Q = HE.QUESTIONS = [
    /* ---------------- INTRO ---------------- */
    { id: 'i_predict', zone: 'z0', concept: 'longRun', type: 'poll', required: false,
      prompt: 'You have 1,000 tokens. How many do you think you\'ll have when you leave?',
      choices: [{ id: 'more', text: 'More than 1,000' }, { id: 'about', text: 'About 1,000' }, { id: 'less', text: 'Less than 1,000' }],
      ok: 'Locked in. We will come back to this prediction at the very end.' },
    { id: 'i_survive', zone: 'z0', concept: 'houseEdge', type: 'poll', required: false,
      prompt: 'If a gambling business paid players MORE than it collected over the long run, could the business survive?',
      choices: [{ id: 'yes', text: 'Yes, it could' }, { id: 'no', text: 'No, it could not' }, { id: 'unsure', text: 'I am not sure' }],
      ok: 'Keep that question in the back of your mind. You will be able to answer it with math soon.' },
    /* ---------------- ZONE 1 ---------------- */
    { id: 'z1_sample', zone: 'z1', concept: 'probability', type: 'mc', required: true,
      prompt: 'A fair coin lands heads 7 times in 10 flips (70%). Which is MORE likely to land close to 50% heads?',
      choices: [{ id: 'a', text: '10 more flips', why: 'Small samples swing a lot. 7 out of 10 is not unusual, and another 10 flips can swing just as far.' },
        { id: 'b', text: '1,000 flips' }, { id: 'c', text: 'Both are equally likely to land close to 50%', why: 'Not quite. Larger samples tend to land closer to the true probability. You just saw it in the coin lab.' }],
      correct: 'b', ok: 'Yes. Bigger samples tend to land closer to the true probability. That idea powers everything ahead.',
      learn: 'Small samples can stray far from the true probability; large samples settle down.' },

    { id: 'z1_dice_predict', zone: 'z1', concept: 'probability', type: 'predict', required: false,
      prompt: 'Before you roll: when you add the totals of TWO dice, which total shows up most often?',
      choices: [{ id: 'eq', text: 'All totals are equally likely' }, { id: 'seven', text: '7' }, { id: 'twelve', text: '12' }, { id: 'two', text: '2' }],
      correct: 'seven', ok: 'Correct. A total of 7 can be made 6 ways out of 36 combinations.',
      no: 'The most common total is 7. It can be made 6 ways (1+6, 2+5, 3+4 and their reverses) out of 36 combinations, more than any other total.',
      surprise: { label: 'PROBABILITY', predicted: { eq: 'All dice totals are equally likely.', twelve: '12 shows up most often.', two: '2 shows up most often.' },
        discovered: 'A total of 7 can be made 6 ways out of 36, so it is the most likely total of two dice (about 16.7%).' } },

    { id: 'z1_dice_num', zone: 'z1', concept: 'probability', type: 'numeric', mode: 'prob', required: true,
      prompt: 'What is the probability of rolling a total of 7 with two fair dice? (Enter a fraction like 1/6, or a percent.)',
      correct: 1 / 6, tol: 0.006, hint: 'Count the favorable combinations (how many ways make 7?) and divide by all 36 combinations.',
      ok: '6 favorable combinations out of 36 = 1/6 ≈ 16.7%.', no: 'Not quite. Probability = favorable outcomes ÷ all equally likely outcomes.',
      learn: 'Probability = favorable ways ÷ total equally likely ways.' },

    { id: 'z1_streak', zone: 'z1', concept: 'randomness', type: 'mc', required: true,
      prompt: 'In 100 fair coin flips, how common is a streak of 5 or more heads (or tails) in a row?',
      choices: [{ id: 'a', text: 'Rare. It would suggest something is wrong with the coin.', why: 'It feels rare, but it is not. Try the detector again: most 100-flip sequences contain a 5-streak.' },
        { id: 'b', text: 'Very common. Most 100-flip sequences contain one.' }, { id: 'c', text: 'Impossible with a fair coin.', why: 'Not impossible at all. You probably saw one in the detector.' }],
      correct: 'b', ok: function () { return 'Right. The math gives about ' + E.pct(E.probRunAtLeast(100, 5), 0) + ' of 100-flip sequences containing a streak of 5 or more. Real randomness is streakier than it feels.'; },
      learn: 'Streaks are a normal feature of random sequences.' },

    /* ---------------- ZONE 2 ---------------- */
    { id: 'z2_net', zone: 'z2', concept: 'ev', type: 'numeric', mode: 'num', required: true,
      prompt: 'You wager 10 tokens. The machine RETURNS 15 tokens. What is your NET profit (in tokens)?',
      correct: 5, tol: 0.01, wrong: [{ v: 15, note: '15 is the RETURN, which includes your 10-token wager coming back. Net profit = return − wager.' }],
      hint: 'Net profit = return − wager.', ok: 'Net = 15 − 10 = +5 tokens. A 15-token return after a 10-token wager is not 15 tokens of profit.',
      no: 'Remember: net profit = return − wager.', learn: 'A return is not a profit. Net = return − wager.' },

    /* ---------------- ZONE 3 ---------------- */
    { id: 'z3_play', zone: 'z3', concept: 'ev', type: 'poll', required: false,
      prompt: 'A hypothetical game: 50% chance to GAIN 8 tokens, 50% chance to LOSE 10 tokens. Would you play?',
      choices: [{ id: 'yes', text: 'Yes, I would play' }, { id: 'no', text: 'No, I would pass' }, { id: 'unsure', text: 'I am not sure yet' }],
      ok: 'Good. Hold that thought. Now let the numbers speak.' },
    { id: 'z3_ev1', zone: 'z3', concept: 'ev', type: 'numeric', mode: 'num', required: true,
      prompt: 'Expected value of the game: 50% chance of +8, 50% chance of −10. (tokens per play)',
      correct: function () { var g = C.evGame; return g.win.p * g.win.net + g.lose.p * g.lose.net; }, tol: 0.01,
      hint: 'EV = (0.50 × 8) + (0.50 × −10).', ok: 'EV = 4 − 5 = −1 token per play.', no: 'Multiply each outcome by its probability, then add.',
      learn: 'Expected value = Σ (probability × outcome).' },
    { id: 'z3_ev2', zone: 'z3', concept: 'ev', type: 'mc', required: true,
      prompt: 'A game: 25% chance to gain 30 tokens, 75% chance to lose 10 tokens. Which statement is true?',
      choices: [{ id: 'p', text: 'It favors the player', why: 'Compute it: 0.25 × 30 = 7.5 and 0.75 × (−10) = −7.5.' }, { id: 'n', text: 'It is neutral (expected value = 0)' }, { id: 'h', text: 'It favors the house', why: 'Compute it: 0.25 × 30 = 7.5 and 0.75 × (−10) = −7.5. They cancel.' }],
      correct: 'n', ok: '7.5 − 7.5 = 0. The big 30-token win is exactly balanced by the frequent 10-token losses.', learn: 'A big possible win can be exactly offset by its low probability.' },
    { id: 'z3_ev3', zone: 'z3', concept: 'ev', type: 'numeric', mode: 'num', required: true,
      prompt: 'You pay 1 token to play. With probability 0.10 you get 8 tokens back (profit +7). Otherwise you get nothing (−1). What is the expected value per play?',
      correct: -0.2, tol: 0.011, hint: 'EV = 0.10 × 7 + 0.90 × (−1).', ok: '0.7 − 0.9 = −0.2 tokens per play.', no: 'Use the NET outcomes (+7 and −1), not the return.',
      learn: 'Use net outcomes (return minus wager) when computing EV.' },
    { id: 'z3_big', zone: 'z3', concept: 'ev', type: 'mc', required: true,
      prompt: 'A game pays +800 tokens with probability 1 in 1,000, and otherwise you lose 1 token. Is a huge payout like that a good bet?',
      choices: [{ id: 'y', text: 'Yes, 800 is huge', why: 'Size alone is not enough. Multiply by the 1-in-1,000 chance: 0.001 × 800 = 0.8, but you lose 1 token 99.9% of the time (−0.999).' }, { id: 'n', text: 'Not automatically. Expected value is 0.001×800 − 0.999×1 ≈ −0.2' }, { id: 'u', text: 'Impossible to tell', why: 'You can tell: EV uses the probabilities and outcomes you are given.' }],
      correct: 'n', ok: 'A large payout does not automatically make a good bet. You must weigh it by its probability.', learn: 'A large payout does not automatically mean a good bet.' },
    { id: 'z3_slot', zone: 'z3', concept: 'ev', type: 'numeric', mode: 'num', required: true,
      prompt: 'Using the Neon Orchard table, what is the expected NET result of one 10-token spin? (tokens)',
      correct: function () { return slots().ev * 10; }, tol: 0.04, hint: 'Add the "probability × net" column, or compute RTP × 10 − 10.',
      ok: function () { return 'Expected net = ' + fm(slots().ev * 10, 2) + ' tokens per 10-token spin.'; }, no: 'Add up probability × net profit for all six outcomes.',
      learn: 'You can compute a machine\'s expected value directly from its probabilities and payouts.' },

    /* ---------------- ZONE 4 ---------------- */
    { id: 'z4_edgenum', zone: 'z4', concept: 'houseEdge', type: 'numeric', mode: 'num', required: true,
      prompt: function () { return 'Neon Orchard has a house edge of ' + E.pct(slots().edge, 1) + '. On average, how many tokens does the machine keep per 1,000 tokens wagered?'; },
      correct: function () { return slots().edge * 1000; }, tol: 2, hint: 'House edge × tokens wagered.', ok: function () { return fm(slots().edge * 1000, 0) + ' tokens on average per 1,000 wagered. That is an expected value across many wagers, not a promise for any one person.'; },
      no: 'Expected tokens kept = house edge × tokens wagered.', learn: 'Expected loss = house edge × total wagered.' },
    { id: 'z4_rtp', zone: 'z4', concept: 'rtp', type: 'mc', required: true,
      prompt: 'A game has a 90% RTP (return to player). Which statement is correct?',
      choices: [{ id: 'a', text: 'Every player gets back exactly 90% of what they wager.', why: 'RTP is a long-run average. Individual sessions are above or below it, as you just saw.' },
        { id: 'b', text: 'Across a very large number of wagers, about 90 tokens come back per 100 wagered on average. Individual sessions can differ a lot.' },
        { id: 'c', text: 'You will win 90% of your bets.', why: 'RTP is about tokens returned, not how often you win.' }],
      correct: 'b', ok: 'Right: LONG-RUN EXPECTATION vs INDIVIDUAL SESSION.', learn: 'RTP is a long-run average, not a prediction for one session.' },
    { id: 'z4_var', zone: 'z4', concept: 'variance', type: 'mc', required: true,
      prompt: 'How can someone truthfully say "I won" even though the game has a house advantage?',
      choices: [{ id: 'a', text: 'The game must not really have a house advantage', why: 'The edge is real. The reason is variance.' },
        { id: 'b', text: 'Short-term results vary (variance), so a positive session can happen even when the expected value is negative' },
        { id: 'c', text: 'They must have used a special strategy', why: 'In independent negative-expectation bets, no betting pattern changes the expected return per token wagered.' }],
      correct: 'b', ok: 'Exactly. Variance spreads individual results above and below the expected value.', learn: 'Variance lets individual players finish ahead even when the expectation is negative.' },

    /* ---------------- ZONE 5 ---------------- */
    { id: 'z5_pred', zone: 'z5', concept: 'parlays', type: 'predict', required: false,
      prompt: 'Predict: a 5-leg parlay where each leg is an independent 50/50 pick. About how likely are ALL FIVE to win?',
      choices: [{ id: 'half', text: 'About 50%' }, { id: 'q', text: 'About 25%' }, { id: 'ten', text: 'About 10%' }, { id: 'three', text: 'About 3%' }],
      correct: 'three', ok: 'Correct: 0.5 × 0.5 × 0.5 × 0.5 × 0.5 = 3.125%.',
      no: 'The answer is about 3%: 0.5⁵ = 3.125%. Every required leg multiplies the probability by another fraction.',
      surprise: { label: 'PARLAYS', predicted: { half: 'A five-leg parlay had about a 50% chance of winning.', q: 'A five-leg parlay had about a 25% chance of winning.', ten: 'A five-leg parlay had about a 10% chance of winning.' },
        discovered: 'Every required leg reduces the probability that the entire parlay succeeds. Five 50/50 legs: only 3.125%.' } },
    { id: 'z5_sim', zone: 'z5', concept: 'parlays', type: 'numeric', mode: 'num', required: true,
      prompt: 'Out of 10,000 players who each make a 5-leg parlay of independent 50/50 picks, about how many do you expect to win all five legs?',
      correct: function () { return 10000 * Math.pow(C.sports.referenceLegP, 5); }, tol: 45, hint: '10,000 × 0.5⁵.', ok: 'About 312. Randomness means the real count will wobble around that.',
      no: 'Multiply the probability that all legs win (0.5⁵) by 10,000.', learn: 'Expected count = number of players × probability of all legs winning.' },
    { id: 'z5_ind', zone: 'z5', concept: 'parlays', type: 'mc', required: true,
      prompt: 'Multiplying leg probabilities gives the chance ALL legs win. What does that simplified calculation assume?',
      choices: [{ id: 'a', text: 'That the legs are independent, so one result does not affect another' }, { id: 'b', text: 'That every team is equally good', why: 'Not required. Each leg can have its own probability.' }, { id: 'c', text: 'That the sportsbook never takes a margin', why: 'Margin changes the payout, not whether legs multiply.' }],
      correct: 'a', ok: 'Right. Real events can sometimes be correlated, which changes the math.', learn: 'Multiplying probabilities assumes independence.' },
    { id: 'z5_margin', zone: 'z5', concept: 'houseEdge', type: 'numeric', mode: 'num', required: true,
      prompt: function () { return 'Each leg is a 50% pick offered at ' + fm(HE.Parlay.legOdds(.5), 2) + 'x (a fair price would be 2.00x). What is the house edge on a 3-leg parlay of such legs? (percent)'; },
      correct: function () { return HE.Parlay.reference(3).edge * 100; }, tol: 0.4, hint: 'Expected return = 0.5³ × (offered multiplier)³. Edge = 1 − that.',
      ok: function () { return 'Expected return ' + E.pct(HE.Parlay.reference(3).rtp, 1) + ' per token, so the edge is ' + E.pct(HE.Parlay.reference(3).edge, 1) + '. The margin compounds with every leg.'; },
      no: 'Expected return per token = (probability all win) × (offered payout multiplier).', learn: 'A small margin on each leg compounds across a parlay.' },
    { id: 'z5_why', zone: 'z5', concept: 'parlays', type: 'mc', required: true,
      prompt: 'Why does a six-leg parlay show such a huge potential payout?',
      choices: [{ id: 'a', text: 'Because the books are being generous', why: 'The payout is large because the event is rare, not because of generosity.' },
        { id: 'b', text: 'Because the probability that ALL six legs win is very small, so the multiplied payout is large (and typically still priced below a fair payout)' },
        { id: 'c', text: 'Because six legs are easier to predict than one', why: 'The opposite. Each added leg gives the entire ticket another chance to fail.' }],
      correct: 'b', ok: 'Risk and reward move together. A bigger payout signals a rarer outcome.', learn: 'Large parlay payouts reflect a very small chance of every leg winning.' },

    /* ---------------- ZONE 6 ---------------- */
    { id: 'z6_gf', zone: 'z6', concept: 'biases', type: 'predict', required: false,
      prompt: 'RED, RED, RED, RED, RED. In an independent 50/50 process, what is more likely on the next spin?',
      choices: [{ id: 'red', text: 'RED' }, { id: 'black', text: 'BLACK' }, { id: 'same', text: 'SAME PROBABILITY' }], correct: 'same',
      ok: 'Correct: the previous outcomes do not change the next independent probability.',
      no: 'The answer is SAME PROBABILITY. Previous independent outcomes do not change the next independent probability.',
      surprise: { label: 'GAMBLER\'S FALLACY', predicted: { black: 'After five reds, black was more likely.', red: 'After five reds, red was more likely (the streak would continue).' },
        discovered: 'In an independent 50/50 process, previous outcomes do not make black (or red) more likely.' } },
    { id: 'z6_hot', zone: 'z6', concept: 'biases', type: 'mc', required: true,
      prompt: 'A fictional player has guessed 6 fair coin flips correctly in a row. Each flip is independent and fair. What is the chance the 7th guess is right?',
      choices: [{ id: 'm', text: 'More than 50% (she is "hot")', why: 'In a fair, independent process there is no hot hand. Every guess is 50%.' }, { id: 'e', text: 'Exactly 50%' }, { id: 'l', text: 'Less than 50% (the luck must run out)', why: 'That is the gambler\'s fallacy, the mirror image of hot-hand thinking. Still 50%.' }],
      correct: 'e', ok: 'Correct. In a fair coin process there is no hot hand. (In real sports, whether "hot hands" exist is a topic researchers still study.)', learn: 'In independent chance events, streaks do not change the next probability.',
      surprise: { label: 'HOT-HAND THINKING', predicted: { m: 'A player who guessed right six times was "hot" and more likely to be right again.', l: 'After six right guesses, the luck had to run out.' }, discovered: 'In a fair, independent process every guess is still 50%.' } },
    { id: 'z6_control', zone: 'z6', concept: 'biases', type: 'mc', required: true,
      prompt: 'Lottery A: YOU choose your number from 1 to 10. Lottery B: the computer assigns your number from 1 to 10. A random number from 1 to 10 is drawn. Which gives a better chance?',
      choices: [{ id: 'a', text: 'A. Choosing makes me more likely to win', why: 'Choosing feels like skill, but the draw is random. Both give a 1-in-10 chance.' }, { id: 'b', text: 'B. The computer picks better', why: 'No. Both give 1 in 10.' }, { id: 's', text: 'Same chance (1 in 10)' }],
      correct: 's', ok: 'Right. Choices that feel like skill can create an "illusion of control" in games of chance.', learn: 'Choosing in a game of chance does not change the odds.',
      surprise: { label: 'ILLUSION OF CONTROL', predicted: { a: 'Choosing my own number made me more likely to win.', b: 'The computer-picked number was better.' }, discovered: 'In a random draw, a number you choose and a number you are given have the same chance.' } },
    { id: 'z6_near_poll', zone: 'z6', concept: 'biases', type: 'poll', required: false,
      prompt: 'Look at the two results. Which one FEELS closer to winning?', choices: [{ id: 'near', text: 'The near miss  (★ ★ ●)' }, { id: 'loss', text: 'The plain loss  (● ▲ ✿)' }, { id: 'same', text: 'They feel the same' }],
      ok: 'Now strip away the presentation…' },
    { id: 'z6_near', zone: 'z6', concept: 'biases', type: 'mc', required: true,
      prompt: 'In terms of tokens returned, how do a "near miss" and a plain loss compare?',
      choices: [{ id: 'a', text: 'The near miss returns a little bit', why: 'Both return 0. The configuration says so, just look at the X-ray.' }, { id: 'b', text: 'Both are losses that return 0 tokens' }, { id: 'c', text: 'A near miss makes a win more likely next time', why: 'Each spin is independent. Nothing about the previous spin changes the next probability.' }],
      correct: 'b', ok: 'Researchers have studied near misses in gambling psychology. In one lab study, near misses were rated as less pleasant than full misses yet increased the desire to keep playing. The outcome itself was still a loss.', learn: 'A near miss is mathematically identical to any other loss.' },
    { id: 'z6_chase_poll', zone: 'z6', concept: 'biases', type: 'poll', required: false,
      prompt: 'A fictional player has lost 300 tokens. What do they do?', choices: [{ id: 'stop', text: 'STOP' }, { id: 'chase', text: 'TRY TO WIN IT BACK' }], ok: 'Either way, let\'s look at the decision with a DECISION X-RAY.' },
    { id: 'z6_chase', zone: 'z6', concept: 'biases', type: 'mc', required: true,
      prompt: 'Does having already lost 300 tokens change the expected value of the NEXT independent bet?',
      choices: [{ id: 'y', text: 'Yes, the game owes the player a win', why: 'Games do not keep a ledger of what they "owe." The next wager has the same probabilities as before.' }, { id: 'n', text: 'No. The past loss is gone; the next bet has its own expected value' }, { id: 'p', text: 'Yes, the bigger the loss the better the next odds', why: 'The odds do not read your balance.' }],
      correct: 'n', ok: 'Past losses do not improve the next independent wager. Feeling the need to recover them is called loss chasing. It is connected to sunk-cost thinking.', learn: 'Past losses do not change the expected value of the next independent bet.' },
    { id: 'z6_mem', zone: 'z6', concept: 'biases', type: 'predict', required: false,
      prompt: 'You just watched a fictional player\'s 20 wagers. Overall, did they win more than they lost?',
      choices: [{ id: 'won', text: 'Won more' }, { id: 'lost', text: 'Lost more' }, { id: 'even', text: 'About even' }], correct: 'lost',
      ok: 'Correct. Count the full record, not just the flashes.', no: 'The complete record shows they lost more. The wins were flashy and memorable; the losses faded.',
      surprise: { label: 'SELECTIVE MEMORY', predicted: { won: 'The player won more than they lost.', even: 'The player came out about even.' }, discovered: 'The full record showed more losses. Exciting wins are remembered more easily than ordinary losses.' } },
    { id: 'z6_sunk', zone: 'z6', concept: 'biases', type: 'mc', required: true,
      prompt: 'Machine A has "eaten" 200 of your tokens. Machine B is brand new. Both have the same probabilities and payouts. Should the 200 tokens already spent affect which machine you play?',
      choices: [{ id: 'y', text: 'Yes, I have to stay to get my investment back', why: 'This is sunk-cost thinking. The 200 tokens are gone either way.' }, { id: 'n', text: 'No. Both machines have the same expected value going forward' }, { id: 'm', text: 'Yes, Machine A is "due"', why: 'Independent spins are never "due."' }],
      correct: 'n', ok: 'Right: sunk costs are gone either way. Only the expected value going forward matters.', learn: 'Money already lost is a sunk cost and does not change future odds.' },
    { id: 'z6_flash', zone: 'z6', concept: 'biases', type: 'mc', required: true,
      prompt: 'Which statement is best supported by what you saw in the interface lab?',
      choices: [{ id: 'a', text: 'Flashy effects make the game more likely to pay out', why: 'The probabilities did not change at all. Check the identical config table.' }, { id: 'b', text: 'Flashy effects can change how a game FEELS, but the probabilities and payouts stay the same' }, { id: 'c', text: 'Plain games are always safer', why: 'The math was identical. The presentation is what changed.' }],
      correct: 'b', ok: 'The presentation changed. The probabilities did not.', learn: 'Flashy presentation changes the feeling, not the probabilities.' },
    { id: 'z6_lights_poll', zone: 'z6', concept: 'biases', type: 'poll', required: false,
      prompt: 'Which version felt more exciting?', choices: [{ id: 'a', text: 'Game A (lights and effects)' }, { id: 'b', text: 'Game B (plain text)' }, { id: 's', text: 'About the same' }], ok: 'Thanks. Now see what actually differed…' },

    /* ---------------- ZONE 7 ---------------- */
    { id: 'z7_lln', zone: 'z7', concept: 'longRun', type: 'mc', required: true,
      prompt: 'What happens to the AVERAGE result as the number of simulated players increases?',
      choices: [{ id: 'a', text: 'It becomes more stable and settles near the mathematically expected result' }, { id: 'b', text: 'It becomes more and more random', why: 'A single result stays random, but the AVERAGE of many results becomes steadier.' }, { id: 'c', text: 'It always becomes exactly the expected value', why: 'It gets closer and steadier but it is still random, so it will not usually be exact.' }],
      correct: 'a', ok: 'That is the Law of Large Numbers: averages over many trials tend to settle near the expected value.', learn: 'Averages over many trials become stable (Law of Large Numbers).' },
    { id: 'z7_prove', zone: 'z7', concept: 'longRun', type: 'mc', required: true,
      prompt: function () {
        var r = P.get('z7.mine') || {};
        return (r.net >= 0 ? 'Your session finished ahead. Does that prove the game has positive expected value?' : 'Your session finished behind. Does that prove the game has negative expected value?');
      },
      choices: [{ id: 'yes', text: 'YES', why: 'One result is one sample. It cannot establish the expected value by itself.' }, { id: 'no', text: 'NO', why: 'It does not prove the opposite either. One result is simply one sample.' }, { id: 'nei', text: 'NOT ENOUGH INFORMATION' }],
      correct: 'nei', ok: 'Right. One result is one sample. To learn the expected value you need the probabilities and payouts, or thousands of trials.', learn: 'One personal result cannot prove a game\'s expected value.',
      surprise: { label: 'ONE RESULT', predicted: { yes: 'My result proved what the game does.', no: 'My result proved the game was the opposite of what I saw.' }, discovered: 'One result is one sample and cannot establish expected value.' } },
    { id: 'z7_rerun1', zone: 'z7', concept: 'variance', type: 'mc', required: true,
      prompt: 'You ran two independent 10,000-player simulations. Why aren\'t the results exactly the same?',
      choices: [{ id: 'a', text: 'Randomness. Each run draws new random outcomes' }, { id: 'b', text: 'The probabilities changed between runs', why: 'The probabilities are identical. Same config both times.' }, { id: 'c', text: 'One of the simulations is broken', why: 'Both are fine. Random sampling gives slightly different results each time.' }],
      correct: 'a', ok: 'Yes: randomness.', learn: 'Independent random samples are never exactly identical.' },
    { id: 'z7_rerun2', zone: 'z7', concept: 'longRun', type: 'mc', required: true,
      prompt: 'Why are the BROAD patterns (shape, average) usually similar from run to run?',
      choices: [{ id: 'a', text: 'Because the underlying probabilities did not change' }, { id: 'b', text: 'Because the simulation remembers the first run', why: 'Each run is independent. It remembers nothing.' }, { id: 'c', text: 'Because the results are copied', why: 'They are newly generated each time.' }],
      correct: 'a', ok: 'Right. Same probabilities, same payouts, so the same pattern emerges.', learn: 'The same underlying probabilities produce similar patterns in large samples.' },
    { id: 'z7_house', zone: 'z7', concept: 'houseEdge', type: 'mc', required: true,
      prompt: 'In HOUSE VIEW, which statement best fits what you saw?',
      choices: [{ id: 'a', text: 'Each individual result is unpredictable, but the combined result across many wagers is tied closely to the expected value' }, { id: 'b', text: 'The house wins every single bet', why: 'Many individual players finished ahead. The edge works across many wagers.' }, { id: 'c', text: 'Players must lose in order for the game to work', why: 'Not every player loses. The expected value is what matters across many wagers.' }],
      correct: 'a', ok: 'The house does not need to win every bet. It needs the mathematics to favor it across many wagers.', learn: 'The house edge works across many wagers, not every bet.' },
    { id: 'z7_edge', zone: 'z7', concept: 'houseEdge', type: 'mc', required: true,
      prompt: 'In the House Edge Experiment, what happens as the house edge increases?',
      choices: [{ id: 'a', text: 'The whole distribution shifts toward bigger average losses, yet some players still finish ahead' }, { id: 'b', text: 'Every player loses', why: 'Even at 10%, plenty of simulated players finished ahead.' }, { id: 'c', text: 'Nothing changes', why: 'Compare the averages: they shift left as the edge grows.' }],
      correct: 'a', ok: 'Yes. A larger edge moves the expected result down, but variance still produces winners.', learn: 'A bigger house edge shifts the whole distribution down.' },

    /* ---------------- ZONE 8 ---------------- */
    { id: 'z8_strategy', zone: 'z8', concept: 'houseEdge', type: 'mc', required: true,
      prompt: 'Did your betting strategy change the mathematical expectation of the game?',
      choices: [{ id: 'a', text: 'Yes. The right strategy turns a negative expected value into a positive one', why: 'For independent bets with a house edge, no betting pattern does that.' },
        { id: 'b', text: 'No. A strategy can change how risk is spread out (and how much you wager in total), but not the expected return per token wagered' }, { id: 'c', text: 'Yes, but only if you win', why: 'The expected value does not depend on how any one session turned out.' }],
      correct: 'b', ok: 'Strategies change the SHAPE of results (your chances of finishing ahead vs behind) but not the expected return per token wagered.', learn: 'Betting strategies cannot change the expected return per token wagered.' },
    { id: 'z8_claim', zone: 'z8', concept: 'longRun', type: 'mc', required: true,
      prompt: 'A fictional student says: "I turned 500 tokens into 1,400. Obviously this works." What is wrong with that conclusion?',
      choices: [{ id: 'a', text: 'Nothing, the result proves the method works', why: 'One success is one sample. See where it lands among 10,000 players.' }, { id: 'b', text: 'One successful outcome does not establish positive expected value' }, { id: 'c', text: 'The student must be lying', why: 'Not at all. The result can truly happen. It just does not prove the method works.' }],
      correct: 'b', ok: 'One result is one sample. It can be real and still say very little about the expected value.', learn: 'One successful outcome does not establish positive expected value.' },

    /* ---------------- ZONE 9: MASTERY (all required) ---------------- */
    { id: 'm_rtp', zone: 'z9', concept: 'rtp', type: 'scenario', required: true, short: 'RTP scenario',
      prompt: 'A game advertises a 95% RTP. A player puts in 100 tokens in total and gets back exactly 60. What is the best conclusion?',
      choices: [{ id: 'a', text: 'The advertisement must be false', why: 'Not necessarily. 95% RTP is a long-run average over very many wagers.' }, { id: 'b', text: 'RTP describes the long-run average across very many wagers, not what one short session will do' }, { id: 'c', text: 'They will get 35 extra tokens back next time to make up the difference', why: 'There is no "making up." Each wager is independent.' }],
      correct: 'b', ok: 'Right. LONG-RUN EXPECTATION is not an INDIVIDUAL SESSION.', learn: 'RTP is a long-run average and does not predict one session.' },
    { id: 'm_due', zone: 'z9', concept: 'randomness', type: 'scenario', required: true, short: 'Five losses',
      prompt: 'A player lost five independent 50/50 bets in a row. Are they "due" to win?',
      choices: [{ id: 'a', text: 'Yes. The next win is more likely now', why: 'Independent events have no memory.' }, { id: 'b', text: 'No. The next bet still has the same 50% chance' }, { id: 'c', text: 'No, now they are even less likely to win', why: 'Also not true: no memory.' }],
      correct: 'b', ok: 'Independent outcomes do not change the next probability.', learn: 'Independent events are not "due."' },
    { id: 'm_parlay', zone: 'z9', concept: 'parlays', type: 'scenario', required: true, short: 'Six-leg payout',
      prompt: 'A six-leg parlay offers a huge potential payout. Why?',
      choices: [{ id: 'a', text: 'Because the chance that every leg wins is very small' }, { id: 'b', text: 'Because the sportsbook wants players to win', why: 'The payout reflects rarity, not generosity.' }, { id: 'c', text: 'Because six predictions are easier than one', why: 'Each extra leg adds another way to lose.' }],
      correct: 'a', ok: 'Right. Payout rises because probability falls.', learn: 'Parlay payouts rise because the probability of winning all legs falls.' },
    { id: 'm_win', zone: 'z9', concept: 'longRun', type: 'scenario', required: true, short: 'Yesterday\'s win',
      prompt: 'Someone won 400 tokens yesterday. Does that establish that the game has positive expected value?',
      choices: [{ id: 'a', text: 'Yes, they have proven it' }, { id: 'b', text: 'No. We don\'t know their total wagers, previous losses, or other players\' results. One outcome is one sample' }, { id: 'c', text: 'Only if the amount is above 300', why: 'No size of single win decides expected value.' }],
      correct: 'b', ok: 'One result is one sample.', learn: 'One win says little about expected value.' },
    { id: 'm_chase', zone: 'z9', concept: 'biases', type: 'scenario', required: true, short: 'Recovering losses',
      prompt: 'A person keeps wagering because they need to recover previous losses. What concept might this demonstrate?',
      choices: [{ id: 'a', text: 'Loss chasing (connected to sunk-cost thinking)' }, { id: 'b', text: 'The Law of Large Numbers', why: 'That is about averages in large samples, not about the urge to recover losses.' }, { id: 'c', text: 'Positive expected value', why: 'Past losses do not create positive expected value.' }],
      correct: 'a', ok: 'Right. Past losses do not improve the next wager\'s expected value.', learn: 'Trying to recover past losses is loss chasing.' },
    { id: 'm_ev', zone: 'z9', concept: 'ev', type: 'numeric', mode: 'num', required: true, short: 'Compute EV',
      prompt: 'A bet has a 20% chance to gain 25 tokens and an 80% chance to lose 8 tokens. What is its expected value? (tokens)',
      correct: -1.4, tol: 0.02, hint: '0.20 × 25 + 0.80 × (−8).', ok: '5 − 6.4 = −1.4 tokens per bet.', no: 'Multiply each outcome by its probability, then add.', learn: 'Compute EV by multiplying each outcome by its probability.' },
    { id: 'm_edge', zone: 'z9', concept: 'houseEdge', type: 'numeric', mode: 'num', required: true, short: 'Expected loss',
      prompt: 'A game has a 5% house edge. Players wager 1,000,000 tokens in total over a very large number of bets. What is the expected net result for the players? (tokens; use a negative number for a loss)',
      correct: -50000, tol: 1, hint: '−5% of the total wagered.', ok: '−5% × 1,000,000 = −50,000 tokens, an expected value over many wagers, not a promise for any single player.', no: 'Expected net = −(house edge × total wagered).', learn: 'Expected net = −(house edge × total wagered).' },
    { id: 'm_flash', zone: 'z9', concept: 'biases', type: 'scenario', required: true, short: 'Flashy vs plain',
      prompt: 'Two versions of a game have identical probabilities and payouts. One is flashy, with sounds and celebrations. The other is plain text. Which statement is accurate?',
      choices: [{ id: 'a', text: 'The flashy one pays more often', why: 'Identical probabilities mean identical frequencies.' }, { id: 'b', text: 'The experience can differ, but the expected value is identical' }, { id: 'c', text: 'The plain one has a lower house edge', why: 'The math was set to be identical.' }],
      correct: 'b', ok: 'The flashing lights don\'t change the math.', learn: 'Presentation changes the experience, not the expected value.' },
    { id: 'm_p4', zone: 'z9', concept: 'parlays', type: 'numeric', mode: 'prob', required: true, short: '4-leg probability',
      prompt: 'A 4-leg parlay has four independent legs, each with a 50% chance. What is the probability that ALL four win? (percent or fraction)',
      correct: 0.0625, tol: 0.003, hint: '0.5 × 0.5 × 0.5 × 0.5', ok: '0.5⁴ = 6.25%.', no: 'Multiply the four probabilities together.', learn: 'Probabilities of independent legs multiply.' },
    { id: 'm_var', zone: 'z9', concept: 'variance', type: 'scenario', required: true, short: 'Winners and the operator',
      prompt: '10,000 players each play a game with a house edge. Hundreds of them finish ahead. Why can the operator still expect to profit overall?',
      choices: [{ id: 'a', text: 'Because the average result across many wagers follows the expected value, which favors the operator, even though individual results vary' }, { id: 'b', text: 'Because the winners are cheating', why: 'Variance explains the winners, no cheating needed.' }, { id: 'c', text: 'It cannot. If hundreds win the game must favor players', why: 'Winners can exist in a negative-expectation game. Look at the whole distribution.' }],
      correct: 'a', ok: 'Gambling does not require every player to lose. The mathematics favor the operator across repeated wagering.', learn: 'Variance creates winners; expected value drives the aggregate.' }
  ];
  HE.QMAP = {}; Q.forEach(function (q) { HE.QMAP[q.id] = q; });
  C.zoneById('z9').steps = [];

  /* ---------------- Question engine ---------------- */
  var QE = HE.QE = {};
  function val(x, a) { return typeof x === 'function' ? x(a) : x; }
  QE.correctValue = function (q) { return val(q.correct); };
  QE.render = function (container, id, opts) {
    opts = opts || {};
    var q = HE.QMAP[id], rec = P.qrec(id), esc = UI.esc;
    var typeLabel = { mc: 'Question', numeric: 'Calculate', predict: 'Predict', poll: 'Your call', scenario: 'Scenario', multi: 'Select all that apply' }[q.type];
    var wrap = UI.el('<div class="q" data-q="' + id + '"><div class="q-kick">' + typeLabel + (q.required ? '' : '') + '</div><div class="q-prompt">' + esc(val(q.prompt)) + '</div><div class="q-body"></div><div class="q-fb" aria-live="polite"></div></div>');
    var body = UI.$('.q-body', wrap), fb = UI.$('.q-fb', wrap);
    container.appendChild(wrap);
    var isChoice = q.type === 'mc' || q.type === 'predict' || q.type === 'poll' || q.type === 'scenario';
    var finished = false;
    function done(restored) {
      finished = true; wrap.classList.add('solved');
      if (q.zone === 'z9') P.complete('q:' + id);
      if (opts.onDone) opts.onDone(P.qrec(id), !!restored);
    }
    function feedback(kind, html) { fb.className = 'q-fb ' + kind; fb.innerHTML = html; UI.live(fb.textContent); }
    function showOk(correct) {
      var r = P.qrec(id), t = val(q.ok), prefix = '';
      if (q.type === 'predict') { prefix = correct ? '<b>Your prediction matches the math.</b> ' : '<b>Interesting. That differs from the math.</b> '; t = correct ? val(q.ok) : (val(q.no) || val(q.ok)); }
      else if (q.type === 'poll') prefix = '<b>Noted.</b> ';
      else prefix = '<b>✓ Correct' + (r.attempts > 1 ? ' (attempt ' + r.attempts + ')' : '') + '.</b> ';
      feedback('ok', prefix + esc(t || ''));
    }
    if (isChoice) {
      var grp = UI.el('<div class="choices" role="radiogroup" aria-label="Answer choices"></div>'); body.appendChild(grp);
      q.choices.forEach(function (c, i) {
        var b = UI.el('<button type="button" class="choice" role="radio" aria-checked="false" data-id="' + c.id + '"><span class="ltr">' + String.fromCharCode(65 + i) + '</span><span>' + esc(c.text) + '</span></button>');
        b.addEventListener('click', function () {
          if (finished || b.disabled) return; UI.sound('click');
          var correct = q.type === 'poll' ? true : (c.id === val(q.correct));
          P.recordAnswer(id, c.id, correct);
          b.setAttribute('aria-checked', 'true');
          if (q.type === 'predict' || q.type === 'poll') {
            P.qrec(id).correct = true; P.save(); UI.$$('.choice', grp).forEach(function (x) { x.disabled = true; });
            b.classList.add(correct ? 'right' : 'picked'); if (q.type === 'predict') UI.$$('.choice', grp).forEach(function (x) { if (x.dataset.id === val(q.correct)) x.classList.add('right'); });
            showOk(correct); UI.sound(correct ? 'right' : 'click'); done();
          } else if (correct) {
            UI.$$('.choice', grp).forEach(function (x) { x.disabled = true; }); b.classList.add('right'); UI.sound('right'); showOk(true); done();
          } else {
            b.classList.add('wrong'); b.disabled = true; UI.sound('wrong');
            feedback('no', '<b>Not quite.</b> ' + esc(c.why || val(q.no) || 'Think about it again.') + ' <em>Try another answer. You have unlimited attempts.</em>');
          }
        });
        grp.appendChild(b);
      });
      if (rec.correct) { var sel = UI.$$('.choice', grp); sel.forEach(function (x) { x.disabled = true; if (x.dataset.id === (q.type === 'poll' || q.type === 'predict' ? rec.last : val(q.correct))) { x.classList.add(q.type === 'poll' ? 'picked' : 'right'); x.setAttribute('aria-checked', 'true'); } if (q.type === 'predict' && x.dataset.id === val(q.correct)) x.classList.add('right'); }); showOk(q.type === 'predict' ? rec.last === val(q.correct) : true); done(true); }
    } else if (q.type === 'numeric') {
      var row = UI.el('<div class="num-row"><label class="sr-only" for="n_' + id + '">Your answer</label><input id="n_' + id + '" class="num-in" type="text" inputmode="decimal" autocomplete="off" placeholder="Type your answer"><button type="button" class="btn primary">Check answer</button></div>');
      var inp = UI.$('input', row), btn = UI.$('button', row); body.appendChild(row);
      var check = function () {
        if (finished) return; var v = E.parseNumber(inp.value, q.mode);
        if (isNaN(v)) { feedback('no', '<b>Enter a number</b> such as 5, −1.4, 1/6 or 12.5%.'); return; }
        var target = val(q.correct), ok = Math.abs(v - target) <= q.tol;
        P.recordAnswer(id, v, ok);
        if (ok) { inp.disabled = true; btn.disabled = true; UI.sound('right'); showOk(true); done(); }
        else {
          UI.sound('wrong'); var note = '', att = P.qrec(id).attempts;
          (q.wrong || []).forEach(function (w) { if (Math.abs(v - w.v) < 1e-6) note = w.note; });
          feedback('no', '<b>Not quite.</b> ' + esc(note || val(q.no) || 'Try again.') + (att >= 2 && q.hint ? ' <em>Hint: ' + esc(q.hint) + '</em>' : '') + ' <em>Unlimited attempts.</em>');
        }
      };
      btn.addEventListener('click', check); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
      if (rec.correct) { inp.value = fm(rec.last, 4).replace(/\.?0+$/, ''); inp.disabled = true; btn.disabled = true; showOk(true); done(true); }
    }
    return wrap;
  };
  /* Questions a student predicted wrongly on the FIRST try, in the order they appear, for MY BIGGEST SURPRISE. */
  QE.surprises = function () {
    var out = [];
    Q.forEach(function (q) {
      var r = P.state.q[q.id];
      if (q.surprise && r && r.firstCorrect === false) {
        var txt = (q.surprise.predicted && q.surprise.predicted[r.firstAnswer]) || null;
        if (txt) out.push({ id: q.id, label: q.surprise.label, predicted: txt, discovered: q.surprise.discovered, w: q.type === 'predict' ? 0 : 1 });
      }
    });
    out.sort(function (a, b) { return a.w - b.w; });
    return out;
  };
  QE.corrected = function () {
    return Q.filter(function (q) { var r = P.state.q[q.id]; return q.required && q.learn && r && r.firstCorrect === false && r.correct; });
  };
})(typeof window !== 'undefined' ? window : globalThis);
