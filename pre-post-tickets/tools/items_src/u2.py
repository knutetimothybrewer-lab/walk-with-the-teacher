"""Unit 2: Mental Health (Days 1-5; Day 6 is a unit-review ticket). All scenarios use fictional people."""
from ._h import mc, ms, match, cr

# ---------------- U2-D1 What is mental health? ----------------
L = "U2-D1"
mc(L, "C1", "Which statement best defines mental health?",
   "A person's emotional and social well-being in daily life",
   ["The complete absence of any diagnosed mental illness", "Feeling happy and calm every single day of the school year", "Another everyday term that simply means mental illness"],
   "Everyone has mental health; it is part of overall wellness, not just the absence of illness.")
mc(L, "C2", "Why is mental health better described as a continuum than as \"healthy\" or \"mentally ill\"?",
   "People move along a range from thriving to struggling over time.",
   ["A person is either mentally healthy or mentally ill and stays that way.", "Only people who have a diagnosis fall anywhere on that range.",
    "Mental health is set at birth and does not change in life."],
   "A continuum shows that mental health shifts with experiences, support, and stress.")
ms(L, "C3", "Which statements are true about what can influence teen mental health? Select all that apply.",
   ["Sleep and daily routines can affect it", "Supportive family and friends can protect it",
    "Ongoing bullying or conflict can harm it", "Social media experiences can influence it"],
   ["Willpower is the only thing that matters; outside experiences have no effect", "It is fixed at birth and nothing can influence it"],
   "Family, peers, school, media, and life experiences all influence mental health; willpower alone is not the whole story.")
match(L, "C4", "Sort each factor for a fictional teen as a risk factor or a protective factor.",
     ["Risk factor", "Protective factor"],
     [("Ongoing lack of sleep", 0), ("Being bullied at school", 0),
      ("Feeling close to family", 1), ("Feeling connected to a school team or club", 1)],
     "Risk factors raise the chance of struggling; protective factors, like connectedness, help buffer stress.")
ms(L, "C5", "Which of these statements are inaccurate? Select all that apply.",
   ["People with mental illness are always visibly struggling.", "Seeking counseling means someone cannot handle their own problems.",
    "Stress is always harmful."],
   ["Mental health can change throughout a person's life.", "A person with a diagnosed mental illness can still function well."],
   "These myths add stigma; stress can be helpful in small amounts and counseling is a healthy step.")
cr(L, "Explain one way stigma can stop a fictional teen from asking for help.")

# ---------------- U2-D2 Stress, anxiety, depression & warning signs ----------------
L = "U2-D2"
mc(L, "C1", "Which fictional student's situation most likely suggests a need for extra support?",
   "Has avoided friends and struggled to get up for several weeks",
   ["Feels nervous the night before a big test at school", "Feels sad for one day after losing an important game", "Feels tired after a very busy week of activities"],
   "Feelings that last for weeks and interfere with daily life go beyond an everyday challenge.")
ms(L, "C2", "Which could be warning signs that a person needs help? Select all that apply.",
   ["Pulling away from friends and activities", "Big changes in sleep or appetite", "Talking about feeling hopeless", "A sudden drop in schoolwork"],
   ["Feeling nervous before a performance", "Wanting some quiet time after a long day"],
   "Lasting changes in behavior, mood, and daily functioning are warning signs; occasional nerves are normal.")
match(L, "C3", "Which part of the Duration, Intensity, Interference check does each detail show?",
     ["Duration", "Intensity", "Interference"],
     [("Has felt this way most days for six weeks", 0), ("Worry is so strong it causes panic", 1),
      ("Can no longer focus on homework or go to practice", 2), ("Has not felt like himself for months", 0)],
     "How long, how strong, and how much it disrupts daily life all help decide the level of concern.")
mc(L, "C4", "A fictional student shows several warning signs. Which is the most appropriate source of support?",
   "A school counselor or another trusted adult",
   ["An anonymous online forum with no moderators", "A social media influencer's coping video", "Waiting to see if it goes away on its own"],
   "Counselors and trusted adults can assess the situation and connect the student to the right help.")
mc(L, "C5", "Why should a peer recognize and refer instead of trying to diagnose a friend?",
   "Only professionals can diagnose, so friends notice and connect.",
   ["A friend can diagnose a disorder after reading about it online.", "Naming the exact disorder is the most helpful thing a friend can do.",
    "Warning signs only matter once a professional has diagnosed someone."],
   "Peers notice and refer; diagnosing is for professionals.")
cr(L, "What is the difference between recognizing that someone may need help and diagnosing them?")

# ---------------- U2-D3 Coping strategies & stress management ----------------
L = "U2-D3"
mc(L, "C1", "What happens in the body during the basic stress (fight-or-flight) response?",
   "Heart rate and breathing speed up as the body prepares.",
   ["The body shuts down to rest until the stressor has passed.", "Only the mind is affected by stress, never the body.", "Heart rate and breathing slow down so the body saves energy."],
   "The stress response activates the body, and recovery afterward is important.")
match(L, "C2", "Sort each coping behavior as generally helpful or potentially harmful.",
     ["Generally helpful", "Potentially harmful"],
     [("Talking with a trusted person", 0), ("Slow, controlled breathing", 0),
      ("Using alcohol or drugs to escape", 1), ("Avoiding responsibilities and doomscrolling", 1)],
     "Helpful coping addresses stress or helps the body recover; harmful coping avoids it or adds new risks.")
