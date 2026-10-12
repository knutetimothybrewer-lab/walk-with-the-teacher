"""Unit 6: Injury Prevention & Safety (Days 1, 2, 3, 5; Day 4 has no lesson plan yet; Day 6 is a unit-review ticket).
When U6-D4 gets criteria, add its items in this folder (u6.py) and rebuild; it joins the Unit 6 review pool automatically.
Statistics in stems are labeled as fictional samples; teachers can swap in current CDC/NHTSA figures."""
from ._h import mc, ms, match, cr

# ---------------- U6-D1 Injury risk overview ----------------
L = "U6-D1"
mc(L, "C1", "A fictional data card says: \"In a sample of 10 fatal teen car crashes, 6 teens were not wearing a seatbelt.\" What is the main finding?",
   "Most of the teens who died in the sampled crashes were unbuckled, which links seatbelt use to survival.",
   ["Seatbelts cause most crashes.", "Most teens in crashes were buckled and still died, so belts do not help.", "Seatbelts only matter on highways."],
   "Summarizing a data card means stating what the numbers show, not adding conclusions the data does not support.")
mc(L, "C1", "Which source would give the most credible injury statistics?",
   "CDC WISQARS or NHTSA", ["A friend's story", "A meme with no source", "An ad for a car accessory"],
   "Credible statistics come from government health and safety agencies that publish their data.")
mc(L, "C2", "How does a seatbelt reduce the risk of serious injury in a crash?",
   "It spreads crash forces across stronger parts of the body and helps keep you from being thrown from the vehicle.",
   ["It prevents the crash from happening.", "It makes the car stop faster.", "It only protects the driver."],
   "Seatbelts reduce the force on the body and keep people inside the protective space of the vehicle.")
mc(L, "C2", "How does a helmet reduce the risk of serious head injury?",
   "It cushions and spreads out the force of an impact so the head and brain take less of it.",
   ["It prevents falls from happening.", "It only matters for beginners.", "It protects only the face, not the head."],
   "Helmets reduce the force that reaches the head and brain at any skill level.")
match(L, "C2", "Sort each statement as a myth or a fact.",
     ["Myth", "Fact"],
     [("\"I'm a good driver, so I don't need a seatbelt.\"", 0), ("\"Helmets are only necessary for beginners.\"", 0),
      ("\"Many serious teen injuries are predictable and preventable.\"", 1), ("\"Wearing a helmet reduces the risk of serious head injury.\"", 1)],
     "Skill does not replace protective gear, and many injuries can be prevented with simple habits.")
cr(L, "Summarize one statistic from today's data stations and explain one protective behavior that reduces that risk.")

# ---------------- U6-D2 CPR/AED Part 1: hands-only CPR ----------------
L = "U6-D2"
mc(L, "C1", "A person suddenly collapses and is not breathing normally. What are the first two steps in the Chain of Survival?",
   "Recognize the emergency and call 911", ["Give rescue breaths, then check a pulse for a minute", "Move them to a car, then drive to the hospital", "Wait to see if they wake up, then call a parent"],
   "The first links are recognizing cardiac arrest and calling 911 right away.")
ms(L, "C1", "Which are links in the Chain of Survival? Select all that apply.",
   ["Recognize and call 911", "Start compressions", "Use an AED", "Hand off to EMS when they arrive"],
   ["Wait for symptoms to pass", "Give the person water"],
   "The chain is recognize, call 911, compress, use an AED, and hand off to EMS.")
mc(L, "C2", "Where do you place your hands for hands-only CPR on an adult?",
   "On the center of the chest, one hand stacked on the other", ["On the stomach", "On the left side of the chest", "On the neck"],
   "Compressions go on the center of the chest.")
mc(L, "C3", "Which rhythm matches the recommended compression rate for hands-only CPR?",
   "A steady 100 to 120 compressions per minute", ["About 60 per minute", "As fast as possible, about 180 per minute", "Fast, then slow, then fast again"],
   "A steady rate of 100 to 120 per minute keeps blood moving effectively.")
mc(L, "C3", "Which best describes hands-only CPR?",
   "Continuous hard, fast chest compressions without rescue breaths until help arrives",
   ["Gentle presses once every few seconds", "Rescue breaths only", "Compressions for one minute, then waiting for EMS"],
   "Hands-only CPR is recommended for teens and adults who see someone suddenly collapse.")
