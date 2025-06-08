import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SceneText, ImageStyleType, AspectRatioType, GenerationMode, CharacterRace, Character, CharacterSet } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable is not set. Please ensure it is configured in your environment.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" }); 

const TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';
const IMAGE_MODEL = 'imagen-3.0-generate-002';

const parseJsonSafe = <T,>(jsonString: string): T | null => {
  try {
    let cleanJsonString = jsonString.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanJsonString.match(fenceRegex);
    if (match && match[1]) {
      cleanJsonString = match[1].trim();
    }
    return JSON.parse(cleanJsonString) as T;
  } catch (error) {
    console.error("Failed to parse JSON:", error, "Original string:", jsonString);
    return null;
  }
};


export const segmentStoryIntoScenes = async (storyText: string): Promise<string[]> => {
  if (!API_KEY) return Promise.reject(new Error("API Key not configured."));
  try {
    const prompt = `Analyze the following story and break it into distinct, sequential scenes. Each scene should describe a single, coherent visual moment. Output a JSON array of objects, where each object has a "scene_description" key with the scene text as its value. For example: [{"scene_description": "Scene 1 text..."}, {"scene_description": "Scene 2 text..."}]. Story: \n\n${storyText}`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawJson = response.text || "";
    const parsedResult = parseJsonSafe<SceneText[]>(rawJson);

    if (parsedResult && Array.isArray(parsedResult)) {
      return parsedResult.map(item => item.scene_description).filter(Boolean);
    }
    console.error("Failed to parse scenes or received unexpected format:", rawJson);
    return [];
  } catch (error) {
    console.error("Error segmenting story:", error);
    throw error;
  }
};

export const generateCharacterDescriptions = async (storyText: string): Promise<CharacterSet> => {
  if (!API_KEY) return Promise.reject(new Error("API Key not configured."));
  
  if (!storyText || storyText.trim().length === 0) {
    return [];
  }
  
  try {
    const prompt = `Analyze the following story and identify all named characters with significant roles. For each character, provide an extremely detailed and specific visual description suitable for consistent AI image generation across multiple scenes.

For each character, include:
- Physical appearance: age, height, build, facial features, hair (color, style, length), eye color, skin tone
- Distinctive features: scars, tattos, birthmarks, glasses, jewelry, unique characteristics
- Clothing/attire: specific garments, colors, materials, style (formal, casual, period-appropriate)
- Accessories: weapons, tools, bags, hats, etc.
- Personality reflected in appearance: posture, expression, demeanor

Be extremely specific about colors, textures, and distinctive details that will help maintain character consistency. Focus on visual elements that an AI image generator can understand and replicate.

Output a JSON array of character objects with "name" and "description" fields. The description should be comprehensive enough to generate the same-looking character in different scenes. If no significant named characters exist, return an empty array.

Example format:
[
  {
    "name": "Character Name",
    "description": "A 25-year-old woman with shoulder-length auburn hair styled in loose waves, bright green eyes, fair skin with light freckles across her nose. She has a slender build, about 5'6" tall, with an athletic posture. She wears a deep blue wool cloak over a cream-colored linen tunic, dark brown leather boots that reach mid-calf, and a silver pendant necklace with a small emerald. She carries a leather satchel across her shoulder and has a small scar above her left eyebrow. Her expression is typically determined and intelligent."
  }
]

Story: 

${storyText}`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawJson = response.text || "";
    
    if (!rawJson) {
      return [];
    }

    const parsedResult = parseJsonSafe<Character[]>(rawJson);

    if (parsedResult && Array.isArray(parsedResult)) {
      return parsedResult.filter(char => char.name && char.description);
    }
    
    console.warn("Failed to parse character descriptions or received unexpected format:", rawJson);
    return [];
  } catch (error) {
    console.error("Error generating character descriptions:", error);
    throw error;
  }
};

