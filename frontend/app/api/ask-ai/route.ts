import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_CRICKET_KEYWORDS = [
  "india", "australia", "ind", "aus", "match", "score", "over", "wicket", "run",
  "boundary", "four", "six", "ball", "pitch", "chase", "target", "innings", "crr",
  "rrr", "momentum", "partnership", "powerplay", "death", "spin", "pace", "yorker",
  "bouncer", "slower", "catch", "lbw", "bowled", "starc", "cummins", "hazlewood",
  "zampa", "stoinis", "head", "travis", "warner", "marsh", "maxwell", "david",
  "wade", "rohit", "sharma", "kohli", "virat", "pant", "rishabh", "surya", "sky",
  "yadav", "dube", "shivam", "hardik", "pandya", "jadeja", "axar", "patel",
  "kuldeep", "bumrah", "jasprit", "arshdeep", "singh", "career", "stats", "average",
  "strike rate", "century", "fifty", "world cup", "t20", "t20i", "ipl", "icc",
  "captain", "bowler", "batter", "batsman", "record", "history", "win", "lose",
  "fantasy", "points", "bowling", "batting", "strength", "weakness", "scored", "avg",
  "मैच", "रन", "विकेट", "ओवर", "भारत", "ऑस्ट्रेलिया", "रोहित", "कोहली", "बुमराह", "हेड"
];

const OFF_TOPIC_PATTERNS = [
  "recipe", "cook", "pasta", "pizza", "weather in", "stock market", "bitcoin",
  "crypto", "write a python", "write javascript", "leetcode", "president of",
  "prime minister", "movie", "bollywood", "actor", "song", "math homework", "calculus"
];

function resolveGroqApiKey(): string {
  const candidates = [
    process.env.GROQ_API_KEY,
    process.env.NEXT_PUBLIC_GROQ_API_KEY,
  ];
  for (const c of candidates) {
    const clean = (c || "").replace(/['"]/g, "").trim();
    if (clean && clean !== "gsk_your_new_key_here") return clean;
  }

  // Local dev fallback: read ../backend/.env or ./.env.local
  const envPaths = [
    path.resolve(process.cwd(), "..", "backend", ".env"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), ".env.local"),
  ];
  for (const p of envPaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf8");
        const match = content.match(/GROQ_API_KEY\s*=\s*([^\r\n#]+)/);
        if (match && match[1]) {
          const clean = match[1].replace(/['"]/g, "").trim();
          if (clean) return clean;
        }
      }
    } catch {
      // Ignore in serverless environment
    }
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const qClean = (body.question || "").trim();
    const qLower = qClean.toLowerCase();
    const language = body.language || "en";
    const matchContext = body.match_context || "";

    // 1. Deterministic Guardrail Check
    const isOffTopic = OFF_TOPIC_PATTERNS.some((bad) => qLower.includes(bad));
    const hasCricketSignal = ALLOWED_CRICKET_KEYWORDS.some((kw) => qLower.includes(kw));

    if (isOffTopic || (qClean.length > 3 && !hasCricketSignal)) {
      if (language === "hi") {
        return NextResponse.json({
          allowed: false,
          source: "guardrail",
          answer:
            "🚫 **MatchMemo Guardrail:** मैं केवल **भारत बनाम ऑस्ट्रेलिया (IND vs AUS)** मैच, क्रिकेट टैक्टिक्स, और इस मैच में खेल रहे खिलाड़ियों के स्कोर व करियर रिकॉर्ड्स से जुड़े सवालों के जवाब दे सकता हूँ।",
        });
      }
      return NextResponse.json({
        allowed: false,
        source: "guardrail",
        answer:
          "🚫 **MatchMemo Guardrail:** I am strictly scoped to this **India vs Australia** match, cricket tactics, and the match/career stats of the participating IND & AUS players. Please ask a cricket-related question!",
      });
    }

    // 2. Call Groq API using Same-Origin Server Route
    const apiKey = resolveGroqApiKey();
    const debugErrors: string[] = [];

    if (!apiKey) {
      debugErrors.push("GROQ_API_KEY is missing in Vercel Environment Variables");
    } else {
      const langInstruction =
        language === "hi"
          ? "Respond in engaging Cricket Hindi / Hinglish (2-4 sentences max) with relevant cricket emojis (🏏, 🔥, 🎯)."
          : "Respond in crisp, broadcast-grade English (2-4 sentences max) with relevant cricket emojis (🏏, 🔥, 🎯).";

      const systemPrompt = `You are MatchMemo AI inside D11 ("Every ball matters"), an expert live cricket analyst for this India vs Australia T20 World Cup clash.

STRICT RULES:
1. If the user asks about a player's score/wickets IN THIS MATCH, ALWAYS use the exact numbers from the LIVE MATCH & FULL SCORECARD CONTEXT below.
2. If the user asks about a player's career stats, bowling/batting average, strengths, IPL/T20I records, or matchups, provide their real-world T20/IPL career statistics AND mention their live match status.
3. Only answer questions related to Cricket, India vs Australia, or the 22 squad players.
4. ${langInstruction}

LIVE MATCH & FULL SCORECARD CONTEXT:
${matchContext}`;

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

      // Discover exact models enabled for this key on Groq
      let discoveredModels: string[] = [];
      try {
        const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
          headers,
          cache: "no-store",
        });
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          discoveredModels = (modelsData.data || [])
            .map((m: { id: string }) => m.id)
            .filter((id: string) => !id.includes("whisper"));
        } else {
          debugErrors.push(`models_endpoint_${modelsRes.status}`);
        }
      } catch (e) {
        debugErrors.push(`models_fetch_err_${String(e)}`);
      }

      // Combine discovered models with standard Groq chat models, prioritizing text/chat models
      const priorityOrder = [
        "allam-2-7b",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "gemma2-9b-it",
        "qwen-qwq-32b",
        "mistral-saba-24b",
        ...discoveredModels,
      ];
      const modelsToTry = Array.from(new Set(priorityOrder)).slice(0, 8);

      for (const modelName of modelsToTry) {
        try {
          const chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: modelName,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: qClean },
              ],
              temperature: 0.4,
              max_tokens: 220,
            }),
            cache: "no-store",
          });

          if (chatRes.ok) {
            const data = await chatRes.json();
            const answerText = data?.choices?.[0]?.message?.content;
            if (answerText && answerText.trim().length > 0) {
              return NextResponse.json({
                allowed: true,
                source: `groq-${modelName}`,
                answer: answerText.trim(),
              });
            }
          } else {
            debugErrors.push(`${modelName}:${chatRes.status}`);
          }
        } catch (err) {
          debugErrors.push(`${modelName}:err`);
        }
      }
    }

    // 3. Return 200 with fallback_needed: true so browser never hits 503 or CORS errors!
    return NextResponse.json({
      allowed: true,
      fallback_needed: true,
      debug_reason: debugErrors.join(", ") || "no_key_or_models",
    });
  } catch (err) {
    return NextResponse.json({
      allowed: true,
      fallback_needed: true,
      debug_reason: String(err),
    });
  }
}