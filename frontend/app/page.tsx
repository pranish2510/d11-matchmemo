"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000")
  .trim()
  .replace(/\/health\/?$/, "")
  .replace(/\/+$/, "");

function FlagIND({ className = "h-5 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 24" className={`${className} shrink-0 rounded-[2px] border border-white/20`} aria-label="India Flag">
      <rect width="36" height="8" y="0" fill="#FF9933" />
      <rect width="36" height="8" y="8" fill="#FFFFFF" />
      <rect width="36" height="8" y="16" fill="#138808" />
      <circle cx="18" cy="12" r="3.2" fill="none" stroke="#000080" strokeWidth="1" />
      <circle cx="18" cy="12" r="0.8" fill="#000080" />
    </svg>
  );
}

function FlagAUS({ className = "h-5 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 24" className={`${className} shrink-0 rounded-[2px] border border-white/20`} aria-label="Australia Flag">
      <rect width="36" height="24" fill="#00008B" />
      <path d="M0,0 L18,12 M18,0 L0,12" stroke="#FFFFFF" strokeWidth="2.2" />
      <path d="M0,0 L18,12 M18,0 L0,12" stroke="#E53945" strokeWidth="1.1" />
      <path d="M9,0 V12 M0,6 H18" stroke="#FFFFFF" strokeWidth="3.2" />
      <path d="M9,0 V12 M0,6 H18" stroke="#E53945" strokeWidth="1.8" />
      <circle cx="9" cy="18" r="2.1" fill="#FFFFFF" />
      <circle cx="27" cy="5" r="1.2" fill="#FFFFFF" />
      <circle cx="31" cy="10" r="1.2" fill="#FFFFFF" />
      <circle cx="24" cy="11" r="1.2" fill="#FFFFFF" />
      <circle cx="27" cy="18" r="1.4" fill="#FFFFFF" />
      <circle cx="29" cy="13.5" r="0.8" fill="#FFFFFF" />
    </svg>
  );
}

interface BallEvent {
  index: number;
  innings: 1 | 2;
  overNumber: number;
  ballInOver: number;
  overLabel: string;
  batter: string;
  nonStriker: string;
  bowler: string;
  runs: number;
  badge: string;
  isWicket: boolean;
  isBoundary: boolean;
  playerOut?: string;
  dismissal?: string;
  commentaryEn: string;
  commentaryHi: string;
}

interface FantasyPlayerDelta {
  player: string;
  roleBadge: string;
  emoji: string;
  points: number;
  breakdownEn: string;
  breakdownHi: string;
}

interface BatterScorecardRow {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  sr: string;
  status: "batting" | "out" | "dnb";
  isStriker: boolean;
  dismissalText: string;
}

interface BowlerScorecardRow {
  name: string;
  overs: string;
  balls: number;
  runs: number;
  wickets: number;
  dots: number;
  econ: string;
}

interface FullInningsCard {
  innings: 1 | 2;
  teamName: string;
  teamShort: string;
  totalRuns: number;
  totalWickets: number;
  oversDisplay: string;
  crr: string;
  batters: BatterScorecardRow[];
  bowlers: BowlerScorecardRow[];
  fallOfWickets: { score: string; player: string; over: string }[];
}

const IND_SQUAD = ["R. Sharma", "V. Kohli", "R. Pant", "S. Yadav", "S. Dube", "H. Pandya", "R. Jadeja", "A. Patel", "K. Yadav", "J. Bumrah", "A. Singh"];
const AUS_SQUAD = ["T. Head", "D. Warner", "M. Marsh", "G. Maxwell", "M. Stoinis", "T. David", "M. Wade", "P. Cummins", "M. Starc", "J. Hazlewood", "A. Zampa"];

const PLAYER_CAREER_PROFILES: Record<string, { fullName: string; shortName: string; role: string; statsEn: string; statsHi: string }> = {
  rohit: {
    fullName: "Rohit Sharma",
    shortName: "R. Sharma",
    role: "India Captain • Opening Batter",
    statsEn: "🏏 **Rohit Sharma (IND Captain):** 4,100+ T20I runs (Most in T20I history), 5 T20I Centuries (World Record), Strike Rate ~140. Known as 'Hitman' for his effortless pull shots and powerplay dominance.",
    statsHi: "🏏 **रोहित शर्मा (कप्तान):** T20I इतिहास में सर्वाधिक 4,100+ रन और 5 शतक (वर्ल्ड रिकॉर्ड), स्ट्राइक रेट ~140। पावरप्ले में छक्कों की बारिश करने के लिए मशहूर!",
  },
  sharma: {
    fullName: "Rohit Sharma",
    shortName: "R. Sharma",
    role: "India Captain • Opening Batter",
    statsEn: "🏏 **Rohit Sharma (IND Captain):** 4,100+ T20I runs, 5 T20I Centuries, Strike Rate ~140.",
    statsHi: "🏏 **रोहित शर्मा (कप्तान):** T20I इतिहास में सर्वाधिक 4,100+ रन और 5 शतक।",
  },
  kohli: {
    fullName: "Virat Kohli",
    shortName: "V. Kohli",
    role: "India Top-Order Batter",
    statsEn: "👑 **Virat Kohli (IND):** 4,000+ T20I runs at an iconic average of 49+, SR 137+. Greatest big-match chaser in T20 World Cup history.",
    statsHi: "👑 **विराट कोहली:** 4,000+ T20I रन, 49+ का शानदार औसत। बड़े मैचों के सबसे बड़े मैच-विनर!",
  },
  virat: {
    fullName: "Virat Kohli",
    shortName: "V. Kohli",
    role: "India Top-Order Batter",
    statsEn: "👑 **Virat Kohli (IND):** 4,000+ T20I runs at an iconic average of 49+, SR 137+.",
    statsHi: "👑 **विराट कोहली:** 4,000+ T20I रन, 49+ का शानदार औसत।",
  },
  pant: {
    fullName: "Rishabh Pant",
    shortName: "R. Pant",
    role: "India Wicketkeeper-Batter",
    statsEn: "⚡ **Rishabh Pant (IND WK):** Fearless left-handed #3 counter-attacker; 1,150+ T20I runs, famous for one-handed sixes and reverse-scoops.",
    statsHi: "⚡ **ऋषभ पंत:** आक्रामक विकेटकीपर-बल्लेबाज, अपने एक हाथ के छक्कों और रिवर्स-स्कूप शॉट्स के लिए प्रसिद्ध।",
  },
  surya: {
    fullName: "Suryakumar Yadav",
    shortName: "S. Yadav",
    role: "India 360° Middle-Order Batter",
    statsEn: "🔥 **Suryakumar Yadav (SKY):** #1 ranked ICC T20I batter; 2,300+ T20I runs at an astonishing Strike Rate of 168+, 4 T20I centuries.",
    statsHi: "🔥 **सूर्यकुमार यादव (SKY):** 168+ के तूफानी स्ट्राइक रेट और 4 T20I शतकों के साथ दुनिया के नंबर-1 360-डिग्री T20 बल्लेबाज!",
  },
  pandya: {
    fullName: "Hardik Pandya",
    shortName: "H. Pandya",
    role: "India Vice-Captain • Pace All-Rounder",
    statsEn: "💪 **Hardik Pandya (IND):** Premier clutch seam all-rounder; 1,500+ T20I runs (SR 141+) & 80+ T20I wickets. Thrives in overs 16–20.",
    statsHi: "💪 **हार्दिक पांड्या:** भारत के प्रमुख ऑलराउंडर; 1,500+ T20I रन और 80+ विकेट।",
  },
  hardik: {
    fullName: "Hardik Pandya",
    shortName: "H. Pandya",
    role: "India Vice-Captain • Pace All-Rounder",
    statsEn: "💪 **Hardik Pandya (IND):** 1,500+ T20I runs (SR 141+) & 80+ T20I wickets.",
    statsHi: "💪 **हार्दिक पांड्या:** भारत के प्रमुख ऑलराउंडर; 1,500+ T20I रन और 80+ विकेट।",
  },
  dube: {
    fullName: "Shivam Dube",
    shortName: "S. Dube",
    role: "India Middle-Order Power Hitter",
    statsEn: "💥 **Shivam Dube (IND):** Middle-overs spin basher; career T20I SR 135+, known for launching leg-spinners into the stands.",
    statsHi: "💥 **शिवम दुबे:** मिडिल ओवर्स में स्पिनर्स के खिलाफ लंबे छक्के जड़ने वाले पावर-हिटर (SR 135+)।",
  },
  jadeja: {
    fullName: "Ravindra Jadeja",
    shortName: "R. Jadeja",
    role: "India Spin All-Rounder",
    statsEn: "🗡️ **Ravindra Jadeja (IND):** Elite 3D all-rounder; 500+ T20I runs, 50+ wickets at an economy under 7.2.",
    statsHi: "🗡️ **रवींद्र जडेजा:** सटीक स्पिन, डेथ ओवर्स में तेज़ रन और दुनिया के सर्वश्रेष्ठ फील्डरों में से एक।",
  },
  bumrah: {
    fullName: "Jasprit Bumrah",
    shortName: "J. Bumrah",
    role: "India Spearhead Fast Bowler",
    statsEn: "🎯 **Jasprit Bumrah (IND):** Generational pace spearhead; 85+ T20I wickets at a historic economy rate of ~6.30! Unplayable yorkers and slower off-cutters.",
    statsHi: "🎯 **जसप्रीत बुमराह:** दुनिया के सबसे खतरनाक तेज गेंदबाज; ~6.30 की अद्भुत इकॉनमी और 85+ T20I विकेट।",
  },
  kuldeep: {
    fullName: "Kuldeep Yadav",
    shortName: "K. Yadav",
    role: "India Left-Arm Wrist Spinner",
    statsEn: "🌀 **Kuldeep Yadav (IND):** Left-arm chinaman match-winner; 65+ T20I wickets at an average under 14.5 and economy ~6.7!",
    statsHi: "🌀 **कुलदीप यादव:** चाइनामैन स्पिनर; 14.5 से कम के औसत से 65+ T20I विकेट।",
  },
  arshdeep: {
    fullName: "Arshdeep Singh",
    shortName: "A. Singh",
    role: "India Left-Arm Swing/Death Bowler",
    statsEn: "⚡ **Arshdeep Singh (IND):** 75+ T20I wickets (SR ~13.2); swings the new ball in Over 1 and nails wide yorkers at the death.",
    statsHi: "⚡ **अर्शदीप सिंह:** नई गेंद से स्विंग और डेथ ओवर्स में यॉर्कर डालने वाले बाएं हाथ के स्ट्राइक गेंदबाज (75+ T20I विकेट)।",
  },
  axar: {
    fullName: "Axar Patel",
    shortName: "A. Patel",
    role: "India Left-Arm Spin All-Rounder",
    statsEn: "🛡️ **Axar Patel (IND):** High-accuracy left-arm orthodox spinner; 55+ T20I wickets (Econ 7.2) plus electric boundary fielding.",
    statsHi: "🛡️ **अक्षर पटेल:** किफायती स्पिन गेंदबाजी और बाउंड्री पर अद्भुत फील्डिंग करने वाले ऑलराउंडर।",
  },
  head: {
    fullName: "Travis Head",
    shortName: "T. Head",
    role: "Australia Explosive Opener",
    statsEn: "🚨 **Travis Head (AUS):** Fearless opener with T20I SR 155+; brutally attacks length balls through the off-side and cow corner.",
    statsHi: "🚨 **ट्रेविस हेड (AUS):** भारत के खिलाफ बड़े मैचों में सबसे खतरनाक बल्लेबाज; 155+ का T20I स्ट्राइक रेट!",
  },
  warner: {
    fullName: "David Warner",
    shortName: "D. Warner",
    role: "Australia Veteran Opener",
    statsEn: "🦘 **David Warner (AUS):** 3,100+ T20I runs, 2021 T20 World Cup Player of the Tournament; legendary dynamism in the Powerplay.",
    statsHi: "🦘 **डेविड वॉर्नर (AUS):** 3,100+ T20I रन, ऑस्ट्रेलिया के सबसे अनुभवी और विस्फोटक ओपनर।",
  },
  marsh: {
    fullName: "Mitchell Marsh",
    shortName: "M. Marsh",
    role: "Australia Captain • All-Rounder",
    statsEn: "💥 **Mitchell Marsh (AUS Captain):** 1,500+ T20I runs at SR 135+; dominant puller of fast bowling at #3.",
    statsHi: "💥 **मिचेल मार्श (AUS कप्तान):** नंबर-3 पर तेज गेंदबाजों के खिलाफ लंबे छक्के लगाने वाले ताकतवर बल्लेबाज।",
  },
  maxwell: {
    fullName: "Glenn Maxwell",
    shortName: "G. Maxwell",
    role: "Australia X-Factor All-Rounder",
    statsEn: "⚡ **Glenn Maxwell (AUS):** 'The Big Show' — 2,500+ T20I runs at SR 154+ and 5 T20I centuries!",
    statsHi: "⚡ **ग्लेन मैक्सवेल (AUS):** 154+ के स्ट्राइक रेट और 5 T20I शतकों वाले 'बिग शो'!",
  },
  starc: {
    fullName: "Mitchell Starc",
    shortName: "M. Starc",
    role: "Australia Left-Arm Express Pacer",
    statsEn: "🔥 **Mitchell Starc (AUS):** 145+ kph left-arm lethal inswing bowler; 75+ T20I wickets.",
    statsHi: "🔥 **मिचेल स्टार्क (AUS):** 145+ किमी/घंटा की रफ्तार और खतरनाक इनस्विंग यॉर्कर डालने वाले पेसर।",
  },
  cummins: {
    fullName: "Pat Cummins",
    shortName: "P. Cummins",
    role: "Australia Pace Ace",
    statsEn: "🎯 **Pat Cummins (AUS):** World-class leader; 60+ T20I wickets with back-of-a-length cutters and consecutive T20 WC hat-tricks!",
    statsHi: "🎯 **पैट कमिंस (AUS):** T20 वर्ल्ड कप में लगातार दो हैट्रिक लेने वाले विश्वस्तरीय तेज गेंदबाज!",
  },
  zampa: {
    fullName: "Adam Zampa",
    shortName: "A. Zampa",
    role: "Australia Leg-Spinner",
    statsEn: "🌀 **Adam Zampa (AUS):** Australia's all-time leading T20I wicket-taker (100+ T20I wickets, Econ ~7.2).",
    statsHi: "🌀 **एडम ज़म्पा (AUS):** 100+ T20I विकेट लेने वाले ऑस्ट्रेलिया के सबसे सफल लेग स्पिनर।",
  },
  hazlewood: {
    fullName: "Josh Hazlewood",
    shortName: "J. Hazlewood",
    role: "Australia Line & Length Seamer",
    statsEn: "🛡️ **Josh Hazlewood (AUS):** Test-match metronome in T20s; 60+ T20I wickets (Econ ~7.5) with relentless seam movement, steep bounce, and dot-ball pressure in the Powerplay.",
    statsHi: "🛡️ **जोश हेज़लवुड (AUS):** सटीक लाइन-लेंथ, सीम मूवमेंट और उछाल से पावरप्ले में डॉट गेंदों का दबाव बनाने वाले पेसर।",
  },
  stoinis: {
    fullName: "Marcus Stoinis",
    shortName: "M. Stoinis",
    role: "Australia Power All-Rounder",
    statsEn: "💪 **Marcus Stoinis (AUS):** 1,100+ T20I runs (SR 148+) and 45+ T20I wickets (IPL bowling avg ~28.5, Econ ~9.2) using heavy-ball cutters and golden-arm partnership breakers.",
    statsHi: "💪 **मार्कस स्टोइनिस (AUS):** 148+ स्ट्राइक रेट वाले फिनिशर और स्लोअर बाउंसर/कटर से साझेदारी तोड़ने वाले ऑलराउंडर।",
  },
};

