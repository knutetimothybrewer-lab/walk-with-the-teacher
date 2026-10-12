"""Form B (parallel) items for Unit 8. Factual, age-appropriate, abstinence-centered; fictional scenarios only."""
from ._h import b_mc as mc, b_ms as ms, b_match as match

# ---------------- U8-D1 ----------------
L = "U8-D1"
match(L, 1, "Sort each statement about puberty as a myth or a fact.",
     ["Myth", "Fact"],
     [("Puberty happens on the same exact schedule for every person.", 0), ("A person can skip puberty by eating the right foods.", 0),
      ("Growth spurts start at different ages for different people.", 1), ("Mood changes and new feelings can be a normal part of puberty.", 1)],
     "Puberty timing varies widely, and changes are physical and emotional.")
mc(L, 2, "Leo (fictional) has not yet had the growth spurt some classmates have had. Which statement is most accurate?",
   "Timing varies from person to person and is normal.",
   ["He must have a health problem that needs treatment.", "Everyone should grow at exactly the same time as each other.", "His body will probably skip growth changes altogether."],
   "There is a wide, normal range for when puberty begins and how fast it goes.")
ms(L, 3, "Which changes can happen during puberty? Select all that apply.",
   ["Changes in height and body shape", "Hormone changes", "Stronger or changing emotions", "New friendships and interests"],
   ["Puberty ends at the same age for everyone", "Emotions stop changing completely"],
   "Puberty involves physical, hormonal, emotional, and social changes.")
mc(L, 4, "Which is the best place to get a trustworthy answer about body changes?",
   "A doctor, the school nurse, or a site like the CDC",
   ["A social media post from a stranger who is very sure", "Advice that a classmate overheard somewhere", "An advertisement for a product that claims to help"],
   "Reliable information comes from health professionals and recognized health organizations.")
ms(L, 5, "Which are signs of a reliable health website? Select all that apply.",
   ["It names its authors or experts", "It links to its medical sources"],
   ["It asks you to buy something right away", "It says \"doctors hate this\" with no proof"],
   "Credible sites show who wrote them and where the facts come from.")

# ---------------- U8-D2 ----------------
L = "U8-D2"
match(L, 1, "Sort each characteristic as healthy or unhealthy in a relationship.",
     ["Healthy", "Unhealthy"],
     [("Listening and taking turns", 0), ("Support during hard times", 0),
      ("Checking someone's phone and deciding who they see", 1), ("Teasing or insulting someone to keep them down", 1)],
     "Healthy relationships have respect and support; control and put-downs are unhealthy.")
ms(L, 2, "Which are warning signs of an unhealthy relationship? Select all that apply.",
   ["Cutting someone off from friends", "Threats or bullying", "Constant put-downs", "Guilt-tripping to get one's way"],
   ["Choosing different hobbies", "Saying \"no\" respectfully"],
   "Isolation, threats, put-downs, and guilt-tripping are warning signs; differences and respectful limits are normal.")
mc(L, 3, "Which statement about consent is accurate?",
   "Consent is freely given and can be taken back.",
   ["Not saying no counts as a yes every time.", "Saying yes once means yes forever after that.", "Pushing someone with guilt is okay if they finally agree."],
   "Consent must be freely given and can be withdrawn at any time.")
mc(L, 4, "Which statement describes a personal boundary?",
   "A limit someone sets about what they are okay with",
   ["A rule that only people in couples need to follow", "A threat meant to control what other people do", "A limit that only counts if the other person approves"],
   "Boundaries apply in every relationship and others should respect them.")
mc(L, 5, "A friend keeps borrowing a student's things without asking. Which statement sets a boundary clearly and respectfully?",
   "\"I feel annoyed when you borrow my things. Please ask first.\"",
   ["\"You are so selfish and nobody likes you.\"", "\"Fine, take it, I guess nothing I want matters.\"", "\"I will stop talking to you altogether from now on, for real.\""],
   "A clear, respectful boundary names the feeling, the situation, and what is needed.")

# ---------------- U8-D3 ----------------
L = "U8-D3"
match(L, 1, "Sort each way as one that can or cannot spread HIV.",
     ["Can spread HIV", "Cannot spread HIV"],
     [("Sharing needles for injections", 0), ("Certain body fluids during sexual contact", 0),
      ("Sharing a drinking glass", 1), ("Shaking hands", 1)],
     "HIV spreads only through certain body fluids; it does not spread through casual contact.")
mc(L, 2, "Which statement about STIs is accurate?",
   "Many STIs have no symptoms, so testing matters.",
   ["STIs always cause obvious symptoms right away.", "Only one kind of STI exists, and it is always curable.", "STIs can only be passed through casual contact like hugging."],
   "Many STIs have no symptoms, which is why testing matters for anyone who is sexually active.")
