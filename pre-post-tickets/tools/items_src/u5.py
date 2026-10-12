"""Unit 5: Gambling, Gaming & Risk (Days 1-4; no unit-review ticket).
Knowledge/skills only; fictional scenarios; mock ads, no real brands. U5-D3-C4 (PSA draft) is a group product and has no auto-graded item."""
from ._h import mc, ms, match, cr

# ---------------- U5-D1 How gambling works ----------------
L = "U5-D1"
match(L, "C1", "Match each description to the correct term.",
     ["Probability", "House edge", "Gambler's fallacy"],
     [("The math of how likely an event is to happen", 0), ("The built-in advantage that lets the business win over time", 1),
      ("Believing a long losing streak means a win is \"due\"", 2), ("The percentage of bets a game is designed to keep on average", 1)],
     "Probability measures chance, house edge is the game's built-in advantage, and the gambler's fallacy is a false belief about streaks.")
mc(L, "C1", "A fair coin lands on heads five times in a row. What does the gambler's fallacy say, and what is true?",
   "The fallacy says tails is \"due,\" but each flip is independent and still has a 50% chance of tails.",
   ["Tails is now more likely because the coin must balance out.", "Heads is now certain to continue.", "The coin is broken."],
   "Past results do not change the odds of the next independent event.")
mc(L, "C2", "A fair six-sided die is rolled once. What is the probability of rolling a 4?",
   "1 in 6", ["1 in 4", "4 in 6", "1 in 2"],
   "One of six equally likely outcomes is a 4, so the probability is 1/6.")
mc(L, "C2", "A game costs $2 to play. There is a 1-in-10 chance to win $10 and otherwise you win nothing. What is the expected result per play, on average?",
   "A loss of $1 per play", ["A gain of $8 per play", "Break even ($0)", "A gain of $1 per play"],
   "Expected value is (1/10 x $10) - $2 = -$1, so players lose on average.")
mc(L, "C3", "Why does a gambling business profit over time even though some players win?",
   "The games pay out less than the true odds, so over many plays the business keeps a percentage.",
   ["The business picks who wins and loses each time.", "Players who learn a system eventually beat the odds.", "Winners always lose their money back the next day."],
   "House advantage guarantees an average profit for the business over many bets.")
cr(L, "Explain in your own words why \"a system\" cannot reliably beat a truly random game.")

# ---------------- U5-D2 The psychology of gambling ----------------
L = "U5-D2"
match(L, "C1", "Match each fictional example to the term it shows.",
     ["Variable reinforcement", "Near miss", "Chasing losses", "Tolerance"],
     [("Wins arrive at unpredictable times, like a slot machine", 0), ("A spin stops one symbol short of the jackpot", 1),
      ("Betting bigger to win back money already lost", 2), ("Needing larger bets to feel the same excitement", 3)],
     "These are the key patterns that keep reward systems engaged and keep people gambling.")
mc(L, "C1", "Why do unpredictable rewards, like slot machine payouts, keep people playing?",
   "Unpredictable rewards trigger a stronger, longer-lasting dopamine response than predictable ones.",
   ["Predictable rewards trigger more dopamine.", "Dopamine is released only after a win.", "Players always know when a win is coming."],
   "Variable reinforcement produces a strong, persistent reward response.")
mc(L, "C2", "Which statement describes the mismatch in the teen brain?",
   "The reward system matures earlier than the prefrontal cortex, which handles impulse control and long-term judgment.",
   ["The prefrontal cortex finishes before the reward system.", "Teen brains have no reward system.", "Both systems are fully mature by age 12."],
   "Reward-seeking develops before impulse control and judgment finish maturing.")
mc(L, "C3", "Why does that mismatch raise teens' vulnerability to gambling and other addictive behaviors?",
   "Strong reward-seeking with still-maturing impulse control makes it harder to stop after a rewarding experience.",
   ["Teens are less intelligent than adults.", "Teens cannot feel rewards.", "Teens always know the odds, so they are protected."],
   "The gap between reward drive and self-control increases the risk of developing addictive patterns.")
ms(L, "C4", "Which can raise a person's vulnerability to problem gambling? Select all that apply.",
   ["High impulsivity", "Strong reward-seeking", "Early exposure to gambling or gambling-like games"],
   ["Strong support from trusted adults", "Knowing the odds of a game"],
   "Impulsivity, reward-seeking, and early exposure raise risk; support and understanding odds are protective.")
