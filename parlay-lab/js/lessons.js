/*
 * lessons.js — the teaching text: reflection questions, quick-check questions, explanations,
 * discussion prompts and glossary. Edit this file to change the wording students see.
 * Feedback is deliberately neutral ("Answer recorded"), never celebratory about picks or streaks.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};

  PL.Lessons = {
    reflections: [
      'Why can a five-leg parlay feel more attractive than five separate predictions?',
      'Why can a near miss encourage another attempt?',
      'How does a large potential payout influence your perception of risk?',
      'Why doesn\'t winning one unlikely parlay prove the strategy is profitable?',
      'What happens when additional events must ALL happen?',
      'Why does house advantage matter over repeated play?',
      'How can someone win in the short term while using a negative expected-value strategy?'
    ],

    influence: ['Larger payout', 'Confidence in prediction', 'Excitement', 'Probability', 'Risk', 'Other'],

    nearMiss: {
      question: 'Does getting 4 out of 5 correct mean you\'re more likely to win the next parlay?',
      options: ['YES', 'NO', 'NOT SURE'],
      explanation: '<p><b>No.</b> Each prediction is its own event. The next game does not "remember" how close your last slip came.</p>' +
        '<p>A near miss <i>feels</i> like progress, but a parlay is all-or-nothing: 4 correct out of 5 pays exactly the same as 0 correct out of 5 — nothing. Near misses can make people want to try again quickly. That feeling is called the <b>near-miss effect</b>, and it is a psychological response, not a change in probability.</p>' +
        '<p>Independence: if each event is independent, the chance of the next slip winning depends only on the events in that slip.</p>'
    },

    fallacy: function (story) {
      var who = story.team;
      var intro = story.hypothetical ? 'Imagine a team has lost four games in a row.' :
        (story.elsewhere ? 'Around the league: ' + who + ' have lost ' + story.n + ' games in a row.' : who + ' have lost ' + story.n + ' games in a row.');
      return {
        intro: intro,
        question: 'Are they now due to win?',
        options: ['Definitely', 'Probably', 'Not necessarily'],
        explanation: '<p><b>Not necessarily.</b> This is the <b>gambler\'s fallacy</b>: believing that a streak of one outcome makes the opposite outcome "due".</p>' +
          '<p>If games are independent, previous results do not force a future result. A team\'s past losses may tell us something about how good the team is — but they do not create a debt of wins that must be paid back.</p>' +
          '<p>Try the coin demo in the <b>Learn</b> tab: after a long run of heads, the next flip is still about 50/50.</p>'
      };
    },

    afterGame: {
      title: 'THE RESULT DOES NOT CHANGE THE ORIGINAL PROBABILITY',
      html: '<p>A 10% event sometimes happens. A 70% event sometimes fails.</p>' +
        '<p>Probability describes uncertainty <b>before</b> the event. The final outcome does not prove that the original probability was incorrect — one game is a tiny sample.</p>'
    },

    discussion: [
      'Who created the largest parlay?',
      'Who had the highest potential return?',
      'Who had the highest probability?',
      'Did those belong to the same person?',
      'Who had a near miss?',
      'Did anyone win an unlikely parlay?',
      'Does winning an unlikely event make that event less unlikely beforehand?',
      'How did adding legs affect probability?',
      'What happened to potential return?',
      'Why would a system advertise the payout more prominently than the probability?'
    ],

    sameGame: [
      'Why did our results differ?',
      'Who required the most events to occur?',
      'Who had the largest potential return?',
      'Did the largest potential return have the highest probability?',
      'Did anyone correctly predict most legs but still lose the parlay?'
    ],

    revealSequence: [
      { stage: 'BEFORE GAME', ask: 'What do you think will happen?', hint: 'Show the matchup and pregame statistics. Have students predict the winner, the score range and the most uncertain prediction.' },
      { stage: 'DURING GAME', ask: 'What is happening?', hint: 'Replay the game. Pause after a big run or a missed shot and ask which predictions are now more or less likely.' },
      { stage: 'AFTER GAME', ask: 'What happened?', hint: 'Show the final score and compare it to the pregame lines. Which predictions hit? Which parlays survived?' },
      { stage: 'AFTER REVEAL', ask: 'What did the mathematics tell us?', hint: 'Open the simulation mathematics: probabilities, fair vs offered values, correlations and parlay ladders.' }
    ],

    glossary: [
      ['Leg', 'One prediction inside a parlay. Every leg must be correct for the parlay to win.'],
      ['Parlay', 'A slip that combines several legs. It pays more than single predictions because it is less likely.'],
      ['Probability', 'How likely something is, from 0% (never) to 100% (always), before it happens.'],
      ['Independent events', 'Events where one outcome does not change the chance of another.'],
      ['Correlated events', 'Events that tend to happen together (or not together), like a team winning and its star scoring a lot.'],
      ['Expected value (EV)', 'The average result per slip if you could repeat the exact same slip many, many times.'],
      ['Fair return', 'What a slip would pay if there were no house advantage: stake ÷ probability.'],
      ['Offered return', 'What this simulation actually pays: the fair return reduced by the house margin on every leg.'],
      ['House margin', 'The built-in mathematical advantage that makes the average result negative for the player.'],
      ['Variance', 'How spread out short-term results are. High variance means big swings from luck.'],
      ['Near miss', 'A loss that was close. It feels meaningful, but does not change the next probability.'],
      ['Gambler\'s fallacy', 'The mistaken belief that a streak makes the opposite result "due".'],
      ['Survivorship bias', 'Paying attention to the winners and forgetting the many who lost.']
    ],

    tooltips: {
      spread: 'A <b>point spread</b> is a head start. “Harbor City −4.5” means Harbor City must win by <b>5 or more</b>. “Metro +4.5” is correct if Metro wins, or loses by <b>4 or fewer</b>.',
      total: '<b>Total score</b> adds both teams\' points together. “Over 205.5” is correct if the combined score is 206 or more; “Under 205.5” if it is 205 or fewer. The .5 means there are no ties.',
      winner: '<b>Game winner</b> is correct if that team has more points when the game ends (overtime included).',
      player: 'A <b>player prop</b> is about one player\'s statistic. “Over 21.5 points” is correct if the player scores 22 or more.',
      events: '<b>Game events</b> are yes/no questions about how the game unfolds.',
      lines: 'Each prediction has a <b>line</b> (the number to beat). Higher or lower alternative lines change both the probability and the payout.',
      leg: 'A <b>leg</b> is one prediction. In a parlay, <b>every</b> leg must be correct.',
      margin: 'The <b>house margin</b> is the simulated built-in advantage. Fair return minus offered return is how many tokens it takes.',
      ev: '<b>Expected value</b> is the average net result per slip if you could repeat it many times. Negative EV means losing on average.'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