function build40OverMatchScript(): BallEvent[] {
  const events: BallEvent[] = [];
  let idx = 1;

  const indBatters = ["R. Sharma", "V. Kohli", "R. Pant", "S. Yadav", "S. Dube", "H. Pandya", "R. Jadeja"];
  const ausBowlers = ["M. Starc", "J. Hazlewood", "P. Cummins", "A. Zampa", "M. Stoinis"];

  const ausBatters = ["T. Head", "D. Warner", "M. Marsh", "G. Maxwell", "M. Stoinis", "T. David", "M. Wade", "P. Cummins", "M. Starc"];
  const indBowlers = ["A. Singh", "J. Bumrah", "A. Patel", "K. Yadav", "H. Pandya"];

  const indOverPatterns: { runs: number[]; wktBall?: number; out?: string; how?: string; noteEn: string; noteHi: string }[] = [
    { runs: [1, 0, 4, 0, 1, 0], noteEn: "🏏 Starc opens with swing; Rohit punches a crisp cover boundary!", noteHi: "🏏 स्टार्क की स्विंग के खिलाफ रोहित ने शानदार चौका जड़ा!" },
    { runs: [0, 0, 0, 0, 0, 1], wktBall: 4, out: "V. Kohli", how: "c David b Hazlewood", noteEn: "🚨 WICKET! Hazlewood bounces out Kohli for a 5-ball duck!", noteHi: "🚨 विकेट! हेज़लवुड ने विराट कोहली (0) को कैच आउट कराया!" },
    { runs: [6, 6, 4, 6, 0, 6], noteEn: "🔥 CARNAGE! Rohit Sharma smashes 28 off Starc's over with 4 colossal sixes!", noteHi: "🔥 तबाही! रोहित शर्मा ने स्टार्क के एक ही ओवर में 4 छक्के और 1 चौका जड़ दिया!" },
    { runs: [1, 4, 0, 1, 4, 1], noteEn: "⚡ Pant joins the attack while Rohit keeps peppering the fence.", noteHi: "⚡ पंत और रोहित ने मिलकर पावरप्ले में रन गति को तेज़ रखा।" },
    { runs: [6, 1, 4, 0, 2, 6], noteEn: "💥 Rohit reaches a 19-ball FIFTY with a flat six over Cummins!", noteHi: "💥 रोहित शर्मा ने मात्र 19 गेंदों में अपना तूफानी अर्धशतक पूरा किया!" },
    { runs: [1, 0, 6, 1, 0, 1], noteEn: "🇮🇳 India finishes the Powerplay flying high!", noteHi: "🇮🇳 पावरप्ले समाप्त, रोहित की बदौलत भारत मजबूत स्थिति में।" },
    { runs: [1, 1, 4, 0, 6, 1], noteEn: "🌀 Zampa introduced; Rohit sweeps him over deep midwicket for SIX!", noteHi: "🌀 ज़म्पा का स्वागत रोहित ने शानदार स्लॉग स्वीप छक्के से किया!" },
    { runs: [0, 1, 0, 6, 0, 1], wktBall: 5, out: "R. Pant", how: "c Hazlewood b Stoinis", noteEn: "🚨 WICKET! Pant falls skying Stoinis; Suryakumar Yadav walks in!", noteHi: "🚨 विकेट! ऋषभ पंत स्टोइनिस की गेंद पर कैच आउट हुए; सूर्या क्रीज़ पर!" },
    { runs: [1, 4, 6, 1, 1, 0], noteEn: "🔥 Suryakumar Yadav starts immediately with a 360° scoop and cover drive!", noteHi: "🔥 सूर्यकुमार यादव ने आते ही चौके और छक्के से पारी को रफ़्तार दी!" },
    { runs: [4, 1, 1, 6, 0, 1], noteEn: "🚀 Rohit enters the 90s as India crosses 115 at the halfway mark!", noteHi: "🚀 10 ओवर के बाद भारत 115 के पार, रोहित शतक के करीब!" },
    { runs: [1, 4, 0, 1, 2, 1], noteEn: "🎯 Cummins mixes up cutters to pull things back slightly.", noteHi: "🎯 कमिंस ने सटीक कटर डालकर रनों पर थोड़ा अंकुश लगाया।" },
    { runs: [4, 0, 1, 0, 6, 1], wktBall: 2, out: "R. Sharma", how: "b Starc", noteEn: "🚨 HUGE WICKET! Starc returns and bowls Rohit Sharma after a legendary knock!", noteHi: "🚨 बड़ा विकेट! स्टार्क ने यॉर्कर पर रोहित शर्मा की ऐतिहासिक पारी का अंत किया!" },
    { runs: [1, 4, 1, 6, 0, 1], noteEn: "💥 Shivam Dube muscles Zampa straight down the ground for a massive six!", noteHi: "💥 शिवम दुबे ने ज़म्पा के खिलाफ सीधा छक्का जड़ा!" },
    { runs: [4, 6, 0, 1, 0, 1], wktBall: 5, out: "S. Yadav", how: "c Wade b Starc", noteEn: "🚨 WICKET! Suryakumar Yadav edges Starc's wide slower cutter behind!", noteHi: "🚨 विकेट! सूर्यकुमार यादव स्टार्क की स्लोअर गेंद पर विकेटकीपर को कैच दे बैठे!" },
    { runs: [1, 1, 0, 4, 1, 1], noteEn: "🏏 Hardik Pandya and Dube rotate strike to set up the death overs.", noteHi: "🏏 हार्दिक पांड्या और दुबे ने पारी को संभालते हुए स्ट्राइक रोटेट की।" },
    { runs: [0, 1, 4, 1, 0, 2], noteEn: "🛡️ Hazlewood bowls a tight final spell; 4 overs left for the finish.", noteHi: "🛡️ हेज़लवुड का किफायती ओवर; अब आखिरी 4 ओवरों का डेथ गेम बाकी।" },
    { runs: [1, 6, 6, 4, 0, 1], noteEn: "🔥 EXPLOSION! Hardik Pandya hammers Stoinis for back-to-back SIXES and a FOUR!", noteHi: "🔥 हार्दिक पांड्या का प्रहार! स्टोइनिस को लगातार दो छक्के और एक चौका जड़ा!" },
    { runs: [4, 1, 0, 1, 0, 6], wktBall: 5, out: "S. Dube", how: "c Warner b Stoinis", noteEn: "🚨 WICKET! Dube falls going big, and Jadeja launches his first ball for SIX!", noteHi: "🚨 विकेट! दुबे आउट हुए, लेकिन जडेजा ने आते ही छक्का लगाया!" },
    { runs: [1, 4, 2, 1, 4, 1], noteEn: "⚡ Pandya slices Cummins over backward point as India nears 200!", noteHi: "⚡ पांड्या के चौकों की मदद से भारत 200 के करीब पहुंचा!" },
    { runs: [2, 1, 4, 1, 2, 1], noteEn: "🇮🇳 INDIA FINISHES AT 205/5! Australia needs 206 to win!", noteHi: "🇮🇳 भारत ने 20 ओवर में 205/5 का विशाल स्कोर खड़ा किया! ऑस्ट्रेलिया को 206 का लक्ष्य।" },
  ];

  const ausOverPatterns: { runs: number[]; wktBall?: number; out?: string; how?: string; noteEn: string; noteHi: string }[] = [
    { runs: [4, 2, 0, 0, 1, 0], wktBall: 6, out: "D. Warner", how: "c Suryakumar b Arshdeep", noteEn: "🚨 WICKET! Arshdeep Singh gets David Warner edging to slip in Over 1!", noteHi: "🚨 पहला झटका! अर्शदीप सिंह ने पहले ही ओवर में डेविड वॉर्नर को स्लिप में कैच कराया!" },
    { runs: [0, 4, 4, 0, 6, 1], noteEn: "🔥 Travis Head counter-attacks with fearless boundaries!", noteHi: "🔥 ट्रेविस हेड ने काउंटर-अटैक करते हुए शानदार चौके-छक्के लगाए!" },
    { runs: [1, 6, 4, 0, 1, 2], noteEn: "💥 Mitchell Marsh muscles a pull shot for SIX!", noteHi: "💥 मिचेल मार्श ने पुल शॉट पर छक्का जड़कर रन रेट को बनाए रखा।" },
    { runs: [4, 0, 1, 4, 1, 0], noteEn: "⚡ Head slashes through point twice as the 50-stand comes up!", noteHi: "⚡ हेड और मार्श के बीच 50 रनों की तेज़ साझेदारी पूरी हुई!" },
    { runs: [6, 1, 4, 6, 1, 1], noteEn: "🚨 Big 19-run over! Head and Marsh put India under serious pressure!", noteHi: "🚨 इस ओवर में 19 रन आए! ऑस्ट्रेलिया ने भारत पर दबाव बनाया।" },
    { runs: [1, 0, 4, 1, 0, 1], noteEn: "🇦🇺 Australia ends Powerplay at 65/1, right on pace with India!", noteHi: "🇦🇺 पावरप्ले के बाद ऑस्ट्रेलिया 65/1, मैच पूरी तरह रोमांचक मोड़ पर।" },
    { runs: [1, 1, 0, 4, 1, 1], noteEn: "🌀 Kuldeep Yadav enters the attack and finds sharp turn.", noteHi: "🌀 कुलदीप यादव गेंदबाजी पर आए और अपनी स्पिन से बल्लेबाजों को छकाया।" },
    { runs: [6, 1, 4, 0, 1, 2], noteEn: "🔥 Travis Head brings up a blistering FIFTY with a slog-sweep six!", noteHi: "🔥 ट्रेविस हेड ने तूफानी अंदाज में अपना अर्धशतक पूरा किया!" },
    { runs: [1, 0, 0, 1, 0, 0], wktBall: 6, out: "M. Marsh", how: "c Axar b Kuldeep", noteEn: "🚨 STUNNER! Axar Patel plucks a one-handed miracle on the boundary to dismiss Marsh!", noteHi: "🚨 अविश्वसनीय कैच! बाउंड्री पर अक्षर पटेल ने एक हाथ से उछलकर मार्श का कैच लपका!" },
    { runs: [4, 1, 6, 1, 4, 1], noteEn: "⚡ Glenn Maxwell counter-punches immediately with reverse sweeps!", noteHi: "⚡ ग्लेन मैक्सवेल ने आते ही रिवर्स स्वीप और छक्के से रन बटोरे!" },
    { runs: [1, 1, 4, 0, 1, 1], noteEn: "🏏 Head and Maxwell take Australia past 115; match on a knife-edge!", noteHi: "🏏 हेड और मैक्सवेल ने ऑस्ट्रेलिया को 115 के पार पहुंचाया।" },
    { runs: [4, 0, 1, 6, 1, 0], noteEn: "💥 Head hammers a monster six over long-off!", noteHi: "💥 हेड का एक और छक्का! मैच बेहद रोमांचक स्थिति में।" },
    { runs: [0, 1, 0, 0, 1, 1], wktBall: 1, out: "G. Maxwell", how: "b Kuldeep", noteEn: "🚨 BOWLED HIM! Kuldeep Yadav bamboozles Glenn Maxwell charging down the track!", noteHi: "🚨 बोल्ड! कुलदीप यादव की गुगली पर ग्लेन मैक्सवेल चारों खाने चित्त!" },
    { runs: [1, 1, 0, 0, 1, 4], wktBall: 3, out: "M. Stoinis", how: "c Pandya b Axar", noteEn: "🚨 WICKET! Axar Patel gets Marcus Stoinis reverse-sweeping to point! Double blow!", noteHi: "🚨 लगातार दूसरा झटका! अक्षर पटेल ने मार्कस स्टोइनिस को पॉइंट पर कैच कराया!" },
    { runs: [1, 4, 0, 1, 1, 0], noteEn: "🎯 Tim David joins Travis Head, who holds the key for Australia.", noteHi: "🎯 ट्रेविस हेड अभी भी क्रीज़ पर डटे हुए हैं, टिम डेविड साथ देने आए।" },
    { runs: [4, 0, 0, 1, 0, 1], wktBall: 3, out: "T. Head", how: "c Rohit b Bumrah", noteEn: "🚨🔥 GAME CHANGER! Jasprit Bumrah returns and deceives Travis Head (76) with a slower off-cutter!", noteHi: "🚨🔥 मैच पलटने वाला पल! जसप्रीत बुमराह ने स्लोअर कटर पर खतरनाक ट्रेविस हेड को आउट किया!" },
    { runs: [1, 6, 0, 0, 1, 0], wktBall: 4, out: "M. Wade", how: "c Kuldeep b Arshdeep", noteEn: "🚨 WICKET! Arshdeep cramps Matthew Wade for room; top-edge taken!", noteHi: "🚨 विकेट! अर्शदीप सिंह ने मैथ्यू वेड को शॉर्ट थर्ड मैन पर कैच आउट कराया!" },
    { runs: [4, 0, 6, 0, 1, 0], wktBall: 4, out: "T. David", how: "c Bumrah b Arshdeep", noteEn: "🚨 WICKET! Arshdeep strikes again to remove Tim David; India takes full command!", noteHi: "🚨 विकेट! अर्शदीप ने टिम डेविड को भी पवेलियन भेजा; भारत की जीत लगभग पक्की!" },
    { runs: [0, 1, 0, 2, 0, 1], noteEn: "🎯 Bumrah bowls a masterclass 19th over conceding just 4 runs!", noteHi: "🎯 बुमराह का जादुई 19वां ओवर, मात्र 4 रन दिए!" },
    { runs: [1, 4, 1, 0, 1, 4], noteEn: "🇮🇳🏆 INDIA WINS BY 24 RUNS! Australia finishes at 181/7 (20.0 ov)!", noteHi: "🇮🇳🏆 भारत ने 24 रनों से रोमांचक मुकाबला जीत लिया! ऑस्ट्रेलिया 181/7 पर सिमटी।" },
  ];

  const generateInnings = (
    inningsNum: 1 | 2,
    patterns: typeof indOverPatterns,
    battersList: string[],
    bowlersList: string[]
  ) => {
    let strikerIdx = 0;
    let nonStrikerIdx = 1;
    let nextBatterIdx = 2;

    patterns.forEach((ov, overIdx) => {
      const bowler = bowlersList[overIdx % bowlersList.length];
      ov.runs.forEach((runVal, ballZeroIdx) => {
        const ballNum = ballZeroIdx + 1;
        const isWkt = ov.wktBall === ballNum;

        if (isWkt && ov.out) {
          if (battersList[nonStrikerIdx] === ov.out) {
            const swap = strikerIdx;
            strikerIdx = nonStrikerIdx;
            nonStrikerIdx = swap;
          }
        }

        const batterName = battersList[strikerIdx] || battersList[battersList.length - 1];
        const nonStrikerName = battersList[nonStrikerIdx] || battersList[battersList.length - 2];

        const dismissedBatter = isWkt ? batterName : undefined;
        const dismissalWay = isWkt ? ov.how || `b ${bowler}` : undefined;

        const overLabel = `${overIdx}.${ballNum}`;
        const badge = isWkt ? "W" : String(runVal);

        let commEn = `${overLabel} • ${bowler} to ${batterName}: `;
        let commHi = `${overLabel} • ${bowler} से ${batterName}: `;

        if (isWkt) {
          commEn += `🚨 WICKET! ${dismissedBatter} is OUT (${dismissalWay})! ${ov.noteEn}`;
          commHi += `🚨 विकेट! ${dismissedBatter} आउट (${dismissalWay})! ${ov.noteHi}`;
        } else if (runVal === 6) {
          commEn += `🚀 SIX! Launched into the stands by ${batterName}! ${ov.noteEn}`;
          commHi += `🚀 छक्का! ${batterName} ने गेंद को स्टैंड्स में पहुंचाया! ${ov.noteHi}`;
        } else if (runVal === 4) {
          commEn += `⚡ FOUR! Crisp timing through the gap by ${batterName}. ${ov.noteEn}`;
          commHi += `⚡ चौका! ${batterName} का बेहतरीन शॉट, गेंद बाउंड्री के पार। ${ov.noteHi}`;
        } else if (runVal === 0) {
          commEn += `⚫ Dot ball. Tight line and length from ${bowler}.`;
          commHi += `⚫ डॉट गेंद। ${bowler} की सटीक लाइन और लेंथ।`;
        } else {
          commEn += `🏃 ${runVal} run${runVal > 1 ? "s" : ""}, smartly rotated into the gap.`;
          commHi += `🏃 ${runVal} रन, समझदारी से स्ट्राइक रोटेट किया।`;
        }

        events.push({
          index: idx++,
          innings: inningsNum,
          overNumber: overIdx,
          ballInOver: ballNum,
          overLabel,
          batter: batterName,
          nonStriker: nonStrikerName,
          bowler,
          runs: isWkt ? 0 : runVal,
          badge,
          isWicket: isWkt,
          isBoundary: !isWkt && (runVal === 4 || runVal === 6),
          playerOut: dismissedBatter,
          dismissal: dismissalWay,
          commentaryEn: commEn,
          commentaryHi: commHi,
        });

        if (isWkt) {
          strikerIdx = Math.min(nextBatterIdx, battersList.length - 1);
          nextBatterIdx++;
        } else if (runVal % 2 === 1) {
          const tmp = strikerIdx;
          strikerIdx = nonStrikerIdx;
          nonStrikerIdx = tmp;
        }
      });

      const tmp = strikerIdx;
      strikerIdx = nonStrikerIdx;
      nonStrikerIdx = tmp;
    });
  };

  generateInnings(1, indOverPatterns, indBatters, ausBowlers);
  generateInnings(2, ausOverPatterns, ausBatters, indBowlers);

  return events;
}

