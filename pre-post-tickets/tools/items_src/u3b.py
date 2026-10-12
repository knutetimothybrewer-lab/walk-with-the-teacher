"""Form B (parallel) items for Unit 3."""
from ._h import b_mc as mc, b_ms as ms, b_match as match

# ---------------- U3-D1 ----------------
L = "U3-D1"
ms(L, 1, "Which of these can influence the health of a community? Select all that apply.",
   ["Housing conditions", "Transportation to clinics and stores", "Safe neighborhoods and parks", "Clean drinking water"],
   ["Only the willpower of each resident", "Nothing outside a person's own body"],
   "Housing, transportation, safe spaces, and water quality all shape community health.")
match(L, 2, "Sort each example as an individual health behavior or an environmental influence.",
     ["Individual behavior", "Environmental influence"],
     [("Choosing to take the stairs", 0), ("Choosing what to drink with dinner", 0),
      ("Whether the neighborhood has working streetlights and sidewalks", 1), ("Whether the nearest clinic can be reached by bus", 1)],
     "Behaviors are personal choices; environmental influences are conditions that make choices easier or harder.")
match(L, 3, "Sort each feature of a fictional neighborhood as a risk factor or a protective factor.",
     ["Risk factor", "Protective factor"],
     [("A factory releasing smoke near homes", 0), ("No safe crossing near the school", 0),
      ("A community garden with fresh produce", 1), ("A recreation center with free programs", 1)],
     "Risk factors raise the chance of poor outcomes; protective factors support health.")
mc(L, 4, "A fictional neighborhood has no safe places to play or exercise. How could this condition influence health?",
   "Residents may have fewer chances to be active, which can affect fitness.",
   ["It guarantees that every resident will eventually have a serious disease.", "It has no effect, since exercise is a purely personal choice.", "It only affects older residents and has no effect on kids."],
   "Conditions can make healthy choices harder without determining one person's outcome.")
mc(L, 5, "Residents live near a clinic but have no safe way to get there at night. Which intervention is the most realistic and best justified?",
   "Add better lighting and a night bus stop to make travel safe.",
   ["Build a second clinic nearby, even though one is already close.", "Tell residents to travel at night despite any danger, since it is personal.", "Open a high-end spa near the clinic for residents to enjoy."],
   "A good intervention targets the actual barrier in the scenario.")

# ---------------- U3-D2 ----------------
L = "U3-D2"
mc(L, 1, "Which statement best explains how public health differs from healthcare?",
   "Public health protects whole communities; healthcare mainly treats individuals.",
   ["Healthcare protects whole communities; public health treats individual patients.", "The two are identical and have the same goals and methods.", "Public health only exists to respond to natural disasters."],
   "Public health works at the population level; healthcare focuses on individual patients.")
ms(L, 2, "Which are functions of public-health agencies? Select all that apply.",
   ["Inspecting restaurants and water supplies", "Running vaccination clinics", "Investigating the cause of outbreaks", "Teaching the public about health risks"],
   ["Setting broken bones for individual patients", "Performing heart surgeries"],
   "Inspection, prevention, outbreak investigation, and education protect communities.")
match(L, 3, "Match each problem to the group most likely to respond.",
     ["Doctor or hospital", "Local health department", "CDC (federal)"],
     [("A child needs stitches after a fall", 0), ("Testing a town's water after several people become ill", 1),
      ("Tracking flu patterns across the whole country", 2), ("Offering free flu shots at a county health fair", 1)],
     "Individual care goes to providers; local problems go to local departments; national tracking involves the CDC.")
match(L, 4, "Match each question to the part of STOP (Source, Timeliness, Objective, Proof) it checks.",
     ["Source", "Timeliness", "Objective", "Proof"],
     [("Is the author a recognized health expert?", 0), ("Was the page updated recently?", 1),
      ("Does the page exist mainly to sell a product?", 2), ("Does it link to studies or data?", 3)],
     "STOP helps judge authority, timing, purpose, and evidence.")
mc(L, 5, "Data show higher diabetes rates in Town X than in Town Y. What does the data alone show?",
   "A gap in outcomes, and the cause needs more information.",
   ["That people in Town X choose worse foods", "That Town X's water is to blame for the gap", "That the numbers must be mistaken because they differ"],
   "A disparity shows a difference exists; it does not prove why.")

# ---------------- U3-D3 ----------------
L = "U3-D3"
ms(L, 1, "Which are common environmental health hazards? Select all that apply.",
   ["Wildfire smoke", "Lead in drinking water", "Very loud noise at concerts", "Heat waves"],
   ["Clean air on a calm day", "Shade from a tree"],
   "Smoke, contaminated water, loud noise, and extreme heat can all harm health.")
match(L, 2, "Match each example to hazard, exposure, or risk.",
     ["Hazard", "Exposure", "Risk"],
     [("Loud speakers at a concert", 0), ("Standing next to the speakers for hours", 1),
      ("The chance of permanent hearing loss", 2), ("Wildfire smoke drifting into town", 0)],
     "A hazard can cause harm, exposure is contact with it, and risk is the likelihood and severity of harm.")
