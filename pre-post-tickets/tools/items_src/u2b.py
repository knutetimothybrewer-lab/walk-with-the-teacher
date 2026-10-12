"""Form B (parallel) items for Unit 2. Fictional people only; no personal disclosure."""
from ._h import b_mc as mc, b_ms as ms, b_match as match

# ---------------- U2-D1 ----------------
L = "U2-D1"
mc(L, 1, "Which statement best describes mental health?",
   "How a person thinks, feels, and connects with others in daily life",
   ["Whether a person has ever been diagnosed with a disorder", "Being in a good mood every moment of the day", "A term that applies only to people who need treatment"],
   "Everyone has mental health; it covers thoughts, feelings, and relationships.")
mc(L, 2, "Which statement best explains why mental health is a continuum?",
   "It ranges from thriving to struggling and can change.",
   ["A person is either healthy or ill, and nothing moves them between.", "Only a doctor's diagnosis can place someone on the range.", "It stays fixed once a person becomes an adult."],
   "A continuum shows that mental health shifts with support, stress, and life events.")
ms(L, 3, "Which statements are true about what can influence teen mental health? Select all that apply.",
   ["A heavy workload with little downtime can strain it", "Feeling accepted by classmates can protect it", "Regular exercise and rest can support it", "Online experiences, positive or negative, can affect it"],
   ["Only a person's attitude matters; their surroundings do not", "Nothing can change it once a person turns thirteen"],
   "Workload, belonging, habits, and online life all influence mental health.")
match(L, 4, "Sort each factor for a fictional teen as a risk factor or a protective factor.",
     ["Risk factor", "Protective factor"],
     [("Constant conflict at home", 0), ("Being left out by classmates every day", 0),
      ("A caring teacher or coach", 1), ("A routine with enough sleep and downtime", 1)],
     "Risk factors raise the chance of struggling; protective factors help buffer stress.")
ms(L, 5, "Which of these statements are inaccurate? Select all that apply.",
   ["A person with a mental illness always looks sad or upset.", "Asking a counselor for help means a person is weak.", "Stress is always bad for you."],
   ["A person's mental health can improve with support and time.", "People with mental illness can live full, productive lives."],
   "These myths add stigma; mental health can improve and many people with illness thrive with support.")

# ---------------- U2-D2 ----------------
L = "U2-D2"
mc(L, 1, "Which fictional student's situation most likely suggests that extra support is needed?",
   "Stopped seeing friends and felt hopeless for a month",
   ["Feels jittery before a school performance next week", "Feels upset for an evening after a disagreement with a friend", "Feels exhausted after a week of final exams"],
   "Feelings that last for weeks and affect daily life go beyond an everyday challenge.")
ms(L, 2, "Which could be warning signs that a person needs help? Select all that apply.",
   ["Losing interest in activities once enjoyed", "Ongoing changes in sleep or eating", "Talking about feeling worthless or hopeless", "Grades dropping sharply with no clear reason"],
   ["Feeling excited before a big event", "Needing time alone to recharge after a busy day"],
   "Lasting changes in mood, habits, and functioning are warning signs.")
match(L, 3, "Which part of the Duration, Intensity, Interference check does each detail show?",
     ["Duration", "Intensity", "Interference"],
     [("Has felt down nearly every day for two months", 0), ("Worry feels so overwhelming it brings on panic", 1),
      ("Has stopped going to class and quit the team", 2), ("These feelings have lasted since the fall", 0)],
     "How long, how strong, and how much it disrupts life all help decide the level of concern.")
mc(L, 4, "A fictional student shows several warning signs. Who is the most appropriate person to turn to first?",
   "A school counselor or another trusted adult",
   ["A stranger offering advice in a chat room", "A video from a wellness influencer", "Nobody, since signs usually pass without help"],
   "Counselors and trusted adults can assess the situation and connect the student to help.")
mc(L, 5, "Why should a student refer a friend for help instead of diagnosing the friend?",
   "Diagnosis takes professional training, so a peer can notice and refer.",
   ["Peers can diagnose accurately by comparing symptoms to an online list.", "Diagnosing a friend is the fastest way to solve the problem.", "Warning signs are not important unless a doctor says so."],
   "Peers recognize and refer; diagnosing is for trained professionals.")

# ---------------- U2-D3 ----------------
L = "U2-D3"
mc(L, 1, "Which best describes what happens in the body during the stress response?",
   "The body speeds up heart rate and breathing to react.",
   ["The body slows down so it can rest until the stress ends.", "Stress changes only thoughts and never affects the body.", "Heart rate drops so that energy is saved for later."],
   "The stress response activates the body; recovery afterward matters.")
match(L, 2, "Sort each coping behavior as generally helpful or potentially harmful.",
     ["Generally helpful", "Potentially harmful"],
     [("Going for a walk to clear your head", 0), ("Asking a friend or counselor for support", 0),
      ("Lashing out at other people when stressed", 1), ("Putting off every responsibility until the stress disappears", 1)],
     "Helpful coping manages stress or supports recovery; harmful coping avoids it or hurts others.")
