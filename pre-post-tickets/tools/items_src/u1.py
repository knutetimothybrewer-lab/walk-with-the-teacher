"""Unit 1: Personal Health & Wellness (Days 1-5; Day 6 is a unit-review ticket)."""
from ._h import mc, ms, match, cr

# ---------------- U1-D1 Health metrics & healthy habits ----------------
L = "U1-D1"
ms(L, "C1", "Which of these are health metrics a clinic might record at a checkup? Select all that apply.",
   ["Blood pressure", "Resting heart rate", "Height and weight"],
   ["Favorite music genre", "Number of social media followers"],
   "Health metrics are measurable facts about the body or habits, like blood pressure, heart rate, and height and weight.")
match(L, "C2", "Sort each fictional person's result as a positive health metric or one that needs attention.",
     ["Positive metric", "Needs attention"],
     [("Sleeps 9 hours on most school nights", 0), ("Resting heart rate of 68 beats per minute", 0),
      ("Blood pressure far above the normal range at repeated visits", 1), ("Sleeps about 5 hours on school nights", 1)],
     "Positive metrics fall in healthy ranges for a teen; repeated readings outside those ranges are a signal to follow up.")
mc(L, "C2", "Jamal's blood pressure was a little high at one visit. Which statement about reading health metrics is most accurate?",
   "One reading is one piece of information; trends over time and a health professional's interpretation matter.",
   ["One number always tells the whole story of a person's health.",
    "A reading outside the range means the person is definitely sick.",
    "Every person has exactly the same healthy range, no matter their age."],
   "Metrics are most useful when tracked over time and interpreted by a professional in context.")
match(L, "C3", "Sort each lifestyle factor by whether it generally supports health or diminishes it.",
     ["Supports health", "Diminishes health"],
     [("Regular physical activity", 0), ("Eating a variety of fruits and vegetables", 0),
      ("Long stretches of sitting with little movement", 1), ("Regularly getting too little sleep", 1)],
     "Activity and balanced eating support health metrics; inactivity and chronic sleep loss work against them.")
mc(L, "C3", "Dana (fictional) sleeps 5 hours a night and sits most evenings. Which change would most likely improve her health metrics?",
   "Move more during the day and go to bed earlier.",
   ["Drink an energy drink every afternoon to stay alert.", "Skip breakfast so she has more time to sleep.",
    "Stop checking any health numbers."],
   "Regular movement and enough sleep are lifestyle changes that improve many health metrics at once.")
cr(L, "Choose one health metric (for example, resting heart rate) and explain one lifestyle change that could help it.")

# ---------------- U1-D2 Dimensions of wellness ----------------
L = "U1-D2"
ms(L, "C1", "Which of these are physical health metrics? Select all that apply.",
   ["Hours of sleep per night", "Resting heart rate", "Minutes of physical activity per day"],
   ["How well a person handles disappointment", "How many people they feel close to"],
   "Physical metrics measure the body and its habits, such as sleep, heart rate, and activity.")
mc(L, "C2", "Which is the best example of a mental health metric?",
   "How well a person can concentrate and cope with everyday stress",
   ["Number of steps taken per day", "Number of friends a person has", "A blood pressure reading"],
   "Mental health metrics describe thinking, focus, stress, and coping rather than the body or relationships.")
mc(L, "C2", "A fictional student sleeps poorly and then has trouble focusing and feels irritable. What does this show about wellness?",
   "The dimensions of wellness are connected and affect each other.",
   ["Each dimension of wellness works completely on its own.", "Only physical health matters for doing well in school.",
    "Mood is only affected by what a person eats."],
   "Physical habits like sleep influence mental and emotional wellness, so the dimensions are linked.")
mc(L, "C3", "Priya (fictional) often feels left out and has no one to talk to when school is hard. Which dimension of wellness is mostly affected?",
   "Social wellness", ["Physical wellness", "Environmental wellness", "Financial wellness"],
   "Having supportive relationships and someone to talk to are social wellness metrics.")
match(L, "C3", "Sort each example by the dimension it best shows.",
     ["Social wellness", "Emotional wellness"],
     [("Has at least one trusted person to talk with", 0), ("Treats others with respect and communicates clearly", 0),
      ("Can name feelings and handle disappointment without lashing out", 1), ("Notices when feeling overwhelmed and uses a coping skill", 1)],
     "Social wellness is about relationships; emotional wellness is about understanding and managing feelings.")
cr(L, "Give one example of a physical, a mental, and a social/emotional health metric for a fictional student.")

# ---------------- U1-D3 Self-assessment & SMART goals ----------------
# C5 ("choose a wellness area that is meaningful to me") is personal and not auto-gradable; left out of the ticket.
L = "U1-D3"
mc(L, "C1", "What is the main purpose of a personal wellness self-assessment?",
   "To reflect honestly on current habits and find strengths and areas to improve",
   ["To earn a grade that is compared with other students", "To prove that a person is already healthy",
    "To diagnose a medical condition"],
   "A self-assessment is a reflection tool; it is not a test, a diagnosis, or a ranking.")
mc(L, "C2", "Maya's (fictional) self-assessment shows sleep 2 out of 5, physical activity 4 out of 5, and stress 3 out of 5. What are her strength and her area to improve?",
   "Strength: physical activity. Area to improve: sleep.",
   ["Strength: sleep. Area to improve: physical activity.", "Strength: stress. Area to improve: physical activity.",
    "She has no strengths because no score is 5."],
   "Her highest score is a strength and her lowest score is the clearest area to work on.")
