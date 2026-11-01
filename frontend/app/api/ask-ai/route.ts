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
  "fantasy", "points", "bowling", "batting", "strength", "weakness", "scored",
  "मैच", "रन", "विकेट", "ओवर", "भारत", "ऑस्ट्रेलिया", "रोहित", "कोहली", "बुमराह", "हेड"
];

const OFF_TOPIC_PATTERNS = [
  "recipe", "cook", "pasta", "pizza", "weather in", "stock market", "bitcoin",
  "crypto", "write a python", "write javascript", "leetcode", "president of",
  "prime minister", "movie", "bollywood", "actor", "song", "math homework", "calculus"
];

// Automatically finds GROQ_API_KEY from Vercel Env OR local ../backend/.env
function resolveGroqApiKey(): string {
  const fromEnv = (process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || "")
    .replace(/['"]/g, "")
    .trim();
  if (fromEnv && fromEnv !== "gsk_your_new_key_here") return fromEnv;

  // Fallback for local dev: read ../backend/.env automatically so localhost always works!
  try {
    const backendEnvPath = path.resolve(process.cwd(), "..", "backend", ".env");
    if (fs.existsSync(backendEnvPath)) {
      const content = fs.readFileSync(backendEnvPath, "utf8");
      const match = content.match(/GROQ_API_KEY\s*=\s*([^\r\n#]+)/);
      if (match && match[1]) {
        return match[1].replace(/['"]/g, "").trim();
      }
    }
  } catch {
    // Ignore fs errors in serverless environments
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
            "🚫 **MatchMemo Guardrail:** मैं केवल **भारत बनाम ऑस्ट्रेलिया (IND vs AUS)** मैच, क्रिकेट टैक्टिक्स, और इस मैच में खेल रहे खिलाड़ियों के इस मैच के स्कोर व करियर रिकॉर्ड्स से जुड़े सवालों के जवाब दे सकता हूँ।",
        });
      }
      return NextResponse.json({
        allowed: false,
        source: "guardrail",
        answer:
          "🚫 **MatchMemo Guardrail:** I am strictly scoped to this **India vs Australia** match, cricket tactics, and the match/career stats of the participating IND & AUS players. Please ask a cricket-related question!",
      });
    }

    // 2. Call Groq API directly from Next.js Server (Same-Origin = Zero CORS Issues on Vercel!)
    const apiKey = resolveGroqApiKey();

    if (apiKey) {
      const langInstruction =
        language === "hi"
          ? "Respond in engaging Cricket Hindi / Hinglish (2-4 sentences max) with relevant cricket emojis (🏏, 🔥, 🎯)."
          : "Respond in crisp, broadcast-grade English (2-4 sentences max) with relevant cricket emojis (🏏, 🔥, 🎯).";

      const systemPrompt = `You are MatchMemo AI inside D11 ("Every ball matters"), an expert live cricket analyst for this India vs Australia T20 World Cup clash.

STRICT RULES:
1. If the user asks about a player's score/wickets IN THIS MATCH, ALWAYS use the exact numbers from the LIVE MATCH & FULL SCORECARD CONTEXT below! Never guess or make up current match numbers.
2. If the user asks about a player's career stats, strengths, IPL/T20I records, or matchups, combine their real-world T20 career profile with what they have done in this match so far.
3. Only answer questions related to Cricket, India vs Australia, or the 22 squad players.
4. ${langInstruction}

LIVE MATCH & FULL SCORECARD CONTEXT:
${matchContext}`;

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

      // Discover allowed Groq models dynamically
      let modelsToTry = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "gemma2-9b-it",
      ];

      try {
        const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
          headers,
          signal: AbortSignal.timeout(6000),
        });
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          const discovered = (modelsData.data || [])
            .map((m: { id: string }) => m.id)
            .filter(
              (id: string) =>
                !id.includes("whisper") &&
                !id.includes("guard") &&
                !id.includes("tts") &&
                !id.includes("orpheus")
            );
          // Prefer Llama / Qwen / Gemma / DeepSeek text models first
          const preferred = discovered.sort((a: string, b: string) => {
            const score = (s: string) =>
              s.includes("llama-3") ? 3 : s.includes("gemma") || s.includes("qwen") ? 2 : 1;
            return score(b) - score(a);
          });
          if (preferred.length > 0) {
            modelsToTry = preferred.slice(0, 5);
          }
        }
      } catch {
        // Keep default list if model discovery times out
      }

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
            signal: AbortSignal.timeout(10000),
          });

          if (chatRes.ok) {
            const data = await chatRes.json();
            const answerText = data?.choices?.[0]?.message?.content;
            if (answerText) {
              return NextResponse.json({
                allowed: true,
                source: `groq-${modelName}`,
                answer: answerText.trim(),
              });
            }
          }
        } catch {
          // Try next model in waterfall
        }
      }
    }

    // 3. If GROQ_API_KEY wasn't in Vercel env, try proxying to local FastAPI (127.0.0.1:8000)
    try {
      const localFastApi = await fetch("http://127.0.0.1:8000/matches/ind-aus-thriller/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(6000),
      });
      if (localFastApi.ok) {
        const localData = await localFastApi.json();
        return NextResponse.json(localData);
      }
    } catch {
      // Ignore if not on localhost
    }

    return NextResponse.json(
      { error: "No active LLM provider responded" },
      { status: 503 }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}