const ALL_MATCH_EVENTS = build40OverMatchScript();

// Helper to build a Complete Ball-1-to-Current-Ball Scorecard for any Innings
function computeInningsFullCard(inningsNum: 1 | 2, upToGlobalIdx: number): FullInningsCard {
  const squad = inningsNum === 1 ? IND_SQUAD : AUS_SQUAD;
  const events = ALL_MATCH_EVENTS.filter((e) => e.innings === inningsNum && e.index <= upToGlobalIdx);

  const totalRuns = events.reduce((s, e) => s + e.runs, 0);
  const totalWickets = events.filter((e) => e.isWicket).length;
  const legalBalls = events.length;
  const oversDisplay = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
  const crr = legalBalls > 0 ? ((totalRuns / legalBalls) * 6).toFixed(2) : "0.00";

  const lastBall = events[events.length - 1];
  const activeStriker = lastBall ? lastBall.batter : squad[0];
  const activeNonStriker = lastBall ? lastBall.nonStriker : squad[1];

  const bMap = new Map<
    string,
    { runs: number; balls: number; fours: number; sixes: number; out: boolean; dismissalText: string; appeared: boolean }
  >();
  squad.forEach((name) =>
    bMap.set(name, { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissalText: "yet to bat", appeared: false })
  );

  const fallOfWickets: { score: string; player: string; over: string }[] = [];
  let runningRuns = 0;
  let runningWkts = 0;

  events.forEach((ev) => {
    runningRuns += ev.runs;
    const st = bMap.get(ev.batter) || {
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: false,
      dismissalText: "",
      appeared: true,
    };
    st.appeared = true;
    st.runs += ev.runs;
    st.balls += 1;
    if (ev.runs === 4) st.fours += 1;
    if (ev.runs === 6) st.sixes += 1;
    bMap.set(ev.batter, st);

    const ns = bMap.get(ev.nonStriker);
    if (ns) ns.appeared = true;

    if (ev.isWicket && ev.playerOut) {
      runningWkts += 1;
      const outPlayer = bMap.get(ev.playerOut);
      if (outPlayer) {
        outPlayer.out = true;
        outPlayer.dismissalText = ev.dismissal || `b ${ev.bowler}`;
      }
      fallOfWickets.push({
        score: `${runningRuns}-${runningWkts}`,
        player: ev.playerOut,
        over: ev.overLabel,
      });
    }
  });

  const batters: BatterScorecardRow[] = squad.map((name) => {
    const st = bMap.get(name)!;
    const isCurrentlyAtCrease =
      events.length > 0 && !st.out && (name === activeStriker || name === activeNonStriker || st.appeared);
    return {
      name,
      runs: st.runs,
      balls: st.balls,
      fours: st.fours,
      sixes: st.sixes,
      sr: st.balls > 0 ? ((st.runs / st.balls) * 100).toFixed(1) : "0.0",
      status: st.out ? "out" : isCurrentlyAtCrease ? "batting" : "dnb",
      isStriker: isCurrentlyAtCrease && name === activeStriker,
      dismissalText: st.out ? st.dismissalText : isCurrentlyAtCrease ? "not out" : "yet to bat",
    };
  });

  const bowlMap = new Map<string, { balls: number; runs: number; wickets: number; dots: number }>();
  events.forEach((ev) => {
    const cur = bowlMap.get(ev.bowler) || { balls: 0, runs: 0, wickets: 0, dots: 0 };
    cur.balls += 1;
    cur.runs += ev.runs;
    if (ev.isWicket) cur.wickets += 1;
    if (ev.runs === 0 && !ev.isWicket) cur.dots += 1;
    bowlMap.set(ev.bowler, cur);
  });

  const bowlers: BowlerScorecardRow[] = [];
  bowlMap.forEach((st, name) => {
    bowlers.push({
      name,
      overs: `${Math.floor(st.balls / 6)}.${st.balls % 6}`,
      balls: st.balls,
      runs: st.runs,
      wickets: st.wickets,
      dots: st.dots,
      econ: st.balls > 0 ? ((st.runs / st.balls) * 6).toFixed(2) : "0.00",
    });
  });

  return {
    innings: inningsNum,
    teamName: inningsNum === 1 ? "INDIA" : "AUSTRALIA",
    teamShort: inningsNum === 1 ? "IND" : "AUS",
    totalRuns,
    totalWickets,
    oversDisplay,
    crr,
    batters,
    bowlers,
    fallOfWickets,
  };
}

const ALLOWED_KEYWORDS = [
  "india", "australia", "ind", "aus", "match", "score", "over", "wicket", "run",
  "boundary", "four", "six", "ball", "pitch", "chase", "target", "innings", "crr",
  "rrr", "momentum", "partnership", "powerplay", "death", "spin", "pace", "yorker",
  "starc", "cummins", "hazlewood", "zampa", "stoinis", "head", "travis", "warner",
  "marsh", "maxwell", "david", "wade", "rohit", "sharma", "kohli", "virat", "pant",
  "rishabh", "surya", "sky", "yadav", "dube", "shivam", "hardik", "pandya", "jadeja",
  "axar", "patel", "kuldeep", "bumrah", "jasprit", "arshdeep", "singh", "career",
  "stats", "average", "strike rate", "century", "fifty", "world cup", "t20", "t20i",
  "record", "history", "win", "lose", "player", "team", "who", "why", "how", "fantasy",
  "points", "captain", "bowling", "batting", "strength", "scored", "ipl",
  "मैच", "रन", "विकेट", "ओवर", "भारत", "ऑस्ट्रेलिया", "रोहित", "कोहली", "बुमराह", "हेड"
];

