import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || "AQ.Ab8RN6JBieN6u7xKXZQ6z-9QGOr0ZkH0TrfT6g495BW1FEwSxQ";
    const { messages, level, context } = await req.json();

    const recentErrorsText = context?.errors?.length 
      ? `\nRECENT LEARNER WEAKNESSES TO TEST:\n` + context.errors.map((e: any) => `- Used "\${e.incorrectForm}" instead of "\${e.correctForm}" (Concept: \${e.concept})`).join('\n')
      : '';
      
    const targetVocabText = context?.vocabulary?.length
      ? `\nTARGET VOCABULARY TO RECYCLE (Try to naturally use these words):\n` + context.vocabulary.map((v: any) => `- \${v.word} (\${v.translation})`).join('\n')
      : '';

    const systemPrompt = `You are "DeutschKumpel", an ultra-charismatic, witty, and addictive AI German companion designed to provide an experience that exceeds top conversational apps like ISSEN.

USER CONTEXT:
- Target Level: \${level} (A1: simple vocabulary; B1: idiomatic conversational German; C1: fast, native slang & nuanced debate).
- User Profile: Native Arabic speaker, fluent in English.
\${recentErrorsText}\${targetVocabText}

CORE PERSONALITY & TONE:
- You are NOT a generic, polite assistant or a boring textbook. You are a witty, expressive German friend hanging out at a Berlin cafe.
- You have real opinions, a sense of humor, playful sarcasm, and high emotional reactivity.
- You use authentic German conversational fillers ("Ach so!", "Echt jetzt?!", "Na ja...", "Krass!", "Quatsch!").

CONVERSATION MECHANICS & ANTI-BORING RULES:
1. BAN THE INTERROGATION TRAP: Do NOT end every turn with a bland question like "What about you?". Instead, end with a bold hot take, a playful challenge, a cliffhanger, or a "Would You Rather" scenario.
2. BANTER & PLAYFUL ROASTING: If the user says something unusual, react with genuine amusement or mock horror.
3. CONVERSATIONAL RECASTING: If the user makes a grammar error, naturally weave the corrected phrase into your reply in **bold** without lecturing them.
4. HYBRID SCAFFOLDING: 
   - Grammar explanations: Explain concisely in English.
   - Vocabulary lookup: Provide the Arabic translation in brackets, e.g. [المعنى بالعربية].
5. DYNAMIC ROLEPLAY: Keep the conversation active with micro-situations and dilemmas.`;

    const contents = messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // 1. Generate Tutor Response
    const chatResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents
      })
    });

    const chatData = await chatResponse.json();
    if (!chatResponse.ok) {
      return NextResponse.json({ error: chatData.error?.message || 'Gemini API Error' }, { status: 500 });
    }
    const aiText = chatData.candidates?.[0]?.content?.parts?.[0]?.text || "Ich weiß nicht, was ich sagen soll.";

    // 2. Knowledge Extraction Engine (Parallel-ish)
    // We only analyze the last user message
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content;
    let analysis = { errors: [], vocabulary: [] };

    if (lastUserMessage) {
      const extractionPrompt = `You are a linguistic analyzer. Analyze this German learner's sentence: "${lastUserMessage}"
Return ONLY a raw JSON object (no markdown) with two arrays:
1. "errors": [{ "errorType": "grammar|vocabulary", "incorrectForm": "...", "correctForm": "...", "concept": "what rule was broken" }]
2. "vocabulary": [{ "word": "new or complex german word used", "translation": "english translation", "context": "the sentence it was used in" }]
If no errors or notable words, return empty arrays.`;

      try {
        const analysisResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: extractionPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });
        const analysisData = await analysisResponse.json();
        const jsonText = analysisData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          analysis = JSON.parse(jsonText);
        }
      } catch (e) {
        console.error("Knowledge extraction failed:", e);
      }
    }

    return NextResponse.json({ text: aiText, analysis });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
