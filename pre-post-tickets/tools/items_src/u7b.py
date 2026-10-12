"""Form B (parallel) items for Unit 7. Habit-based goals only; nothing treats weight, calories, or body size as a goal."""
from ._h import b_mc as mc, b_ms as ms, b_match as match

# ---------------- U7-D1 ----------------
L = "U7-D1"
match(L, 1, "Match each job to the macronutrient that does it.",
     ["Carbohydrates", "Protein", "Fat"],
     [("Gives quick, steady energy to the brain and muscles", 0), ("Helps build muscle and repair tissue", 1),
      ("Stores energy and helps cells work properly", 2), ("Found mostly in pasta, oats, and bananas", 0)],
     "Carbohydrates fuel the body, protein builds and repairs, and fat stores energy and supports cells.")
ms(L, 2, "Which foods are mostly protein? Select all that apply.",
   ["Fish", "Lean turkey", "Cottage cheese"], ["Potatoes", "Butter"],
   "Fish, turkey, and cottage cheese are protein-rich; potatoes are mostly carbohydrate and butter is mostly fat.")
mc(L, 3, "Which fictional dinner best matches the MyPlate proportions?",
   "Baked fish, quinoa, carrots, a pear, and yogurt",
   ["Three tacos with extra cheese and a large sweet drink", "A plate with only mashed potatoes and gravy", "A bowl of cereal with nothing else on the table"],
   "A MyPlate meal includes fruits, vegetables, grains, protein, and dairy in balanced proportions.")
mc(L, 4, "Which statement about MyPlate is accurate?",
   "It shows balance and variety across food groups as a flexible guide.",
   ["It requires every meal to match its picture exactly.", "It is a calorie-restricted plan for losing weight.", "It lists the only foods that people are allowed to eat."],
   "MyPlate shows balance across food groups rather than one perfect meal.")
mc(L, 5, "Which statement about micronutrients is accurate?",
   "Vitamins and minerals help the body in small amounts.",
   ["They supply the main fuel that the body uses for energy.", "They are another word for the proteins in food.", "Only supplement pills can provide them to the body."],
   "Micronutrients are needed in small amounts and come from a variety of foods.")

# ---------------- U7-D2 ----------------
L = "U7-D2"
match(L, 1, "Match each description to the part of the nutrition facts label.",
     ["Serving size", "Calories", "% Daily Value", "Added sugars"],
     [("The amount the label's numbers are based on, such as 3/4 cup", 0), ("The amount of energy one serving provides", 1),
      ("How much a serving contributes to daily needs, shown as a percent", 2), ("Sugar added during processing, listed on its own line", 3)],
     "Each part of the label answers a different question about the food.")
mc(L, 2, "A nutrient lists 3% Daily Value per serving. How is that generally described?",
   "Low (5% or less)", ["High (20% or more)", "Perfect for one meal", "Impossible to interpret"],
   "A rough guide: 5% or less is low and 20% or more is high.")
mc(L, 3, "Yogurt A has 18 g added sugar per serving and Yogurt B has 7 g, with the same serving size. Which statement is accurate?",
   "Yogurt B has less added sugar per serving.", ["Yogurt A has less added sugar.", "Both have the same added sugar.", "Labels cannot be compared across different brands."],
   "Comparing the same serving size on both labels shows which has less added sugar.")
mc(L, 4, "A box lists 3 servings of 120 calories each. A student eats the whole box. How many calories, and what does serving size mean?",
   "360 calories; serving size is only a reference.",
   ["120 calories; the label always lists the whole box's total.", "360 calories; serving size is the amount everyone must eat.", "40 calories; labels list only one-third of a serving."],
   "Portion size is what a person actually eats; serving size is a standard amount for comparison.")
match(L, 5, "Match each visual reference to what it can help estimate.",
     ["Palm", "Fist", "Cupped hand", "Thumb"],
     [("About one serving of fish", 0), ("About a cup of rice or cereal", 1),
      ("About a handful of nuts or trail mix", 2), ("About a tablespoon of oil or butter", 3)],
     "Hand-based references are a practical estimating tool, not a strict rule.")

# ---------------- U7-D3 ----------------
L = "U7-D3"
match(L, 1, "Match each description to the FITT component.",
     ["Frequency", "Intensity", "Time", "Type"],
     [("Three days each week", 0), ("A hard pace that makes it difficult to talk", 1), ("Forty-five minutes per workout", 2), ("Cycling, dancing, or lifting weights", 3)],
     "FITT stands for Frequency, Intensity, Time, and Type.")
mc(L, 2, "Nia (fictional) cycles at an easy pace for 15 minutes on 3 days a week. Which change increases the Time component?",
   "Cycling for 30 minutes each time", ["Cycling on 5 days a week instead of 3", "Adding hill sprints to the ride", "Swimming laps instead of cycling"],
   "Time is how long; the other choices change frequency, intensity, and type.")
