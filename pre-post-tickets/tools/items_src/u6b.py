"""Form B (parallel) items for Unit 6 (Days 1, 2, 3, 5). Add U6-D4 items here when that lesson has criteria."""
from ._h import b_mc as mc, b_ms as ms, b_match as match

# ---------------- U6-D1 ----------------
L = "U6-D1"
mc(L, 1, "A fictional data card says: \"In a sample of 20 teen bike crashes with head injuries, 14 riders were not wearing helmets.\" What is the main finding?",
   "Most riders with head injuries in the sample were not wearing helmets.",
   ["Helmets caused most of the head injuries in the sample.", "Most riders with head injuries had been wearing helmets.", "Only a few of the injured riders were without helmets."],
   "14 of 20 is most of the sample. Summarizing a data card means stating what the numbers show.")
mc(L, 2, "Which source would give the most trustworthy statistics on teen injuries?",
   "CDC or NHTSA injury-data pages", ["A viral post that lists no source", "A classmate's guess at the numbers", "A video review of a safety gadget"],
   "Credible statistics come from agencies that publish their data and methods.")
mc(L, 3, "How does a seat belt help protect you in a crash?",
   "It keeps you from hitting the dashboard or leaving the car.",
   ["It makes crashes less likely by keeping the car steady.", "It only helps in slow crashes under ten miles per hour.", "It protects the car's seat more than it protects the passenger."],
   "Seat belts hold people in place so crash forces are absorbed by stronger parts of the body.")
mc(L, 4, "How does a bike helmet help protect the brain in a fall?",
   "Its foam cushions the impact on the head.",
   ["It keeps riders from falling off the bike at all.", "It matters only for riders on very busy roads.", "It protects equally well when worn loose on top of the head."],
   "A properly fitted helmet reduces the force that reaches the head and brain.")
match(L, 5, "Sort each statement as a myth or a fact.",
     ["Myth", "Fact"],
     [("\"Seat belts are only needed on long highway trips.\"", 0), ("\"Experienced riders do not need helmets.\"", 0),
      ("\"Wearing a seat belt lowers the risk of dying in a crash.\"", 1), ("\"Many injuries are predictable and can be prevented.\"", 1)],
     "Protective habits help in every trip, and many injuries are preventable.")

# ---------------- U6-D2 ----------------
L = "U6-D2"
mc(L, 1, "You see a teen collapse in a hallway and not breathe normally. What are the first two steps of the Chain of Survival?",
   "Recognize cardiac arrest and call 911",
   ["Give water, then wait to see if the person wakes up", "Carry the person outside, then call a relative", "Give rescue breaths for two minutes before calling anyone"],
   "Recognizing cardiac arrest and calling 911 come first.")
ms(L, 2, "Which are steps or links in the Chain of Survival? Select all that apply.",
   ["Call 911 immediately", "Push hard and fast on the chest", "Use an AED when it arrives", "Continue until EMS takes over"],
   ["Wait for the person to recover on their own", "Move them to a bed first"],
   "The chain is recognize, call 911, compress, use an AED, and hand off to EMS.")
mc(L, 3, "For hands-only CPR on an adult, where do the heels of your hands go?",
   "In the center of the chest, hands stacked",
   ["Over the stomach, just under the bottom of the ribs", "On the left shoulder, close to the collarbone and neck", "On the upper back, between the two shoulder blades"],
   "Compressions go on the center of the chest.")
mc(L, 4, "Which tempo fits the compression rate for hands-only CPR?",
   "A steady beat of 100 to 120 compressions a minute",
   ["A slow, careful pace of about 40 compressions a minute", "As fast as you possibly can, around 200 a minute", "Fast for a while, then a long pause, then fast again"],
   "A steady rate of 100 to 120 per minute keeps blood moving effectively.")
mc(L, 5, "Which describes hands-only CPR best?",
   "Pushing hard and fast on the chest with no rescue breaths",
   ["Gentle chest taps every few seconds until help arrives", "Giving rescue breaths only, with no chest compressions at all", "Pressing on the chest for one minute, then stopping to wait"],
   "Hands-only CPR is continuous chest compressions until help arrives.")

