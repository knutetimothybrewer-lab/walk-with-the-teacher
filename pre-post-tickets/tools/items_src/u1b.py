"""Form B (parallel) items for Unit 1. Each mirrors the form-A item of the same number: same criterion, same type, same difficulty."""
from ._h import b_mc as mc, b_ms as ms, b_match as match

# ---------------- U1-D1 ----------------
L = "U1-D1"
ms(L, 1, "Which of these would a school nurse or doctor record as health metrics? Select all that apply.",
   ["Body temperature", "Weight", "Pulse rate (heart rate)"],
   ["Favorite sport to watch", "Number of video game wins"],
   "Temperature, weight, and pulse are measurable facts about the body that clinics track.")
match(L, 2, "Sort each fictional person's result as a positive health metric or one that needs attention.",
     ["Positive metric", "Needs attention"],
     [("Up-to-date vaccinations", 0), ("Body temperature of 98.6 degrees F at a routine checkup", 0),
      ("Resting heart rate far above the normal range at several visits", 1), ("Sleeping only about 4 hours on most school nights", 1)],
     "Metrics inside healthy ranges are positive; repeated readings outside them are a signal to follow up.")
mc(L, 3, "Priya's resting heart rate was a little high at one clinic visit. Which statement about health metrics is the most accurate?",
   "A single reading is a snapshot, and patterns over time matter.",
   ["One reading gives a complete and final picture of a person's health.", "Any number outside the usual range means the person has a disease.",
    "The healthy range is the same for toddlers, teens, and older adults."],
   "Metrics are best interpreted over time and with a health professional.")
match(L, 4, "Sort each lifestyle factor by whether it generally supports health or diminishes it.",
     ["Supports health", "Diminishes health"],
     [("Drinking water throughout the day", 0), ("Spending free time being active outdoors", 0),
      ("Smoking or vaping regularly", 1), ("Skipping meals and relying on sugary drinks", 1)],
     "Hydration and activity support health; tobacco, nicotine, and poor eating habits harm it.")
mc(L, 5, "Leo (fictional) sleeps 5 hours, eats few vegetables, and rarely moves during the day. Which plan would most likely improve his health metrics?",
   "Add daily movement, eat vegetables, and aim for more sleep.",
   ["Use energy drinks to stay awake and skip meals to save time.", "Ignore his health numbers since they are only numbers.",
    "Do one very hard workout a month to make up for everything else."],
   "Small, steady changes in movement, eating, and sleep improve many metrics together.")

# ---------------- U1-D2 ----------------
L = "U1-D2"
ms(L, 1, "Which of these are physical health metrics? Select all that apply.",
   ["Blood pressure", "Height and weight", "Amount of weekly exercise"],
   ["How well a person copes with stress", "How many people a person trusts"],
   "Physical metrics measure the body and its habits.")
mc(L, 2, "Which is the best example of a mental health metric?",
   "How well a person can focus and manage worries",
   ["How many minutes of exercise a person gets daily", "How many people a person talks to each day", "A person's height and weight at a checkup"],
   "Mental health metrics describe focus, stress, and coping.")
mc(L, 3, "A fictional student skips meals and sleeps 4 hours, and then feels anxious and cannot concentrate. What does this show about wellness?",
   "Physical habits and mental wellness are linked.",
   ["Physical habits have no connection to how a person feels.", "Anxiety is only caused by schoolwork, never by daily habits.",
    "Only mental wellness matters when a student is struggling."],
   "Sleep and nutrition influence mood and focus, so the dimensions of wellness are connected.")
mc(L, 4, "Omar (fictional) feels overwhelmed and snaps at others when he is frustrated, even though he has good friends. Which dimension is mostly affected?",
   "Emotional wellness", ["Physical wellness", "Environmental wellness", "Financial wellness"],
   "Understanding and managing feelings is an emotional wellness skill.")
match(L, 5, "Sort each example by the dimension it best shows.",
     ["Social wellness", "Emotional wellness"],
     [("Spends time with supportive friends and family", 0), ("Resolves conflicts by talking respectfully", 0),
      ("Notices feeling sad and uses a healthy way to cope", 1), ("Handles a bad grade without losing control", 1)],
     "Social wellness is about connections; emotional wellness is about understanding and managing feelings.")

# ---------------- U1-D3 ----------------
L = "U1-D3"
mc(L, 1, "Which is the best description of a wellness self-assessment?",
   "A reflection tool for noticing habits, strengths, and areas to grow",
   ["A graded quiz used to rank students against each other", "A medical exam that diagnoses health problems", "A one-time test that decides whether someone is healthy"],
   "A self-assessment is for honest reflection, not ranking or diagnosing.")
mc(L, 2, "Sam's (fictional) self-assessment shows stress management 2 out of 5, sleep 4 out of 5, and social connection 3 out of 5. What are his strength and his area to improve?",
   "Strength: sleep. Area to improve: stress management.",
   ["Strength: stress management. Area to improve: sleep.", "Strength: social connection. Area to improve: sleep and stress.", "He has no strengths since none of his scores is a 5."],
   "His highest score is a strength and his lowest score is the clearest area to improve.")
