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
mc(L, "C1", "A fair coin lands on heads five times in a row. Which statement is true about the next flip?",
   "It still has a 50% chance of tails, since flips are independent.",
   ["Tails is now more likely, because the coin must balance out.", "Heads is now certain to continue, since it is on a streak.", "The coin must be broken, so the next result is unpredictable."],
   "Believing tails is \"due\" is the gambler's fallacy; past results do not change the odds of an independent event.")
mc(L, "C2", "A fair six-sided die is rolled once. What is the probability of rolling a 4?",
   "1 in 6", ["1 in 4", "4 in 6", "1 in 12"],
   "One of six equally likely outcomes is a 4, so the probability is 1/6.")
mc(L, "C2", "A game costs $2 to play. There is a 1-in-10 chance to win $10 and otherwise you win nothing. What is the expected result per play, on average?",
   "A loss of $1 per play", ["A gain of about $8 per play on average", "Break even ($0)", "A gain of $1 per play"],
   "Expected value is (1/10 x $10) - $2 = -$1, so players lose on average.")
mc(L, "C3", "Why does a gambling business profit over time even though some players win?",
   "Games pay out less than the true odds, so the house wins.",
   ["The business secretly decides who wins and who loses each time.", "Players who learn the right system eventually beat the odds.", "Winners always give their money back to the game the next day."],
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
   "Unpredictable rewards trigger a stronger, longer dopamine response.",
   ["Predictable rewards cause the stronger and longer dopamine response.", "Dopamine is released only at the moment a player wins money.", "Players always know exactly when the next win is coming."],
   "Variable reinforcement produces a strong, persistent reward response.")
mc(L, "C2", "Which statement describes the mismatch in the teen brain?",
   "The reward system matures first, while impulse control in the prefrontal cortex lags.",
   ["The prefrontal cortex finishes maturing before the reward system does.", "Teen brains have no reward system, which explains the risk-taking.", "Both brain systems are already fully mature by about age twelve."],
   "Reward-seeking develops before impulse control and judgment finish maturing.")
mc(L, "C3", "Why does that mismatch raise teens' vulnerability to gambling and other addictive behaviors?",
   "Strong reward-seeking and still-maturing impulse control make stopping harder.",
   ["Teens are less able to understand the rules of games than adults are.", "Teens cannot feel rewards, so they keep looking for more.", "Teens always understand the odds, so they are fully protected."],
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
   "Betting paired with fandom and celebrities seems like a normal part of sports.",
   ["It makes betting seem rare and unusual among sports fans.", "It teaches viewers the real odds and risks behind every bet.", "It has no effect, because teens cannot legally place any bets."],
   "Repeated exposure shapes what feels normal, even for people who cannot yet bet.")
mc(L, "C3", "Why is a \"risk-free bet\" not really risk-free?",
   "Bonuses come with conditions, so money must be wagered first.",
   ["The company covers every loss with no conditions attached at all.", "The odds change in the player's favor during the promotion.", "Risk-free bets are guaranteed to never lose any money at all."],
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
   "\"No thanks, I'm not in. Want to play basketball?\"",
   ["\"Maybe next time, I guess, if I have some extra money.\"", "\"That's a dumb thing to do and you should feel bad!\"", "\"I'd join, but I would probably get caught by someone.\""],
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
