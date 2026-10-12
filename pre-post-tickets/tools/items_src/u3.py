"""Unit 3: Community & Environmental Health (Days 1-5; Day 6 is a unit-review ticket)."""
from ._h import mc, ms, match, cr

# ---------------- U3-D1 Environment & health ----------------
L = "U3-D1"
ms(L, "C1", "Which of these can influence the health of a community? Select all that apply.",
   ["Air and water quality", "Access to healthcare", "Safe places to be physically active", "Access to affordable healthy food"],
   ["Nothing, because health is decided only by each person's choices", "Nothing, because health is decided only by genes"],
   "Community conditions like air, water, care, food, and safe spaces all shape health alongside personal choices.")
match(L, "C2", "Sort each example as an individual health behavior or an environmental influence.",
     ["Individual behavior", "Environmental influence"],
     [("Choosing to walk to school", 0), ("Deciding what to eat for lunch", 0),
      ("Whether safe sidewalks exist on the route to school", 1), ("Whether a grocery store with fresh food is nearby", 1)],
     "Behaviors are personal choices; environmental influences are conditions around a person that make choices easier or harder.")
match(L, "C3", "Sort each feature of a fictional neighborhood as a risk factor or a protective factor.",
     ["Risk factor", "Protective factor"],
     [("A busy highway next to the homes", 0), ("No bus service to the clinic", 0),
      ("A park with walking paths", 1), ("A free community health clinic", 1)],
     "Risk factors raise the chance of poor health outcomes; protective factors support health.")
mc(L, "C4", "A fictional neighborhood has no grocery store within five miles. How could this condition influence health?",
   "Residents may struggle to get fresh, affordable food.",
   ["It guarantees that every resident there will eventually become seriously ill.", "It has no effect, since food choices are entirely a personal matter.", "It only affects adults and has no effect on children or teens."],
   "Conditions can make healthy choices easier or harder without determining one person's outcome.")
mc(L, "C5", "Clinics and grocery stores are nearby, but residents lack reliable transportation. Which intervention is the most realistic and best justified?",
   "Expand a bus route to the clinic and grocery store, since transportation is the barrier.",
   ["Build a second hospital in the area, even though one is already nearby.", "Tell residents to just walk farther, since distance is a personal matter.", "Open a luxury gym downtown, even though no one has asked for one."],
   "A good intervention targets the actual barrier identified in the scenario.")
cr(L, "Name one behavior people see as only a personal choice and explain how the environment could make it easier or harder.")

# ---------------- U3-D2 Public health systems ----------------
L = "U3-D2"
mc(L, "C1", "Which best describes the difference between healthcare and public health?",
   "Healthcare mainly treats individuals; public health protects whole populations.",
   ["Public health treats individual patients in hospitals; healthcare protects populations.", "They mean the same thing, so the two terms can be swapped freely.", "Public health only responds to emergencies such as outbreaks."],
   "Healthcare focuses on individual patients, while public health works at the population level.")
ms(L, "C2", "Which are functions of public-health agencies? Select all that apply.",
   ["Tracking disease patterns (surveillance)", "Promoting vaccination and prevention programs", "Responding to outbreaks", "Preparing for emergencies"],
   ["Performing surgery on individual patients", "Writing prescriptions for each patient"],
   "Surveillance, prevention, outbreak response, and preparedness protect whole communities.")
match(L, "C3", "Match each problem to the group most likely to respond.",
     ["Doctor or hospital", "Local health department", "CDC (federal)"],
     [("A student needs treatment for an ear infection", 0), ("Inspecting restaurants after several people in one town get sick", 1),
      ("Tracking a measles outbreak spreading across many states", 2), ("Running vaccination clinics for a county", 1)],
     "Individual care goes to providers; local problems go to local departments; multi-state problems involve the CDC.")
match(L, "C4", "Match each question to the part of STOP (Source, Timeliness, Objective, Proof) it checks.",
     ["Source", "Timeliness", "Objective", "Proof"],
     [("Is the information from a health agency or expert?", 0), ("Is the information current?", 1),
      ("Is the creator trying to sell or persuade?", 2), ("Does it cite data or research?", 3)],
     "STOP helps judge a source's authority, timing, purpose, and evidence.")
mc(L, "C5", "Data show a higher asthma rate in Neighborhood A than in Neighborhood B. What does the data alone show?",
   "A gap in outcomes, and the cause needs more information.",
   ["That people in Neighborhood A make worse health choices", "That pollution in Neighborhood A is the cause", "That the data must be wrong because it differs"],
   "A disparity shows a difference exists; it does not prove why.")
cr(L, "In two or three sentences, explain the difference between healthcare and public health.")

# ---------------- U3-D3 Environmental hazards & prevention ----------------
L = "U3-D3"
ms(L, "C1", "Which are common environmental health hazards? Select all that apply.",
   ["Air pollution", "UV radiation from the sun", "Excessive noise", "Extreme heat"],
   ["Drinking water from a tested, safe supply", "Walking outdoors when air quality is good"],
   "Air pollution, UV, loud noise, and heat can all harm health.")
match(L, "C2", "Match each example to hazard, exposure, or risk.",
     ["Hazard", "Exposure", "Risk"],
     [("Strong UV radiation from the midday sun", 0), ("Working outside at noon without sunscreen", 1),
      ("The chance of sunburn or skin damage", 2), ("Water contaminated with lead", 0)],
     "A hazard can cause harm, exposure is contact with it, and risk is the likelihood and severity of harm.")
