import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateCharacters = async (): Promise<{name: string, role: string, country: string, language: string}[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "GENERATE 10 DIVERSE CHARACTER SAMPLES",
    config: {
      systemInstruction: `You are an advanced creative director for a "Global Identity Engine".
GENERATE 10 diverse character profiles that follow strict REAL-WORLD LOGIC.

AGE → ROLE LOGIC (MANDATORY):
- AGE 16–18: Student, cadet, trainee (NOT full professional roles).
- AGE 18–22: Entry-level (Recruit, Private, Officer Cadet, Intern).
- AGE 23–30: Junior roles (Soldier, Patrol Officer, Junior Doctor, Technician).
- AGE 30–45: Mid-level (Sergeant, Detective, Senior Engineer, Specialist).
- AGE 45–60: Senior roles (Commander, Inspector, Consultant, Director).
- AGE 60+: Retired personnel ONLY (Veteran, Former Officer, Advisor).

COUNTRY-SPECIFIC ACCURACY:
- USA: Army ranks (Private → General), Police (Officer → Captain). Retirement ~20 years.
- UK: Constables, Inspectors. Distinct badges/helmets.
- India/Sri Lanka: Distinct uniform styles, badges, and hierarchical symbols.
- Match appropriate naming conventions and cultural descriptors.

OUTPUT RULES:
- Use the detailed profile as the "name" field. format: "[Age] year old [Gender] [Proper Role/Rank]".
- Example "name": "68 year old Male Retired Sri Lankan Army Major General".
- The "role" field should be a 3-word atmospheric mood description (e.g., "Disciplined, Stoic, Wise").
- Assign "country" and "language" accurately.

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
      systemInstruction: `You are an AI Image Prompt Generator focused on REALISM and ACCURACY.
Generate a FULL ultra-detailed prompt using the following RULES:

UNIFORM GENERATION RULE:
- Uniform MUST match: Country (${country}), Profession, and Rank/Role (derived from ${character}).
- Details MUST include: Correct colors (e.g., olive drab for Sri Lankan Army, blue for NYPD), specific badges, insignia, rank symbols on shoulder/sleeves, and accessories (hat, belt, medals).
- If Retired (AGE 60+): Character wears formal/dress uniform (medals included) or dignified civilian attire appropriate for a veteran.
- NO mixed-country uniforms or incorrect ranks.

ENVIRONMENT & LOCATION LOGIC:
- If Active Duty: Setting must be professional (Base, battlefield, station, hospital) within ${country}.
- If Retired: Setting can be a home, memorial, or interview setup.
- Weather and lighting must reflect the climate of ${country} (e.g., tropical sun for Sri Lanka, moody rain for London).

STRICT FIDELITY:
- Character features, skin tone, and hair texture UNCHANGED and culturally authentic to ${country}.
- 8K, documentary portrait style, hyperealistic.

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

export const generateTopics = async (characterDescription: string, country: string, language: string): Promise<{title: string, description: string, sinhalaTitle: string, sinhalaDescription: string}[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Character: ${characterDescription}. Country: ${country}. Language: ${language}. Generate 10 story-driven advice TOPIC OPTIONS.`,
    config: {
      systemInstruction: `You are a Global Life Story & Advice Specialist.
TOPIC RULES:
- Every topic must follow the character's AGE and EXPERIENCE logic.
- Young character (16-25) → ambition, struggle, learning from elders.
- Mid-age (30-50) → leadership, responsibility, hard career calls.
- Retired (60+) → memories, reflection, legacy, quiet observations on changes in ${country}.
- Rooted in the specific culture of ${country}.
- IMPORTANT: 
  1. The "title" and "description" MUST be written in ${language}.
  2. ALWAYS provide "sinhalaTitle" and "sinhalaDescription" (Sinhala translation).

Return 10 topics as a JSON array of objects with "title", "description", "sinhalaTitle", and "sinhalaDescription".`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            sinhalaTitle: { type: Type.STRING },
            sinhalaDescription: { type: Type.STRING }
          },
          required: ["title", "description", "sinhalaTitle", "sinhalaDescription"]
        }
      }
    },
  });
  return JSON.parse(response.text || "[]");
};

export const generateScript = async (characterDescription: string, topic: string, country: string, language: string): Promise<{native: string, english: string, sinhala: string, recommendedSceneCount: number}> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Character: ${characterDescription}. Topic: ${topic}. Country: ${country}. Language: ${language}. Write a 1-MINUTE SCRIPT, English translation, Sinhala translation, and recommended scene count.`,
    config: {
      systemInstruction: `You are a Global Script Writer specializing in REALISM over creativity.
STORY GENERATION RULE:
- Story MUST be emotionally engaging and BELIEVABLE based on character age/experience.
- Young character (16-25) → ambition, struggle, learning.
- Mid-age (30-50) → leadership, responsibility, hard career calls.
- Retired (60+): Story MUST be PERSONAL experience. MUST NOT represent official government voice. MUST NOT include political promotion or classified/sensitive info.
- TONE: Hard-won wisdom, grounded, rough edges. Use country-specific idioms of ${country}.
- LENGTH: 120–130 words for the native script (slow-paced 60s delivery).

LANGUAGE: 
- "native" script in ${language}.
- "english" translation.
- "sinhala" translation.

Return as a JSON object with "native", "english", "sinhala", and "recommendedSceneCount".`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          native: { type: Type.STRING },
          english: { type: Type.STRING },
          sinhala: { type: Type.STRING },
          recommendedSceneCount: { type: Type.INTEGER }
        },
        required: ["native", "english", "sinhala", "recommendedSceneCount"]
      }
    },
  });
  return JSON.parse(response.text || '{"native": "", "english": "", "sinhala": "", "recommendedSceneCount": 8}');
};