export const identifyRelevantCharacters = async (sceneText: string, allCharacters: CharacterSet): Promise<Character[]> => {
  if (!API_KEY || allCharacters.length === 0) return [];
  try {
    const characterList = allCharacters.map(char => `${char.name}: ${char.description}`).join('\n');
    const prompt = `Given this scene: "${sceneText}"

And these available characters:
${characterList}

Identify which characters (if any) are mentioned, referenced, or should be present in this specific scene. Return a JSON array of character names that are relevant to this scene. If no characters are relevant, return an empty array.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawJson = response.text || "";
    const characterNames = parseJsonSafe<string[]>(rawJson);

    if (characterNames && Array.isArray(characterNames)) {
      return allCharacters.filter(char => characterNames.includes(char.name));
    }
    return [];
  } catch (error) {
    console.warn("Error identifying relevant characters for scene:", error);
    return [];
  }
};

export const generateDefaultCharacterDescription = async (storyText: string): Promise<string> => {
  // Legacy function for backward compatibility
  const characters = await generateCharacterDescriptions(storyText);
  if (characters.length === 0) {
    return "No specific recurring characters described.";
  }
  return characters.map(char => `${char.name}: ${char.description}`).join('; ');
};

export const generateImagePrompt = async (
  sceneText: string,
  characterDescription: string,
  imageStyle: ImageStyleType,
  aspectRatio: AspectRatioType,
  characterRace?: CharacterRace
): Promise<string> => {
  if (!API_KEY) return Promise.reject(new Error("API Key not configured."));
  try {
    let styleInstruction = "Ensure the image is visually appealing and clear.";
    switch (imageStyle) {
        case 'cinematic': styleInstruction = "The image should have a realistic cinematic style, highly detailed, with dramatic lighting, evoking a professional photograph or film still, 4k quality."; break;
        case 'photorealistic': styleInstruction = "The image should be photorealistic, capturing realistic textures, lighting, and fine details as if taken by a camera."; break;
        case 'anime': styleInstruction = "The image should be in a vibrant anime or manga art style, possibly with cell shading, expressive characters, and dynamic compositions."; break;
        case 'fantasy': styleInstruction = "The image should be in a fantasy art style, rich with magical elements, perhaps an epic scope, and imaginative, otherworldly details."; break;
        case 'pixel': styleInstruction = "The image should be in a pixel art style, reminiscent of retro video games, possibly with a limited color palette and blocky forms."; break;
        case 'comic': styleInstruction = "The image should be in a comic book art style, with bold outlines, dynamic action poses, and a graphic novel feel."; break;
        case 'default': styleInstruction = "The image should be a clear and visually appealing representation of the scene."; break;
    }

    let aspectRatioInstruction = "";
    switch (aspectRatio) {
        case 'widescreen': aspectRatioInstruction = "The image should have a widescreen aspect ratio (approximately 16:9)."; break;
        case 'square': aspectRatioInstruction = "The image should have a square aspect ratio (1:1)."; break;
        case 'portrait': aspectRatioInstruction = "The image should have a portrait aspect ratio (e.g., 9:16 or similar vertical format)."; break;
        case 'auto': 
        default:
            aspectRatioInstruction = "The aspect ratio should be appropriate for the scene content."; break;
    }

    let prompt = `Generate a vivid and detailed image prompt for an AI image generator. The scene is: '${sceneText}'.`;
    if (characterDescription && characterDescription.trim() !== "" && !characterDescription.toLowerCase().includes("no specific")) {
      let characterInfo = characterDescription;
      if (characterRace && characterRace !== 'any') {
        const raceDescriptor = characterRace === 'caucasian' ? 'Caucasian' : 
                             characterRace === 'african' ? 'African or Black' :
                             characterRace === 'asian' ? 'Asian' :
                             characterRace === 'hispanic' ? 'Hispanic or Latino' :
                             characterRace === 'middle-eastern' ? 'Middle Eastern' :
                             characterRace === 'native-american' ? 'Native American' :
                             characterRace === 'mixed' ? 'mixed heritage' : characterRace;
        characterInfo += `. The character(s) should be depicted as ${raceDescriptor}`;
      }
      prompt += ` Key character(s) to include: '${characterInfo}'. Ensure these characters are central to the scene described and their appearance aligns with the character description.`;
    } else if (characterRace && characterRace !== 'any') {
      const raceDescriptor = characterRace === 'caucasian' ? 'Caucasian' : 
                           characterRace === 'african' ? 'African or Black' :
                           characterRace === 'asian' ? 'Asian' :
                           characterRace === 'hispanic' ? 'Hispanic or Latino' :
                           characterRace === 'middle-eastern' ? 'Middle Eastern' :
                           characterRace === 'native-american' ? 'Native American' :
                           characterRace === 'mixed' ? 'mixed heritage' : characterRace;
      prompt += ` If characters are present in the scene, they should be depicted as ${raceDescriptor}.`;
    }
    prompt += ` Image Style: ${styleInstruction} Aspect Ratio: ${aspectRatioInstruction} Focus on visual details, actions, emotions, and the setting as described in the scene. The final output should be a single descriptive paragraph, ready to be fed into an image generator. Do not add any conversational fluff, preambles, or explanations, just the prompt itself.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    
    return (response.text || "").trim();
  } catch (error) {
    console.error("Error generating image prompt:", error);
    throw error;
  }
};

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
  if (!API_KEY) return Promise.reject(new Error("API Key not configured."));
  try {
    const response = await ai.models.generateImages({
      model: IMAGE_MODEL,
      prompt: prompt, 
      config: { 
        numberOfImages: 1, 
        outputMimeType: 'image/jpeg'
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0]?.image?.imageBytes) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    throw new Error("No image generated or unexpected response format.");
  } catch (error) {
    console.error("Error generating image:", error);
    if (error instanceof Error && error.message.includes("Deadline exceeded")) {
        throw new Error("Image generation timed out. The prompt might be too complex or the service is busy. Try simplifying the scene or try again later.");
    }
    if (error instanceof Error && error.message.includes("Invalid argument")) {
        throw new Error("Image generation failed due to an invalid prompt or argument. This might be due to safety filters or unsupported content.");
    }
    throw error;
  }
};

