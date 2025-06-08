export type GenerationMode = 'story' | 'illustration';

export type CharacterRace = 'any' | 'caucasian' | 'african' | 'asian' | 'hispanic' | 'middle-eastern' | 'native-american' | 'mixed' | 'custom';

export interface RaceOption {
  value: CharacterRace;
  label: string;
}

export interface Character {
  name: string;
  description: string;
  race?: CharacterRace;
}

export type CharacterSet = Character[];

export interface ProcessedSequence {
  id: string;
  originalSceneText: string;
  generatedPrompt: string | null;
  currentPrompt: string | null; // For editing
  imageUrl: string | null;
  status: 'idle' | 'segmenting' | 'prompting' | 'prompt_generated' | 'awaiting_image_generation' | 'image_generating' | 'completed' | 'error';
  error?: string | null;
  partNumber?: number; // To track which part this sequence belongs to
  isPromptEdited?: boolean; // To track if the user has modified the prompt
  mode?: GenerationMode; // To track which mode was used to generate this sequence
  relevantCharacters?: Character[]; // Characters mentioned/relevant to this specific sequence
}

export interface SceneText {
  scene_description: string;
}

export type ImageStyleType = 'cinematic' | 'photorealistic' | 'anime' | 'fantasy' | 'pixel' | 'comic' | 'default';
export type AspectRatioType = 'auto' | 'widescreen' | 'square' | 'portrait';

export interface StyleOption {
  value: ImageStyleType;
  label: string;
}

export interface AspectRatioOption {
  value: AspectRatioType;
  label: string;
}
