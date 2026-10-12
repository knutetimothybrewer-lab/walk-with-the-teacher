"""Unit 8: Family Life & Sexuality (Days 1-5; Day 6 is a unit-review ticket).
Factual, age-appropriate, consistent with the plans' abstinence-centered framing. Fictional scenarios only;
nothing asks students about their own experiences, relationships, or health."""
from ._h import mc, ms, match, cr

# ---------------- U8-D1 Puberty & reproductive health basics ----------------
L = "U8-D1"
match(L, "C1", "Sort each statement about puberty as a myth or a fact.",
     ["Myth", "Fact"],
     [("Everyone goes through puberty at exactly the same age.", 0), ("If puberty starts later than friends', something is wrong.", 0),
      ("The timing and pace of puberty vary widely and are normal.", 1), ("Puberty includes both physical and emotional changes.", 1)],
     "Puberty timing varies, and changes are physical, emotional, and social.")
mc(L, "C1", "Several of Maya's (fictional) friends started puberty earlier than she did. Which statement is most accurate?",
   "Timing varies from person to person and is normal.",
   ["She must have a health problem that needs treatment.", "Everyone should start puberty at exactly the same age.", "Her body will probably skip puberty altogether."],
   "There is a wide, normal range for when puberty begins.")
ms(L, "C2", "Which changes can happen during puberty? Select all that apply.",
   ["Growth spurts", "Hormonal changes", "Mood and emotional changes", "Changes in social interests"],
   ["The brain stops developing", "Height and weight stay exactly the same"],
   "Puberty involves physical, hormonal, emotional, and social changes.")
mc(L, "C3", "Which is the most reliable place to get an answer about puberty or body changes?",
   "A doctor, the school nurse, or KidsHealth",
   ["A rumor that gets passed along in the hallway", "An anonymous post in a public online forum", "An ad for a product that claims to fix it"],
   "Reliable information comes from health professionals and recognized health organizations.")
ms(L, "C3", "Which are signs of a reliable health website? Select all that apply.",
   ["It is run by a recognized health organization", "It cites medical sources"],
   ["It is mainly trying to sell a product", "It has no author or sources"],
   "Credible sources are run by experts, cite evidence, and are not mainly selling something.")
cr(L, "Name one physical change, one emotional change, and one reliable place to ask a question about puberty.")

# ---------------- U8-D2 Healthy relationships ----------------
L = "U8-D2"
match(L, "C1", "Sort each characteristic as healthy or unhealthy in a relationship.",
     ["Healthy", "Unhealthy"],
     [("Respect for each other's opinions", 0), ("Honesty and trust", 0),
      ("Controlling who the other person can talk to", 1), ("Pressuring someone to do things they do not want to do", 1)],
     "Healthy relationships have respect, trust, and equality; control and pressure are unhealthy.")
ms(L, "C1", "Which are warning signs of an unhealthy relationship? Select all that apply.",
   ["Isolation from friends and family", "Control over decisions", "Pressure", "Disrespect"],
   ["Disagreeing and talking it through respectfully", "Spending time with other friends"],
   "Isolation, control, pressure, and disrespect are warning signs; respectful disagreement is normal.")
mc(L, "C2", "Which statement correctly describes consent?",
   "It is clear, freely given, and can be withdrawn at any time.",
   ["Silence from the other person always means yes.", "Once given, it can never be changed or taken back.", "Asking over and over until someone agrees is fine."],
   "Consent must be freely given and can be taken back at any time.")
mc(L, "C2", "What is a personal boundary?",
   "A limit set for what someone is comfortable with",
   ["A rule that applies only in romantic relationships", "A way to punish someone who has upset you in the past", "Something that only counts if the other person agrees"],
   "Boundaries apply in every relationship, including friendships and family.")
mc(L, "C3", "A group-project partner keeps ignoring a student's ideas. Which statement sets a boundary clearly and respectfully?",
   "\"I feel ignored when my ideas get skipped. Please listen.\"",
   ["\"You never listen to anyone and you are completely useless.\"", "\"Fine, whatever, just do it your way and leave me out.\"", "\"I will just do the whole project all by myself.\""],
   "A clear, respectful boundary names the feeling, the situation, and what is needed.")
cr(L, "List two characteristics of a healthy relationship and one sign of an unhealthy one.")

# ---------------- U8-D3 STIs & HIV ----------------
L = "U8-D3"
match(L, "C1", "Sort each way as one that can or cannot spread HIV.",
     ["Can spread HIV", "Cannot spread HIV"],
     [("Sharing needles", 0), ("From a parent to a baby during pregnancy, birth, or breastfeeding", 0),
      ("Hugging", 1), ("Mosquito bites", 1)],
     "HIV spreads only through certain body fluids; it does not spread through casual contact or insects.")
mc(L, "C1", "Which statement about STIs is accurate?",
   "Some are curable, some are manageable, and many show no symptoms.",
   ["All STIs can be cured with a short course of antibiotics.", "STIs always cause symptoms that a person can easily see.", "Only certain kinds of people can ever get an STI."],
   "Many STIs have no symptoms, which is why testing matters for anyone who is sexually active.")
