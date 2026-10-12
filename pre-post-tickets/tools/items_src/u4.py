"""Unit 4: Tobacco, Alcohol & Other Drugs (Days 1-5; Day 6 is a unit-review ticket).
Knowledge/skills only. All scenarios use fictional people; nothing asks for personal experiences."""
from ._h import mc, ms, match, cr

# ---------------- U4-D1 Addiction & the adolescent brain ----------------
L = "U4-D1"
match(L, "C1", "Match each fictional example to tolerance, physical dependence, or addiction.",
     ["Tolerance", "Physical dependence", "Addiction (substance use disorder)"],
     [("Needing larger amounts to get the same effect", 0),
      ("A patient takes prescribed pain medicine as directed and has withdrawal symptoms when it stops, with no compulsive use", 1),
      ("Continuing to use despite repeated harm and loss of control", 2),
      ("The body adjusts so the same dose no longer works as well", 0)],
     "Tolerance and physical dependence are body adaptations; addiction involves compulsive use despite harm, so they are not the same.")
ms(L, "C2", "How can psychoactive substances affect brain function or behavior? Select all that apply.",
   ["They can change how brain cells communicate", "They can impair judgment and coordination", "They can affect mood and memory"],
   ["They affect behavior only when a large amount is used", "They always cause permanent damage after one use"],
   "Substances alter brain signaling and can change judgment, coordination, mood, and memory.")
ms(L, "C3", "Which statements about substance-use risk are accurate? Select all that apply.",
   ["Starting at a younger age raises the risk of problems", "Supportive family and friends can reduce risk", "Many factors together influence risk, such as stress, genetics, and availability"],
   ["Addiction is just a lack of willpower", "Any single risk factor guarantees addiction"],
   "Risk comes from many interacting factors; no single factor decides the outcome.")
mc(L, "C4", "Why can adolescents be more vulnerable to risk-taking?",
   "Impulse control is still developing while the reward system is very active.",
   ["Teen brains are fully developed, so risk comes only from choices.", "Teens are unable to learn from the consequences of their actions.", "Impulse control matures first while the reward system lags behind."],
   "Adolescent brain development makes reward-seeking strong while self-control is still maturing.")
mc(L, "C5", "Which source is best for supporting a claim about how addiction affects the brain?",
   "NIDA, the National Institute on Drug Abuse",
   ["A viral video posted by an anonymous online account", "A commercial website that is selling a detox product", "A close friend's strong opinion about the topic"],
   "Credible claims are backed by expert, evidence-based organizations.")
cr(L, "Correct this statement in two or three sentences: \"Tolerance and addiction mean the same thing.\"")

# ---------------- U4-D2 Tobacco & vaping ----------------
L = "U4-D2"
mc(L, "C1", "Why is nicotine especially concerning for teens?",
   "It is highly addictive and can affect attention in teens.",
   ["Teen brains are protected from nicotine's effects until adulthood.", "Nicotine is only harmful when it comes from burning cigarettes.", "Nicotine only causes problems after many years of daily use."],
   "The developing brain is more vulnerable to nicotine's effects and to dependence.")
ms(L, "C2", "Which are health risks linked to tobacco or vaping? Select all that apply.",
   ["Nicotine addiction", "Irritation and harm to the lungs", "Effects on attention and learning", "Cancer risk from toxic chemicals in burned tobacco"],
   ["Improved lung capacity", "Better focus in the long run"],
   "Nicotine, aerosol chemicals, and smoke are linked to addiction, lung harm, brain effects, and cancer.")
match(L, "C3", "Match each influence to the category it shows.",
     ["Marketing", "Product design or flavors", "Peer norms"],
     [("Social media influencers who make vaping look fun", 0), ("Fruit and candy flavors", 1),
      ("Believing \"most teens my age vape\"", 2), ("Small, sleek devices that are easy to hide", 1)],
     "Marketing, flavors and design, and perceived norms all shape youth nicotine use.")