# ---------------- U6-D3 ----------------
L = "U6-D3"
match(L, 1, "Put the AED steps in order. Match each step to when it happens.",
     ["First", "Second", "Third", "Fourth"],
     [("Press the power button and listen to the voice prompts", 0), ("Place the pads on bare skin where the pictures show", 1),
      ("Tell everyone to stand clear while the AED checks", 2), ("Restart chest compressions when the AED tells you to", 3)],
     "The sequence is power on, pads on, stand clear, then resume CPR as prompted.")
mc(L, 2, "The AED says, \"Shock delivered. Begin CPR.\" What should you do?",
   "Begin chest compressions right away",
   ["Wait ten minutes before touching the person", "Take off the pads and walk away", "Wait until the person sits up by themselves"],
   "CPR continues after a shock until prompted otherwise or EMS takes over.")
mc(L, 3, "How do CPR and an AED fit together during an emergency?",
   "CPR moves blood while the AED checks the heart.",
   ["An AED makes chest compressions unnecessary once the pads are on.", "CPR begins only after the AED has failed several times.", "Using either one by itself is always enough to save someone."],
   "CPR, the AED, and calling 911 together make up the response most likely to save a life.")
mc(L, 4, "Myth: \"Hospitals let a registered donor die so they can use the organs.\" Which fact corrects it?",
   "Doctors work to save every patient's life first, donor or not.",
   ["Registered donors are placed at the back of the line for care.", "Hospitals only treat donors if their organs are in good shape.", "Registering signs a contract that ends normal medical treatment."],
   "Being a registered donor does not change the care a person receives.")
mc(L, 5, "Myth: \"You must be young and perfectly healthy to be an organ donor.\" Which fact corrects it?",
   "People of many ages and health conditions can register as donors.",
   ["Only people under twenty-five can ever become donors.", "Only people with no medical history at all can register.", "Donors must pass a fitness test before they can sign up."],
   "Age and many health conditions do not automatically rule out registering as a donor.")

# ---------------- U6-D5 ----------------
L = "U6-D5"
mc(L, 1, "In a walking test, students take longer to react when they are also texting. What does this show?",
   "Distraction slows reaction time, so a person moves farther before reacting.",
   ["Texting sharpens attention by keeping the mind busy and engaged.", "Reaction time stays the same no matter what else is going on.", "Only loud noises, and never phones, can slow down reaction time."],
   "Divided attention measurably delays response, which raises crash risk.")
match(L, 2, "Match each example to the type of distraction it shows.",
     ["Visual", "Manual", "Cognitive"],
     [("Glancing at a map app instead of the road", 0), ("Holding a phone with one hand while steering", 1),
      ("Thinking about tomorrow's test while driving", 2), ("Watching a video on a screen while crossing a street", 0)],
     "Distractions can take eyes, hands, or attention away from the task.")
mc(L, 3, "Why is using a phone while driving more dangerous than most other distractions?",
   "It takes eyes, hands, and attention off driving.",
   ["It only takes the driver's eyes off the road for a moment.", "It is risky only at very high speeds on highways.", "It is only dangerous when the driver is not talking."],
   "Phone use combines visual, manual, and cognitive distraction.")
ms(L, 4, "Which are healthy technology habits that support safety? Select all that apply.",
   ["Turning on a driving mode that silences alerts", "Looking up before stepping into a crosswalk", "Muting group chats while riding a bike", "Keeping live location private from strangers"],
   ["Posting a live location story every few minutes", "Checking messages at stop lights while driving"],
   "Safe habits limit distractions and protect privacy.")
mc(L, 5, "Which is a specific, realistic safety commitment for a fictional student?",
   "\"I will mute my notifications before I ride.\"",
   ["\"I will be a better and safer person this year.\"", "\"I will never carry a phone anywhere again in my life.\"", "\"I will use my phone only when it feels safe enough.\""],
   "A strong commitment names a specific action and is realistic to follow.")