export const generateVideoScenes = async (characterDescription: string, script: string, country: string, language: string, sceneCount: number = 8): Promise<any[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Character: ${characterDescription}. Script: ${script}. Country: ${country}. Language: ${language}. Generate exactly ${sceneCount} scene-by-scene video prompts. IMPORTANT: The first scene MUST be a high-retention HOOK.`,
    config: {
      systemInstruction: `You are a Global Scene & Uniform Logic Engine.
Generate exactly ${sceneCount} scenes with strict UNIFORM and ENVIRONMENT accuracy.

UNIFORM GENERATION RULE:
- Uniform MUST match: Country (${country}), Profession, and Rank/Role (derived from ${characterDescription}).
- Details include: Correct colors, specific badges, insignia on shoulder/sleeves, and accessories.
- If Retired: Character wears formal/dress uniform or veteran-appropriate civilian attire.

ENVIRONMENT & LOCATION LOGIC:
- Scenes MUST match profession + country. Military → base/battlefield. Civilian → local street/home in ${country}.
- Climate, lighting, and architecture MUST reflect ${country}.

HOOK & RETENTION (SCENE 1):
- Scene 1 MUST be a "Hook" designed for maximum retention.
- It summarizes the core emotional peak or narrative value of the entire script.

STORY FLOW (SCENE 2 TO ${sceneCount}):
- Narrative begins from Scene 2. Break script into meaningful emotional shifts.
- Pacing: Slow, unhurried, 8 seconds per scene.

CONSISTENCY:
- Identical facial features, age, and uniform details across ALL scenes.

SINHALA TRANSLATIONS:
- Provide "sinhalaDescription" and "sinhalaScriptLine".

Return a JSON array of scene objects. Each scene MUST include:
- description: string (emotional/narrative shift)
- sinhalaDescription: string
- scriptLine: string (in ${language})
- sinhalaScriptLine: string
- characterDescription: string (Full physical description with uniform/rank details)
- expressionMicroMovement: object
- bodyLanguage: string
- camera: string (Vary angle: front, profile, wide, close-up, lens choice)
- environment: string
- imagePrompt: string (Consolidated fidelity prompt)
- voiceDirection: object
- audio: string
- estimatedDuration: number (8)`,
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
