"""Form B (parallel) items for Unit 5. Mock ads only; no real brands."""
from ._h import b_mc as mc, b_ms as ms, b_match as match

# ---------------- U5-D1 ----------------
L = "U5-D1"
match(L, 1, "Match each description to the correct term.",
     ["Probability", "House edge", "Gambler's fallacy"],
     [("How likely a chance event is, shown as a number", 0), ("The advantage that makes a game pay out less than the true odds", 1),
      ("Thinking a color is \"due\" after a long streak on a wheel", 2), ("The average share of money wagered that the business keeps", 1)],
     "Probability measures chance, house edge is the game's built-in advantage, and the gambler's fallacy is a false belief about streaks.")
mc(L, 2, "A fair roulette-style wheel lands on red six times in a row. Which statement is true about the next spin?",
   "It has the same chance of red or black each spin.",
   ["Black is now more likely, since the wheel has to balance out.", "Red is now certain to continue, because it is on a streak.", "The wheel must be broken, so nothing can be predicted at all."],
   "Streaks do not change the odds of the next independent spin.")
mc(L, 3, "A fair spinner has 5 equal sections numbered 1 to 5. What is the probability of landing on 3?",
   "1 in 5", ["1 in 15", "3 in 5", "1 in 2"],
   "One of five equally likely outcomes is a 3, so the probability is 1/5.")
mc(L, 4, "A game costs $5 to play. There is a 1-in-20 chance to win $60 and otherwise you win nothing. What is the expected result per play, on average?",
   "A loss of $2 per play", ["A gain of $55 per play", "Break even ($0)", "A gain of $3 per play"],
   "Expected value is (1/20 x $60) - $5 = -$2, so players lose on average.")
mc(L, 5, "Why do gambling businesses make money over time even though some customers win?",
   "Payouts are set below the true odds, so the business keeps a share overall.",
   ["The business secretly decides which customers will win and lose.", "Customers who study a game long enough always beat the odds.", "Winners are required to return their money the following day."],
   "House advantage guarantees an average profit for the business over many bets.")

# ---------------- U5-D2 ----------------
L = "U5-D2"
match(L, 1, "Match each fictional example to the term it shows.",
     ["Variable reinforcement", "Near miss", "Chasing losses", "Tolerance"],
     [("Prizes from loot boxes arrive at random times", 0), ("A scratch ticket is missing just one matching symbol", 1),
      ("Doubling a bet after a loss to try to recover", 2), ("Needing riskier bets to feel the same thrill", 3)],
     "These are key patterns that keep reward systems engaged and keep people gambling.")
mc(L, 2, "Why do random, unpredictable prizes, like those in loot boxes, keep people playing?",
   "Unpredictable rewards trigger a stronger, longer dopamine response.",
   ["Predictable rewards cause the stronger and longer dopamine response.", "Dopamine is released only at the moment a player loses money.", "Players always know exactly when the next prize is coming."],
   "Variable reinforcement produces a strong, persistent reward response.")
mc(L, 3, "Which statement describes the brain development gap in teenagers?",
   "Reward-seeking circuits mature earlier than the self-control of the prefrontal cortex.",
   ["The prefrontal cortex matures completely before the reward circuits do.", "Teens lack reward circuits, which is why they take chances.", "Both brain systems are completely finished developing by thirteen."],
   "Reward-seeking develops before impulse control and judgment finish maturing.")
mc(L, 4, "Why does that gap raise a teen's vulnerability to gambling and other addictions?",
   "Strong reward-seeking and maturing self-control make quitting hard.",
   ["Teens are worse at reading rules than adults are, so they lose more.", "Teens feel no rewards, so they keep searching for bigger ones.", "Teens always grasp the odds, which makes them completely safe."],
   "The gap between reward drive and self-control increases the risk of addictive patterns.")
ms(L, 5, "Which can raise a person's vulnerability to problem gambling? Select all that apply.",
   ["Acting without thinking (impulsivity)", "A strong desire for thrills and rewards", "Playing gambling-style games at a young age"],
   ["Close support from caring adults", "Understanding how odds really work"],
   "Impulsivity, thrill-seeking, and early exposure raise risk; support and knowing the odds are protective.")