ms(L, "C3", "Which are evidence-informed coping strategies? Select all that apply.",
   ["Slow, controlled breathing", "A short walk or other movement", "Progressive muscle relaxation", "Replacing \"I'm going to fail\" with a more realistic thought"],
   ["Avoiding the problem completely", "Staying up all night to make up for lost time"],
   "Breathing, movement, relaxation, and realistic thinking help; avoidance and lost sleep make stress worse.")
mc(L, "C4", "Alex (fictional) has a big game tomorrow and feels jittery. Which strategy fits best?",
   "Controlled breathing and a short walk to calm down",
   ["Staying up late rewatching old games to feel ready", "Scrolling for hours to avoid thinking about the game", "Skipping practice to avoid feeling any pressure"],
   "Calming the body fits a stressor that is about nerves; avoidance does not address it.")
mc(L, "C5", "Which coping plan for a fictional student is the most realistic and complete?",
   "Lists warning signs, strategies, a trusted person, and when to get more help",
   ["Uses the same single strategy every time, whatever the stressor is", "Aims to never feel any stress again, starting right now", "Handles every problem alone without telling any other person"],
   "A realistic plan matches strategies to stressors, includes support, and knows when to get more help.")
cr(L, "Describe one stressful situation for a fictional student and the coping strategy that fits it best.")

# ---------------- U2-D4 Supporting a peer ----------------
# C3 ("ask appropriate questions") is left out: with 6 criteria and 5 items it is the most closely tied to C1/C4 (Listen > Validate > Ask > Connect).
L = "U2-D4"
ms(L, "C1", "Which show active listening? Select all that apply.",
   ["Giving full attention and putting your phone away", "Letting the person finish without interrupting", "Repeating back what you heard to check you understood"],
   ["Immediately giving advice", "Telling a story about your own bigger problem"],
   "Active listening means attention, patience, and checking understanding before offering ideas.")
match(L, "C2", "Sort each response to a struggling friend as supportive or dismissive.",
     ["Supportive", "Dismissive"],
     [("That sounds really difficult.", 0), ("I'm glad you told me.", 0), ("Just get over it.", 1), ("Other people have it worse.", 1)],
     "Supportive language validates feelings; dismissive language minimizes them.")
mc(L, "C4", "After listening to a friend who is struggling, which response best connects them to support?",
   "\"Would you talk to the school counselor? I can go with you.\"",
   ["\"You should just handle it on your own, honestly.\"", "\"I'll fix this for you, so do not worry.\"", "\"Post about it online and see what people say.\""],
   "Offering to connect and accompany a friend to a trusted adult is a safe, supportive step.")
ms(L, "C5", "A friend asks you to keep a secret. In which situations must you involve a trusted adult? Select all that apply.",
   ["A friend talks about hurting themselves", "A friend is being hurt or abused", "A friend says they plan to hurt someone"],
   ["A friend is stressed about an upcoming test", "A friend had an argument with a sibling"],
   "Safety comes before secrecy when someone may be hurt.")
mc(L, "C6", "A friend keeps coming to you with serious struggles. Which statement is accurate?",
   "Supporting someone means listening and connecting them to help, not treating them.",
   ["A good friend becomes the person's therapist and treats them.", "If the friend does not improve, it is the supporter's fault.", "A supporter should promise to keep everything secret no matter what."],
   "Friends are support, not treatment; professionals and trusted adults provide the help.")
cr(L, "Write the first three things a supportive friend might say to someone who says they are not doing okay.")

# ---------------- U2-D5 Accessing mental-health resources ----------------
L = "U2-D5"
ms(L, "C1", "Which are sources of mental-health support for teens? Select all that apply.",
   ["A school counselor", "A primary-care provider", "A trusted parent, coach, or teacher", "The 988 Suicide & Crisis Lifeline"],
   ["An anonymous comment section", "An advertisement promising a quick cure"],
   "Counselors, health providers, trusted adults, and crisis lines are reliable supports.")
match(L, "C2", "Sort each resource as crisis support or non-crisis support.",
     ["Crisis support", "Non-crisis support"],
     [("988 Suicide & Crisis Lifeline", 0), ("Calling 911 in an immediate emergency", 0),
      ("Scheduling regular visits with a therapist", 1), ("Talking with the school counselor about ongoing stress", 1)],
     "Crisis resources are for immediate danger; non-crisis resources support ongoing needs.")
mc(L, "C3", "Which source is most likely to give credible mental-health information?",
   "A government health agency or medical group like the CDC",
   ["An anonymous post written on a public online forum thread", "An influencer who earns money by selling a supplement", "An ad promising a quick cure for stress and anxiety"],
   "Credible information comes from experts and evidence-based organizations.")
mc(L, "C4", "Noah (fictional) has felt down for weeks but is not in danger. Which resource fits best?",
   "A school counselor or primary-care provider to plan next steps",
   ["Waiting until the situation becomes a real emergency before acting", "Taking advice from strangers in an online comment thread", "Calling 911 right away, even though there is no danger"],
   "Ongoing, non-emergency concerns match counselors and health providers.")
match(L, "C5", "Sort each strategy by the barrier to getting help it helps overcome.",
     ["Stigma or embarrassment", "Cost or transportation", "Not knowing where to go"],
     [("Remember that asking for help is common and a sign of strength", 0), ("Ask the school counselor about free or low-cost options", 1),
      ("Check the school's resource list to see who to contact", 2), ("Ask a trusted adult to help arrange rides or appointments", 1)],
     "Naming the barrier makes it easier to choose a strategy that works.")
cr(L, "Name two barriers to asking for help and one way to overcome each.")