match(L, 3, "Match each description to the SMART letter it shows.",
     ["Specific", "Measurable", "Achievable", "Relevant", "Time-bound"],
     [("Plans to stretch for 10 minutes each morning", 0), ("Tracks progress by counting 5 mornings a week", 1),
      ("Fits into the existing school-day schedule", 2), ("Helps relieve tightness from sitting all day", 3),
      ("Will be done daily until the end of the semester", 4)],
     "SMART stands for Specific, Measurable, Achievable, Relevant, and Time-bound.")
mc(L, 4, "A goal says, \"Eat better.\" Which revision fixes the missing SMART parts?",
   "Eat one fruit with lunch on 5 school days a week for 4 weeks.",
   ["Eat healthier foods more often and avoid junk food from now on.", "Never eat any snacks or desserts again, starting from today.", "Eat only fruit and vegetables for the next two full months."],
   "The revision names the action, a number, a realistic plan, and a time frame.")
ms(L, 5, "Which of these goals include all five SMART parts? Select all that apply.",
   ["Walk to school on 3 mornings a week for the next month to build energy.",
    "Do a 10-minute breathing exercise every evening for two weeks to reduce stress."],
   ["Feel happier.", "Get in shape somehow."],
   "A SMART goal names an action, a measure, a realistic target, a reason, and a deadline.")

# ---------------- U1-D4 ----------------
L = "U1-D4"
ms(L, 1, "Which are warning signs that a health claim may be misleading? Select all that apply.",
   ["Says a product will \"melt fat\" with no effort", "Relies on a single photo of one person as proof", "Is selling the very product it recommends"],
   ["Names the study and links to the full report", "Was reviewed by independent health experts"],
   "Effortless miracle results, thin proof, and a sales motive are common red flags.")
match(L, 2, "Sort each feature by whether it points to a credible source or a source to question.",
     ["Credible source", "Question this source"],
     [("Written by a doctor and cites published research", 0), ("A state health department website", 0),
      ("A celebrity paid to promote a diet tea", 1), ("A video saying \"doctors hate this one trick\"", 1)],
     "Credible sources have expertise and evidence; paid promotion and clickbait do not.")
mc(L, 3, "A famous YouTuber with millions of subscribers says a juice cleanse \"resets your body.\" What does their fame show?",
   "Nothing about its truth, since credible evidence counts.",
   ["That the claim is true, because millions of people watch them.", "That the claim is proven by how healthy the YouTuber looks.", "That the cleanse is safe because many viewers shared the video."],
   "Fame, looks, and shares are not evidence; credibility comes from expertise and proof.")
mc(L, 4, "What is the best way to check a surprising health claim you saw in a video?",
   "Look for it from credible sources such as the CDC.",
   ["Ask the commenters under the video whether the claim is true.", "Check how many likes and shares the video has received so far.", "Trust it when the speaker sounds confident and uses scientific words."],
   "Verification means comparing the claim with reliable, independent sources.")
mc(L, 5, "A fictional post says a \"detox\" tea cleans your organs in three days. Which decision and reason are best?",
   "Do not trust it yet: no evidence is shown, and the poster sells the tea.",
   ["Trust it: natural ingredients are always safe and effective for everyone.", "Trust it: lots of followers commented that it worked for them.", "Do not trust it: anything sold online is always a scam."],
   "A good justification points to missing evidence and the seller's motive.")

# ---------------- U1-D5 ----------------
L = "U1-D5"
mc(L, 1, "Ava (fictional) has a big presentation tomorrow. At 10:30 p.m. friends invite her to a video chat. What decision does Ava face?",
   "Whether to join the chat or go to bed",
   ["Whether her friends are really her friends or not", "Whether to give the presentation at all", "Which friend she should talk to first tonight"],
   "The decision is the choice Ava must make now, and it affects her rest and her presentation.")
ms(L, 2, "Mateo is tired, has homework left, and friends want to chat online. Which are realistic choices he could make? Select all that apply.",
   ["Finish homework, then go to bed on time", "Join the chat briefly, then stop at a set time", "Tell friends he can chat tomorrow after school"],
   ["Stay up all night trying to do everything", "Do nothing and hope it all works out"],
   "Realistic options fit his responsibilities; ignoring the situation solves nothing.")
match(L, 3, "Sort each consequence of regularly skipping breakfast.",
     ["Positive consequence", "Negative consequence"],
     [("A few extra minutes of sleep before school", 0), ("Not having to prepare food in the morning", 0),
      ("Feeling hungry and distracted in morning classes", 1), ("Low energy and trouble concentrating over time", 1)],
     "Choices often have short-term upsides and longer-term costs; both belong in the decision.")
mc(L, 4, "Which choice is the most responsible for a student who feels stressed and has stopped exercising and sleeping enough?",
   "Set a realistic routine for sleep and movement and ask for help if needed.",
   ["Keep pushing through and ignore how tired they feel.", "Stop doing schoolwork until the stress goes away on its own.", "Copy what a friend does without thinking about the results."],
   "A responsible choice considers consequences and supports health.")
mc(L, 5, "Which statement best explains why a choice is a responsible health decision?",
   "It considers short- and long-term effects and accepts ownership of the results.",
   ["It is the choice that an adult or authority figure picked for me.", "It is the choice that works out perfectly with no downside at all.", "It is whatever choice is the most popular among classmates."],
   "Responsible decisions are based on consequences and ownership, not approval or perfection.")