ms(L, "C4", "Which of these claims are inaccurate? Select all that apply.",
   ["E-cigarette aerosol is just harmless water vapor.", "Nicotine-free means risk-free.", "If a product is sold legally, it must be safe for teens."],
   ["Vaping can still expose users to nicotine and other chemicals.", "Burning tobacco creates many toxic chemicals."],
   "Aerosol contains more than water, and legal sale does not mean safe for youth.")
mc(L, "C5", "Which counter-message is accurate and teen-appropriate?",
   "\"Vape aerosol can contain nicotine and other chemicals. Check the CDC.\"",
   ["\"Vaping will kill you within a week, so never even try it.\"", "\"Everyone who ever vapes will definitely get lung cancer.\"", "\"Vaping is totally fine as long as you only do it sometimes.\""],
   "Good counter-messages are accurate, avoid exaggeration, and point to credible sources.")
cr(L, "Name one influence on youth nicotine use and explain how a public-health message could counter it.")

# ---------------- U4-D3 Alcohol: effects, impairment, decisions ----------------
L = "U4-D3"
ms(L, "C1", "Which are short-term effects of alcohol that can affect safety or decisions? Select all that apply.",
   ["Slower reaction time", "Poorer judgment", "Reduced coordination", "Memory problems or blackouts"],
   ["Better driving ability", "Sharper decision-making"],
   "Alcohol is a central nervous system depressant that impairs judgment, reaction time, coordination, and memory.")
ms(L, "C2", "Which statements explain why alcohol affects people differently? Select all that apply.",
   ["Body size and composition can change the effect", "Drinking quickly increases impairment compared with drinking slowly", "Food and medications can change the effect"],
   ["Everyone is affected the same way by the same number of drinks", "Feeling fine means a person is not impaired"],
   "Impairment varies with amount, speed, body, food, and medications, and people cannot reliably judge their own impairment.")
match(L, "C3", "A fictional teen's ride home has been drinking. Match each statement to the decision-making step it shows.",
     ["Define the problem", "List options", "Think about consequences", "Choose the safest decision"],
     [("My ride has been drinking and I need to get home", 0), ("I could call a parent, find a sober driver, or stay overnight", 1),
      ("A crash could cause injury, legal trouble, and harm to others", 2), ("I will call a parent for a ride", 3)],
     "A structured process moves from the problem to options, consequences, and the safest choice.")
mc(L, "C4", "Mia (fictional) is offered a ride from someone who has been drinking. Which response best weighs alternatives and consequences?",
   "Compares options like a sober driver, weighs the risks, and picks the safest",
   ["Takes the first ride offered because it is the easiest option", "Decides based on whatever most of the friends there are doing", "Avoids making any decision and hopes it all works out fine"],
   "Safer alternatives and their consequences should be compared before acting.")
ms(L, "C5", "Which are signs that someone who drank alcohol needs emergency help right away? Select all that apply.",
   ["Cannot be woken up", "Vomiting repeatedly and confused", "Slow or irregular breathing"],
   ["Being loud and talkative", "Feeling slightly dizzy but walking and talking normally"],
   "Unresponsiveness and breathing problems can mean alcohol poisoning; call emergency services.")
cr(L, "Describe one alcohol-related situation where the safest decision should be made before anyone starts drinking.")

# ---------------- U4-D4 Marijuana, prescription drugs & opioids ----------------
# Left out: C6 (use credible sources; tested in U1-D4 and U4-D1-C5).
L = "U4-D4"
ms(L, "C1", "Which are ways marijuana can affect functioning or safety? Select all that apply.",
   ["Slower reaction time", "Trouble with attention and memory", "Reduced coordination while driving", "Poorer judgment"],
   ["It improves driving reaction time", "It is harmless because it is natural"],
   "Cannabis can impair attention, reaction time, coordination, memory, and judgment.")