ms(L, 3, "Which are prevention methods for STIs? Select all that apply.",
   ["Abstinence", "Vaccines such as the HPV vaccine", "Getting tested regularly", "Condoms used correctly every time (they reduce, but do not eliminate, risk)"],
   ["Showering after contact", "Birth control pills alone (they prevent pregnancy, not STIs)"],
   "Abstinence, vaccination, testing, and condoms help; showering and birth control pills do not protect against STIs.")
mc(L, 4, "Which method has no risk of sexually transmitted infection?",
   "Abstinence, because no sexual contact means no exposure",
   ["Using condoms every time, which still leaves some risk", "Getting vaccinated, which covers only some infections", "Getting tested, which finds infections but does not prevent them"],
   "Other methods reduce risk, but abstinence removes it entirely.")
match(L, 5, "Sort each HIV statement as a myth or a fact.",
     ["Myth", "Fact"],
     [("HIV spreads through shared toilets.", 0), ("HIV spreads through mosquito bites.", 0),
      ("People can live long lives with HIV by taking treatment.", 1), ("Accurate facts help reduce stigma toward people with HIV.", 1)],
     "Accurate information reduces stigma and fear.")

# ---------------- U8-D4 ----------------
L = "U8-D4"
mc(L, 1, "Why does this curriculum call abstinence the most effective prevention method?",
   "Because it removes the risk of pregnancy and STIs, while others only reduce it.",
   ["Because all other prevention methods have no effect at all on risk.", "Because it is the easiest option for every person to follow every day.", "Because it matters for only one particular group of people in school."],
   "Abstinence is the only method with no risk; others reduce risk but do not eliminate it.")
mc(L, 2, "Which statement about choosing abstinence is accurate?",
   "It is a personal choice people can confirm at any time.",
   ["It cannot be changed once someone has made the decision.", "It only counts if a person was never pressured by anyone.", "It is only ever chosen for a single particular reason."],
   "People choose abstinence for many reasons and can re-affirm the decision whenever they want.")
match(L, 3, "A fictional teen feels pressured. Match each statement to the decision-making step.",
     ["Identify the situation and values", "List options", "Weigh consequences", "Decide", "Reflect"],
     [("A friend wants me to do something that conflicts with my values", 0), ("I could say no, suggest another plan, leave, or call an adult", 1),
      ("Pressure may continue, but saying no keeps me true to my values and health", 2), ("I decide to say no and walk away", 3),
      ("Afterward I think about what went well and what to change", 4)],
     "A decision-making model moves from the situation and values to options, consequences, a decision, and reflection.")
mc(L, 4, "Which is a clear, respectful refusal that stays consistent with personal values?",
   "\"No, that's not for me. Let's go.\"",
   ["\"Um, maybe, I don't know, it's complicated...\"", "\"Wow, you're so immature for even asking that.\"", "\"I guess it is okay if you really want it.\""],
   "Clear, calm, and respectful language protects boundaries and the relationship.")
ms(L, 5, "Which strategies help someone stay consistent with their values under pressure? Select all that apply.",
   ["Practicing what to say before a pressure situation", "Walking away from the situation", "Texting a trusted adult for help"],
   ["Making excuses until the person stops asking", "Agreeing to avoid being teased"],
   "Practice, exits, and support work better than excuses or giving in.")

# ---------------- U8-D5 ----------------
L = "U8-D5"
ms(L, 1, "Which are reliable resources for health information? Select all that apply.",
   ["A school counselor or nurse", "A family doctor", "A county or city health department", "A national health organization such as the CDC"],
   ["A comment thread of strangers", "A site selling miracle cures"],
   "Health professionals and recognized health organizations are reliable.")
mc(L, 2, "A fictional classmate has a health question and is not sure whom to ask. Which two resources would you suggest?",
   "The school nurse and a trusted doctor",
   ["A comment thread of strangers and an ad", "Nobody at all, because they should handle it alone", "A quiz on a website that sells products"],
   "Reliable, accessible resources include the school nurse and a trusted doctor.")
mc(L, 3, "Which statement about teen access to confidential health services is accurate?",
   "Rules vary by state, so a school nurse can explain local options.",
   ["Services are always free and completely private for minors everywhere.", "Minors are never allowed to use any health service at all.", "Only parents can learn where to get health services."],
   "Rules differ by state and provider; a nurse or counselor can explain what is available locally.")
ms(L, 4, "Which are good first places to ask where to get testing or help? Select all that apply.",
   ["The school nurse", "A school counselor", "The local health department", "A trusted doctor or clinic"],
   ["A stranger in a comment section", "A friend's guess from social media"],
   "Professionals and public-health offices can give accurate local information.")
mc(L, 5, "Which message to a friend is caring, accurate, and non-judgmental?",
   "\"I'm here for you. A school nurse can help, and asking is okay.\"",
   ["\"You should feel embarrassed to ask about this stuff.\"", "\"People will talk if you ask, so keep quiet.\"", "\"Just search online; honestly it is not my problem.\""],
   "An effective message is caring, accurate, and free of shame.")