# ---------------- U5-D3 ----------------
L = "U5-D3"
match(L, 1, "Match each fictional ad line to the technique it uses.",
     ["Sign-up bonus or \"risk-free\" bet", "Celebrity or influencer promotion", "Streak or loyalty reward", "Social proof"],
     [("\"Get a $200 bonus when you sign up today!\"", 0), ("A famous quarterback says, \"I trust this app.\"", 1),
      ("\"Keep your streak alive for bonus bets!\"", 2), ("\"Join the millions of fans who bet on game day.\"", 3)],
     "Bonuses, famous faces, rewards for staying active, and crowd appeal are common betting marketing tactics.")
ms(L, 2, "Which are persuasive techniques used in sports-betting ads? Select all that apply.",
   ["Free bet offers for new customers", "Star athletes promoting the app", "\"Risk-free\" first bet language", "Rewards for betting several days in a row"],
   ["Posting the real chance of losing in bold type", "Explaining how the house edge works"],
   "Ads highlight excitement and rewards and rarely show the odds or the house edge.")
mc(L, 3, "A fictional betting promo uses esports clips, popular streamers, and trending slang. Which audience is it most likely aiming for?",
   "Teens and young adults", ["Older retired adults", "Toddlers and preschoolers", "Professional poker players"],
   "Content, platforms, and language show who an ad wants to reach.")
mc(L, 4, "How can nonstop sports-betting ads during games normalize gambling for young people?",
   "Betting shown beside fandom and stars seems like a normal part of sports.",
   ["It makes betting look like something almost no one does.", "It teaches viewers the real odds and risks of every bet.", "It has no effect, because young people cannot legally bet."],
   "Repeated exposure shapes what feels normal, even for people who cannot yet bet.")
mc(L, 5, "Why is a \"bonus bet\" not truly free money?",
   "Bonuses come with conditions, so winnings often must be wagered first.",
   ["The company pays every loss with no limits or conditions.", "The bonus changes the odds in the customer's favor.", "A bonus bet can never lose any money at any time."],
   "The wording hides the conditions and keeps the player betting.")

# ---------------- U5-D4 ----------------
L = "U5-D4"
ms(L, 1, "Which could be warning signs of problem gambling? Select all that apply.",
   ["Being preoccupied with gambling", "Hiding gambling from family and friends", "Betting more to chase lost money", "Falling behind on schoolwork or chores"],
   ["Walking away after a set limit every time", "Choosing other activities over betting"],
   "Preoccupation, secrecy, chasing losses, and neglecting responsibilities are warning signs.")
match(L, 2, "Dee (fictional) is invited to join a sports bracket pool. Match each statement to the decision-making step.",
     ["Identify the problem", "List options", "Think about consequences", "Make the decision"],
     [("Dee is asked to put money into a sports bracket pool", 0), ("Join, decline, or suggest watching the game together instead", 1),
      ("Losing money, continued pressure, and damaged friendships", 2), ("Dee says no and suggests watching together", 3)],
     "A decision-making model moves from the problem to options, consequences, and a choice.")
mc(L, 3, "Which is the clearest refusal when a friend pushes you to join a betting game?",
   "\"No thanks, I'm not in. Want to grab pizza instead?\"",
   ["\"Maybe some other time, I guess, if I happen to have money.\"", "\"That's a ridiculous thing to do and you should stop!\"", "\"I would join, but I would probably get caught.\""],
   "A clear, calm \"no\" with an alternative is an effective refusal.")
ms(L, 4, "Where can someone find help for problem gambling? Select all that apply.",
   ["A school counselor", "A parent or trusted adult", "ncpgambling.org and the helpline at 1-800-522-4700"],
   ["Keep it secret and try to win the money back", "Borrow money from friends to cover the losses"],
   "Counselors, trusted adults, and the helpline offer support; secrecy and borrowing make things worse.")
match(L, 5, "Sort each consequence of problem gambling as financial or social.",
     ["Financial consequence", "Social consequence"],
     [("Running out of money meant for lunch or bills", 0), ("Debt from borrowing to place more bets", 0),
      ("Arguments and broken trust with family", 1), ("Pulling away from friends and activities", 1)],
     "Problem gambling harms both money and relationships.")
