"""Unit 7: Nutrition & Physical Activity (Days 1-5; Day 6 is a unit-review ticket).
Per the plans, goals are habit-based; no item treats weight, calories, or body size as a goal."""
from ._h import mc, ms, match, cr

# ---------------- U7-D1 Macronutrients & micronutrients ----------------
L = "U7-D1"
match(L, "C1", "Match each job to the macronutrient that does it.",
     ["Carbohydrates", "Protein", "Fat"],
     [("The body's main source of energy", 0), ("Builds and repairs body tissue", 1),
      ("Stores energy and supports cell function", 2), ("Found mostly in foods like bread, rice, and fruit", 0)],
     "Carbohydrates fuel the body, protein builds and repairs, and fat stores energy and supports cells.")
ms(L, "C1", "Which foods are mostly protein? Select all that apply.",
   ["Grilled chicken", "Tofu", "Eggs"], ["White rice", "Olive oil"],
   "Chicken, tofu, and eggs are protein-rich; rice is mostly carbohydrate and olive oil is mostly fat.")
mc(L, "C2", "Which fictional lunch best matches the MyPlate proportions?",
   "Grilled chicken, brown rice, broccoli, an apple, and milk",
   ["A large order of fries, onion rings, and a big soda", "A large bowl of fruit salad with nothing else on the plate", "Two slices of pizza, a bag of chips, and a sugary drink"],
   "A MyPlate meal includes fruits, vegetables, grains, protein, and dairy in balanced proportions.")
mc(L, "C2", "How is MyPlate best described?",
   "A guide showing balance, not a strict rule",
   ["A strict plan that every meal must match exactly", "A weight-loss diet that restricts certain foods", "A list of foods that people should never eat"],
   "MyPlate shows balance across food groups rather than one perfect meal.")
mc(L, "C3", "What do micronutrients do?",
   "Vitamins and minerals help the body in small amounts.",
   ["They provide most of the body's daily energy supply.", "They are simply another name for the fats in food.", "They can only be obtained by taking a supplement pill."],
   "Micronutrients are needed in small amounts and are found in a variety of foods.")
cr(L, "Name the three macronutrients and one job of each.")

# ---------------- U7-D2 Nutrition labels ----------------
L = "U7-D2"
match(L, "C1", "Match each description to the part of the nutrition facts label.",
     ["Serving size", "Calories", "% Daily Value", "Added sugars"],
     [("The standard amount that all the numbers on the label are based on", 0), ("The energy you get from one serving", 1),
      ("A rough guide to how much a serving adds toward a day's needs", 2), ("Sugars put in during processing, not found naturally", 3)],
     "Each part of the label answers a different question about the food.")
mc(L, "C1", "A nutrient lists 25% Daily Value per serving. How is that generally described?",
   "High (20% or more)", ["Low (5% or less)", "Exactly right for one meal", "Not important"],
   "A rough guide: 5% or less is low and 20% or more is high.")
mc(L, "C2", "Cereal A has 12 g added sugar per serving and Cereal B has 5 g per serving, with the same serving size. Which statement is accurate?",
   "Cereal B has less added sugar per serving.", ["Cereal A has less added sugar.", "They have the same added sugar.", "The label cannot be used to compare two different cereals."],
   "Comparing the same serving size on both labels shows which has less added sugar.")
mc(L, "C3", "A bag lists 2 servings with 150 calories each. A student eats the whole bag. How many calories did they eat, and what does the serving size on the label mean?",
   "300 calories; serving size is only a reference amount.",
   ["150 calories; the label always shows the whole bag's total.", "300 calories; serving size is the amount everyone should eat.", "75 calories; labels list only half of a serving each time."],
   "Portion size is what a person actually eats; serving size is just a standard amount for comparison.")
match(L, "C4", "Match each visual reference to what it can help estimate.",
     ["Palm", "Fist", "Cupped hand", "Thumb"],
     [("About one serving of meat or other protein", 0), ("About a cup of cooked pasta or fruit", 1),
      ("About a small handful-sized snack portion", 2), ("About a serving of peanut butter or oil", 3)],
     "Hand-based references are a practical estimating tool, not a strict rule.")
cr(L, "Explain the difference between serving size and portion size.")

# ---------------- U7-D3 Physical activity guidelines ----------------
L = "U7-D3"
match(L, "C1", "Match each description to the FITT component.",
     ["Frequency", "Intensity", "Time", "Type"],
     [("How many days per week", 0), ("How hard the body is working", 1), ("How many minutes each session lasts", 2), ("Walking, swimming, or strength training", 3)],
     "FITT stands for Frequency, Intensity, Time, and Type.")
mc(L, "C2", "Kai (fictional) walks at an easy pace for 20 minutes on 2 days a week. Which change increases the Frequency component?",
   "Walking on 4 days a week instead of 2", ["Walking for 30 minutes each time instead of 20", "Adding short jogging intervals", "Swimming instead of walking"],
   "Frequency is how often; the other choices change time, intensity, and type.")