mc(L, "C3", "One student uses earbuds at low volume for 30 minutes. Another uses them at very high volume for hours every day. Whose hearing risk is higher?",
   "The second: higher volume, longer time, and more frequent exposure raise risk.",
   ["The same, because both students use earbuds the same way.", "The first, because lower volume is somehow more damaging to hearing.", "Neither, because listening to music cannot ever harm hearing."],
   "Risk depends on intensity, duration, and frequency, not just the presence of a hazard.")
mc(L, "C4", "Today's Air Quality Index (AQI) is 160, which credible guidance labels \"Unhealthy.\" What is the best interpretation?",
   "Everyone should limit heavy outdoor exertion, and people with asthma need care.",
   ["The air is safe for everyone to exercise as hard as they like.", "Only people who smoke or vape are affected by the air quality.", "The AQI only matters for cars and factories, not for people."],
   "At an AQI in the Unhealthy range, everyone may feel effects and sensitive groups are at greater risk.")
ms(L, "C5", "A soccer tournament is scheduled on a day with poor air quality. Which protective behaviors are realistic? Select all that apply.",
   ["Check the AQI before and during the event", "Shorten games or lower the intensity", "Take more breaks and watch for symptoms"],
   ["Play harder to finish faster", "Ignore the air quality because nothing can be done"],
   "Risk can be reduced with practical steps even when the hazard cannot be removed.")
cr(L, "Explain why \"hazard\" and \"risk\" are not the same thing.")

# ---------------- U3-D4 Media & community influence ----------------
L = "U3-D4"
mc(L, "C1", "A fictional sports drink ad uses upbeat pop music, teen athletes, and social media influencers. Who is the intended audience?",
   "Teenagers and young adults", ["Older adults and retirees", "Young children in elementary school", "Doctors and other health professionals"],
   "Music, models, and platforms show who the advertiser wants to reach.")
match(L, "C2", "Match each ad line to the persuasive technique it uses.",
     ["Social proof", "Celebrity or influencer endorsement", "Scarcity", "Fear"],
     [("\"Join the 2 million teens who already switched!\"", 0), ("A famous athlete holds the product", 1),
      ("\"Only 50 left. Limited edition!\"", 2), ("\"Without this, you're falling behind your teammates.\"", 3)],
     "Advertisers use proof from the crowd, famous faces, urgency, and fear to persuade.")
mc(L, "C3", "An ad shows a smiling athlete holding a sugary drink but never states that it improves performance. What is the implied message?",
   "That drinking it will make you athletic and successful",
   ["That it is the cheapest drink available in the store", "That it is made with nothing but plain filtered water", "That there is no message at all because no claim is stated"],
   "Ads can communicate implied messages without making an explicit claim.")
mc(L, "C4", "Many students believe \"everyone stays up past midnight on school nights,\" but a survey shows most do not. How can this belief affect behavior?",
   "People often copy what seems normal, even if wrong.",
   ["It cannot, because only hard facts ever influence behavior.", "It only affects people who already disagree with the belief.", "It only matters if the belief happens to be completely true."],
   "People often follow what they think is normal, even when they are wrong about it.")
mc(L, "C5", "A fast-food chain advertises discount meals to teens on many platforms every day. How could the repeated messages affect community health behaviors?",
   "They can make it seem normal and appealing to many people.",
   ["Repetition has no effect, because people only decide using facts and prices.", "It only affects people who already liked the product beforehand.", "It guarantees that every single teen will buy the product."],
   "Repeated exposure can shape norms and choices across a community without determining any one person's decision.")
cr(L, "Explain one way marketing can influence a health behavior without directly telling someone what to do.")

# ---------------- U3-D5 Designing a community health action ----------------
# Left out: C2 (use two credible sources; tested in U1-D4 and U3-D2) and C3 (population and influences; tested in U3-D1).
L = "U3-D5"
mc(L, "C1", "Which is the clearest, most specific community-health problem statement?",
   "Many students here listen at unsafe volumes, risking harm.",
   ["Students' health is not as good as it could possibly be.", "Our community should be much healthier than it currently is.", "There is a lot of noise in the world around us every day."],
   "A clear problem names who is affected and what the harm is.")
mc(L, "C4", "For the problem of unsafe listening volume at school, which intervention is the most specific and realistic?",
   "A volume-awareness campaign with posters and a free hearing-screening day",
   ["A school-wide ban on all music and headphones at every grade", "A general goal to make everyone at the school healthier overall", "A request that students simply care more about their hearing"],
   "A good intervention is specific, feasible, and linked to the problem.")
mc(L, "C5", "To get crosswalk lights installed near a school, which is the best audience for an advocacy message?",
   "The city council, which can decide and fund it",
   ["A group of students who already agree with the request", "A famous celebrity who has no connection to the town", "Anyone who happens to scroll past a social media post"],
   "Advocacy targets people with the power to act.")
mc(L, "C6", "Which is a clear call to action?",
   "We ask the school board to approve filling stations by next semester.",
   ["Water is important for the health of everyone at school.", "We hope that people will think more about hydration.", "Someone should really do something about water here soon."],
   "A call to action names who should do what and by when.")
ms(L, "C7", "Which could show that a hearing-safety campaign worked? Select all that apply.",
   ["A student survey on listening volume before and after", "The share of students using volume limits at a follow-up check"],
   ["The number of posters printed", "How colorful the posters look"],
   "Success is measured by changes in behavior or outcomes, not by effort or appearance.")
cr(L, "Complete the pitch: We want ______ to ______ because ______.")