match(L, "C3", "Match each description to the SMART letter it shows.",
     ["Specific", "Measurable", "Achievable", "Relevant", "Time-bound"],
     [("Names exactly what you will do: drink water with lunch", 0), ("Includes a number you can track: 20 minutes", 1),
      ("Realistic for your schedule and resources", 2), ("Matters for your own wellness needs", 3),
      ("Has a deadline: by the end of May", 4)],
     "SMART stands for Specific, Measurable, Achievable, Relevant, and Time-bound.")
mc(L, "C4", "A goal says, \"Be healthier.\" Which revision fixes the missing SMART parts?",
   "Walk 20 minutes after school on 4 days a week for the next 6 weeks.",
   ["Exercise a lot more and eat better soon.", "Never eat sweets again starting tomorrow.", "Run a marathon next week."],
   "The revision names the action, a number, a realistic plan, and a time frame.")
ms(L, "C6", "Which of these goals include all five SMART parts? Select all that apply.",
   ["Sleep 8 hours on school nights, Sunday to Thursday, for the next month to help focus in class.",
    "Drink 6 cups of water a day for two weeks to reduce afternoon headaches."],
   ["Be less stressed.", "Lose a lot of weight fast."],
   "A SMART goal names a specific action, a measure, a realistic target, a reason, and a deadline.")
cr(L, "Rewrite the goal \"Get fit\" as a SMART goal for a fictional student.")

# ---------------- U1-D4 Health & fitness misinformation ----------------
L = "U1-D4"
ms(L, "C1", "Which are warning signs that a health claim may be misleading? Select all that apply.",
   ["Promises fast results with no effort, like \"lose 15 pounds in 10 days\"",
    "Uses only before-and-after photos and personal testimonials as proof",
    "Sells a product while giving the advice"],
   ["Cites a named study and links to it", "Is reviewed by a medical organization"],
   "Quick-fix promises, testimonials instead of evidence, and a sales motive are common red flags.")
match(L, "C2", "Sort each feature by whether it points to a credible source or a source to question.",
     ["Credible source", "Question this source"],
     [("A government health agency or university medical center", 0), ("Cites research and names its authors", 0),
      ("An influencer with many followers who sells supplements", 1), ("Anonymous post with no sources", 1)],
     "Credible sources show expertise and evidence; popularity and a sales motive do not make a source credible.")
mc(L, "C2", "A fitness influencer with millions of followers says a tea \"melts belly fat.\" What does their popularity show?",
   "Nothing about whether the claim is true; credibility depends on evidence and expertise.",
   ["The claim must be true because so many people follow them.", "The claim is true if the influencer looks fit.",
    "The claim is true if many comments agree with it."],
   "Follower counts and appearance are not evidence; credibility comes from expertise and reliable proof.")
mc(L, "C3", "Which is the best way to check a health claim you saw on social media?",
   "Compare it with credible sources such as the CDC, NIH, or a medical center.",
   ["Share it and see whether friends believe it.", "Search for another post that says the same thing.",
    "Trust it if the video looks professionally made."],
   "Verifying means checking the claim against reliable, independent sources, not repeating it.")
mc(L, "C4", "A fictional ad claims a supplement \"burns fat while you sleep.\" Which decision and reason are best?",
   "Do not trust it yet: there is no evidence given, and the seller profits from the claim.",
   ["Trust it: supplements are always tested for safety and results.", "Trust it: the ad has lots of five-star reviews.",
    "Do not trust it: ads are always lies."],
   "A good justification points to missing evidence and the seller's motive, not to reviews or blanket distrust.")
cr(L, "A video shows a dramatic before-and-after photo. Name two things you would check before trusting it.")

# ---------------- U1-D5 Decision-making & personal responsibility ----------------
L = "U1-D5"
mc(L, "C1", "Sam (fictional) has a big test tomorrow. It is 11:30 p.m. and friends invite him to play online. What decision must Sam make?",
   "Whether to stay up playing or go to sleep before the test",
   ["Whether his friends are good friends", "Whether to take the test", "Which game is the most fun"],
   "The decision is the choice Sam must make now, which affects his rest and his test.")
ms(L, "C2", "Lena is exhausted, has homework left, and friends want to hang out online. Which are realistic choices she could make? Select all that apply.",
   ["Finish homework, then go to bed on time", "Play online for a short, set time, then stop and go to bed",
    "Tell her friends she will connect tomorrow"],
   ["Ignore everything and hope it works out", "Stay up all night doing both"],
   "Good options are realistic and fit her responsibilities; ignoring the situation is not a choice that solves it.")
match(L, "C3", "Sort each consequence of regularly staying up very late on school nights.",
     ["Positive consequence", "Negative consequence"],
     [("More time to relax with friends tonight", 0), ("Trouble focusing in class tomorrow", 1),
      ("Feeling tired and irritable over time", 1), ("Finishing a game or show you enjoy", 0)],
     "Choices often have short-term benefits and longer-term costs, and both belong in the decision.")
mc(L, "C4", "Using the STOP steps, which choice is the most responsible for a tired student with a test tomorrow?",
   "Set a stopping time, finish what is necessary, and get enough sleep.",
   ["Stay up as late as friends are online.", "Skip the test preparation altogether.", "Do whatever an adult says without thinking."],
   "A responsible choice considers consequences for health and responsibilities.")
mc(L, "C5", "Which reasoning best explains why a choice is a responsible health decision?",
   "It weighs the likely short- and long-term consequences for my health and responsibilities.",
   ["It is what an adult told me to do.", "It is the choice that is perfect in every way.", "It is what most of my friends are doing."],
   "Responsible decisions are based on consequences and ownership, not on pleasing others or perfection.")
cr(L, "Describe a fictional student's decision and explain, step by step, how the STOP process helps.")