match(L, "C2", "Sort each example as prescribed use or misuse.",
     ["Prescribed use", "Misuse"],
     [("Taking medicine exactly as directed by the prescriber", 0), ("Using a medicine that was prescribed to you, in the amount and way directed", 0),
      ("Taking a friend's ADHD medication to study", 1), ("Taking extra pills because the pain feels worse", 1)],
     "Using someone else's medication, more than prescribed, or for another purpose is misuse.")
mc(L, "C3", "Why can opioids cause life-threatening overdose?",
   "They slow breathing, and too much can stop it.",
   ["They speed up the heart until it stops.", "They only cause overdose when injected.", "They only affect people who misuse them regularly."],
   "Opioids depress breathing, which is what makes overdose life-threatening.")
mc(L, "C4", "A classmate offers a pill said to be \"the same as a prescription one.\" Why can't that claim show the pill is safe?",
   "Counterfeit pills can look real but contain fentanyl, so looks prove nothing.",
   ["Pills that look like medicine always come from drug companies.", "Pills sold for a low price are always the weaker versions.", "Pills with natural-sounding ingredients are guaranteed to be safe."],
   "You cannot tell what is in a pill by looking, and counterfeit pills can be deadly.")
ms(L, "C5", "Which are key parts of responding to a suspected opioid overdose? Select all that apply.",
   ["Call 911 right away", "Give naloxone if it is available", "Stay with the person until help arrives"],
   ["Wait to see if they sleep it off", "Give them coffee or food to wake them up"],
   "Naloxone can temporarily reverse an overdose, but emergency medical help is still needed.")
cr(L, "Complete: One drug misconception that can increase risk is ___ because ___.")

# ---------------- U4-D5 Influences, decisions & refusal skills ----------------
L = "U4-D5"
match(L, "C1", "Sort each fictional situation as direct or indirect pressure.",
     ["Direct pressure", "Indirect pressure"],
     [("A friend says, \"Just try it, don't be weird.\"", 0), ("Someone keeps handing you a drink and asking again", 0),
      ("Everyone in the room is holding a vape", 1), ("Your ride depends on someone who has been drinking", 1)],
     "Direct pressure is said out loud; indirect pressure comes from the situation and social cues.")
match(L, "C2", "Match each response to passive, aggressive, or assertive communication.",
     ["Passive", "Aggressive", "Assertive"],
     [("Mumbles \"um, maybe... okay\" and looks away", 0), ("Yells, \"You're stupid for asking!\"", 1),
      ("Looks them in the eye and says, \"No thanks, I'm not interested.\"", 2), ("Says, \"Sure, whatever you want\" to avoid conflict", 0)],
     "Assertive communication is clear and respectful; passive gives in and aggressive attacks.")
ms(L, "C3", "Which are effective refusal or exit strategies? Select all that apply.",
   ["Saying a clear \"No thanks\" and suggesting something else to do", "Leaving the setting and contacting a trusted adult", "Teaming up with a friend who will leave with you"],
   ["Giving a long, apologetic explanation hoping they stop asking", "Going along now and planning to quit later"],
   "Short, confident refusals, alternatives, allies, and leaving are effective; long excuses and going along are not.")
mc(L, "C4", "Which response uses effective body language and concise words?",
   "Eye contact, a calm voice, and \"No thanks, I'm good.\"",
   ["Looking at the floor and saying, \"maybe, I guess\"", "Standing close to the person and shouting a long insult", "Laughing nervously while giving a long, rambling excuse"],
   "Confident posture and a brief, clear statement make refusal more effective.")
mc(L, "C5", "A fictional friend at a party is unresponsive after drinking. What is the best action?",
   "Call for emergency help and get a trusted adult",
   ["Keep it secret to protect the friend from trouble", "Handle it alone so that no one else ever finds out", "Wait until the morning to see how they are doing"],
   "Safety comes before secrecy; some situations need an adult or emergency help immediately.")
cr(L, "Write a three-line response to a pressure scenario: a refusal, an alternative or exit, and a support plan.")