cr(L, "Using three vocabulary words from today, explain why someone might keep gambling while losing money.")

# ---------------- U5-D3 Sports betting & gambling marketing ----------------
L = "U5-D3"
match(L, "C1", "Match each fictional ad line to the technique it uses.",
     ["Sign-up bonus or \"risk-free\" bet", "Celebrity or influencer promotion", "Streak or loyalty reward", "Social proof"],
     [("\"Your first bet is risk-free up to $100!\"", 0), ("A famous player says he bets on every game he watches", 1),
      ("\"You're on a 5-day streak. Bet again to unlock a bonus!\"", 2), ("\"Join millions of fans already betting!\"", 3)],
     "Bonuses, famous faces, rewards for staying active, and crowd appeal are common betting marketing tactics.")
ms(L, "C1", "Which are persuasive techniques used in sports-betting ads? Select all that apply.",
   ["Sign-up bonuses", "Celebrity endorsements", "\"Risk-free bet\" language", "Loyalty or streak rewards"],
   ["Showing the true odds of losing in large print", "Explaining the house edge to viewers"],
   "Ads highlight excitement and rewards and rarely show the odds or the house edge.")
mc(L, "C2", "A fictional betting app promo uses game-style graphics, popular streamers, and meme slang. Which audience is it most likely aiming for?",
   "Teens and young adults", ["Retired adults", "Elementary-aged children", "Professional gamblers"],
   "Style, platforms, and language show who an ad wants to reach.")
mc(L, "C3", "How can constant betting ads during sports broadcasts normalize gambling for young people?",
   "Pairing betting with fun, fandom, and celebrities makes it seem like a normal part of watching sports.",
   ["It makes betting seem rare and unusual.", "It informs viewers of the real odds.", "It has no effect because teens cannot legally bet."],
   "Repeated exposure shapes what feels normal, even for people who cannot yet bet.")
mc(L, "C3", "Why is a \"risk-free bet\" not really risk-free?",
   "Bonuses usually have conditions, and money often must be wagered before it can be withdrawn.",
   ["The company covers every loss without conditions.", "Odds change in the player's favor.", "Risk-free bets cannot lose any money ever."],
   "The wording hides the conditions and keeps the player betting.")
cr(L, "Name one persuasive technique in a mock sports-betting ad and what the ad does not tell you.")

# ---------------- U5-D4 Healthy decision-making & getting help ----------------
L = "U5-D4"
ms(L, "C1", "Which could be warning signs of problem gambling? Select all that apply.",
   ["Borrowing money repeatedly", "Lying about losses", "Betting more to win back lost money", "Skipping school or activities to gamble"],
   ["Spending time on hobbies and friends", "Choosing not to bet"],
   "Hiding behavior, money problems, chasing losses, and neglecting responsibilities are warning signs.")
match(L, "C2", "Chris (fictional) is invited to join a betting pool. Match each statement to the decision-making step.",
     ["Identify the problem", "List options", "Think about consequences", "Make the decision"],
     [("Chris is asked to put money into a betting pool", 0), ("Join, say no, or suggest another activity", 1),
      ("Losing money, feeling pressure again, straining friendships", 2), ("Chris declines and suggests a pickup game", 3)],
     "A decision-making model moves from the problem to options, consequences, and a choice.")
mc(L, "C3", "Which is the clearest refusal to a friend pressuring you to join a betting pool?",
   "\"No thanks, I'm not putting in money. Want to play basketball instead?\"",
   ["\"Maybe next time, I guess...\"", "\"That's a dumb thing to do!\"", "\"I'd join, but I'd probably get caught.\""],
   "A clear, calm \"no\" with an alternative is an effective refusal.")
ms(L, "C4", "Where can someone find help for problem gambling? Select all that apply.",
   ["A school counselor", "A trusted adult", "The National Problem Gambling Helpline, 1-800-522-4700"],
   ["Keep it secret and handle it alone", "Borrow money from friends to cover losses"],
   "Counselors, trusted adults, and the helpline offer support; secrecy and borrowing make things worse.")
match(L, "C5", "Sort each consequence of problem gambling as financial or social.",
     ["Financial consequence", "Social consequence"],
     [("Borrowing money and not repaying it", 0), ("Losing money needed for everyday things", 0),
      ("Friends or family losing trust after lies about losses", 1), ("Missing team events or school to gamble", 1)],
     "Problem gambling harms both money and relationships.")
cr(L, "Write a short refusal and an alternative plan for a fictional peer invited to a betting pool.")