mc(L, 3, "One worker is in the sun 15 minutes with sunscreen and shade. Another is out six hours at noon with none. Whose risk of sun damage is higher?",
   "The second: stronger exposure, longer time, and no protection raise risk.",
   ["The same, since both workers are out in the sun at some point.", "The first, because shade somehow makes sunburn more likely.", "Neither, because sunlight is never harmful to anyone's skin."],
   "Risk depends on intensity, duration, and protection, not just the hazard.")
mc(L, 4, "The UV Index forecast for today is 9 (Very High). What is the best interpretation?",
   "Use sunscreen, shade, and cover-ups at midday.",
   ["UV is low, so no sun protection is needed at all today.", "Only people with dark skin need to worry about UV at all.", "UV matters only on cloudy days, never on sunny days."],
   "A very high UV Index calls for sun protection for everyone.")
ms(L, 5, "A football practice is scheduled on an extreme heat day. Which protective behaviors are realistic? Select all that apply.",
   ["Check the heat forecast and adjust the schedule", "Add water breaks and shade", "Shorten practice or lower the intensity"],
   ["Skip drinking water so players do not feel sluggish", "Ignore heat warnings because practice must go on"],
   "Risk can be reduced with practical steps even when the hazard remains.")

# ---------------- U3-D4 ----------------
L = "U3-D4"
mc(L, 1, "A fictional energy drink ad uses extreme sports clips, loud music, and gamer influencers. Who is the intended audience?",
   "Teens and young adults", ["Retired adults over seventy", "Toddlers and preschoolers", "Hospital doctors and nurses"],
   "Visuals, music, and influencers show who the advertiser wants to reach.")
match(L, 2, "Match each ad line to the persuasive technique it uses.",
     ["Social proof", "Celebrity or influencer endorsement", "Scarcity", "Fear"],
     [("\"9 out of 10 teens choose it!\"", 0), ("A famous gamer sips the drink in a video", 1),
      ("\"Last chance, the deal ends tonight!\"", 2), ("\"If you skip this, you'll fall behind everyone.\"", 3)],
     "Ads use crowd appeal, famous faces, urgency, and fear to persuade.")
mc(L, 3, "A cereal ad shows a happy family at breakfast but never states that the cereal is healthy. What is the implied message?",
   "That eating it leads to a happy family morning",
   ["That it has the lowest sugar of any cereal", "That it is made without any ingredients at all", "That there is no message because no claim is stated"],
   "Ads can imply benefits without making an explicit claim.")
mc(L, 4, "Many students believe \"everybody skips breakfast,\" but a survey shows most students eat it. How can this belief affect behavior?",
   "People often copy what seems normal, even if wrong.",
   ["It cannot, because only measured facts ever influence people.", "It only affects people who already skip breakfast.", "It only matters if the belief happens to be accurate."],
   "Perceived norms can shape behavior even when they are inaccurate.")
mc(L, 5, "A soda company posts ads for teens on many apps every day. How could the repeated messages affect community health behavior?",
   "They can make it seem normal and appealing to many people.",
   ["Repetition has no effect, because people decide only using facts and prices.", "It only affects people who already liked the drink beforehand.", "It guarantees that every single teen will buy the drink."],
   "Repeated exposure can shape norms across a community without determining any one person's choice.")

# ---------------- U3-D5 ----------------
L = "U3-D5"
mc(L, 1, "Which is the clearest, most specific community-health problem statement?",
   "Many students skip sunscreen outdoors, risking sunburn.",
   ["Students' health is not as good as it could possibly be.", "Our community should be much healthier than it currently is.", "There is a lot of sunshine in the world around us every day."],
   "A clear problem names who is affected and what the harm is.")
mc(L, 2, "For the problem of students skipping sunscreen, which intervention is the most specific and realistic?",
   "A sun-safety campaign with posters and sunscreen stations at outdoor events",
   ["A school-wide ban on all outdoor events during the spring", "A general goal to make everyone at the school healthier", "A request that students simply care more about their skin"],
   "A good intervention is specific, feasible, and linked to the problem.")
mc(L, 3, "To get more shade structures built at a city park, which is the best audience for an advocacy message?",
   "The parks department, which can decide and fund it",
   ["A group of students who already agree with the request", "A famous celebrity who has no connection to the park", "Anyone who happens to scroll past a social media post"],
   "Advocacy targets people with the power to act.")
mc(L, 4, "Which is a clear call to action?",
   "We ask the city to install shade structures at the park by next summer.",
   ["Shade is important for the health of everyone at the park.", "We hope that people will think more about sun safety.", "Someone should really do something about the sun here soon."],
   "A call to action names who should do what and by when.")
ms(L, 5, "Which could show that a sun-safety campaign worked? Select all that apply.",
   ["A survey of sunscreen use before and after the campaign", "The share of students using shade at a follow-up event"],
   ["The number of flyers handed out", "How bright the poster colors are"],
   "Success is measured by changes in behavior or outcomes, not effort or appearance.")