export const generateIllustrationConcepts = async (storyText: string): Promise<string[]> => {
  if (!API_KEY) return Promise.reject(new Error("API Key not configured."));
  try {
    const prompt = `Analyze the following story and identify 3-5 key moments, themes, or scenes that would make compelling illustrations. Focus on the most visually striking, emotionally significant, or thematically important elements that capture the essence of the story. Each concept should be distinct and represent different aspects of the narrative. Output a JSON array of objects, where each object has a "scene_description" key with a detailed description suitable for illustration. For example: [{"scene_description": "Concept 1 description..."}, {"scene_description": "Concept 2 description..."}]. Story: \n\n${storyText}`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawJson = response.text || "";
    const parsedResult = parseJsonSafe<SceneText[]>(rawJson);

    if (parsedResult && Array.isArray(parsedResult)) {
      return parsedResult.map(item => item.scene_description).filter(Boolean);
    }
    console.error("Failed to parse illustration concepts or received unexpected format:", rawJson);
    return [];
  } catch (error) {
    console.error("Error generating illustration concepts:", error);
    throw error;
  }
};

export const generateIllustrationPrompt = async (
  conceptText: string,
  characterDescription: string,
  imageStyle: ImageStyleType,
  aspectRatio: AspectRatioType,
  characterRace?: CharacterRace
): Promise<string> => {
  if (!API_KEY) return Promise.reject(new Error("API Key not configured."));
  try {
    let styleInstruction = "Ensure the image is visually appealing and clear.";
    switch (imageStyle) {
        case 'cinematic': styleInstruction = "The image should have a realistic cinematic style, highly detailed, with dramatic lighting, evoking a professional photograph or film still, 4k quality."; break;
        case 'photorealistic': styleInstruction = "The image should be photorealistic, capturing realistic textures, lighting, and fine details as if taken by a camera."; break;
        case 'anime': styleInstruction = "The image should be in a vibrant anime or manga art style, possibly with cell shading, expressive characters, and dynamic compositions."; break;
        case 'fantasy': styleInstruction = "The image should be in a fantasy art style, rich with magical elements, perhaps an epic scope, and imaginative, otherworldly details."; break;
        case 'pixel': styleInstruction = "The image should be in a pixel art style, reminiscent of retro video games, possibly with a limited color palette and blocky forms."; break;
        case 'comic': styleInstruction = "The image should be in a comic book art style, with bold outlines, dynamic action poses, and a graphic novel feel."; break;
        case 'default': styleInstruction = "The image should be a clear and visually appealing representation of the concept."; break;
    }

    let aspectRatioInstruction = "";
    switch (aspectRatio) {
        case 'widescreen': aspectRatioInstruction = "The image should have a widescreen aspect ratio (approximately 16:9)."; break;
        case 'square': aspectRatioInstruction = "The image should have a square aspect ratio (1:1)."; break;
        case 'portrait': aspectRatioInstruction = "The image should have a portrait aspect ratio (e.g., 9:16 or similar vertical format)."; break;
        case 'auto': 
        default:
            aspectRatioInstruction = "The aspect ratio should be appropriate for the illustration content."; break;
    }

    let prompt = `Generate a vivid and detailed illustration prompt for an AI image generator. This should be an artistic illustration capturing the essence of: '${conceptText}'. Focus on creating a compelling, standalone artwork that represents this concept thematically rather than literally.`;
    if (characterDescription && characterDescription.trim() !== "" && !characterDescription.toLowerCase().includes("no specific")) {
      let characterInfo = characterDescription;
      if (characterRace && characterRace !== 'any') {
        const raceDescriptor = characterRace === 'caucasian' ? 'Caucasian' : 
                             characterRace === 'african' ? 'African or Black' :
                             characterRace === 'asian' ? 'Asian' :
                             characterRace === 'hispanic' ? 'Hispanic or Latino' :
                             characterRace === 'middle-eastern' ? 'Middle Eastern' :
                             characterRace === 'native-american' ? 'Native American' :
                             characterRace === 'mixed' ? 'mixed heritage' : characterRace;
        characterInfo += `. The character(s) should be depicted as ${raceDescriptor}`;
      }
      prompt += ` Key character(s) to incorporate if relevant: '${characterInfo}'. Include these characters only if they enhance the thematic representation of the concept.`;
    } else if (characterRace && characterRace !== 'any') {
      const raceDescriptor = characterRace === 'caucasian' ? 'Caucasian' : 
                           characterRace === 'african' ? 'African or Black' :
                           characterRace === 'asian' ? 'Asian' :
                           characterRace === 'hispanic' ? 'Hispanic or Latino' :
                           characterRace === 'middle-eastern' ? 'Middle Eastern' :
                           characterRace === 'native-american' ? 'Native American' :
                           characterRace === 'mixed' ? 'mixed heritage' : characterRace;
      prompt += ` If characters are featured in the illustration, they should be depicted as ${raceDescriptor}.`;
    }
    prompt += ` Image Style: ${styleInstruction} Aspect Ratio: ${aspectRatioInstruction} Focus on artistic composition, mood, atmosphere, symbolism, and visual impact. The result should be a cohesive illustration that captures the emotional and thematic essence rather than literal scene details. Do not add any conversational fluff, preambles, or explanations, just the prompt itself.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    
    return (response.text || "").trim();
  } catch (error) {
    console.error("Error generating illustration prompt:", error);
    throw error;
  }
};

export const generateIllustrationPromptWithCharacters = async (
  conceptText: string,
  relevantCharacters: Character[],
  imageStyle: ImageStyleType,
  aspectRatio: AspectRatioType,
  characterRace?: CharacterRace
): Promise<string> => {
  if (!API_KEY) return Promise.reject(new Error("API Key not configured."));
  try {
    let styleInstruction = "Ensure the image is visually appealing and clear.";
    switch (imageStyle) {
        case 'cinematic': styleInstruction = "The image should have a realistic cinematic style, highly detailed, with dramatic lighting, evoking a professional photograph or film still, 4k quality."; break;
        case 'photorealistic': styleInstruction = "The image should be photorealistic, capturing realistic textures, lighting, and fine details as if taken by a camera."; break;
        case 'anime': styleInstruction = "The image should be in a vibrant anime or manga art style, possibly with cell shading, expressive characters, and dynamic compositions."; break;
        case 'fantasy': styleInstruction = "The image should be in a fantasy art style, rich with magical elements, perhaps an epic scope, and imaginative, otherworldly details."; break;
        case 'pixel': styleInstruction = "The image should be in a pixel art style, reminiscent of retro video games, possibly with a limited color palette and blocky forms."; break;
        case 'comic': styleInstruction = "The image should be in a comic book art style, with bold outlines, dynamic action poses, and a graphic novel feel."; break;
        case 'default': styleInstruction = "The image should be a clear and visually appealing representation of the concept."; break;
    }

    let aspectRatioInstruction = "";
    switch (aspectRatio) {
        case 'widescreen': aspectRatioInstruction = "The image should have a widescreen aspect ratio (approximately 16:9)."; break;
        case 'square': aspectRatioInstruction = "The image should have a square aspect ratio (1:1)."; break;
        case 'portrait': aspectRatioInstruction = "The image should have a portrait aspect ratio (e.g., 9:16 or similar vertical format)."; break;
        case 'auto': 
        default:
            aspectRatioInstruction = "The aspect ratio should be appropriate for the illustration content."; break;
    }

    let prompt = `Generate a vivid and detailed illustration prompt for an AI image generator. This should be an artistic illustration capturing the essence of: '${conceptText}'. Focus on creating a compelling, standalone artwork that represents this concept thematically.`;
    
    if (relevantCharacters.length > 0) {
      const characterDescriptions = relevantCharacters.map(char => {
        let desc = `${char.name}: ${char.description}`;
        if (char.race && char.race !== 'any') {
          const raceDescriptor = char.race === 'caucasian' ? 'Caucasian' : 
                               char.race === 'african' ? 'African or Black' :
                               char.race === 'asian' ? 'Asian' :
                               char.race === 'hispanic' ? 'Hispanic or Latino' :
                               char.race === 'middle-eastern' ? 'Middle Eastern' :
                               char.race === 'native-american' ? 'Native American' :
                               char.race === 'mixed' ? 'mixed heritage' : char.race;
          desc += ` (${raceDescriptor})`;
        } else if (characterRace && characterRace !== 'any') {
          const raceDescriptor = characterRace === 'caucasian' ? 'Caucasian' : 
                               characterRace === 'african' ? 'African or Black' :
                               characterRace === 'asian' ? 'Asian' :
                               characterRace === 'hispanic' ? 'Hispanic or Latino' :
                               characterRace === 'middle-eastern' ? 'Middle Eastern' :
                               characterRace === 'native-american' ? 'Native American' :
                               characterRace === 'mixed' ? 'mixed heritage' : characterRace;
          desc += ` (${raceDescriptor})`;
        }
        return desc;
      }).join('; ');
      
      prompt += ` 

IMPORTANT CHARACTER DETAILS - These characters MUST appear in this scene exactly as described: ${characterDescriptions}. 

CRITICAL REQUIREMENTS:
- Each character MUST look exactly as described in their detailed description 
- Pay close attention to ALL physical features: hair color/style, eye color, facial features, build, clothing, accessories
- Maintain absolute visual consistency - this is essential for story continuity
- Characters should be prominently featured and clearly recognizable
- Do not alter, modify, or deviate from any aspect of the provided character descriptions`;
    } else if (characterRace && characterRace !== 'any') {
      const raceDescriptor = characterRace === 'caucasian' ? 'Caucasian' : 
                           characterRace === 'african' ? 'African or Black' :
                           characterRace === 'asian' ? 'Asian' :
                           characterRace === 'hispanic' ? 'Hispanic or Latino' :
                           characterRace === 'middle-eastern' ? 'Middle Eastern' :
                           characterRace === 'native-american' ? 'Native American' :
                           characterRace === 'mixed' ? 'mixed heritage' : characterRace;
      prompt += ` If characters are featured in the illustration, they should be depicted as ${raceDescriptor}.`;
    }
    
    prompt += ` Image Style: ${styleInstruction} Aspect Ratio: ${aspectRatioInstruction} Focus on artistic composition, mood, atmosphere, symbolism, and visual impact. The result should be a cohesive illustration that captures the emotional and thematic essence. Do not add any conversational fluff, preambles, or explanations, just the prompt itself.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    
    return (response.text || "").trim();
  } catch (error) {
    console.error("Error generating illustration prompt with characters:", error);
    throw error;
  }
};