export default function D11Application() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [screen, setScreen] = useState<"setup" | "live">("setup");
  const [selectedInnings, setSelectedInnings] = useState<1 | 2>(1);
  const [selectedStartOver, setSelectedStartOver] = useState<number>(10);

  const [currentBallIdx, setCurrentBallIdx] = useState<number>(61);
  const [activeTab, setActiveTab] = useState<"live" | "fullcard" | "matchmemo" | "momentum" | "timeline">("live");
  const [scorecardInningsTab, setScorecardInningsTab] = useState<1 | 2>(1);
  const [commFilter, setCommFilter] = useState<"all" | "wickets" | "boundaries">("all");

  const [userOnline, setUserOnline] = useState<boolean>(true);
  const [offlineCheckpointIdx, setOfflineCheckpointIdx] = useState<number | null>(null);
  const [showMatchMemoModal, setShowMatchMemoModal] = useState<boolean>(false);
  const [memoLang, setMemoLang] = useState<"en" | "hi">("en");
  const [memoDepth, setMemoDepth] = useState<"quick" | "detailed">("quick");

  // FANTASY MODE STATE
  const [fantasyMode, setFantasyMode] = useState<boolean>(true);
  const [fantasyBooster, setFantasyBooster] = useState<"1x" | "1.5x" | "2x">("1x");
  const [fantasyAnimKey, setFantasyAnimKey] = useState<number>(0);

  // FDE TELEMETRY STATE
  const [fdeMode, setFdeMode] = useState<boolean>(false);
  const [simulateOutage, setSimulateOutage] = useState<boolean>(false);
  const [telemetryLog, setTelemetryLog] = useState<{
    latencyMs: number;
    provider: string;
    guardrailStatus: "PASS" | "BLOCKED" | "STANDBY";
    fallbackTriggered: boolean;
    timestamp: string;
    lastQuestion: string;
  }>({
    latencyMs: 184,
    provider: "d11-hybrid-router (Groq + Python Engine)",
    guardrailStatus: "STANDBY",
    fallbackTriggered: false,
    timestamp: new Date().toISOString(),
    lastQuestion: "Initial session telemetry check",
  });

  // Ask MatchMemo AI state
  const [customQuestion, setCustomQuestion] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [aiSource, setAiSource] = useState<string>("d11-intelligence");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [lastStepPulse, setLastStepPulse] = useState<number>(0);

  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const autoRunTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("d11-theme") as "dark" | "light" | null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem("d11-theme", next);
  };

  useEffect(() => {
    if (!userOnline && screen === "live") {
      autoRunTimerRef.current = setInterval(() => {
        setCurrentBallIdx((prev) => {
          const currentInnings = ALL_MATCH_EVENTS[prev - 1]?.innings || 1;
          const maxIdxForInnings = currentInnings === 1 ? 120 : 240;
          if (prev < maxIdxForInnings) {
            return prev + 1;
          }
          return prev;
        });
      }, 1100);
    } else if (autoRunTimerRef.current) {
      clearInterval(autoRunTimerRef.current);
      autoRunTimerRef.current = null;
    }
    return () => {
      if (autoRunTimerRef.current) clearInterval(autoRunTimerRef.current);
    };
  }, [userOnline, screen]);

  const overSummaries = useMemo(() => {
    const summaries: {
      innings: 1 | 2;
      overNumber: number;
      startBallIdx: number;
      endBallIdx: number;
      scoreAfter: string;
      runsInOver: number;
      wicketsInOver: number;
      headlineEn: string;
    }[] = [];

    ([1, 2] as const).forEach((inn) => {
      const innEvents = ALL_MATCH_EVENTS.filter((e) => e.innings === inn);
      let cumRuns = 0;
      let cumWkts = 0;
      for (let ov = 0; ov < 20; ov++) {
        const ovBalls = innEvents.filter((e) => e.overNumber === ov);
        const ovRuns = ovBalls.reduce((s, b) => s + b.runs, 0);
        const ovWkts = ovBalls.filter((b) => b.isWicket).length;
        cumRuns += ovRuns;
        cumWkts += ovWkts;
        const wktEvent = ovBalls.find((b) => b.isWicket);
        summaries.push({
          innings: inn,
          overNumber: ov,
          startBallIdx: ovBalls[0].index,
          endBallIdx: ovBalls[ovBalls.length - 1].index,
          scoreAfter: `${cumRuns}/${cumWkts}`,
          runsInOver: ovRuns,
          wicketsInOver: ovWkts,
          headlineEn: wktEvent
            ? wktEvent.commentaryEn.split(": ")[1] || wktEvent.commentaryEn
            : ovBalls[ovBalls.length - 1].commentaryEn.split(": ")[1] || "Tight tactical over.",
        });
      }
    });
    return summaries;
  }, []);

  // Compute Full Scorecards from Ball 1 to Current Ball for BOTH Innings
  const fullScorecards = useMemo(() => {
    const activeInnings = ALL_MATCH_EVENTS[currentBallIdx - 1]?.innings || 1;
    const inn1Card = computeInningsFullCard(1, activeInnings === 1 ? currentBallIdx : 120);
    const inn2Card = computeInningsFullCard(2, activeInnings === 2 ? currentBallIdx : 0);
    return { 1: inn1Card, 2: inn2Card };
  }, [currentBallIdx]);

  const matchState = useMemo(() => {
    const currentEvent = ALL_MATCH_EVENTS[currentBallIdx - 1] || ALL_MATCH_EVENTS[0];
    const innings = currentEvent.innings;
    const inningsEvents = ALL_MATCH_EVENTS.filter(
      (e) => e.innings === innings && e.index <= currentBallIdx
    );

    const totalRuns = inningsEvents.reduce((acc, e) => acc + e.runs, 0);
    const totalWickets = inningsEvents.filter((e) => e.isWicket).length;
    const legalBalls = inningsEvents.length;
    const oversDisplay = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
    const crr = legalBalls > 0 ? ((totalRuns / legalBalls) * 6).toFixed(2) : "0.00";

    const batterStats = new Map<string, { runs: number; balls: number; fours: number; sixes: number }>();
    inningsEvents.forEach((e) => {
      const cur = batterStats.get(e.batter) || { runs: 0, balls: 0, fours: 0, sixes: 0 };
      cur.runs += e.runs;
      cur.balls += 1;
      if (e.runs === 4) cur.fours += 1;
      if (e.runs === 6) cur.sixes += 1;
      batterStats.set(e.batter, cur);
    });

    const striker = currentEvent.batter;
    const nonStriker = currentEvent.nonStriker;
    const sStat = batterStats.get(striker) || { runs: 0, balls: 0, fours: 0, sixes: 0 };
    const nsStat = batterStats.get(nonStriker) || { runs: 0, balls: 0, fours: 0, sixes: 0 };

    const bowlerName = currentEvent.bowler;
    const bowlerBalls = inningsEvents.filter((e) => e.bowler === bowlerName);
    const bRuns = bowlerBalls.reduce((a, b) => a + b.runs, 0);
    const bWkts = bowlerBalls.filter((b) => b.isWicket).length;
    const bOvers = `${Math.floor(bowlerBalls.length / 6)}.${bowlerBalls.length % 6}`;
    const bEcon = bowlerBalls.length > 0 ? ((bRuns / bowlerBalls.length) * 6).toFixed(2) : "0.00";

    const last30 = inningsEvents.slice(-30);
    const last5Runs = last30.reduce((a, b) => a + b.runs, 0);
    const last5Wkts = last30.filter((b) => b.isWicket).length;

    const indLimitIdx = innings === 1 ? currentBallIdx : 120;
    const indEventsSlice = ALL_MATCH_EVENTS.filter((e) => e.innings === 1 && e.index <= indLimitIdx);

    const indWormPoints: { overFloat: number; runs: number; isWicket: boolean; label: string }[] = [
      { overFloat: 0, runs: 0, isWicket: false, label: "0.0" },
    ];
    let indCum = 0;
    indEventsSlice.forEach((e, i) => {
      indCum += e.runs;
      indWormPoints.push({
        overFloat: (i + 1) / 6,
        runs: indCum,
        isWicket: e.isWicket,
        label: `${e.overLabel} (${indCum}) ${e.isWicket ? `W: ${e.playerOut}` : ""}`,
      });
    });

    const ausWormPoints: { overFloat: number; runs: number; isWicket: boolean; label: string }[] = [
      { overFloat: 0, runs: 0, isWicket: false, label: "0.0" },
    ];
    if (innings === 2) {
      const ausEventsSlice = ALL_MATCH_EVENTS.filter((e) => e.innings === 2 && e.index <= currentBallIdx);
      let ausCum = 0;
      ausEventsSlice.forEach((e, i) => {
        ausCum += e.runs;
        ausWormPoints.push({
          overFloat: (i + 1) / 6,
          runs: ausCum,
          isWicket: e.isWicket,
          label: `${e.overLabel} (${ausCum}) ${e.isWicket ? `W: ${e.playerOut}` : ""}`,
        });
      });
    }

    return {
      currentEvent,
      innings,
      teamBatting: innings === 1 ? "INDIA" : "AUSTRALIA",
      teamBattingShort: innings === 1 ? "IND" : "AUS",
      teamBowlingShort: innings === 1 ? "AUS" : "IND",
      totalRuns,
      totalWickets,
      legalBalls,
      oversDisplay,
      crr,
      target: innings === 2 ? 206 : null,
      runsNeeded: innings === 2 ? Math.max(0, 206 - totalRuns) : null,
      ballsRemaining: innings === 2 ? Math.max(0, 120 - legalBalls) : null,
      reqRate:
        innings === 2 && 120 - legalBalls > 0
          ? (((206 - totalRuns) / (120 - legalBalls)) * 6).toFixed(2)
          : "0.00",
      striker: {
        name: striker,
        ...sStat,
        sr: sStat.balls > 0 ? ((sStat.runs / sStat.balls) * 100).toFixed(1) : "0.0",
      },
      nonStriker: {
        name: nonStriker,
        ...nsStat,
        sr: nsStat.balls > 0 ? ((nsStat.runs / nsStat.balls) * 100).toFixed(1) : "0.0",
      },
      bowler: {
        name: bowlerName,
        overs: bOvers,
        runs: bRuns,
        wickets: bWkts,
        econ: bEcon,
      },
      last5Summary: `${last5Runs}/${last5Wkts}`,
      recentDeliveries: inningsEvents.slice(-10),
      commentary: inningsEvents.slice().reverse(),
      indWormPoints,
      ausWormPoints,
    };
  }, [currentBallIdx]);

  // Keep scorecardInningsTab synced when innings changes
  useEffect(() => {
    setScorecardInningsTab(matchState.innings);
  }, [matchState.innings]);

  const matchMemoData = useMemo(() => {
    const endBall = ALL_MATCH_EVENTS[Math.max(0, currentBallIdx - 1)];
    const minInningsIdx = endBall.innings === 1 ? 1 : 121;
    const rawFromIdx = offlineCheckpointIdx ?? Math.max(minInningsIdx, currentBallIdx - 12);
    const fromIdx = Math.max(minInningsIdx - 1, Math.min(rawFromIdx, currentBallIdx));

    const missedEvents = ALL_MATCH_EVENTS.filter(
      (e) => e.innings === endBall.innings && e.index > fromIdx && e.index <= currentBallIdx
    );

    const fantasySlice =
      missedEvents.length > 0
        ? missedEvents
        : ALL_MATCH_EVENTS.filter(
            (e) =>
              e.innings === endBall.innings &&
              e.index > Math.max(minInningsIdx - 1, currentBallIdx - 12) &&
              e.index <= currentBallIdx
          );

    const fMap = new Map<
      string,
      {
        runs: number;
        fours: number;
        sixes: number;
        wickets: number;
        bowledBonus: number;
        dotsBowled: number;
        isBowler: boolean;
      }
    >();

    const ensurePlayer = (name: string, isBowler = false) => {
      if (!fMap.has(name)) {
        fMap.set(name, {
          runs: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          bowledBonus: 0,
          dotsBowled: 0,
          isBowler,
        });
      }
      return fMap.get(name)!;
    };

    fantasySlice.forEach((ev) => {
      const bat = ensurePlayer(ev.batter, false);
      bat.runs += ev.runs;
      if (ev.runs === 4) bat.fours += 1;
      if (ev.runs === 6) bat.sixes += 1;

      const bowl = ensurePlayer(ev.bowler, true);
      bowl.isBowler = true;
      if (ev.isWicket) {
        bowl.wickets += 1;
        if (ev.dismissal && ev.dismissal.startsWith("b ")) {
          bowl.bowledBonus += 1;
        }
      } else if (ev.runs === 0) {
        bowl.dotsBowled += 1;
      }
    });

    const fantasyLeaderboard: FantasyPlayerDelta[] = [];
    fMap.forEach((st, player) => {
      const batPts = st.runs * 1 + st.fours * 1 + st.sixes * 2 + (st.runs >= 30 ? 4 : 0);
      const bowlPts = st.wickets * 25 + st.bowledBonus * 8 + st.dotsBowled * 1;
      const totalPts = batPts + bowlPts;

      if (totalPts > 0) {
        const partsEn: string[] = [];
        const partsHi: string[] = [];
        if (st.runs > 0) {
          partsEn.push(`${st.runs} runs (${st.fours}x4, ${st.sixes}x6)`);
          partsHi.push(`${st.runs} रन (${st.fours} चौके, ${st.sixes} छक्के)`);
        }
        if (st.wickets > 0) {
          partsEn.push(`${st.wickets} Wicket${st.wickets > 1 ? "s" : ""} (+${st.wickets * 25} pts)`);
          partsHi.push(`${st.wickets} विकेट (+${st.wickets * 25} अंक)`);
        }
        if (st.dotsBowled > 0 && st.wickets === 0 && st.runs === 0) {
          partsEn.push(`${st.dotsBowled} Dot ball${st.dotsBowled > 1 ? "s" : ""} bowled`);
          partsHi.push(`${st.dotsBowled} डॉट गेंदें`);
        }

        const emoji = st.wickets > 0 ? "🎯" : st.sixes > 0 ? "🚀" : st.fours > 0 ? "⚡" : "🏏";
        fantasyLeaderboard.push({
          player,
          roleBadge: st.wickets > 0 ? "BOWL IMPACT" : st.runs > 0 ? "BAT IMPACT" : "DOT PRESSURE",
          emoji,
          points: totalPts,
          breakdownEn: partsEn.join(" • ") || "Active crease impact",
          breakdownHi: partsHi.join(" • ") || "सक्रिय योगदान",
        });
      }
    });

    fantasyLeaderboard.sort((a, b) => b.points - a.points);

    const beforeEvents = ALL_MATCH_EVENTS.filter(
      (e) => e.innings === endBall.innings && e.index <= fromIdx
    );
    const beforeRuns = beforeEvents.reduce((a, b) => a + b.runs, 0);
    const beforeWkts = beforeEvents.filter((b) => b.isWicket).length;
    const beforeOvers = `${Math.floor(beforeEvents.length / 6)}.${beforeEvents.length % 6}`;

    const runsAdded = missedEvents.reduce((a, b) => a + b.runs, 0);
    const wicketsFallen = missedEvents.filter((b) => b.isWicket);
    const boundariesHit = missedEvents.filter((b) => b.isBoundary);
    const dotBalls = missedEvents.filter((b) => b.runs === 0 && !b.isWicket).length;

    const turningPointBall =
      wicketsFallen[wicketsFallen.length - 1] ||
      boundariesHit[boundariesHit.length - 1] ||
      missedEvents[missedEvents.length - 1] ||
      endBall;

    const quickRecapEn =
      missedEvents.length === 0
        ? `🏏 You are caught up live at ${matchState.totalRuns}/${matchState.totalWickets} (${matchState.oversDisplay} ov)! Tap "GO OFFLINE" above to simulate stepping away while the match auto-runs.`
        : `⚡ While you were away for ${missedEvents.length} balls (Over ${beforeOvers} → ${matchState.oversDisplay}), ${matchState.teamBattingShort} moved from ${beforeRuns}/${beforeWkts} to ${matchState.totalRuns}/${matchState.totalWickets} (+${runsAdded} runs, ${wicketsFallen.length} wicket${wicketsFallen.length === 1 ? "" : "s"}). ${
            wicketsFallen.length > 0
              ? `🚨 Key wickets: ${wicketsFallen.map((w) => `${w.playerOut} (${w.overLabel})`).join(", ")}.`
              : `🔥 ${boundariesHit.length} boundaries kept the scoreboard flying!`
          }`;

    const detailedRecapEn =
      missedEvents.length === 0
        ? quickRecapEn
        : `📊 Across the ${missedEvents.length} deliveries you missed, ${matchState.teamBatting} scored ${runsAdded} runs at ${((runsAdded / Math.max(1, missedEvents.length)) * 6).toFixed(2)} RPO (${boundariesHit.length} boundaries, ${dotBalls} dot balls). ${
            wicketsFallen.length > 0
              ? `🚨 The momentum shifted dramatically when ${wicketsFallen.map((w) => `${w.playerOut} was dismissed in Over ${w.overLabel} (${w.dismissal})`).join("; ")}. `
              : `💪 The batters maintained composure without losing a wicket. `
          }Right now, ${matchState.striker.name} (${matchState.striker.runs}* off ${matchState.striker.balls}) and ${matchState.nonStriker.name} (${matchState.nonStriker.runs}* off ${matchState.nonStriker.balls}) are facing ${matchState.bowler.name}.`;

    const quickRecapHi =
      missedEvents.length === 0
        ? `🏏 आप लाइव मैच के साथ पूरी तरह अपडेट हैं (${matchState.totalRuns}/${matchState.totalWickets}, ${matchState.oversDisplay} ओवर)! ऊपर "GO OFFLINE" दबाएं और मैचमेमो AI कैच-अप टेस्ट करें।`
        : `⚡ जब आप ऑफलाइन थे (${missedEvents.length} गेंदें, ओवर ${beforeOvers} → ${matchState.oversDisplay}), ${matchState.teamBattingShort} का स्कोर ${beforeRuns}/${beforeWkts} से ${matchState.totalRuns}/${matchState.totalWickets} हो गया (+${runsAdded} रन, ${wicketsFallen.length} विकेट)। ${
            wicketsFallen.length > 0
              ? `🚨 प्रमुख विकेट: ${wicketsFallen.map((w) => `${w.playerOut} (${w.overLabel} ओवर)`).join(", ")}।`
              : `🔥 इस दौरान ${boundariesHit.length} शानदार चौके/छक्के लगे!`
          }`;

    const detailedRecapHi =
      missedEvents.length === 0
        ? quickRecapHi
        : `📊 आपकी अनुपस्थिति में खेली गई ${missedEvents.length} गेंदों में ${matchState.teamBattingShort} ने ${((runsAdded / Math.max(1, missedEvents.length)) * 6).toFixed(2)} के रन रेट से ${runsAdded} रन जोड़े (${boundariesHit.length} बाउंड्री, ${dotBalls} डॉट गेंदें)। ${
            wicketsFallen.length > 0
              ? `🚨 मैच में बड़ा मोड़ तब आया जब ${wicketsFallen.map((w) => `ओवर ${w.overLabel} में ${w.playerOut} (${w.dismissal}) आउट हुए`).join(" और ")}। `
              : `💪 बल्लेबाजों ने बिना कोई विकेट गंवाए साझेदारी को आगे बढ़ाया। `
          }इस समय क्रीज़ पर ${matchState.striker.name} (${matchState.striker.runs}*) और ${matchState.nonStriker.name} (${matchState.nonStriker.runs}*) डटे हुए हैं।`;

    return {
      fromIdx,
      toIdx: currentBallIdx,
      missedCount: missedEvents.length,
      beforeScore: `${beforeRuns}/${beforeWkts}`,
      beforeOvers,
      currentScore: `${matchState.totalRuns}/${matchState.totalWickets}`,
      currentOvers: matchState.oversDisplay,
      runsAdded,
      wicketsFallen,
      boundariesHit,
      dotBalls,
      turningPointEn: turningPointBall.commentaryEn,
      turningPointHi: turningPointBall.commentaryHi,
      quickRecapEn,
      detailedRecapEn,
      quickRecapHi,
      detailedRecapHi,
      fantasyLeaderboard: fantasyLeaderboard.slice(0, 4),
    };
  }, [offlineCheckpointIdx, currentBallIdx, matchState]);

  const handleStartSimulation = () => {
    const targetSummary = overSummaries.find(
      (s) => s.innings === selectedInnings && s.overNumber === selectedStartOver
    );
    const startIdx = targetSummary ? targetSummary.startBallIdx : selectedInnings === 1 ? 1 : 121;
    setCurrentBallIdx(startIdx);
    setOfflineCheckpointIdx(startIdx);
    setUserOnline(true);
    setShowMatchMemoModal(false);
    setActiveTab("live");
    setScreen("live");
  };

  const handleStepBall = (dir: "prev" | "next" | "over") => {
    const minIdx = matchState.innings === 1 ? 1 : 121;
    const maxIdx = matchState.innings === 1 ? 120 : 240;
    setCurrentBallIdx((prev) => {
      if (dir === "prev") return Math.max(minIdx, prev - 1);
      if (dir === "next") return Math.min(maxIdx, prev + 1);
      return Math.min(maxIdx, prev + 6);
    });
    setLastStepPulse(Date.now());
    setFantasyAnimKey((k) => k + 1);
  };

  const handleSwitchInningsLive = (inn: 1 | 2) => {
    const targetIdx = inn === 1 ? 61 : 181;
    setCurrentBallIdx(targetIdx);
    setOfflineCheckpointIdx(targetIdx - 12);
    setLastStepPulse(Date.now());
    setFantasyAnimKey((k) => k + 1);
  };

  const handleGoOffline = () => {
    setOfflineCheckpointIdx(currentBallIdx);
    setUserOnline(false);
    setShowMatchMemoModal(false);
  };

  const handleReturnOnline = () => {
    setUserOnline(true);
    setFantasyAnimKey((k) => k + 1);
    setShowMatchMemoModal(true);
  };

  // Helper to get a player's exact match performance up to currentBallIdx
  const getPlayerMatchSummaryText = (shortName: string, lang: "en" | "hi"): string => {
    const allBatters = [...fullScorecards[1].batters, ...fullScorecards[2].batters];
    const allBowlers = [...fullScorecards[1].bowlers, ...fullScorecards[2].bowlers];

    const batRow = allBatters.find((b) => b.name === shortName);
    const bowlRow = allBowlers.find((b) => b.name === shortName);

    const parts: string[] = [];
    if (batRow && batRow.status !== "dnb") {
      if (lang === "en") {
        parts.push(
          `In this match (${batRow.status === "out" ? `OUT: ${batRow.dismissalText}` : "NOT OUT*"}): **${batRow.runs}${
            batRow.status === "batting" ? "*" : ""
          } runs off ${batRow.balls} balls** (${batRow.fours}x4, ${batRow.sixes}x6, SR ${batRow.sr}).`
        );
      } else {
        parts.push(
          `इस मैच में प्रदर्शन (${batRow.status === "out" ? `आउट: ${batRow.dismissalText}` : "नाबाद*"}): **${batRow.balls} गेंदों में ${
            batRow.runs
          }${batRow.status === "batting" ? "*" : ""} रन** (${batRow.fours} चौके, ${batRow.sixes} छक्के, SR ${batRow.sr})।`
        );
      }
    }
    if (bowlRow && bowlRow.balls > 0) {
      if (lang === "en") {
        parts.push(
          `Bowling in this match: **${bowlRow.overs} overs, ${bowlRow.runs} runs, ${bowlRow.wickets} wicket(s)** (Econ ${bowlRow.econ}, ${bowlRow.dots} dots).`
        );
      } else {
        parts.push(
          `इस मैच में गेंदबाजी: **${bowlRow.overs} ओवर में ${bowlRow.runs} रन देकर ${bowlRow.wickets} विकेट** (इकॉनमी ${bowlRow.econ})।`
        );
      }
    }
    return parts.join(" ");
  };

  // Ask MatchMemo Handler: Calls Same-Origin /api/ask-ai FIRST (Zero CORS on Vercel!)
  const handleAskMatchMemo = async (questionText: string) => {
    const q = questionText.trim();
    if (!q) return;
    setCustomQuestion(q);
    setAiLoading(true);
    const startTime = performance.now();

    // Build rich Full-Scorecard Context for both innings so Groq knows every batter & bowler's exact match score!
    const inn1BatSummary = fullScorecards[1].batters
      .filter((b) => b.status !== "dnb")
      .map((b) => `${b.name}: ${b.runs}${b.status === "batting" ? "*" : ""}(${b.balls}b, ${b.fours}x4, ${b.sixes}x6, ${b.dismissalText})`)
      .join(", ");
    const inn1BowlSummary = fullScorecards[1].bowlers
      .map((bw) => `${bw.name}: ${bw.overs}-${bw.runs}-${bw.wickets} (Econ ${bw.econ})`)
      .join(", ");

    const inn2BatSummary =
      matchState.innings === 2
        ? fullScorecards[2].batters
            .filter((b) => b.status !== "dnb")
            .map((b) => `${b.name}: ${b.runs}${b.status === "batting" ? "*" : ""}(${b.balls}b, ${b.fours}x4, ${b.sixes}x6, ${b.dismissalText})`)
            .join(", ")
        : "Yet to bat";

    const contextSummary = `CURRENT LIVE SCORE: ${matchState.teamBatting} ${matchState.totalRuns}/${matchState.totalWickets} in ${matchState.oversDisplay} overs (Innings ${matchState.innings}).
1ST INNINGS (INDIA ${fullScorecards[1].totalRuns}/${fullScorecards[1].totalWickets} in ${fullScorecards[1].oversDisplay} ov) BATTING: ${inn1BatSummary}. AUS BOWLING: ${inn1BowlSummary}.
2ND INNINGS (AUSTRALIA ${fullScorecards[2].totalRuns}/${fullScorecards[2].totalWickets} in ${fullScorecards[2].oversDisplay} ov) BATTING: ${inn2BatSummary}.
MISSED WINDOW: ${matchMemoData.missedCount} balls (+${matchMemoData.runsAdded}R, ${matchMemoData.wicketsFallen.length}W).`;

    if (!simulateOutage) {
      // 1. Try Same-Origin Next.js API Route (/api/ask-ai) -> Works on Vercel & Localhost with ZERO CORS!
      try {
        const sameOriginRes = await fetch("/api/ask-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            language: memoLang,
            match_context: contextSummary,
          }),
        });
        if (sameOriginRes.ok) {
          const data = await sameOriginRes.json();
          const elapsed = Math.round(performance.now() - startTime);
          if (data.answer) {
            setAiResponse(data.answer);
            setAiSource(data.source || "groq-llm");
            setBackendOnline(true);
            setTelemetryLog({
              latencyMs: elapsed,
              provider: data.source || "groq-llm",
              guardrailStatus: data.allowed === false ? "BLOCKED" : "PASS",
              fallbackTriggered: false,
              timestamp: new Date().toISOString(),
              lastQuestion: q,
            });
            setAiLoading(false);
            return;
          }
        }
      } catch {
        // Proceed to direct backend check if needed
      }

      // 2. Secondary Check: Direct FastAPI URL (for local development if needed)
      try {
        const res = await fetch(`${API_BASE}/matches/ind-aus-thriller/ask-ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            language: memoLang,
            match_context: contextSummary,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const elapsed = Math.round(performance.now() - startTime);
          if (data.answer) {
            setAiResponse(data.answer);
            setAiSource(data.source || "groq-llm");
            setBackendOnline(true);
            setTelemetryLog({
              latencyMs: elapsed,
              provider: data.source || "groq-llm",
              guardrailStatus: data.allowed === false ? "BLOCKED" : "PASS",
              fallbackTriggered: data.source === "d11-intelligence-engine",
              timestamp: new Date().toISOString(),
              lastQuestion: q,
            });
            setAiLoading(false);
            return;
          }
        }
      } catch {
        // Gracefully degrade to deterministic match + career engine below
      }
    }

    const elapsed = Math.max(1, Math.round(performance.now() - startTime));
    const qLower = q.toLowerCase();
    const hasAllowedTopic = ALLOWED_KEYWORDS.some((kw) => qLower.includes(kw));

    if (!hasAllowedTopic) {
      setAiSource("guardrail-engine");
      setTelemetryLog({
        latencyMs: elapsed,
        provider: "d11-deterministic-guardrail",
        guardrailStatus: "BLOCKED",
        fallbackTriggered: false,
        timestamp: new Date().toISOString(),
        lastQuestion: q,
      });
      setAiResponse(
        memoLang === "en"
          ? "🚫 MatchMemo Guardrail: I can only answer questions related to Cricket, the India vs Australia teams, or the match and career stats of the participating players!"
          : "🚫 MatchMemo Guardrail: मैं केवल भारत बनाम ऑस्ट्रेलिया (IND vs AUS) मैच और इसमें खेल रहे खिलाड़ियों के स्कोर व करियर आँकड़ों से जुड़े सवालों के जवाब दे सकता हूँ!"
      );
      setAiLoading(false);
      return;
    }

    // Match + Career Hybrid Player Lookup (Answers BOTH current match score AND career stats!)
    for (const [key, profile] of Object.entries(PLAYER_CAREER_PROFILES)) {
      if (qLower.includes(key)) {
        const matchPerf = getPlayerMatchSummaryText(profile.shortName, memoLang);
        setAiSource(simulateOutage ? "fde-failover-cache" : "d11-player-match-intel");
        setTelemetryLog({
          latencyMs: elapsed,
          provider: simulateOutage ? "fde-failover-engine (0ms SLA)" : "d11-player-match-intel",
          guardrailStatus: "PASS",
          fallbackTriggered: simulateOutage,
          timestamp: new Date().toISOString(),
          lastQuestion: q,
        });
        const baseBio = memoLang === "en" ? profile.statsEn : profile.statsHi;
        setAiResponse(matchPerf ? `📊 **Match Scorecard:** ${matchPerf}\n\n${baseBio}` : baseBio);
        setAiLoading(false);
        return;
      }
    }

    setAiSource(simulateOutage ? "fde-deterministic-failover" : "d11-match-intelligence");
    setTelemetryLog({
      latencyMs: elapsed,
      provider: simulateOutage ? "fde-deterministic-failover" : "d11-match-intelligence",
      guardrailStatus: "PASS",
      fallbackTriggered: true,
      timestamp: new Date().toISOString(),
      lastQuestion: q,
    });
    setAiResponse(
      memoLang === "en"
        ? `🏏 Live Match Intel (${matchState.teamBattingShort} ${matchState.totalRuns}/${matchState.totalWickets} in ${matchState.oversDisplay} ov): ${matchMemoData.detailedRecapEn}`
        : `🏏 लाइव मैच विश्लेषण (${matchState.teamBattingShort} ${matchState.totalRuns}/${matchState.totalWickets}, ${matchState.oversDisplay} ओवर): ${matchMemoData.detailedRecapHi}`
    );
    setAiLoading(false);
  };

  const applyMultiplier = (pts: number) => {
    if (fantasyBooster === "2x") return pts * 2;
    if (fantasyBooster === "1.5x") return Math.round(pts * 1.5);
    return pts;
  };

  // COMPLETE BALL-1-TO-CURRENT-BALL SCORECARD COMPONENT (INNINGS 1 & INNINGS 2)
  const renderFullMatchScorecard = () => {
    const activeCard = fullScorecards[scorecardInningsTab];

    return (
      <section className="rounded-[4px] border border-[var(--border-strong)] bg-[var(--surface-primary)] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3.5 py-2.5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#E53945]">
              📋 COMPLETE MATCH SCORECARD (BALL 1 → CURRENT BALL)
            </div>
            <h3 className="text-xs sm:text-sm font-bold uppercase">
              ALL BATTERS, DISMISSALS, FALL OF WICKETS &amp; BOWLING SPELLS
            </h3>
          </div>

          {/* Switch between Innings 1 (IND) and Innings 2 (AUS) anytime! */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setScorecardInningsTab(1)}
              className={`inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-[11px] font-bold uppercase border transition ${
                scorecardInningsTab === 1
                  ? "border-[#E53945] bg-[#E53945] text-white"
                  : "border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)]"
              }`}
            >
              <FlagIND className="h-3 w-4" />
              <span>
                1ST INN: IND ({fullScorecards[1].totalRuns}/{fullScorecards[1].totalWickets})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setScorecardInningsTab(2)}
              className={`inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-[11px] font-bold uppercase border transition ${
                scorecardInningsTab === 2
                  ? "border-[#E53945] bg-[#E53945] text-white"
                  : "border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)]"
              }`}
            >
              <FlagAUS className="h-3 w-4" />
              <span>
                2ND INN: AUS (
                {matchState.innings === 2
                  ? `${fullScorecards[2].totalRuns}/${fullScorecards[2].totalWickets}`
                  : "YET TO BAT"}
                )
              </span>
            </button>
          </div>
        </div>

        {scorecardInningsTab === 2 && matchState.innings === 1 ? (
          <div className="p-5 text-center text-xs text-[var(--text-secondary)]">
            🇦🇺 Australia&apos;s 2nd Innings chase begins after India completes 20 overs (205/5). Click{" "}
            <button
              type="button"
              onClick={() => handleSwitchInningsLive(2)}
              className="font-bold text-[#E53945] underline"
            >
              Jump to 2nd Innings
            </button>{" "}
            to simulate Australia&apos;s chase now!
          </div>
        ) : (
          <div>
            {/* Innings Summary Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3.5 py-2 text-xs font-bold uppercase bg-[var(--surface-primary)]">
              <span>
                {activeCard.teamName} INNINGS ({activeCard.oversDisplay} OVERS)
              </span>
              <span className="tabular-nums text-sm text-[#E53945]">
                {activeCard.totalRuns}/{activeCard.totalWickets} (CRR: {activeCard.crr})
              </span>
            </div>

            {/* Full Batting Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[10px] font-bold uppercase text-[var(--text-muted)]">
                    <th className="py-2 pl-3 pr-2">BATTER</th>
                    <th className="py-2 px-2">STATUS / DISMISSAL</th>
                    <th className="py-2 px-1.5 text-right">R</th>
                    <th className="py-2 px-1.5 text-right">B</th>
                    <th className="py-2 px-1.5 text-right">4s</th>
                    <th className="py-2 px-1.5 text-right">6s</th>
                    <th className="py-2 pl-1.5 pr-3 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {activeCard.batters.map((b) => (
                    <tr
                      key={b.name}
                      className={
                        b.status === "batting"
                          ? "bg-[#E53945]/8"
                          : b.status === "dnb"
                          ? "opacity-55"
                          : ""
                      }
                    >
                      <td className="py-2 pl-3 pr-2 font-bold whitespace-nowrap">
                        {b.name}{" "}
                        {b.status === "batting" && (
                          <span className="text-[#E53945]">{b.isStriker ? "*" : ""}</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-[11px] text-[var(--text-secondary)]">
                        {b.status === "out" ? (
                          <span className="text-[#E53945] font-medium">{b.dismissalText}</span>
                        ) : b.status === "batting" ? (
                          <span className="text-[#3B82F6] font-bold uppercase">batting</span>
                        ) : (
                          <span>yet to bat</span>
                        )}
                      </td>
                      <td className="py-2 px-1.5 text-right font-bold">
                        {b.status === "dnb" ? "-" : b.runs}
                      </td>
                      <td className="py-2 px-1.5 text-right text-[var(--text-secondary)]">
                        {b.status === "dnb" ? "-" : b.balls}
                      </td>
                      <td className="py-2 px-1.5 text-right text-[var(--text-secondary)]">
                        {b.status === "dnb" ? "-" : b.fours}
                      </td>
                      <td className="py-2 px-1.5 text-right text-[var(--text-secondary)]">
                        {b.status === "dnb" ? "-" : b.sixes}
                      </td>
                      <td className="py-2 pl-1.5 pr-3 text-right font-semibold">
                        {b.status === "dnb" ? "-" : b.sr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fall of Wickets Strip */}
            {activeCard.fallOfWickets.length > 0 && (
              <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3.5 py-2 text-[11px]">
                <span className="font-bold uppercase text-[#E53945] mr-1.5">
                  🚨 FALL OF WICKETS:
                </span>
                <span className="text-[var(--text-secondary)]">
                  {activeCard.fallOfWickets
                    .map((f) => `${f.score} (${f.player}, ${f.over} ov)`)
                    .join(" • ")}
                </span>
              </div>
            )}

            {/* Full Bowling Table */}
            <div className="border-t border-[var(--border-subtle)] overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[10px] font-bold uppercase text-[var(--text-muted)]">
                    <th className="py-2 pl-3 pr-2">BOWLER</th>
                    <th className="py-2 px-1.5 text-right">O</th>
                    <th className="py-2 px-1.5 text-right">DOTS</th>
                    <th className="py-2 px-1.5 text-right">R</th>
                    <th className="py-2 px-1.5 text-right">W</th>
                    <th className="py-2 pl-1.5 pr-3 text-right">ECON</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {activeCard.bowlers.map((bw) => (
                    <tr key={bw.name}>
                      <td className="py-2 pl-3 pr-2 font-bold">{bw.name}</td>
                      <td className="py-2 px-1.5 text-right">{bw.overs}</td>
                      <td className="py-2 px-1.5 text-right text-[var(--text-secondary)]">{bw.dots}</td>
                      <td className="py-2 px-1.5 text-right">{bw.runs}</td>
                      <td className="py-2 px-1.5 text-right font-bold text-[#E53945]">{bw.wickets}</td>
                      <td className="py-2 pl-1.5 pr-3 text-right font-semibold">{bw.econ}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderFantasyImpactSection = () => {
    if (!fantasyMode) return null;
    const maxPts = Math.max(1, ...(matchMemoData.fantasyLeaderboard.map((p) => p.points) || [40]));

    return (
      <div
        key={fantasyAnimKey}
        className="animate-fantasy-card rounded-[4px] border-2 border-[#FACC15]/70 bg-gradient-to-b from-[#FACC15]/12 to-[var(--bg-secondary)] p-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🏆</span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#FACC15]">
                DREAM11 FANTASY POINTS RECAP
              </div>
              <div className="text-xs font-bold uppercase text-[var(--text-primary)]">
                {matchMemoData.missedCount > 0
                  ? `MISSED WINDOW IMPACT (${matchMemoData.missedCount} BALLS)`
                  : "RECENT PHASE FANTASY LEADERS"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-[3px] border border-[var(--border-strong)] bg-[var(--surface-primary)] p-0.5">
            {(
              [
                { id: "1x", label: "1X BASE" },
                { id: "1.5x", label: "1.5X VC" },
                { id: "2x", label: "2X CAPT" },
              ] as const
            ).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setFantasyBooster(b.id)}
                className={`rounded-[2px] px-2 py-0.5 text-[10px] font-bold uppercase transition ${
                  fantasyBooster === b.id
                    ? "bg-[#E53945] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {matchMemoData.fantasyLeaderboard.map((item, idx) => {
            const boostedPts = applyMultiplier(item.points);
            const widthPct = Math.min(100, Math.max(18, Math.round((item.points / maxPts) * 100)));
            return (
              <div
                key={item.player}
                style={{ animationDelay: `${idx * 75}ms` }}
                className="animate-fantasy-card rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{item.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold uppercase truncate">
                          {item.player}
                        </span>
                        <span className="rounded-[2px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--text-muted)]">
                          {item.roleBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        {memoLang === "en" ? item.breakdownEn : item.breakdownHi}
                      </p>
                    </div>
                  </div>

                  <div className="animate-pts-glow shrink-0 rounded-[3px] bg-[#E53945] px-2.5 py-1 text-right tabular-nums text-white">
                    <div className="text-xs sm:text-sm font-bold leading-none">
                      +{boostedPts} PTS
                    </div>
                    {fantasyBooster !== "1x" && (
                      <div className="text-[9px] font-bold uppercase opacity-90 mt-0.5">
                        {fantasyBooster} APPLIED
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-[2px] bg-[var(--bg-secondary)]">
                  <div
                    style={{ width: `${widthPct}%` }}
                    className="h-full bg-gradient-to-r from-[#E53945] to-[#FACC15] transition-all duration-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFdeTelemetryPanel = () => {
    if (!fdeMode) return null;

    const structuredPayload = {
      schema_version: "d11.matchmemo.v2",
      match_id: "ind-aus-thriller",
      innings: matchState.innings,
      checkpoint_slice: {
        from_event_id: matchMemoData.fromIdx,
        to_event_id: matchMemoData.toIdx,
        missed_deliveries: matchMemoData.missedCount,
      },
      deterministic_truth: {
        score_before: matchMemoData.beforeScore,
        score_now: matchMemoData.currentScore,
        runs_delta: matchMemoData.runsAdded,
        wickets_delta: matchMemoData.wicketsFallen.length,
        top_fantasy_mvp: matchMemoData.fantasyLeaderboard[0]
          ? `${matchMemoData.fantasyLeaderboard[0].player} (+${matchMemoData.fantasyLeaderboard[0].points} pts)`
          : "N/A",
      },
      observability: {
        active_provider: simulateOutage ? "fde-deterministic-failover" : telemetryLog.provider,
        last_latency_ms: telemetryLog.latencyMs,
        guardrail_state: telemetryLog.guardrailStatus,
        zero_hallucination_lock: true,
      },
    };

    return (
      <section className="mt-3 rounded-[4px] border-2 border-[#3B82F6] bg-[#14171C] text-[#F4F5F7] p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#3B82F6] animate-pulse" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#3B82F6]">
                🛠️ FORWARD DEPLOYED ENGINEER (FDE) TELEMETRY &amp; PIPELINE INSPECTOR
              </div>
              <p className="text-xs text-[#C6CBD2]">
                Deterministic Python/TS math computes truth; LLM explains narrative with zero-downtime failover.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSimulateOutage(!simulateOutage)}
              className={`rounded-[3px] px-3 py-1.5 text-[11px] font-bold uppercase border transition ${
                simulateOutage
                  ? "border-[#E53945] bg-[#E53945] text-white"
                  : "border-white/25 bg-white/5 text-[#C6CBD2] hover:border-white/50"
              }`}
            >
              {simulateOutage
                ? "🚨 LLM OUTAGE SIMULATED (FAILOVER ACTIVE)"
                : "⚡ SIMULATE LLM API OUTAGE (CHAOS TEST)"}
            </button>
            <button
              type="button"
              onClick={() => setFdeMode(false)}
              className="rounded-[3px] border border-white/20 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold uppercase text-[#C6CBD2]"
            >
              HIDE ✕
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-4 tabular-nums">
          <div className="rounded-[4px] border border-white/10 bg-black/40 p-2.5">
            <div className="text-[10px] font-bold uppercase text-[#9299A3]">PIPELINE LATENCY</div>
            <div className="mt-1 text-lg font-bold text-[#3B82F6]">{telemetryLog.latencyMs} ms</div>
            <div className="text-[10px] text-[#C6CBD2]">SLA Target: &lt;1500ms</div>
          </div>
          <div className="rounded-[4px] border border-white/10 bg-black/40 p-2.5">
            <div className="text-[10px] font-bold uppercase text-[#9299A3]">INFERENCE ROUTER</div>
            <div className="mt-1 text-xs font-bold uppercase text-white truncate">
              {simulateOutage ? "DETERMINISTIC FAILOVER" : telemetryLog.provider}
            </div>
            <div className="text-[10px] text-[#C6CBD2]">
              {simulateOutage ? "100% Uptime Guaranteed" : "Dynamic Waterfall Active"}
            </div>
          </div>
          <div className="rounded-[4px] border border-white/10 bg-black/40 p-2.5">
            <div className="text-[10px] font-bold uppercase text-[#9299A3]">DOMAIN GUARDRAIL</div>
            <div
              className={`mt-1 text-sm font-bold uppercase ${
                telemetryLog.guardrailStatus === "BLOCKED" ? "text-[#E53945]" : "text-[#FACC15]"
              }`}
            >
              {telemetryLog.guardrailStatus}
            </div>
            <div className="text-[10px] text-[#C6CBD2]">Scope: IND/AUS Squad Only</div>
          </div>
          <div className="rounded-[4px] border border-white/10 bg-black/40 p-2.5">
            <div className="text-[10px] font-bold uppercase text-[#9299A3]">EVENT DIFF SLICE</div>
            <div className="mt-1 text-sm font-bold text-white">
              #{matchMemoData.fromIdx} → #{matchMemoData.toIdx} ({matchMemoData.missedCount} balls)
            </div>
            <div className="text-[10px] text-[#C6CBD2]">Zero Hallucination Math</div>
          </div>
        </div>

        <div className="mt-3 rounded-[4px] border border-white/10 bg-black/60 p-3">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#3B82F6] mb-1.5">
            <span>LIVE STRUCTURED CONTEXT PAYLOAD (INJECTED INTO LLM)</span>
            <span>READ-ONLY TELEMETRY</span>
          </div>
          <pre className="text-[11px] leading-relaxed text-[#C6CBD2] overflow-x-auto tabular-nums">
            {JSON.stringify(structuredPayload, null, 2)}
          </pre>
        </div>
      </section>
    );
  };

  const renderWormGraph = () => {
    const width = 560;
    const height = 230;
    const padL = 38;
    const padR = 18;
    const padT = 18;
    const padB = 30;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const toX = (overFloat: number) => padL + (overFloat / 20) * plotW;
    const toY = (runs: number) => padT + plotH - (Math.min(215, runs) / 215) * plotH;

    const indPath = matchState.indWormPoints
      .map((pt, i) => `${i === 0 ? "M" : "L"}${toX(pt.overFloat).toFixed(1)},${toY(pt.runs).toFixed(1)}`)
      .join(" ");

    const ausPath =
      matchState.innings === 2
        ? matchState.ausWormPoints
            .map((pt, i) => `${i === 0 ? "M" : "L"}${toX(pt.overFloat).toFixed(1)},${toY(pt.runs).toFixed(1)}`)
            .join(" ")
        : "";

    const indWickets = matchState.indWormPoints.filter((p) => p.isWicket);
    const ausWickets = matchState.ausWormPoints.filter((p) => p.isWicket);

    return (
      <div className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#E53945]">
              📈 LIVE MATCH TIMELINE &amp; WORM GRAPH (0–20 OVERS)
            </div>
            <h3 className="text-sm font-bold uppercase">
              CUMULATIVE RUNS (0–205) &amp; WICKET DOTS
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 text-[#3B82F6]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6] inline-block" />
              🇮🇳 IND (1st Inn)
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#FACC15]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FACC15] inline-block" />
              🇦🇺 AUS (2nd Inn Overlap)
            </span>
          </div>
        </div>

        <div className="mt-3 w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block select-none">
            {[0, 50, 100, 150, 205].map((rVal) => {
              const y = toY(rVal);
              return (
                <g key={rVal}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={width - padR}
                    y2={y}
                    stroke="currentColor"
                    className="text-[var(--border-subtle)]"
                    strokeDasharray={rVal === 205 ? "3 3" : "none"}
                    strokeWidth="1"
                  />
                  <text
                    x={padL - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-[var(--text-muted)] text-[10px] font-bold"
                  >
                    {rVal}
                  </text>
                </g>
              );
            })}

            {[0, 5, 10, 15, 20].map((ovVal) => {
              const x = toX(ovVal);
              return (
                <g key={ovVal}>
                  <line
                    x1={x}
                    y1={padT}
                    x2={x}
                    y2={height - padB}
                    stroke="currentColor"
                    className="text-[var(--border-subtle)]"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={height - 10}
                    textAnchor="middle"
                    className="fill-[var(--text-muted)] text-[10px] font-bold"
                  >
                    {ovVal} ov
                  </text>
                </g>
              );
            })}

            <path
              d={indPath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {matchState.innings === 2 && ausPath && (
              <path
                d={ausPath}
                fill="none"
                stroke="#FACC15"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {indWickets.map((w, i) => (
              <circle
                key={`ind-w-${i}`}
                cx={toX(w.overFloat)}
                cy={toY(w.runs)}
                r="4.2"
                fill="#E53945"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              >
                <title>{`IND Wicket: ${w.label}`}</title>
              </circle>
            ))}

            {matchState.innings === 2 &&
              ausWickets.map((w, i) => (
                <circle
                  key={`aus-w-${i}`}
                  cx={toX(w.overFloat)}
                  cy={toY(w.runs)}
                  r="4.5"
                  fill="#FACC15"
                  stroke="#E53945"
                  strokeWidth="2"
                >
                  <title>{`AUS Wicket: ${w.label}`}</title>
                </circle>
              ))}
          </svg>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
          <span>🔴 Red/Gold Dots = Wickets fallen • Graph advances live with every ball</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSwitchInningsLive(1)}
              className={`rounded-[3px] px-2 py-0.5 text-[10px] font-bold uppercase border ${
                matchState.innings === 1
                  ? "border-[#3B82F6] bg-[#3B82F6]/20 text-[#3B82F6]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
              }`}
            >
              🇮🇳 View 1st Inn
            </button>
            <button
              type="button"
              onClick={() => handleSwitchInningsLive(2)}
              className={`rounded-[3px] px-2 py-0.5 text-[10px] font-bold uppercase border ${
                matchState.innings === 2
                  ? "border-[#FACC15] bg-[#FACC15]/20 text-[#FACC15]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
              }`}
            >
              🇦🇺 View 2nd Inn Overlap
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMatchMemoPanel = () => (
    <section className="rounded-[4px] border-2 border-[#E53945] bg-[var(--surface-primary)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[#E53945]/12 px-3.5 py-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#E53945]">
            ⚡ MATCHMEMO • AI RETURN CATCH-UP
          </div>
          <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight">
            NEVER MISS THE STORY OF A MATCH
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setFantasyMode(!fantasyMode);
              setFantasyAnimKey((k) => k + 1);
            }}
            className={`rounded-[4px] border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
              fantasyMode
                ? "border-[#FACC15] bg-[#FACC15] text-[#191B20] shadow-[0_0_12px_rgba(250,204,21,0.4)]"
                : "border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
            }`}
          >
            🏆 FANTASY MODE {fantasyMode ? "ON" : "OFF"}
          </button>

          <div className="flex rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-secondary)] p-0.5">
            <button
              type="button"
              onClick={() => setMemoLang("en")}
              className={`rounded-[3px] px-2 py-1 text-[10px] font-bold uppercase ${
                memoLang === "en" ? "bg-[#E53945] text-white" : "text-[var(--text-secondary)]"
              }`}
            >
              ENG
            </button>
            <button
              type="button"
              onClick={() => setMemoLang("hi")}
              className={`rounded-[3px] px-2 py-1 text-[10px] font-bold uppercase ${
                memoLang === "hi" ? "bg-[#E53945] text-white" : "text-[var(--text-secondary)]"
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>
      </div>

      <div className="p-3.5 sm:p-4 space-y-3.5">
        <div className="grid grid-cols-2 gap-2 tabular-nums">
          <div className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2.5">
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
              OFFLINE AT ({matchMemoData.beforeOvers} OV)
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold">{matchMemoData.beforeScore}</div>
          </div>
          <div className="rounded-[4px] border border-[#E53945]/50 bg-[#E53945]/10 p-2.5">
            <div className="text-[10px] font-bold uppercase text-[#E53945]">
              NOW LIVE ({matchMemoData.currentOvers} OV)
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold">
              {matchMemoData.currentScore}{" "}
              <span className="text-xs text-[#E53945] block sm:inline">
                (+{matchMemoData.runsAdded}R, {matchMemoData.wicketsFallen.length}W)
              </span>
            </div>
          </div>
        </div>

        {renderFantasyImpactSection()}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMemoDepth("quick")}
            className={`rounded-[4px] py-2 text-xs font-bold uppercase tracking-wider border ${
              memoDepth === "quick"
                ? "bg-[#E53945] border-[#E53945] text-white"
                : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            ⚡ QUICK RECAP (15S)
          </button>
          <button
            type="button"
            onClick={() => setMemoDepth("detailed")}
            className={`rounded-[4px] py-2 text-xs font-bold uppercase tracking-wider border ${
              memoDepth === "detailed"
                ? "bg-[#E53945] border-[#E53945] text-white"
                : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            📖 DETAILED RECAP (30S)
          </button>
        </div>

        <div className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 text-xs sm:text-sm leading-relaxed">
          {memoLang === "en"
            ? memoDepth === "quick"
              ? matchMemoData.quickRecapEn
              : matchMemoData.detailedRecapEn
            : memoDepth === "quick"
            ? matchMemoData.quickRecapHi
            : matchMemoData.detailedRecapHi}
        </div>

        <div className="rounded-[4px] border-l-4 border-l-[#E53945] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#E53945]">
            {memoLang === "en" ? "🔥 BIGGEST TURNING POINT" : "🔥 मैच का सबसे बड़ा टर्निंग पॉइंट"}
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
            {memoLang === "en" ? matchMemoData.turningPointEn : matchMemoData.turningPointHi}
          </p>
        </div>

        {/* ASK MATCHMEMO WITH FULL SCORECARD CONTEXT + GROQ + GUARDRAIL */}
        <div className="border-t border-[var(--border-subtle)] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#E53945]">
              🤖 ASK MATCHMEMO AI (MATCH SCORE &amp; CAREER INTEL)
            </span>
            <span className="text-[9px] uppercase font-bold text-[var(--text-muted)]">
              GUARDRAIL: IND/AUS ONLY
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              { labelEn: "🏏 Rohit score in this match?", labelHi: "🏏 इस मैच में रोहित का स्कोर?", q: "What is Rohit Sharma's score in this match and his T20I career record?" },
              { labelEn: "🎯 Bumrah bowling figures", labelHi: "🎯 बुमराह की गेंदबाजी", q: "What are Jasprit Bumrah's bowling figures in this match and career economy?" },
              { labelEn: "🚨 Travis Head record", labelHi: "🚨 ट्रेविस हेड का रिकॉर्ड", q: "Tell me about Travis Head's score in this match and T20I strike rate" },
              { labelEn: "📉 Why did momentum shift?", labelHi: "📉 मोमेंटम क्यों बदला?", q: "Why did the match momentum shift in the recent overs?" },
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAskMatchMemo(chip.q)}
                className="rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[#E53945] hover:text-[var(--text-primary)] transition"
              >
                {memoLang === "en" ? chip.labelEn : chip.labelHi}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskMatchMemo(customQuestion);
            }}
            className="mt-2.5 flex gap-1.5"
          >
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder={
                memoLang === "en"
                  ? "Ask Rohit score in this match, Bumrah, Head, Stoinis..."
                  : "इस मैच में रोहित का स्कोर, बुमराह, हेड के बारे में पूछें..."
              }
              className="flex-1 min-w-0 rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#E53945] focus:outline-none"
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="shrink-0 rounded-[4px] bg-[#E53945] px-3.5 py-2 text-xs font-bold uppercase text-white hover:bg-[#d32f3b] disabled:opacity-50"
            >
              {aiLoading ? "..." : "ASK ▶"}
            </button>
          </form>

          {aiResponse && (
            <div className="mt-2.5 rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-secondary)] p-3 text-xs leading-relaxed text-[var(--text-primary)] whitespace-pre-line">
              <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#E53945]">
                <span>
                  SOURCE: {aiSource.toUpperCase()} ({telemetryLog.latencyMs}ms)
                </span>
                <button
                  type="button"
                  onClick={() => setAiResponse("")}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  CLEAR ✕
                </button>
              </div>
              {aiResponse}
            </div>
          )}
        </div>
      </div>
    </section>
  );

  // ============================================================================
  // SCREEN 1: WELCOME SIMULATION SETUP LANDING SCREEN
  // ============================================================================
  if (screen === "setup") {
    const inningsOvers = overSummaries.filter((s) => s.innings === selectedInnings);
    const currentOverPreview =
      overSummaries.find((s) => s.innings === selectedInnings && s.overNumber === selectedStartOver) ||
      overSummaries[0];

    return (
      <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] px-3 py-4 sm:px-8 sm:py-6">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#E53945] text-xs font-bold tracking-wider text-white">
                D11
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold uppercase tracking-wider">D11</span>
                  <span className="rounded-[3px] border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                    MATCHMEMO + FANTASY ENGINE
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">Every ball matters.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] font-semibold uppercase">
                <span className={`h-2 w-2 rounded-[2px] ${backendOnline ? "bg-[#E53945]" : "bg-[#C6CBD2]"}`} />
                {backendOnline ? "AI ENGINE READY" : "LOCAL ENGINE"}
              </div>
              <button
                onClick={toggleTheme}
                className="rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] font-semibold uppercase"
              >
                {theme === "dark" ? "☀️ LIGHT" : "🌙 DARK"}
              </button>
            </div>
          </header>

          <section className="mt-4 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:p-7">
            <div className="border-b border-[var(--border-subtle)] pb-4">
              <div className="inline-flex items-center gap-2 rounded-[3px] bg-[#E53945]/15 border border-[#E53945]/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-[#E53945]">
                🏏 STEP 1 • START A LIVE MATCH SIMULATION FIRST
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <FlagIND className="h-6 w-9" />
                  <span className="text-xl sm:text-3xl font-bold uppercase">INDIA</span>
                </div>
                <span className="text-sm font-bold text-[#E53945] px-1">VS</span>
                <div className="flex items-center gap-2">
                  <FlagAUS className="h-6 w-9" />
                  <span className="text-xl sm:text-3xl font-bold uppercase">AUSTRALIA</span>
                </div>
              </div>
              <p className="mt-1.5 text-xs sm:text-sm text-[var(--text-secondary)]">
                Choose which innings you want to experience and slide the horizontal over bar to pick your exact starting over.
              </p>
            </div>

            <div className="mt-5">
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                1. CHOOSE INNINGS TO SIMULATE
              </label>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedInnings(1)}
                  className={`text-left rounded-[4px] border p-3.5 transition ${
                    selectedInnings === 1
                      ? "border-2 border-[#E53945] bg-[var(--surface-elevated)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase text-[#3B82F6]">
                      <FlagIND className="h-4 w-6" /> 1ST INNINGS • INDIA
                    </span>
                    <span className="tabular-nums text-xs font-bold text-[var(--text-secondary)]">
                      FINAL: 205/5
                    </span>
                  </div>
                  <p className="mt-1.5 text-base sm:text-lg font-bold uppercase">🇮🇳 INDIA BATTING (20 OVERS)</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    🔥 Rohit Sharma&apos;s explosive knock, SKY &amp; Dube six-hitting, and Hardik Pandya&apos;s death-overs blitz.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedInnings(2)}
                  className={`text-left rounded-[4px] border p-3.5 transition ${
                    selectedInnings === 2
                      ? "border-2 border-[#E53945] bg-[var(--surface-elevated)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase text-[#FACC15]">
                      <FlagAUS className="h-4 w-6" /> 2ND INNINGS • AUSTRALIA
                    </span>
                    <span className="tabular-nums text-xs font-bold text-[var(--text-secondary)]">
                      TARGET: 206
                    </span>
                  </div>
                  <p className="mt-1.5 text-base sm:text-lg font-bold uppercase">🇦🇺 AUSTRALIA CHASE (20 OVERS)</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    ⚡ Travis Head&apos;s counter-attack vs Kuldeep, Axar &amp; Bumrah&apos;s match-turning death spell (Worm Graph Overlaps India!).
                  </p>
                </button>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  2. SLIDE HORIZONTAL BAR TO PICK STARTING OVER (OVER 1 — OVER 20)
                </label>
                <span className="tabular-nums text-xs sm:text-sm font-bold text-[#E53945]">
                  STARTING AT: OVER {selectedStartOver + 1}.1
                </span>
              </div>

              <div className="mt-2.5">
                <input
                  type="range"
                  min={0}
                  max={19}
                  value={selectedStartOver}
                  onChange={(e) => setSelectedStartOver(Number(e.target.value))}
                  className="w-full accent-[#E53945] cursor-pointer h-2 bg-[var(--bg-secondary)] rounded-[2px]"
                />
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-2">
                {inningsOvers.map((ov) => {
                  const isSelected = ov.overNumber === selectedStartOver;
                  return (
                    <button
                      key={ov.overNumber}
                      type="button"
                      onClick={() => setSelectedStartOver(ov.overNumber)}
                      className={`shrink-0 rounded-[4px] border px-2.5 py-2 text-left transition min-w-[74px] ${
                        isSelected
                          ? "border-[#E53945] bg-[#E53945] text-white"
                          : "border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase">OV {ov.overNumber + 1}</div>
                      <div className="tabular-nums text-xs font-bold">{ov.scoreAfter}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-secondary)] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-xs font-bold uppercase text-[var(--text-secondary)]">
                    📍 OVER {selectedStartOver + 1} PREVIEW
                  </span>
                  <span className="tabular-nums rounded-[3px] bg-[#E53945] px-2 py-0.5 text-xs font-bold text-white">
                    SCORE AFTER OVER: {currentOverPreview.scoreAfter}
                  </span>
                </div>
                <p className="mt-2 text-xs sm:text-sm font-medium">{currentOverPreview.headlineEn}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-[var(--border-subtle)] pt-4">
              <button
                type="button"
                onClick={handleStartSimulation}
                className="w-full sm:w-auto rounded-[4px] bg-[#E53945] px-6 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white hover:bg-[#d32f3b]"
              >
                🚀 START LIVE SIMULATION (INNINGS {selectedInnings} • OVER {selectedStartOver + 1}.1) ▶
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // ============================================================================
  // SCREEN 2: LIVE MATCH DASHBOARD
  // ============================================================================
  const filteredCommentary = matchState.commentary.filter((c) => {
    if (commFilter === "wickets") return c.isWicket;
    if (commFilter === "boundaries") return c.isBoundary;
    return true;
  });

  return (
    <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] pb-12 overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-2.5 py-3 sm:px-6">
        {/* TOP HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-2 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#E53945] text-xs font-bold text-white">
              D11
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase">
                <FlagIND className="h-3.5 w-5" /> IND <span className="text-[#E53945]">vs</span>{" "}
                <FlagAUS className="h-3.5 w-5" /> AUS
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">Every ball matters.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {userOnline ? (
              <div className="flex items-center gap-1.5 rounded-[4px] border border-[#E53945] bg-[#E53945]/15 px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase text-[var(--text-primary)] shadow-[0_0_12px_rgba(229,57,69,0.35)]">
                <span className="h-2 w-2 rounded-full bg-[#E53945] animate-ping" />
                <span>USER LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase text-[#FACC15]">
                <span className="h-2 w-2 rounded-full bg-[#FACC15] animate-pulse" />
                <span>OFFLINE ({matchMemoData.missedCount} BALLS)</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setFdeMode(!fdeMode)}
              className={`rounded-[4px] border px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase transition ${
                fdeMode
                  ? "border-[#3B82F6] bg-[#3B82F6] text-white shadow-[0_0_12px_rgba(59,130,246,0.45)]"
                  : "border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              🛠️ FDE TELEMETRY
            </button>

            <button
              type="button"
              onClick={() => setScreen("setup")}
              className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              SETUP
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1 text-[10px] sm:text-xs font-bold uppercase"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        {renderFdeTelemetryPanel()}

        {/* SIMULATION CONTROLS DECK */}
        <section className="mt-2.5 rounded-[4px] border border-[var(--border-strong)] bg-[var(--surface-primary)] p-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#E53945]">
                  🎮 START SIMULATING THE MATCH FROM HERE
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] hidden sm:block">
                  Step ball-by-ball, switch between Innings 1 &amp; 2 anytime, or press <strong>GO OFFLINE</strong> to test MatchMemo.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSwitchInningsLive(1)}
                  className={`rounded-[3px] px-2 py-1 text-[10px] font-bold uppercase border ${
                    matchState.innings === 1
                      ? "border-[#E53945] bg-[#E53945] text-white"
                      : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                  }`}
                >
                  🇮🇳 1ST INN
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchInningsLive(2)}
                  className={`rounded-[3px] px-2 py-1 text-[10px] font-bold uppercase border ${
                    matchState.innings === 2
                      ? "border-[#E53945] bg-[#E53945] text-white"
                      : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                  }`}
                >
                  🇦🇺 2ND INN
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleStepBall("prev")}
                disabled={!userOnline}
                className="rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-bold uppercase text-[var(--text-primary)] active:scale-95 transition disabled:opacity-40"
              >
                ◀ PREV BALL
              </button>
              <button
                type="button"
                onClick={() => handleStepBall("next")}
                disabled={!userOnline}
                className="rounded-[4px] border border-[#E53945]/60 bg-[var(--bg-secondary)] px-3 py-2 text-xs font-bold uppercase text-[var(--text-primary)] active:scale-95 transition disabled:opacity-40"
              >
                NEXT BALL ▶
              </button>
              <button
                type="button"
                onClick={() => handleStepBall("over")}
                disabled={!userOnline}
                className="rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-bold uppercase text-[var(--text-primary)] active:scale-95 transition disabled:opacity-40"
              >
                +1 OVER ▶▶
              </button>

              {userOnline ? (
                <button
                  type="button"
                  onClick={handleGoOffline}
                  className="rounded-[4px] bg-[#34373D] border border-[#C6CBD2]/50 px-3 py-2 text-xs font-bold uppercase text-white hover:bg-[#E53945] active:scale-95 transition"
                >
                  📴 GO OFFLINE
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReturnOnline}
                  className="col-span-2 sm:col-span-1 rounded-[4px] bg-[#E53945] px-3.5 py-2 text-xs font-bold uppercase text-white shadow-[0_0_18px_rgba(229,57,69,0.5)] animate-pulse"
                >
                  ● BACK ONLINE — MATCHMEMO ({matchMemoData.missedCount} BALLS)
                </button>
              )}
            </div>
          </div>
        </section>

        {/* NAVIGATION TABS (INCLUDES FULL SCORECARD TAB FOR INNINGS 1 & 2) */}
        <nav className="mt-2.5 flex items-center overflow-x-auto whitespace-nowrap border-b border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2">
          {(
            [
              { id: "live", label: "🏏 LIVE CREASE" },
              { id: "fullcard", label: "📋 FULL SCORECARD (INN 1 & 2)" },
              { id: "matchmemo", label: `⚡ MATCHMEMO + 🏆 FANTASY (${matchMemoData.missedCount})` },
              { id: "momentum", label: "📈 WORM GRAPH" },
              { id: "timeline", label: "⏱️ 40-OVER JUMP" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`shrink-0 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                activeTab === t.id
                  ? "border-[#E53945] text-[#E53945]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* MAIN WORKSPACE */}
        <div className="mt-3 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3.5 min-w-0">
            {activeTab === "fullcard" && renderFullMatchScorecard()}
            {activeTab === "momentum" && renderWormGraph()}

            {activeTab === "timeline" && (
              <section className="rounded-[4px] border border-[#E53945] bg-[var(--surface-primary)] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase text-[#E53945]">
                    ⏱️ 40-OVER INSTANT JUMP BAR (TAP ANY OVER)
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSwitchInningsLive(1)}
                      className={`rounded-[3px] px-2.5 py-1 text-[10px] font-bold uppercase ${
                        matchState.innings === 1 ? "bg-[#E53945] text-white" : "bg-[var(--bg-secondary)]"
                      }`}
                    >
                      🇮🇳 INNINGS 1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchInningsLive(2)}
                      className={`rounded-[3px] px-2.5 py-1 text-[10px] font-bold uppercase ${
                        matchState.innings === 2 ? "bg-[#E53945] text-white" : "bg-[var(--bg-secondary)]"
                      }`}
                    >
                      🇦🇺 INNINGS 2
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 sm:grid-cols-10 gap-1.5">
                  {overSummaries
                    .filter((s) => s.innings === matchState.innings)
                    .map((ov) => (
                      <button
                        key={ov.overNumber}
                        type="button"
                        onClick={() => {
                          setCurrentBallIdx(ov.startBallIdx);
                          setActiveTab("live");
                        }}
                        className="rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2 text-center hover:border-[#E53945] tabular-nums"
                      >
                        <div className="text-[10px] font-bold text-[var(--text-muted)]">
                          OV {ov.overNumber + 1}
                        </div>
                        <div className="text-xs font-bold">{ov.scoreAfter}</div>
                      </button>
                    ))}
                </div>
              </section>
            )}

            {activeTab === "matchmemo" && <div className="lg:hidden">{renderMatchMemoPanel()}</div>}

            {/* MAIN LIVE CREASE SCORECARD */}
            <section
              key={lastStepPulse}
              className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-[10px] sm:text-xs font-bold uppercase text-[var(--text-secondary)]">
                <span>ICC MEN&apos;S T20 • INNINGS {matchState.innings}/2</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#E53945]">
                    {matchState.innings === 2 ? "🇮🇳 IND 1ST INN: 205/5 (20.0)" : "TARGET PROJECTION: 205"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === "fullcard" ? "live" : "fullcard")}
                    className="rounded-[3px] border border-[#E53945] bg-[#E53945]/15 px-2 py-0.5 text-[10px] font-bold uppercase text-[#E53945]"
                  >
                    {activeTab === "fullcard" ? "HIDE FULL CARD" : "📋 VIEW FULL SCORECARD"}
                  </button>
                </div>
              </div>

              <div className="p-3.5 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--text-muted)]">
                      {matchState.innings === 1 ? <FlagIND className="h-4 w-6" /> : <FlagAUS className="h-4 w-6" />}
                      <span>{matchState.teamBatting} INNINGS</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2.5">
                      <span className="text-xl sm:text-3xl font-bold uppercase">
                        {matchState.teamBattingShort}
                      </span>
                      <span className="tabular-nums text-3xl sm:text-5xl font-bold tracking-tight">
                        {matchState.totalRuns}/{matchState.totalWickets}
                      </span>
                      <span className="tabular-nums text-sm sm:text-lg font-semibold text-[var(--text-secondary)]">
                        ({matchState.oversDisplay} ov)
                      </span>
                    </div>
                    {matchState.innings === 2 && (
                      <div className="mt-1 text-xs font-bold text-[#FACC15]">
                        🇦🇺 Need {matchState.runsNeeded} runs in {matchState.ballsRemaining} balls • 🇮🇳 IND: 205/5
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-right tabular-nums w-full sm:w-auto">
                    <div className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1.5">
                      <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">CRR</div>
                      <div className="text-sm sm:text-base font-bold text-[#E53945]">{matchState.crr}</div>
                    </div>
                    <div className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1.5">
                      <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">LAST 5 OV</div>
                      <div className="text-sm sm:text-base font-bold">{matchState.last5Summary}</div>
                    </div>
                    <div className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1.5">
                      <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">
                        {matchState.innings === 2 ? "REQ RR" : "BALLS"}
                      </div>
                      <div className="text-sm sm:text-base font-bold">
                        {matchState.innings === 2 ? matchState.reqRate : `${matchState.legalBalls}/120`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs">
                  <span className="font-bold text-[#E53945] uppercase mr-1.5">
                    LAST BALL ({matchState.currentEvent.overLabel}):
                  </span>
                  <span className="text-[var(--text-primary)]">
                    {memoLang === "en"
                      ? matchState.currentEvent.commentaryEn
                      : matchState.currentEvent.commentaryHi}
                  </span>
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)] overflow-x-auto">
                <table className="w-full text-left text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[10px] font-bold uppercase text-[var(--text-muted)]">
                      <th className="py-2 pl-3 pr-2">ACTIVE CREASE BATTERS</th>
                      <th className="py-2 px-1.5 text-right">R</th>
                      <th className="py-2 px-1.5 text-right">B</th>
                      <th className="py-2 px-1.5 text-right">4s</th>
                      <th className="py-2 px-1.5 text-right">6s</th>
                      <th className="py-2 pl-1.5 pr-3 text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    <tr>
                      <td className="py-2 pl-3 pr-2 font-bold truncate max-w-[130px]">
                        🏏 {matchState.striker.name} <span className="text-[#E53945]">*</span>
                      </td>
                      <td className="py-2 px-1.5 text-right font-bold">{matchState.striker.runs}</td>
                      <td className="py-2 px-1.5 text-right text-[var(--text-secondary)]">{matchState.striker.balls}</td>
                      <td className="py-2 px-1.5 text-right text-[var(--text-secondary)]">{matchState.striker.fours}</td>
                      <td className="py-2 px-1.5 text-right text-[var(--text-secondary)]">{matchState.striker.sixes}</td>
                      <td className="py-2 pl-1.5 pr-3 text-right font-semibold">{matchState.striker.sr}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pl-3 pr-2 font-semibold text-[var(--text-secondary)] truncate max-w-[130px]">
                        {matchState.nonStriker.name}
                      </td>
                      <td className="py-2 px-1.5 text-right font-bold">{matchState.nonStriker.runs}</td>
                      <td className="py-2 px-1.5 text-right text-[var(--text-secondary)]">{matchState.nonStriker.balls}</td>
                      <td className="py-2 px-1.5 text-right text-[var(--text-secondary)]">{matchState.nonStriker.fours}</td>
                      <td className="py-2 px-1.5 text-right text-[var(--text-secondary)]">{matchState.nonStriker.sixes}</td>
                      <td className="py-2 pl-1.5 pr-3 text-right font-semibold">{matchState.nonStriker.sr}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs tabular-nums">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">🎯 BOWLER: </span>
                    <span className="font-bold">{matchState.bowler.name}</span>
                  </div>
                  <div className="font-semibold text-[var(--text-secondary)]">
                    {matchState.bowler.overs} OV • {matchState.bowler.runs} R •{" "}
                    <span className="text-[#E53945] font-bold">{matchState.bowler.wickets} W</span> • ECON{" "}
                    {matchState.bowler.econ}
                  </div>
                </div>
              </div>
            </section>

            {/* Always show the Full Ball-1-to-Current-Ball Scorecard right below the live crease card as well */}
            {activeTab !== "fullcard" && renderFullMatchScorecard()}

            <section className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase text-[var(--text-muted)]">
                <span>⏱️ RECENT DELIVERIES</span>
                <span className="tabular-nums">LAST {matchState.recentDeliveries.length} BALLS</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
                {matchState.recentDeliveries.map((b) => (
                  <div key={b.index} className="flex flex-col items-center shrink-0">
                    <div
                      className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-[3px] text-xs font-bold tabular-nums border ${
                        b.isWicket
                          ? "bg-[#E53945] border-[#E53945] text-white"
                          : b.isBoundary
                          ? "bg-[var(--surface-elevated)] border-[#C6CBD2] text-[var(--text-primary)]"
                          : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {b.badge}
                    </div>
                    <span className="mt-0.5 text-[9px] text-[var(--text-muted)] tabular-nums">
                      {b.overLabel}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {activeTab !== "momentum" && renderWormGraph()}

            <section className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3.5 py-2.5">
                <span className="text-xs font-bold uppercase">
                  🎙️ COMMENTARY ({memoLang === "en" ? "ENGLISH" : "हिंदी"})
                </span>
                <div className="flex items-center gap-1">
                  {(["all", "wickets", "boundaries"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setCommFilter(f)}
                      className={`rounded-[3px] px-2 py-1 text-[10px] font-bold uppercase ${
                        commFilter === f
                          ? "bg-[#E53945] text-white"
                          : "bg-[var(--surface-primary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[340px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
                {filteredCommentary.slice(0, 20).map((item) => (
                  <div key={item.index} className="flex items-start gap-2.5 p-3 text-xs">
                    <div className="flex flex-col items-center shrink-0 w-10">
                      <span className="tabular-nums font-bold text-[var(--text-secondary)]">
                        {item.overLabel}
                      </span>
                      <span
                        className={`mt-1 flex h-6 w-7 items-center justify-center rounded-[3px] font-bold tabular-nums ${
                          item.isWicket
                            ? "bg-[#E53945] text-white"
                            : item.isBoundary
                            ? "bg-[var(--surface-elevated)] border border-[#C6CBD2]"
                            : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[var(--text-primary)]">
                        {item.bowler} to {item.batter}
                      </div>
                      <p className="mt-0.5 text-[var(--text-secondary)] leading-relaxed break-words">
                        {memoLang === "en" ? item.commentaryEn : item.commentaryHi}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-4 min-w-0">{renderMatchMemoPanel()}</aside>
        </div>
      </div>

      {/* POPUP MODAL WHEN USER CLICKS "BACK ONLINE" */}
      {showMatchMemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4">
          <div className="w-full max-w-xl rounded-[4px] border-2 border-[#E53945] bg-[var(--surface-primary)] p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E53945] animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#E53945]">
                  ⚡ USER LIVE • MATCHMEMO + FANTASY CATCH-UP
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setFantasyMode(!fantasyMode);
                    setFantasyAnimKey((k) => k + 1);
                  }}
                  className={`rounded-[3px] px-2 py-1 text-[10px] font-bold uppercase ${
                    fantasyMode ? "bg-[#FACC15] text-[#191B20]" : "bg-[var(--bg-secondary)]"
                  }`}
                >
                  🏆 FANTASY {fantasyMode ? "ON" : "OFF"}
                </button>
                <button
                  type="button"
                  onClick={() => setMemoLang(memoLang === "en" ? "hi" : "en")}
                  className="rounded-[3px] border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] font-bold uppercase"
                >
                  {memoLang === "en" ? "हिंदी" : "ENG"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMatchMemoModal(false)}
                  className="rounded-[3px] bg-[#E53945] px-2.5 py-1 text-[10px] font-bold uppercase text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <h3 className="mt-3 text-lg sm:text-xl font-bold uppercase">
              {memoLang === "en"
                ? `👋 WELCOME BACK! YOU MISSED ${matchMemoData.missedCount} BALLS`
                : `👋 वापसी पर स्वागत है! आपने ${matchMemoData.missedCount} गेंदें मिस कीं`}
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-2.5 tabular-nums">
              <div className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2.5">
                <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
                  OFFLINE AT ({matchMemoData.beforeOvers} OV)
                </div>
                <div className="text-xl font-bold">{matchMemoData.beforeScore}</div>
              </div>
              <div className="rounded-[4px] border border-[#E53945] bg-[#E53945]/15 p-2.5">
                <div className="text-[10px] font-bold uppercase text-[#E53945]">
                  LIVE NOW ({matchMemoData.currentOvers} OV)
                </div>
                <div className="text-xl font-bold">
                  {matchMemoData.currentScore} (+{matchMemoData.runsAdded}R, {matchMemoData.wicketsFallen.length}W)
                </div>
              </div>
            </div>

            <div className="mt-3">{renderFantasyImpactSection()}</div>

            <div className="mt-3 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5 text-xs sm:text-sm leading-relaxed">
              {memoLang === "en" ? matchMemoData.detailedRecapEn : matchMemoData.detailedRecapHi}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMatchMemoModal(false)}
                className="w-full sm:w-auto rounded-[4px] bg-[#E53945] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
              >
                CONTINUE WATCHING LIVE MATCH ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}