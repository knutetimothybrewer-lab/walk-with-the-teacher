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
   "Timing varies widely from person to person, and that range is normal.",
   ["She must have a health problem.", "Everyone should start at the same age.", "Her body will skip puberty."],
   "There is a wide, normal range for when puberty begins.")
ms(L, "C2", "Which changes can happen during puberty? Select all that apply.",
   ["Growth spurts", "Hormonal changes", "Mood and emotional changes", "Changes in social interests"],
   ["The brain stops developing", "Height and weight stay exactly the same"],
   "Puberty involves physical, hormonal, emotional, and social changes.")
mc(L, "C3", "Which is the most reliable place to get an answer about puberty or body changes?",
   "A doctor, the school nurse, or a trusted site such as KidsHealth or the CDC",
   ["A rumor passed along in the hallway", "An anonymous forum post", "An ad for a product"],
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
   ["Silence means yes.", "Once given, it cannot be changed.", "Asking repeatedly until someone agrees is fine."],
   "Consent must be freely given and can be taken back at any time.")
mc(L, "C2", "What is a personal boundary?",
   "A limit a person sets for what they are comfortable with, which others should respect",
   ["A rule that applies only in romantic relationships", "A way to punish someone", "Something that only counts if the other person agrees"],
   "Boundaries apply in every relationship, including friendships and family.")
mc(L, "C3", "A group-project partner keeps ignoring a student's ideas. Which statement sets a boundary clearly and respectfully?",
   "\"I feel ignored when my ideas get skipped, so I need us to hear everyone's ideas before we decide.\"",
   ["\"You never listen and you're useless.\"", "\"Fine, whatever, do it your way.\"", "\"I'll just do the whole project myself.\""],
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
   "Some are bacterial and can be cured, others are viral and can be managed but not cured, and many have no obvious symptoms.",
   ["All STIs can be cured with antibiotics.", "STIs always cause visible symptoms.", "Only certain kinds of people can get STIs."],
   "Many STIs have no symptoms, which is why testing matters for anyone who is sexually active.")
ms(L, "C2", "Which are prevention methods for STIs? Select all that apply.",
   ["Abstinence", "Vaccination where available, such as the HPV vaccine", "Regular testing", "Correct and consistent condom use (reduces, but does not eliminate, risk)"],
   ["Birth control pills (they prevent pregnancy, not STIs)", "Washing up after contact"],
   "Abstinence, vaccination, testing, and condoms help; birth control pills do not protect against STIs.")
mc(L, "C2", "Which prevention method has no risk of sexually transmitted infection?",
   "Abstinence", ["Correct and consistent condom use", "Vaccination", "Regular testing"],
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
   "It removes the risk of pregnancy and STI transmission from sexual activity entirely, while other methods only reduce risk.",
   ["Because no other method has any effect.", "Because it is easy for everyone.", "Because it only matters for one kind of person."],
   "Abstinence is the only method with no risk; others reduce risk but do not eliminate it.")
mc(L, "C1", "Which statement about choosing abstinence is accurate?",
   "It can be made and re-affirmed at any point, for many different reasons.",
   ["It cannot be changed once decided.", "It only counts if a person has never faced pressure.", "It is only chosen for one reason."],
   "People choose abstinence for values, goals, readiness, or health reasons, and can re-affirm the decision at any time.")
match(L, "C2", "A fictional teen feels pressured. Match each statement to the decision-making step.",
     ["Identify the situation and values", "List options", "Weigh consequences", "Decide", "Reflect"],
     [("A partner is pressuring me, and I want to wait", 0), ("I can say no, change the subject, leave, or talk to a trusted adult", 1),
      ("Pressure may continue, but saying no protects my values and health", 2), ("I will say no and suggest something else to do", 3),
      ("Later, I think about what worked and what I would do differently", 4)],
     "A decision-making model moves from the situation and values to options, consequences, a decision, and reflection.")
mc(L, "C3", "Which is a clear, respectful refusal that stays consistent with personal values?",
   "\"No, I'm not ready for that, and that's okay. Let's do something else.\"",
   ["\"Maybe later, I don't know...\"", "\"You're pathetic for asking.\"", "\"I guess, if you really want.\""],
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
   "The school nurse or counselor and a trusted doctor",
   ["A rumor in a group chat and an influencer", "An anonymous forum and an ad", "No one; they should handle it alone"],
   "Reliable, accessible resources include the school nurse or counselor and a trusted doctor.")
mc(L, "C2", "What is generally true about testing and health services for minors?",
   "Availability and confidentiality vary by state and provider, so a school nurse or counselor is a good first contact.",
   ["They are always free and fully confidential everywhere.", "They are never available to minors.", "Only a parent can find out where to go."],
   "Rules differ by state and provider; a nurse or counselor can explain what is available locally.")
ms(L, "C2", "Which are good first places to ask where to get testing or help? Select all that apply.",
   ["The school nurse", "The school counselor", "The local health department", "A trusted doctor"],
   ["A social media influencer", "Rumors in a group chat"],
   "Professionals and public-health offices can give accurate local information.")
mc(L, "C3", "Which message to a friend is accurate and non-judgmental?",
   "\"I care about you. If you have a question about your health, the school nurse can help, and it's okay to ask.\"",
   ["\"You should be ashamed to need help.\"", "\"Everyone will find out, so be careful.\"", "\"Just google it, I don't care.\""],
   "An effective message is caring, accurate, and free of shame.")
cr(L, "Write a short, caring message encouraging a fictional friend to use a reliable resource.")