ms(L, 3, "Which are evidence-informed coping strategies? Select all that apply.",
   ["Journaling to sort through worries", "Short bursts of movement such as stretching", "Planning tasks and tackling them one at a time", "Taking slow breaths when feeling tense"],
   ["Pushing through without sleep for days", "Ignoring the problem and hoping it disappears"],
   "Journaling, movement, planning, and breathing help; skipping sleep and avoiding problems do not.")
mc(L, 4, "Zoe (fictional) argued with a close friend and feels upset. Which strategy fits best?",
   "Talking with a trusted person, then calmly reaching out",
   ["Posting angry messages about the friend online", "Avoiding the friend forever and acting like nothing happened", "Staying up all night replaying the argument"],
   "Social stressors fit social support and calm communication.")
mc(L, 5, "Which coping plan for a fictional student is the most realistic and complete?",
   "Names triggers, strategies, supporters, and when to seek help",
   ["Relies on one favorite strategy even when it clearly stops working", "Promises to never feel stressed again by working harder", "Keeps the plan secret and never asks anyone for help"],
   "A realistic plan matches strategies to stressors and includes support and a threshold for more help.")

# ---------------- U2-D4 ----------------
L = "U2-D4"
ms(L, 1, "Which show active listening? Select all that apply.",
   ["Making eye contact and facing the person", "Nodding and not interrupting while they talk", "Summarizing what you heard and checking that you got it right"],
   ["Checking your phone while they talk", "Changing the subject to something more cheerful"],
   "Active listening means full attention, patience, and checking understanding.")
match(L, 2, "Sort each response to a struggling friend as supportive or dismissive.",
     ["Supportive", "Dismissive"],
     [("That sounds like a lot to deal with.", 0), ("Thanks for trusting me with this.", 0),
      ("You're making a big deal out of nothing.", 1), ("Just cheer up, it could be worse.", 1)],
     "Supportive language validates feelings; dismissive language minimizes them.")
mc(L, 3, "After listening to a friend who feels overwhelmed, which response best connects them to support?",
   "\"Would you like to see a counselor? I can come with you.\"",
   ["\"Keep it to yourself, because it will probably pass soon.\"", "\"Let's just ignore it for now and see if it goes away.\"", "\"Ask the internet and follow whatever it tells you to do.\""],
   "Offering to go with a friend to a trusted adult is a supportive, safe step.")
ms(L, 4, "A friend asks you to keep a secret. In which situations must you involve a trusted adult? Select all that apply.",
   ["A friend says they want to hurt themselves", "A friend tells you someone is hurting them", "A friend says they plan to hurt another person"],
   ["A friend is nervous about a class presentation", "A friend is annoyed about a group chat argument"],
   "Safety comes before secrecy when someone may be hurt.")
mc(L, 5, "A friend leans on you every day with serious problems. Which statement is accurate?",
   "A good supporter listens and connects the friend to help.",
   ["A good friend takes over as the friend's counselor.", "If the friend stays upset, the supporter failed.", "A good supporter must keep every secret regardless of safety."],
   "Friends are support, not treatment; trained helpers provide treatment.")

# ---------------- U2-D5 ----------------
L = "U2-D5"
ms(L, 1, "Which are sources of mental-health support for teens? Select all that apply.",
   ["A school psychologist or social worker", "A therapist or counselor in the community", "A parent, caregiver, or coach they trust", "A crisis text or phone line such as 988"],
   ["A product page promising instant happiness", "A comment section full of strangers"],
   "School staff, community professionals, trusted adults, and crisis lines are reliable supports.")
match(L, 2, "Sort each resource as crisis support or non-crisis support.",
     ["Crisis support", "Non-crisis support"],
     [("Texting or calling 988 during a crisis", 0), ("Going to an emergency room when someone is in immediate danger", 0),
      ("Meeting a counselor weekly to build coping skills", 1), ("Asking the school nurse about local clinics", 1)],
     "Crisis resources are for immediate danger; non-crisis resources support ongoing needs.")
mc(L, 3, "Which source is most likely to provide credible mental-health information?",
   "A medical center or government health site such as NIMH",
   ["A viral post from someone who has no medical credentials", "A video by a person who is promoting a paid online course", "A website with ads that promise instant, guaranteed results"],
   "Credible information comes from experts and evidence-based organizations.")
mc(L, 4, "Ben (fictional) has felt anxious for weeks, but he is safe and not in danger. Which resource fits best?",
   "A school counselor or health provider for support",
   ["Waiting for the feelings to grow into a crisis first", "Advice from unknown people on a message board", "Calling 911 even though no emergency is happening"],
   "Ongoing, non-emergency concerns match counselors and health providers.")
match(L, 5, "Sort each strategy by the barrier to getting help it helps overcome.",
     ["Stigma or embarrassment", "Cost or transportation", "Not knowing where to go"],
     [("Remember that many teens seek help and it takes courage", 0), ("Ask about free or sliding-scale services at the school or clinic", 1),
      ("Use the school's resource list to see who to contact first", 2), ("Ask a trusted adult to help with rides", 1)],
     "Naming the barrier makes it easier to pick a strategy that works.")