cr(L, "List the Chain of Survival steps in order.")

# ---------------- U6-D3 CPR/AED Part 2: AED use & organ donation ----------------
L = "U6-D3"
match(L, "C1", "Put the AED steps in order. Match each step to when it happens.",
     ["First", "Second", "Third", "Fourth"],
     [("Turn on the AED and follow its voice prompts", 0), ("Attach the pads to bare skin as pictured", 1),
      ("Make sure no one is touching the person while it analyzes or shocks", 2), ("Resume CPR when the AED says to", 3)],
     "The sequence is power on, pads on, stand clear, then resume CPR as prompted.")
mc(L, "C1", "The AED has delivered a shock. What should you do next?",
   "Resume CPR right away or when the AED prompts you", ["Wait ten minutes before touching the person", "Remove the pads and stop", "Wait for the person to sit up on their own"],
   "CPR continues after a shock until the AED prompts otherwise or EMS takes over.")
mc(L, "C2", "How do CPR and an AED work together in the Chain of Survival?",
   "CPR keeps blood moving until the AED can analyze and, if needed, shock the heart; both continue until EMS arrives.",
   ["An AED replaces the need for CPR.", "CPR is only used after the AED fails.", "Either one alone is always enough."],
   "CPR, the AED, and calling 911 together make up the response most likely to save a life.")
mc(L, "C3", "Myth: \"Doctors will not try as hard to save a registered organ donor.\" Which fact corrects it?",
   "Registered donors receive the same life-saving care; donation is only considered after the medical team has done everything to save them.",
   ["Registered donors are treated second.", "Doctors only try hard for young donors.", "Registering is a legal contract that replaces medical care."],
   "Being a registered donor does not change the medical care a person receives.")
mc(L, "C3", "Myth: \"Organ donation rules out an open-casket funeral.\" Which fact corrects it?",
   "Donation does not prevent an open-casket funeral.", ["Donation always rules out a funeral.", "Only some religions allow funerals after donation.", "Donors cannot have any service."],
   "Donation is performed with care and does not stop families from having a viewing or service.")
cr(L, "Write a two-sentence \"myth vs. fact\" message about organ donation.")

# ---------------- U6-D5 Digital & road safety ----------------
L = "U6-D5"
mc(L, "C1", "In a ruler-drop test, students catch the ruler more slowly while also reading a text aloud. What does this show?",
   "Distraction slows reaction time, which at driving speeds means more distance traveled before reacting.",
   ["Multitasking improves reaction time.", "Reaction time does not change with attention.", "Only physical distractions slow reactions."],
   "Divided attention measurably delays response, which raises crash risk.")
match(L, "C1", "Match each example to the type of distraction it shows.",
     ["Visual", "Manual", "Cognitive"],
     [("Looking away from the road at a notification", 0), ("Taking a hand off the wheel to type", 1),
      ("Mind busy replaying an argument", 2), ("Reading a text while crossing a street", 0)],
     "Distractions can take eyes, hands, or attention away from the task.")
mc(L, "C1", "Why is texting while driving especially dangerous?",
   "It combines visual, manual, and cognitive distraction at the same time.",
   ["It only distracts the eyes.", "It is safe at low speeds.", "It only matters on highways."],
   "Texting takes the eyes, hands, and mind off driving at once.")
ms(L, "C2", "Which are healthy technology habits that support safety? Select all that apply.",
   ["Using do-not-disturb driving mode or keeping the phone out of reach", "Not using a phone while crossing streets", "Setting boundaries around notifications", "Being careful about sharing real-time location publicly"],
   ["Sharing your live location publicly so friends can find you", "Texting only at red lights while driving"],
   "Safe habits limit distractions and protect privacy; public live location and texting at lights add risk.")
mc(L, "C3", "Which is a specific, realistic safety commitment for a fictional student?",
   "\"I will turn on do-not-disturb and put my phone in my bag before I start the car.\"",
   ["\"I'll try to be safer.\"", "\"I will never use technology again.\"", "\"I'll only text when I think it's safe.\""],
   "A strong commitment names a specific action, a time, and is realistic to follow.")
cr(L, "Describe one specific, realistic change a fictional student could make to reduce a distraction-related risk.")