mc(L, 3, "Which plan includes all four FITT components?",
   "Swim at a moderate pace for 30 minutes, 3 days a week",
   ["Swim at a moderate pace for 30 minutes whenever there is time", "Swim at a moderate pace on 3 days a week as time allows", "Swim for 30 minutes on 3 days a week at no particular effort level"],
   "A FITT plan names how often, how hard, how long, and what kind of activity.")
mc(L, 4, "A student can talk but cannot sing during a jog. Using the talk test, what is the intensity?",
   "Moderate, because talking is possible but singing is not",
   ["Vigorous, because they can only say a few words", "Light, because they can sing the whole song", "It cannot be judged using the talk test"],
   "If you can talk but not sing, the activity is moderate.")
mc(L, 5, "A student rates effort 8 out of 10 and can say only a few words. What does this suggest?",
   "Vigorous, because they can barely talk",
   ["Light, because they can sing along easily", "Moderate, because the effort rating is only a 4", "It is impossible to judge from an effort rating"],
   "A high effort rating and difficulty talking show vigorous intensity.")

# ---------------- U7-D4 ----------------
L = "U7-D4"
match(L, 1, "Match each example to the marketing technique it uses.",
     ["Health halo (front-label claim)", "Influencer promotion", "Dramatic before/after claim"],
     [("\"Made with whole grains!\" on a box high in added sugar", 0), ("A fitness star wearing the brand and posting a promo code", 1),
      ("A \"body transformation\" in thirty days", 2), ("\"Light and natural!\" on a cookie package", 0)],
     "Front-label claims, influencer promotion, and dramatic before/after images are common patterns.")
mc(L, 2, "A drink says \"Real fruit juice!\" on the front, but the label shows 24 g of added sugar. Which technique is this?",
   "A health halo: a front claim hides the real label.",
   ["Social proof, because many shoppers already buy it", "A scarcity claim, because the drink is a limited item", "A doctor's recommendation printed on the bottle"],
   "The front claim draws attention while the added sugar is on the full label.")
ms(L, 3, "Which are common patterns in social-media fitness marketing? Select all that apply.",
   ["Influencers promoting supplements with discount codes", "Before/after photos that promise results in days", "Promises of quick or extreme transformations"],
   ["Balanced advice that cites its sources", "Information reviewed by a medical expert"],
   "These patterns grab attention without giving reliable evidence.")
mc(L, 4, "Why should a trendy workout claim be verified with a credible source?",
   "Marketing grabs attention fast, while credible sources show the real evidence.",
   ["Trendy claims are always tested by independent experts first.", "If a claim goes viral, it has already been fact-checked by others.", "Workout claims on social media must always be complete and accurate."],
   "Credible sources, like a dietitian or public health organization, provide the real picture.")
ms(L, 5, "Which are credible sources for checking a fitness or nutrition claim? Select all that apply.",
   ["A registered dietitian", "A doctor or pediatrician", "A public health organization such as the CDC"],
   ["A creator's promo-code page", "An unsigned post from a stranger"],
   "Experts and public health organizations are credible; sellers and anonymous posts are not.")

# ---------------- U7-D5 ----------------
L = "U7-D5"
mc(L, 1, "Which goal includes all five SMART components?",
   "I will drink a glass of water with lunch 5 days a week for 3 weeks to stay focused.",
   ["I will drink more water and feel a lot better pretty soon, hopefully.", "I will drink a glass of water with lunch on 5 school days each week.", "I will drink water at every moment of every day for the rest of my life."],
   "The goal names an action, a number, a realistic target, a reason, and a time frame.")
match(L, 2, "Match each phrase from a goal to the SMART component it shows.",
     ["Specific", "Measurable", "Achievable", "Relevant", "Time-bound"],
     [("\"swap one soda for water\"", 0), ("\"on 5 school days a week\"", 1), ("\"using the water fountain by my class\"", 2),
      ("\"to have more energy for practice\"", 3), ("\"over the next 3 weeks\"", 4)],
     "Each part of a SMART goal answers a different question.")
mc(L, 3, "Which is a habit-based goal?",
   "Walk 15 minutes after dinner on four evenings.",
   ["Drop 15 pounds before the summer starts, no matter what.", "Stay under a strict number of calories each day.", "Change my body to look like an athlete online."],
   "Habit-based goals focus on actions, not weight, calories, or body size.")
ms(L, 4, "Which are realistic barriers to a goal of doing 20 minutes of activity before school? Select all that apply.",
   ["Not enough time before the bus", "Feeling too tired in the morning", "No safe place to exercise near home"],
   ["Having a clear plan", "Telling a friend about the goal"],
   "A barrier is something that could get in the way of the goal.")
mc(L, 5, "Barrier: \"I forget to do my activity after school.\" Which strategy fits?",
   "Set a phone reminder and lay out clothes",
   ["Give up because it is too hard to remember", "Wait until summer when there is more free time", "Do the activity only when you happen to remember"],
   "A strategy directly addresses the barrier.")
