"""Unit 6: Injury Prevention & Safety (Days 1, 2, 3, 5; Day 4 has no lesson plan yet; Day 6 is a unit-review ticket).
When U6-D4 gets criteria, add its items in this folder (u6.py) and rebuild; it joins the Unit 6 review pool automatically.
Statistics in stems are labeled as fictional samples; teachers can swap in current CDC/NHTSA figures."""
from ._h import mc, ms, match, cr

# ---------------- U6-D1 Injury risk overview ----------------
L = "U6-D1"
mc(L, "C1", "A CDC data card reports that of 1,658 teens (ages 16-19) killed in car crashes in 2020 with known belt use, 936 were not wearing a seat belt. What is the main finding?",
   "More than half of the teens killed were not buckled up.",
   ["Most of the teens who were killed had been wearing seat belts.", "Seat belts caused more than half of these teen deaths.", "Only a small share of the teens killed were unbuckled."],
   "936 of 1,658 is about 56%. Summarizing a data card means stating what the numbers show. (Figure from the CDC teen driver risk-factors page; swap in the latest CDC or NHTSA numbers when you teach.)")
mc(L, "C1", "Which source would give the most credible injury statistics?",
   "CDC WISQARS or NHTSA", ["A friend's story", "A meme with no source", "An ad for a car accessory"],
   "Credible statistics come from government health and safety agencies that publish their data.")
mc(L, "C2", "How does a seatbelt reduce the risk of serious injury in a crash?",
   "It spreads crash force across the body and keeps you inside the vehicle.",
   ["It prevents the crash from ever happening in the first place.", "It makes the car itself stop faster than it otherwise would.", "It only protects the driver, not the passengers in the car."],
   "Seatbelts reduce the force on the body and keep people inside the protective space of the vehicle.")
mc(L, "C2", "How does a helmet reduce the risk of serious head injury?",
   "It cushions the impact so the head takes less force.",
   ["It prevents crashes and falls from happening in the first place.", "It only matters for beginners who are learning to ride.", "It protects only the face and jaw, not the rest of the head."],
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
   "On the center of the chest, hands stacked", ["On the upper stomach, just below the ribs", "On the left side of the chest, right over the heart", "On the neck, with both hands pressing near the throat"],
   "Compressions go on the center of the chest.")
mc(L, "C3", "Which rhythm matches the recommended compression rate for hands-only CPR?",
   "A steady 100 to 120 compressions per minute", ["A slow, careful pace of about 60 compressions per minute", "As fast as possible, about 180 compressions per minute", "Fast, then slow, then fast again in a repeating pattern"],
   "A steady rate of 100 to 120 per minute keeps blood moving effectively.")
mc(L, "C3", "Which best describes hands-only CPR?",
   "Nonstop hard, fast chest compressions, no breaths",
   ["Gentle chest presses once every few seconds until help comes", "Giving rescue breaths only, with no chest compressions", "One minute of compressions, then stopping to wait for EMS"],
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
   "Resume CPR right away or when the AED prompts you", ["Wait about ten minutes before touching the person again", "Remove the pads and stop", "Wait for the person to sit up on their own"],
   "CPR continues after a shock until the AED prompts otherwise or EMS takes over.")
mc(L, "C2", "How do CPR and an AED work together in the Chain of Survival?",
   "CPR keeps blood moving while an AED checks and shocks the heart if needed.",
   ["An AED replaces the need for CPR once it has been turned on.", "CPR is only started after the AED has already failed twice.", "Either one used alone is always enough to save a person."],
   "CPR, the AED, and calling 911 together make up the response most likely to save a life.")
mc(L, "C3", "Myth: \"Doctors will not try as hard to save a registered organ donor.\" Which fact corrects it?",
   "Registered donors get the same life-saving care as anyone else.",
   ["Registered donors are treated after other patients are seen.", "Doctors only try hard to save donors who are very young.", "Registering is a legal contract that replaces normal medical care."],
   "Being a registered donor does not change the medical care a person receives.")
mc(L, "C3", "Myth: \"Organ donation rules out an open-casket funeral.\" Which fact corrects it?",
   "Donation does not prevent an open-casket funeral.", ["Donation always rules out a funeral.", "Only some religions allow funerals after donation.", "Donors cannot have any service."],
   "Donation is performed with care and does not stop families from having a viewing or service.")
cr(L, "Write a two-sentence \"myth vs. fact\" message about organ donation.")

# ---------------- U6-D5 Digital & road safety ----------------
L = "U6-D5"
mc(L, "C1", "In a ruler-drop test, students catch the ruler more slowly while also reading a text aloud. What does this show?",
   "Distraction slows reaction time, so a driver travels farther before reacting.",
   ["Multitasking sharpens reaction time by keeping the brain busy.", "Reaction time stays the same no matter how much attention is split.", "Only physical distractions, like holding a phone, slow reactions."],
   "Divided attention measurably delays response, which raises crash risk.")
match(L, "C1", "Match each example to the type of distraction it shows.",
     ["Visual", "Manual", "Cognitive"],
     [("Looking away from the road at a notification", 0), ("Taking a hand off the wheel to type", 1),
      ("Mind busy replaying an argument", 2), ("Reading a text while crossing a street", 0)],
     "Distractions can take eyes, hands, or attention away from the task.")
mc(L, "C1", "Why is texting while driving especially dangerous?",
   "It combines visual, manual, and cognitive distraction.",
   ["It only distracts the eyes and not the hands or the mind.", "It is safe at low speeds, so it matters little in town.", "It only matters on highways and never on side streets."],
   "Texting takes the eyes, hands, and mind off driving at once.")
ms(L, "C2", "Which are healthy technology habits that support safety? Select all that apply.",
   ["Using do-not-disturb driving mode or keeping the phone out of reach", "Not using a phone while crossing streets", "Setting boundaries around notifications", "Being careful about sharing real-time location publicly"],
   ["Sharing your live location publicly so friends can find you", "Texting only at red lights while driving"],
   "Safe habits limit distractions and protect privacy; public live location and texting at lights add risk.")
mc(L, "C3", "Which is a specific, realistic safety commitment for a fictional student?",
   "\"I will put my phone in my bag before I drive.\"",
   ["\"I will try to be a lot safer when I am driving.\"", "\"I will never use any kind of technology ever again.\"", "\"I will only text when I feel like it is safe to.\""],
   "A strong commitment names a specific action, a time, and is realistic to follow.")
cr(L, "Describe one specific, realistic change a fictional student could make to reduce a distraction-related risk.")