mc(L, "C2", "Which activity plan includes all four FITT components?",
   "Jog at a moderate pace for 30 minutes on 3 days a week",
   ["Jog at a moderate pace for 30 minutes whenever there is time", "Jog at a moderate pace on 3 days a week as time allows", "Jog for 30 minutes on 3 days a week at no particular effort level"],
   "A FITT plan names how often, how hard, how long, and what kind of activity.")
mc(L, "C3", "During an activity a student can say only a few words at a time. Using the talk test, what is the intensity?",
   "Vigorous, because talking is difficult", ["Light, because they can still talk easily", "Moderate, because they can sing easily", "It cannot be judged using the talk test"],
   "If you can only say a few words, the activity is vigorous.")
mc(L, "C3", "A student rates their effort 3 out of 10 and can sing easily. What does this suggest about intensity?",
   "Light, because the effort rating is low", ["Vigorous, because the effort rating is high", "Moderate, because singing is easy", "It cannot be judged from an effort rating"],
   "A low effort rating and easy singing show light intensity.")
cr(L, "Describe how the talk test shows whether activity is light, moderate, or vigorous.")

# ---------------- U7-D4 Food & fitness marketing ----------------
L = "U7-D4"
match(L, "C1", "Match each example to the marketing technique it uses.",
     ["Health halo (front-label claim)", "Influencer promotion", "Dramatic before/after claim"],
     [("\"100% NATURAL! LOW FAT!\" on a package that is high in added sugar", 0), ("A fitness creator holding a supplement with a discount code", 1),
      ("Photos showing a huge change in two weeks", 2), ("\"Natural\" printed in large type on a candy wrapper", 0)],
     "Front-label claims, influencer promotion, and dramatic before/after images are common patterns.")
mc(L, "C1", "A snack bar front says \"Made with real fruit!\" but the label shows 18 g of added sugar. Which technique is this?",
   "A health halo: a front claim hides the real label.",
   ["Social proof, because many other buyers like the product", "A scarcity claim, because the bar seems to be a limited item", "A medical recommendation from a doctor or a dietitian"],
   "The front claim draws attention while the added sugar is on the full label.")
ms(L, "C1", "Which are common patterns in social-media fitness marketing? Select all that apply.",
   ["Influencer-promoted supplements", "Dramatic before/after images", "Claims of fast or extreme results"],
   ["Linked studies from credible organizations", "Balanced advice from a registered dietitian"],
   "These patterns grab attention without giving reliable evidence.")
mc(L, "C2", "Why should a fitness claim be checked against a credible source?",
   "Marketing grabs attention, while credible sources show the evidence.",
   ["Influencers are always trained experts in nutrition and fitness.", "If many people follow a claim, it has already been verified.", "Front-of-package claims must always give the complete picture."],
   "Credible sources, like a registered dietitian or public health organization, provide the real picture.")
ms(L, "C2", "Which are credible sources for checking a fitness or nutrition claim? Select all that apply.",
   ["A doctor", "A registered dietitian", "An established public health organization"],
   ["An influencer's discount-code page", "An anonymous comment"],
   "Experts and public health organizations are credible; sellers and anonymous posts are not.")
cr(L, "Explain why a front-of-package claim like \"natural\" should be checked against the nutrition label.")

# ---------------- U7-D5 Personal nutrition & activity plan ----------------
L = "U7-D5"
mc(L, "C1", "Which goal includes all five SMART components?",
   "I will add a serving of vegetables to dinner 4 nights a week for 4 weeks to get more fiber.",
   ["I will eat more vegetables at dinner and try to be healthier overall soon.", "I will add one serving of vegetables to dinner on four nights each week.", "I will eat vegetables at every single meal for the rest of my whole life."],
   "The goal names an action, a number, a realistic target, a reason, and a time frame.")
match(L, "C1", "Match each phrase from a goal to the SMART component it shows.",
     ["Specific", "Measurable", "Achievable", "Relevant", "Time-bound"],
     [("\"add a serving of fruit to breakfast\"", 0), ("\"on 4 days a week\"", 1), ("\"using fruit I already have at home\"", 2),
      ("\"to keep my energy up for practice\"", 3), ("\"for the next three weeks\"", 4)],
     "Each part of a SMART goal answers a different question.")
mc(L, "C2", "Which is a habit-based nutrition or activity goal?",
   "Add one serving of vegetables to dinner four nights this week.", ["Lose 10 pounds by the end of June, whatever it takes.", "Stay under a set number of calories every single day.", "Change my body shape to look like someone online."],
   "Habit-based goals focus on actions, not weight, calories, or body size.")
ms(L, "C3", "Which are realistic barriers to a goal of eating breakfast before school? Select all that apply.",
   ["Not enough time in the morning", "Not feeling hungry early in the day", "No grab-and-go options at home"],
   ["Having a clear goal", "Writing the goal down"],
   "A barrier is something that could get in the way of the goal.")
mc(L, "C4", "Barrier: \"I don't have time before school.\" Which strategy fits?",
   "Prepare something the night before", ["Skip breakfast entirely on those mornings", "Wait until there is more free time in the mornings", "Drop the goal because it is too hard to keep"],
   "A strategy directly addresses the barrier.")
cr(L, "Write a SMART habit-based goal for a fictional student, with one barrier and one strategy.")
