import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateCharacters = async (): Promise<{name: string, role: string, country: string, language: string}[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "GENERATE 10 DIVERSE CHARACTER SAMPLES",
    config: {
      systemInstruction: `You are a creative director for a documentary series. 
GENERATE 10 diverse character roles from various walks of life and age groups (from youth to elderly).
IMPORTANT: 
- Use the ROLE/DESCRIPTION as the "name" field. Do NOT use personal names like "John" or "Silas".
- Examples: "Young urban street artist (female)", "Middle-aged deep sea diver (male)", "Elderly tea plantation worker (female)", "Teenage competitive chess player (non-binary)", "Veteran mountain guide (male)".
- The "role" field should be a 3-word atmospheric description (e.g., "Vibrant, Urban, Bold" or "Weathered, Wise, Patient").
- Assign a "country" and its primary "language" to each character, ensuring global diversity (Asia, Europe, Africa, Americas, etc.).

Return as a JSON array of objects with "name", "role", "country", and "language".`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            role: { type: Type.STRING },
            country: { type: Type.STRING },
            language: { type: Type.STRING }
          },
          required: ["name", "role", "country", "language"]
        }
      }
    },
  });
  return JSON.parse(response.text || "[]");
};

export const generateLocations = async (character: string): Promise<string[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Character: ${character}. Give me 10 simple location options.`,
    config: {
      systemInstruction: `Return 10 SHORT location names (max 3 words) suited for the character. 
Examples: "Sunlit Porch", "Quiet Garden", "Old Workshop", "River Bank".
Return as a JSON array of strings.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
  });
  return JSON.parse(response.text || "[]");
};

export const generateImagePrompt = async (character: string, location: string, country: string): Promise<any> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Character: ${character}. Location: ${location}. Country/Culture: ${country}. Generate FULL ultra-detailed prompt.`,
    config: {
      systemInstruction: `You are an AI Image Prompt Generator. Generate a FULL ultra-detailed prompt using the SAMPLE FORMAT below.
Sections required: FACE & SKIN, HAIR/STYLING, CLOTHING, HANDS, POSE, BACKGROUND, LIGHTING, TECHNICAL.
IMPORTANT: 
- The character's skin tone, facial features, hair texture, and clothing MUST strictly reflect the culture and ethnicity of ${country}.
- Clothing should be culturally authentic to ${country}, especially for rural or traditional roles.
- Character always looks DIRECTLY into camera.
- Style: Hyperrealistic, documentary portrait, 8K quality.
- Lighting: Natural, cinematic.

Return the result as a JSON object matching this schema:
{
  "prompt": "string",
  "negative_prompt": "string",
  "settings": {
    "steps": number,
    "cfg_scale": number,
    "sampler": "string",
    "resolution": "string",
    "clip_skip": number,
    "model": "string",
    "aspect_ratio": "string",
    "midjourney_flag": "string"
  }
}`,
      responseMimeType: "application/json"
    },
  });
  return JSON.parse(response.text || "{}");
};

export const generateTopics = async (characterDescription: string, country: string, language: string): Promise<{title: string, description: string}[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Character: ${characterDescription}. Country: ${country}. Language: ${language}. Generate 10 story-driven advice TOPIC OPTIONS.`,
    config: {
      systemInstruction: `You are a Life Story & Advice Script Writer.
TOPIC RULES:
- Every topic must feel like it could ONLY come from this specific character's life, age group, and the culture of ${country}.
- Rooted in real situations their life/profession creates in ${country}.
- Mix of: failure, loss, hard decisions, quiet wins, unexpected lessons, things they wish they knew at a different stage of life.
- Nothing generic — no "believe in yourself" angles.
- Should make the viewer think: "I never thought about it that way".
- IMPORTANT: The "title" and "description" MUST be written in ${language}.

Return 10 topics as a JSON array of objects with "title" and "description" (one honest sentence).`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    },
  });
  return JSON.parse(response.text || "[]");
};

export const generateScript = async (characterDescription: string, topic: string, country: string, language: string): Promise<{native: string, english: string}> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Character: ${characterDescription}. Topic: ${topic}. Country: ${country}. Language: ${language}. Write a 1-MINUTE SCRIPT and its English translation.`,
    config: {
      systemInstruction: `You are a Life Story & Advice Script Writer.