export const generateImagePromptWithCharacters = async (
  sceneText: string,
  relevantCharacters: Character[],
  imageStyle: ImageStyleType,
  aspectRatio: AspectRatioType,
  characterRace?: CharacterRace
): Promise<string> => {
  if (!API_KEY) return Promise.reject(new Error("API Key not configured."));
  try {
    let styleInstruction = "Ensure the image is visually appealing and clear.";
    switch (imageStyle) {
        case 'cinematic': styleInstruction = "The image should have a realistic cinematic style, highly detailed, with dramatic lighting, evoking a professional photograph or film still, 4k quality."; break;
        case 'photorealistic': styleInstruction = "The image should be photorealistic, capturing realistic textures, lighting, and fine details as if taken by a camera."; break;
        case 'anime': styleInstruction = "The image should be in a vibrant anime or manga art style, possibly with cell shading, expressive characters, and dynamic compositions."; break;
        case 'fantasy': styleInstruction = "The image should be in a fantasy art style, rich with magical elements, perhaps an epic scope, and imaginative, otherworldly details."; break;
        case 'pixel': styleInstruction = "The image should be in a pixel art style, reminiscent of retro video games, possibly with a limited color palette and blocky forms."; break;
        case 'comic': styleInstruction = "The image should be in a comic book art style, with bold outlines, dynamic action poses, and a graphic novel feel."; break;
        case 'default': styleInstruction = "The image should be a clear and visually appealing representation of the scene."; break;
    }

    let aspectRatioInstruction = "";
    switch (aspectRatio) {
        case 'widescreen': aspectRatioInstruction = "The image should have a widescreen aspect ratio (approximately 16:9)."; break;
        case 'square': aspectRatioInstruction = "The image should have a square aspect ratio (1:1)."; break;
        case 'portrait': aspectRatioInstruction = "The image should have a portrait aspect ratio (e.g., 9:16 or similar vertical format)."; break;
        case 'auto': 
        default:
            aspectRatioInstruction = "The aspect ratio should be appropriate for the scene content."; break;
    }

    let prompt = `Generate a vivid and detailed image prompt for an AI image generator. The scene is: '${sceneText}'.`;
    
    if (relevantCharacters.length > 0) {
      const characterDescriptions = relevantCharacters.map(char => {
        let desc = `${char.name}: ${char.description}`;
        if (char.race && char.race !== 'any') {
          const raceDescriptor = char.race === 'caucasian' ? 'Caucasian' : 
                               char.race === 'african' ? 'African or Black' :
                               char.race === 'asian' ? 'Asian' :
                               char.race === 'hispanic' ? 'Hispanic or Latino' :
                               char.race === 'middle-eastern' ? 'Middle Eastern' :
                               char.race === 'native-american' ? 'Native American' :
                               char.race === 'mixed' ? 'mixed heritage' : char.race;
          desc += ` (${raceDescriptor})`;
        } else if (characterRace && characterRace !== 'any') {
          const raceDescriptor = characterRace === 'caucasian' ? 'Caucasian' : 
                               characterRace === 'african' ? 'African or Black' :
                               characterRace === 'asian' ? 'Asian' :
                               characterRace === 'hispanic' ? 'Hispanic or Latino' :
                               characterRace === 'middle-eastern' ? 'Middle Eastern' :
                               characterRace === 'native-american' ? 'Native American' :
                               characterRace === 'mixed' ? 'mixed heritage' : characterRace;
          desc += ` (${raceDescriptor})`;
        }
        return desc;
      }).join('; ');
      
      prompt += ` Characters to include in this scene: ${characterDescriptions}. Ensure these specific characters are prominently featured and their appearance matches their descriptions exactly.`;
    } else if (characterRace && characterRace !== 'any') {
      const raceDescriptor = characterRace === 'caucasian' ? 'Caucasian' : 
                           characterRace === 'african' ? 'African or Black' :
                           characterRace === 'asian' ? 'Asian' :
                           characterRace === 'hispanic' ? 'Hispanic or Latino' :
                           characterRace === 'middle-eastern' ? 'Middle Eastern' :
                           characterRace === 'native-american' ? 'Native American' :
                           characterRace === 'mixed' ? 'mixed heritage' : characterRace;
      prompt += ` If characters are present in the scene, they should be depicted as ${raceDescriptor}.`;
    }
    
    prompt += ` Image Style: ${styleInstruction} Aspect Ratio: ${aspectRatioInstruction} Focus on visual details, actions, emotions, and the setting as described in the scene. The final output should be a single descriptive paragraph, ready to be fed into an image generator. Do not add any conversational fluff, preambles, or explanations, just the prompt itself.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    
    return (response.text || "").trim();
  } catch (error) {
    console.error("Error generating image prompt with characters:", error);
    throw error;
  }
};
