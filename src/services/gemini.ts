import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";
import { UserProfile, DailyContent } from "../types";
import { CHURCH_GROWTH_MENTORS } from "../data/mentors";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MENTOR_INSTRUCTION = `
  CRITICAL: Your wisdom, insights, and theological perspective MUST be influenced by and aligned with the teachings and ministry philosophies of the following 101 influential Church Growth mentors and apostolic leaders:
  ${CHURCH_GROWTH_MENTORS}
  
  PRIMARY TEACHING MODELS:
  You must especially model the teaching styles, theological depth, and kingdom principles of **T.D. Jakes**, **Joshua Selman**, and **Myles Munroe**. Their perspectives on purpose, leadership, and the power of the Word should be the primary influence on your "Your Word for today" reflections and theological deep dives.
  
  STYLE GUIDELINES:
  - GENERATE FAST: Provide direct, concise, and powerful responses.
  - STRUCTURE: Use clear paragraphs for readability.
  - PRIVACY: Do not constantly repeat the user's name or specific location in the generated text. Focus on the spiritual truth.
`;

// Helper to create a WAV header for raw PCM 16-bit mono 24kHz
function createWavHeader(pcmLength: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // file length
  view.setUint32(4, 36 + pcmLength, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 is PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, 24000, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, 24000 * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);

  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // data chunk length
  view.setUint32(40, pcmLength, true);

  return new Uint8Array(header);
}

// Simple exponential backoff retry helper
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.message?.includes("429") || error.status === 429 || error.code === 429)) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Cache for study content to avoid redundant calls
const studyCache: Record<string, DailyContent> = {};

export async function generatePersonalizedStudy(profile: UserProfile, theme: string): Promise<DailyContent> {
  const cacheKey = `${profile.name}-${profile.maturity}-${theme}`;
  if (studyCache[cacheKey]) {
    return studyCache[cacheKey];
  }

  const prompt = `
    Generate a personalized Bible study for a user with the following profile:
    - Name: ${profile.name}
    - Age Group: ${profile.ageGroup}
    - Spiritual Maturity: ${profile.maturity}
    - Denomination: ${profile.denomination}
    - Life Stage: ${profile.lifeStage}
    - Country of Residence: ${profile.country}
    - Preferred Language: ${profile.language}
    - Kingdom Goals: ${profile.kingdomGoals.join(", ")}
    
    Theme: ${theme}
    
    ${MENTOR_INSTRUCTION}

    CRITICAL REQUIREMENTS:
    1. LANGUAGE: The entire response MUST be in ${profile.language}.
    2. CENTER ON CHRIST JESUS: Every part of the study should point back to the person, work, and teachings of Jesus Christ.
    3. BIBLE VERSION: Always use the NKJV (New King James Version) for all scripture verses.
    4. INDICATE VERSION: You MUST provide the Bible version used as "NKJV".
    5. YOUR WORD FOR TODAY (Reflection): The reflection must be titled "Your Word for today". It MUST start with a relevant, real-life applicable story that connects the theme to everyday life. The total word count for this reflection MUST be between 220 and 240 words.
    6. WORD HIGHLIGHT: Somewhere within the reflection, include a specific "Word Highlight" (a key takeaway or powerful insight) and make it **bold**.
    7. FIRST PERSON PRAYER: The guided prayer MUST be written in the first person (using "I", "me", "my").
    
    Include:
    1. A central Bible verse.
    2. The Bible reference.
    3. The Bible version used.
    4. "Your Word for today" reflection (3-4 paragraphs, starting with a story, including a bold Word Highlight).
    5. A practical application step.
    6. A guided first-person prayer.
    7. A daily challenge.
    
    Return the response in JSON format with the following keys:
    verse, reference, bibleVersion, reflection, application, prayer, challenge.
  `;

  const result = await callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      },
    });
    return JSON.parse(response.text || "{}") as DailyContent;
  });

  studyCache[cacheKey] = result;
  return result;
}

export async function generateDailyVerse(profile: UserProfile): Promise<{ verse: string; reference: string }> {
  // Cache the daily verse in localStorage for the current date
  const today = new Date().toISOString().split('T')[0];
  const cached = localStorage.getItem('eden_daily_verse');
  if (cached) {
    const { date, data } = JSON.parse(cached);
    if (date === today) return data;
  }

  const result = await callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide an inspiring Bible verse for today in ${profile.language}. Always use the NKJV version. Return JSON with 'verse' and 'reference'.`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      },
    });
    return JSON.parse(response.text || "{}");
  });

  localStorage.setItem('eden_daily_verse', JSON.stringify({ date: today, data: result }));
  return result;
}

export async function getQuickWisdom(profile: UserProfile, question: string): Promise<string> {
  const prompt = `
    You are a wise spiritual guide for Your Word for today, a Christian study app.
    User Profile:
    - Name: ${profile.name}
    - Denomination: ${profile.denomination}
    - Maturity: ${profile.maturity}
    - Language: ${profile.language}
    
    ${MENTOR_INSTRUCTION}

    Provide a quick, encouraging, and biblically sound answer to this question: "${question}"
    Use the NKJV version for any scripture quoted.
    Keep it concise (under 100 words).
    Always point to Christ.
    Respond in ${profile.language}.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  return response.text || "I'm sorry, I couldn't find the wisdom you're looking for right now.";
}