LANGUAGE: The "native" script MUST be written entirely in ${language}.
TRANSLATION: Provide a faithful "english" translation of the script.
LENGTH: 120–130 words for the native script (strictly optimized for a 60-second slow-paced delivery).
VOICE: First person.
TONE: Real person, hard full life, NOT motivational, NOT poetic, pauses, short sentences, rough edges.
CULTURE: The script should reflect the cultural nuances, idioms, and values of ${country}.
STRUCTURE (Narrative Arc for Clarity):
1. OPENING: A vivid, specific memory that sets the scene (25-30 words).
2. MIDDLE: The core conflict or turning point—what happened and what it cost (55-60 words).
3. CLOSING: A grounded, hard-won lesson or advice for the next generation (35-40 words).

BANNED: "Life is a journey", "I've learned that", "Trust the process", rhyming, inspirational poster language.
Start mid-scene. Use sensory details. Ensure the story is clear and easy to follow for any audience.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          native: { type: Type.STRING },
          english: { type: Type.STRING }
        },
        required: ["native", "english"]
      }
    },
  });
  return JSON.parse(response.text || '{"native": "", "english": ""}');
};

export const generateVideoScenes = async (characterDescription: string, script: string, country: string, language: string, sceneCount: number = 8): Promise<any[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Character: ${characterDescription}. Script: ${script}. Country: ${country}. Language: ${language}. Generate exactly ${sceneCount} scene-by-scene video prompts.`,
    config: {
      systemInstruction: `You are a Video Scene Prompt Generator for AI video tools.
Split the script naturally into exactly ${sceneCount} scenes.
DURATION: Each scene = exactly 8 seconds. 

FLOW & PACING:
- Analyze the story and break it into meaningful emotional or narrative shifts across exactly ${sceneCount} scenes.
- Pacing should be slow and unhurried.
- Ensure the story arc (Beginning, Middle, End) is perfectly distributed among the ${sceneCount} scenes.

CAMERA & VARIATION RULES:
- For every new scene: CHANGE camera angle (front, 3/4, side profile, top-down, close-up, extreme close-up, wide shot, over-the-shoulder, low angle).
- Vary lens feel (50mm, 85mm, macro, wide).
- Adjust composition and framing for smooth visual continuity.

EMOTION RULES:
- Match facial expression and body language to the story moment (e.g., calm → thinking → pain → intensity → reflection → strength).
- Add slight natural variation in pose and micro-expression while maintaining identity.

CONSISTENCY RULES:
- Maintain identical facial features, same age, same hairstyle, same clothing/uniform details across all scenes.
- Keep the same character identity in every frame.

Return a JSON array of scene objects. Each scene MUST include:
- description: string (A short scene description representing a meaningful emotional or narrative shift)
- scriptLine: string (The line from the script in ${language}, with [PAUSE], [SLOW], [HOLD] marks)
- characterDescription: string (Full physical description fresh every scene, reflecting their age, state, and the culture of ${country})
- expressionMicroMovement: object { eyes, brow, jawLips, overall }
- bodyLanguage: string
- camera: string (Detailed camera angle, lens feel, and composition)
- environment: string
- imagePrompt: string (A consolidated, high-fidelity image prompt for this specific scene, combining character, environment, lighting, and camera angle)
- voiceDirection: object { pace, tone, texture, delivery, languageNote: "Note on ${language} pronunciation/accent for ${country}" }
- audio: string
- estimatedDuration: number (8)

Do not abbreviate character descriptions. Render every detail of their physical presence.`,
      responseMimeType: "application/json"
    },
  });
  return JSON.parse(response.text || "[]");
};

export const generateCharacterAngles = async (characterPrompt: string): Promise<{angle: string, prompt: string}[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Character Prompt: ${characterPrompt}. Generate 5 different camera angles for this character.`,
    config: {
      systemInstruction: `You are an AI Image Prompt Engineer. 
Based on the provided character prompt, generate 5 variations for different camera angles to create a "Character Reference Sheet".
ANGLES: 
1. Extreme Close-up (Focus on eyes/skin texture)
2. Profile View (Side of face)
3. Medium Shot (Waist up, showing clothing details)
4. Wide Shot (Full body in environment)
5. Low Angle (Heroic/Dignified perspective)

Keep the character's physical description IDENTICAL to the original prompt, only changing the camera angle, framing, and composition.
Return as a JSON array of objects with "angle" and "prompt".`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            angle: { type: Type.STRING },
            prompt: { type: Type.STRING }
          },
          required: ["angle", "prompt"]
        }
      }
    },
  });
  return JSON.parse(response.text || "[]");
};

export const generateImage = async (prompt: string): Promise<string> => {
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
            aspectRatio: "1:1",
        },
    },
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const generateVideo = async (prompt: string): Promise<string> => {
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY || "",
    },
  });
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