ms(L, "C2", "Which are prevention methods for STIs? Select all that apply.",
   ["Abstinence", "Vaccination where available, such as the HPV vaccine", "Regular testing", "Correct and consistent condom use (reduces, but does not eliminate, risk)"],
   ["Birth control pills (they prevent pregnancy, not STIs)", "Washing up after contact"],
   "Abstinence, vaccination, testing, and condoms help; birth control pills do not protect against STIs.")
mc(L, "C2", "Which prevention method has no risk of sexually transmitted infection?",
   "Abstinence, which removes the risk entirely", ["Correct and consistent condom use, which lowers risk", "Vaccination, which protects against some infections", "Regular testing, which finds infections early"],
   "Other methods reduce risk, but abstinence removes it entirely.")
match(L, "C3", "Sort each HIV statement as a myth or a fact.",
     ["Myth", "Fact"],
     [("HIV can spread through hugging.", 0), ("HIV can spread by sharing food or drinks.", 0),
      ("With modern treatment, HIV is a manageable long-term condition.", 1), ("Stigma and misinformation harm people living with HIV.", 1)],
     "Accurate information reduces stigma and fear.")
cr(L, "Correct one common HIV myth using an accurate fact.")

# ---------------- U8-D4 Abstinence-centered decision-making ----------------
L = "U8-D4"
mc(L, "C1", "Why is abstinence presented as the most effective prevention method?",
   "Because it removes the risk of pregnancy and STIs, while others only reduce it.",
   ["Because no other prevention method has any effect on either one.", "Because it is the easiest choice for every single person to make.", "Because it only matters for one particular group of people."],
   "Abstinence is the only method with no risk; others reduce risk but do not eliminate it.")
mc(L, "C1", "Which statement about choosing abstinence is accurate?",
   "It can be chosen and re-affirmed at any point, for many reasons.",
   ["It cannot be changed once a person has decided on it.", "It only counts if a person has never faced any pressure.", "It is only ever chosen for one particular reason."],
   "People choose abstinence for values, goals, readiness, or health reasons, and can re-affirm the decision at any time.")
match(L, "C2", "A fictional teen feels pressured. Match each statement to the decision-making step.",
     ["Identify the situation and values", "List options", "Weigh consequences", "Decide", "Reflect"],
     [("A partner is pressuring me, and I want to wait", 0), ("I can say no, change the subject, leave, or talk to a trusted adult", 1),
      ("Pressure may continue, but saying no protects my values and health", 2), ("I will say no and suggest something else to do", 3),
      ("Later, I think about what worked and what I would do differently", 4)],
     "A decision-making model moves from the situation and values to options, consequences, a decision, and reflection.")
mc(L, "C3", "Which is a clear, respectful refusal that stays consistent with personal values?",
   "\"No, I'm not ready, and that's okay. Let's go.\"",
   ["\"Maybe later, I guess, I don't really know yet...\"", "\"You're pathetic for even asking me something like that.\"", "\"I guess so, if you really want to, I suppose.\""],
   "Clear, calm, and respectful language protects boundaries and the relationship.")
ms(L, "C3", "Which strategies help someone stay consistent with their values under pressure? Select all that apply.",
   ["Planning a response ahead of time", "Leaving the situation", "Talking with a trusted adult"],
   ["Going along to avoid conflict", "Giving a long explanation hoping the pressure stops"],
   "Planning, exit strategies, and support work better than going along or over-explaining.")
cr(L, "Write a short, respectful refusal statement for a fictional teen under pressure.")

# ---------------- U8-D5 Resources & advocacy ----------------
L = "U8-D5"
ms(L, "C1", "Which are reliable resources for health information? Select all that apply.",
   ["The school nurse or counselor", "A trusted doctor", "The local health department", "The CDC"],
   ["An anonymous forum", "An ad with miracle-cure claims"],
   "Health professionals and recognized health organizations are reliable.")
mc(L, "C1", "A fictional friend is worried about a health question and does not know who to ask. Which two resources would you name?",
   "The school nurse and a trusted doctor",
   ["A rumor in a group chat and a popular influencer", "An anonymous online forum and an ad for a product", "No one at all; they should simply handle it alone"],
   "Reliable, accessible resources include the school nurse or counselor and a trusted doctor.")
mc(L, "C2", "What is generally true about testing and health services for minors?",
   "Rules vary by state and provider, so ask a school nurse or counselor first.",
   ["They are always completely free and fully confidential everywhere.", "They are never available to any person who is under eighteen.", "Only a parent is allowed to find out where to go for help."],
   "Rules differ by state and provider; a nurse or counselor can explain what is available locally.")
ms(L, "C2", "Which are good first places to ask where to get testing or help? Select all that apply.",
   ["The school nurse", "The school counselor", "The local health department", "A trusted doctor"],
   ["A social media influencer", "Rumors in a group chat"],
   "Professionals and public-health offices can give accurate local information.")
mc(L, "C3", "Which message to a friend is accurate and non-judgmental?",
   "\"I care about you. The school nurse can help, and asking is okay.\"",
   ["\"You should be ashamed to even need help with something like this.\"", "\"Everyone will find out about it, so you had better be careful.\"", "\"Just google it yourself, because honestly I do not care.\""],
   "An effective message is caring, accurate, and free of shame.")
cr(L, "Write a short, caring message encouraging a fictional friend to use a reliable resource.")