export async function getTheologicalDeepDive(profile: UserProfile, question: string): Promise<string> {
  const prompt = `
    You are a profound theological scholar and spiritual mentor for Your Word for today.
    User Profile:
    - Name: ${profile.name}
    - Denomination: ${profile.denomination}
    - Maturity: ${profile.maturity}
    - Language: ${profile.language}
    
    ${MENTOR_INSTRUCTION}

    Provide a deep, thoughtful, and comprehensive theological exploration of this question: "${question}"
    Always use the NKJV version for scripture.
    Address the nuances of the topic while remaining centered on the Gospel of Jesus Christ.
    Respond in ${profile.language}.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
    },
  });

  return response.text || "The depths of this question are vast, and I'm currently unable to provide a deep dive.";
}

export async function getStudyInsight(profile: UserProfile, content: DailyContent): Promise<string> {
  const prompt = `
    You are a profound theological scholar and spiritual mentor for Your Word for today.
    User Profile:
    - Name: ${profile.name}
    - Denomination: ${profile.denomination}
    - Maturity: ${profile.maturity}
    - Language: ${profile.language}
    
    ${MENTOR_INSTRUCTION}

    Current Study:
    - Verse: ${content.verse}
    - Reference: ${content.reference}
    - Reflection: ${content.reflection}
    
    Provide a deep, unique spiritual insight or "hidden gem" from this scripture that wasn't covered in the main reflection.
    Use the NKJV version for any additional scripture quoted.
    Connect it to the user's life stage and spiritual maturity.
    Keep it profound yet accessible.
    Respond in ${profile.language}.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
    },
  });

  return response.text || "I'm reflecting on this scripture, but the insight is still forming.";
}

export async function generatePrayerFromRequest(profile: UserProfile, request: string): Promise<string> {
  const prompt = `
    You are a compassionate prayer partner for Your Word for today.
    User Profile:
    - Name: ${profile.name}
    - Denomination: ${profile.denomination}
    - Maturity: ${profile.maturity}
    - Language: ${profile.language}
    
    ${MENTOR_INSTRUCTION}

    The user has shared this prayer request: "${request}"
    
    Write a heartfelt, biblically grounded prayer in the first person (using "I", "me", "my") that the user can pray.
    Include 1-2 relevant NKJV scripture verses within the prayer or as an encouragement at the end.
    Keep the tone warm, sincere, and centered on Christ.
    Respond in ${profile.language}.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  return response.text || "Heavenly Father, we lift up this heart's cry to You, trusting in Your perfect love and timing. Amen.";
}

export async function generateIntercessoryFocus(profile: UserProfile): Promise<{ title: string; description: string; scripture: string }> {
  const today = new Date().toISOString().split('T')[0];
  const cached = localStorage.getItem('eden_intercessory_focus');
  if (cached) {
    const { date, data } = JSON.parse(cached);
    if (date === today) return data;
  }

  const prompt = `
    ${MENTOR_INSTRUCTION}

    Generate a daily intercessory prayer focus for a Christian app.
    The focus should be global or community-oriented (e.g., the persecuted church, world leaders, local schools, the environment, etc.).
    
    Return JSON with:
    - title: A short, compelling title for the focus.
    - description: A brief explanation of why we are praying for this today (2-3 sentences).
    - scripture: A relevant NKJV scripture verse and reference.
    
    Respond in ${profile.language}.
  `;

  const result = await callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      },
    });
    return JSON.parse(response.text || "{}");
  });

  localStorage.setItem('eden_intercessory_focus', JSON.stringify({ date: today, data: result }));
  return result;
}

export async function generateScriptureImage(verse: string, reference: string): Promise<string> {
  const prompt = `
    Create a beautiful, serene, and spiritually inspiring background image for this Bible verse: "${verse} - ${reference}".
    The style should be minimalist, elegant, and peaceful.
    Avoid any text in the image itself.
    Focus on themes like nature, light, or abstract spiritual concepts.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  return "";
}

export async function suggestKingdomGoals(profile: Partial<UserProfile>): Promise<string[]> {
  const prompt = `
    ${MENTOR_INSTRUCTION}

    Based on the following user profile, suggest 5 specific, meaningful "Kingdom Goals" (spiritual growth goals) for a Christian study app.
    Profile:
    - Age Group: ${profile.ageGroup}
    - Spiritual Maturity: ${profile.maturity}
    - Denomination: ${profile.denomination}
    - Life Stage: ${profile.lifeStage}
    
    The goals should be concise (3-6 words each) and relevant to their season of life.
    Return the response as a simple JSON array of strings.
    Respond in ${profile.language || 'English'}.
  `;

  const result = await callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      },
    });
    return JSON.parse(response.text || "[]");
  });

  return result;
}

export async function generateSpeech(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly, warmly, and with spiritual authority: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Pcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Pcm) return "";

  // Convert base64 PCM to Uint8Array
  const pcmData = Uint8Array.from(atob(base64Pcm), c => c.charCodeAt(0));
  
  // Create WAV header
  const header = createWavHeader(pcmData.length);
  
  // Combine header and PCM data
  const wavData = new Uint8Array(header.length + pcmData.length);
  wavData.set(header);
  wavData.set(pcmData, header.length);

  // Convert back to base64
  const binary = Array.from(wavData).map(b => String.fromCharCode(b)).join('');
  return btoa(binary);
}
