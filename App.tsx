import React, { useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import * as FileSaver from 'file-saver';
import { ProcessedSequence, ImageStyleType, AspectRatioType, StyleOption, AspectRatioOption, GenerationMode, CharacterRace, RaceOption, Character, CharacterSet } from './types';
import { segmentStoryIntoScenes, generateImagePrompt, generateImageFromPrompt, generateIllustrationConcepts, generateIllustrationPrompt, generateCharacterDescriptions, identifyRelevantCharacters, generateImagePromptWithCharacters, generateIllustrationPromptWithCharacters } from './services/geminiService';
import SequenceCard from './components/SequenceCard';
import LoadingSpinner from './components/LoadingSpinner';
import { useAppDispatch, useAppSelector, useStateReset } from './store/hooks';
import {
  setStoryInput,
  setStoryChunks,
  setCurrentChunkIndex,
  incrementChunkIndex,
  setIsMultiPartStory,
  setGenerationMode,
  setIsProcessingGlobal,
  setProcessingMessage,
  setGlobalError,
  clearGlobalError,
  resetStoryState 
} from './store/storySlice';
import {
  setSequences,
  addSequences,
  clearSequences,
  updateSequence,
  updateSequencePrompt,
  updateSequenceStatus,
  updateSequenceImage,
  updateMultipleSequences
} from './store/sequencesSlice';
import {
  setSelectedImageStyle,
  setSelectedAspectRatio,
  setCharacterRace,
  setCharacters,
  clearCharacters,
  setApiKeyStatus
} from './store/settingsSlice';

const IMAGE_GENERATION_DELAY_MS = 12500; 
const MAX_STORY_LENGTH_TOTAL = 50000;
const CHUNK_CHARACTER_LIMIT = 7000;
const MAX_SCENES_WARNING_THRESHOLD = 20; 

const dataURLtoBlob = (dataurl: string): Blob | null => {
  const arr = dataurl.split(',');
  if (arr.length < 2) return null;
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) return null;
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const sanitizeFilename = (name: string, maxLength = 50): string => {
  const alphanumeric = name.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_');
  return alphanumeric.substring(0, maxLength);
};

const imageStyleOptions: StyleOption[] = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'photorealistic', label: 'Photorealistic' },
  { value: 'anime', label: 'Anime / Manga' },
  { value: 'fantasy', label: 'Fantasy Art' },
  { value: 'pixel', label: 'Pixel Art' },
  { value: 'comic', label: 'Comic Book' },
  { value: 'default', label: 'Default / Automatic' },
];

const aspectRatioOptions: AspectRatioOption[] = [
  { value: 'auto', label: 'Automatic (Default)' },
  { value: 'widescreen', label: 'Widescreen (16:9)' },
  { value: 'square', label: 'Square (1:1)' },
  { value: 'portrait', label: 'Portrait (9:16)' },
];

const raceOptions: RaceOption[] = [
  { value: 'any', label: 'Any / Let AI Decide' },
  { value: 'caucasian', label: 'Caucasian / White' },
  { value: 'african', label: 'African / Black' },
  { value: 'asian', label: 'Asian' },
  { value: 'hispanic', label: 'Hispanic / Latino' },
  { value: 'middle-eastern', label: 'Middle Eastern' },
  { value: 'native-american', label: 'Native American' },
  { value: 'mixed', label: 'Mixed Heritage' },
];

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Redux state selectors
  const {
    storyInput,
    storyChunks,
    currentChunkIndex,
    isMultiPartStory,
    generationMode,
    isProcessingGlobal,
    processingMessage,
    globalError
  } = useAppSelector((state) => state.story);
  
  const { sequences } = useAppSelector((state) => state.sequences);
  
  const {
    selectedImageStyle,
    selectedAspectRatio,
    characterRace,
    characters,
    apiKeyStatus
  } = useAppSelector((state) => state.settings);

  // Initialize state reset for manual clearing (state now persists across refreshes)
  const resetState = useStateReset();

  useEffect(() => {
    if (!process.env.API_KEY) {
        dispatch(setApiKeyStatus("API_KEY is not set. Application functionality will be limited."));
    } else {
        dispatch(setApiKeyStatus("API Key detected. Ready."));
    }
  }, [dispatch]);

  const splitStoryIntoChunks = (text: string, limit: number): string[] => {
    const chunks: string[] = [];
    let currentPosition = 0;
    while (currentPosition < text.length) {
      let endPosition = Math.min(currentPosition + limit, text.length);
      if (endPosition < text.length) {
        let lastSpace = text.lastIndexOf(' ', endPosition);
        let lastNewline = text.lastIndexOf('\n', endPosition);
        let splitAt = Math.max(lastSpace, lastNewline);
        if (splitAt > currentPosition && splitAt < endPosition ) {
             endPosition = splitAt + 1;
        }
      }
      chunks.push(text.substring(currentPosition, endPosition).trim());
      currentPosition = endPosition;
    }
    return chunks.filter(chunk => chunk.length > 0);
  };
  
  const handleProcessStoryAndGeneratePrompts = useCallback(async (storyPartText: string, partNumber: number, totalParts: number) => {
    if (!storyPartText.trim()) {
      dispatch(setGlobalError(`Part ${partNumber} is empty. Cannot process.`));
      if (isMultiPartStory && partNumber < totalParts) {
        dispatch(setProcessingMessage(`Part ${partNumber} was empty. Waiting for you to start Part ${partNumber + 1}.`));
      }
      return;
    }
    if (!process.env.API_KEY) {
      dispatch(setGlobalError("API Key is missing."));
      return;
    }

    dispatch(setIsProcessingGlobal(true));
    dispatch(clearGlobalError());
    if (partNumber === 1) dispatch(clearSequences()); // Clear existing sequences if starting a new story or the first part.
    
    dispatch(setProcessingMessage(`Part ${partNumber}/${totalParts}: Preparing ${generationMode === 'story' ? 'story scenes' : 'illustration concepts'}...`));

    let currentCharacters = characters;

    try {
      // Generate character descriptions if this is the first part and we don't have characters yet
      if (partNumber === 1 && currentCharacters.length === 0) {
        dispatch(setProcessingMessage(`Part ${partNumber}/${totalParts}: Identifying characters in the story...`));
        try {
          // Use the current story part text instead of joining all chunks
          const storyTextForCharacters = storyPartText || storyChunks.join('\n');
          const detectedCharacters = await generateCharacterDescriptions(storyTextForCharacters);
          
          if (detectedCharacters.length > 0) {
            // Apply the default race to characters that don't have one specified
            const charactersWithRace = detectedCharacters.map(char => ({
              ...char,
              race: char.race || characterRace
            }));
            dispatch(setCharacters(charactersWithRace));
            currentCharacters = charactersWithRace;
          }
        } catch (charError) { 
          console.warn("Could not auto-generate character descriptions:", charError);
        }
      }
      
      // Use different processing based on mode
      let sceneTexts: string[] = [];
      if (generationMode === 'story') {
        dispatch(setProcessingMessage(`Part ${partNumber}/${totalParts}: Segmenting story into scenes...`));
        sceneTexts = await segmentStoryIntoScenes(storyPartText);
      } else {
        dispatch(setProcessingMessage(`Part ${partNumber}/${totalParts}: Generating illustration concepts...`));
        sceneTexts = await generateIllustrationConcepts(storyPartText);
      }
      
      if (sceneTexts.length === 0) {
        dispatch(setGlobalError(`Could not ${generationMode === 'story' ? 'segment Part ' + partNumber + ' into scenes' : 'generate illustration concepts for Part ' + partNumber}.`));
        dispatch(setProcessingMessage(isMultiPartStory ? `Part ${partNumber} processing failed. Ready for next action.` : 'Processing failed.'));
        dispatch(setIsProcessingGlobal(false));
        return;
      }

      // Warning logic only applies to story mode with many scenes
      if (generationMode === 'story' && sceneTexts.length > MAX_SCENES_WARNING_THRESHOLD && partNumber === 1 && totalParts === 1) {
          const estimatedMinutes = Math.ceil((sceneTexts.length * IMAGE_GENERATION_DELAY_MS) / (1000 * 60));
          if (!window.confirm(`This story part has ${sceneTexts.length} scenes. Generating all images may take over ${estimatedMinutes} minute(s). Do you want to proceed with generating prompts?`)) {
              dispatch(setIsProcessingGlobal(false)); 
              dispatch(setProcessingMessage('Prompt generation cancelled.')); 
              return;
          }
      } else if (generationMode === 'story' && totalParts > 1 && partNumber === 1 ) {
           const totalEstimatedScenes = sceneTexts.length * totalParts; // Rough estimate for first part
           if (totalEstimatedScenes > MAX_SCENES_WARNING_THRESHOLD) {
             const estimatedMinutes = Math.ceil((totalEstimatedScenes * IMAGE_GENERATION_DELAY_MS) / (1000 * 60));
             if (!window.confirm(`This story (across ${totalParts} parts) might result in ~${totalEstimatedScenes} scenes. Processing all images may take over ${estimatedMinutes} minute(s). Continue with generating prompts for Part 1?`)) {
                 dispatch(setIsProcessingGlobal(false)); 
                 dispatch(setProcessingMessage('Prompt generation cancelled.')); 
                 return;
             }
           }
      }

      const initialSequencesPart: ProcessedSequence[] = sceneTexts.map((text, index) => ({
        id: `${generationMode}-part${partNumber}-${Date.now()}-${index}`,
        originalSceneText: text,
        generatedPrompt: null,
        currentPrompt: null, // Will be filled
        imageUrl: null,
        status: 'prompting' as const, 
        partNumber: partNumber,
        mode: generationMode,
        relevantCharacters: [], // Will be identified
      }));
      dispatch(addSequences(initialSequencesPart));

      const itemType = generationMode === 'story' ? 'scenes' : 'concepts';
      dispatch(setProcessingMessage(`Part ${partNumber}/${totalParts}: Generating prompts for ${initialSequencesPart.length} ${itemType}...`));
      
      for (let i = 0; i < initialSequencesPart.length; i++) {
        const currentSeqId = initialSequencesPart[i].id;
        try {
          // Identify relevant characters for this scene
          const relevantCharacters = currentCharacters.length > 0 
            ? await identifyRelevantCharacters(initialSequencesPart[i].originalSceneText, currentCharacters)
            : [];

          // Generate prompt using the new character-aware functions
          const imageGenPrompt = generationMode === 'story' 
            ? await generateImagePromptWithCharacters(
                initialSequencesPart[i].originalSceneText, 
                relevantCharacters, 
                selectedImageStyle, 
                selectedAspectRatio, 
                characterRace
              )
            : await generateIllustrationPromptWithCharacters(
                initialSequencesPart[i].originalSceneText, 
                relevantCharacters, 
                selectedImageStyle, 
                selectedAspectRatio, 
                characterRace
              );

          dispatch(updateSequence({
            id: currentSeqId,
            updates: {
              generatedPrompt: imageGenPrompt,
              currentPrompt: imageGenPrompt,
              status: 'prompt_generated' as const,
              relevantCharacters: relevantCharacters
            }
          }));
        } catch (promptError) {
          console.error("Error generating prompt for scene:", initialSequencesPart[i].originalSceneText, promptError);
          dispatch(updateSequence({
            id: currentSeqId,
            updates: {
              status: 'error' as const,
              error: `Failed to generate prompt: ${promptError instanceof Error ? promptError.message : String(promptError)}`
            }
          }));
        }
      }
      
      if (isMultiPartStory && partNumber < totalParts) {
        dispatch(incrementChunkIndex());
        dispatch(setProcessingMessage(`Part ${partNumber} prompts generated. Review/edit, then generate images or process Part ${partNumber + 1}.`));
      } else {
        dispatch(setIsMultiPartStory(false)); 
        dispatch(setProcessingMessage(sequences.some((s: ProcessedSequence) => s.status === 'error' && !s.generatedPrompt) ? 'Prompt generation completed with some errors. Review below.' : 'Prompts generated! Review and edit, then generate images.'));
      }

    } catch (error) {
      console.error(`Error processing prompts for Part ${partNumber}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch(setGlobalError(`An error occurred in Part ${partNumber} during prompt generation: ${errorMessage}`));
      dispatch(setProcessingMessage(`Error in Part ${partNumber}. Check errors.`));
      dispatch(updateMultipleSequences(s => 
        s.partNumber === partNumber && s.status === 'prompting' 
          ? { ...s, status: 'error' as const, error: `Failed during Part ${partNumber} prompt generation: ${errorMessage}` }
          : s
      ));
    } finally {
      dispatch(setIsProcessingGlobal(false));
    }
  }, [dispatch, selectedImageStyle, selectedAspectRatio, storyChunks, generationMode, characterRace, characters, isMultiPartStory, sequences]);

  const handleUpdatePrompt = useCallback((sequenceId: string, newPrompt: string) => {
    dispatch(updateSequencePrompt({ sequenceId, newPrompt }));
  }, [dispatch]);

  const handleGenerateImageForSequence = useCallback(async (sequenceId: string, promptToUse: string) => {
    if (!process.env.API_KEY) {
      dispatch(setGlobalError("API Key is missing."));
      dispatch(updateSequenceStatus({ id: sequenceId, status: 'error', error: 'API Key missing.' }));
      return;
    }
    
    dispatch(updateSequenceStatus({ id: sequenceId, status: 'image_generating' }));
    try {
      // Delay is handled by handleGenerateAllPendingImages or individual card can add one if needed for single generations outside batch
      const imageUrl = await generateImageFromPrompt(promptToUse); 
      dispatch(updateSequenceImage({ id: sequenceId, imageUrl }));
    } catch (error) {
      console.error("Error generating image:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      dispatch(updateSequenceStatus({ id: sequenceId, status: 'error', error: `Image generation failed: ${errorMsg}` }));
      if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota")) {
         dispatch(setGlobalError(`API rate limit potentially hit. Subsequent image requests may fail.`));
       }
      throw error; // Re-throw so card can catch if needed
    }
  }, [dispatch]);

  const handleGenerateAllPendingImages = useCallback(async () => {
    const sequencesToGenerate = sequences.filter((s: ProcessedSequence) => (s.status === 'prompt_generated' || s.status === 'awaiting_image_generation' || (s.status === 'error' && !s.imageUrl && !!s.currentPrompt)) && !s.imageUrl);
    if (sequencesToGenerate.length === 0) {
      dispatch(setProcessingMessage("No images pending generation or all prompts have images."));
      return;
    }

    dispatch(setIsProcessingGlobal(true));
    dispatch(setProcessingMessage(`Starting batch image generation for ${sequencesToGenerate.length} ${generationMode === 'story' ? 'scenes' : 'concepts'}...`));
    let generatedCount = 0;

    for (const seq of sequencesToGenerate) {
      if (!seq.currentPrompt) {
        dispatch(updateSequenceStatus({ id: seq.id, status: 'error', error: 'Skipped: Prompt is missing.' }));
        continue;
      }
      try {
        generatedCount++;
        const itemType = generationMode === 'story' ? 'Scene' : 'Concept';
        dispatch(setProcessingMessage(`Generating image ${generatedCount}/${sequencesToGenerate.length} (${itemType} ${sequences.findIndex((s: ProcessedSequence) => s.id === seq.id) + 1}). Waiting ${IMAGE_GENERATION_DELAY_MS / 1000}s...`));
        // Update status to awaiting_image_generation before delay for better UX
        dispatch(updateSequenceStatus({ id: seq.id, status: 'awaiting_image_generation' }));
        await new Promise(resolve => setTimeout(resolve, IMAGE_GENERATION_DELAY_MS));
        await handleGenerateImageForSequence(seq.id, seq.currentPrompt);
      } catch (error) {
        // Error is handled by handleGenerateImageForSequence setting status and error on the sequence
        console.error(`Failed generating image for sequence ${seq.id} in batch.`, error);
        // No need to break the loop, continue with others
      }
    }
    const itemType = generationMode === 'story' ? 'scenes' : 'concepts';
    dispatch(setProcessingMessage(generatedCount > 0 ? `Batch image generation completed for ${generatedCount} ${itemType}.` : "No images were generated in this batch."));
    dispatch(setIsProcessingGlobal(false));
  }, [dispatch, sequences, handleGenerateImageForSequence, generationMode]);


  const handleMainSubmit = useCallback(() => {
    if (!storyInput.trim() && !isMultiPartStory) { // Allow submit if multi-part and just moving to next part
      dispatch(setGlobalError("Please enter a story text."));
      return;
    }
    if (storyInput.length > MAX_STORY_LENGTH_TOTAL && !isMultiPartStory) {
      dispatch(setGlobalError(`The total story is too long (>${MAX_STORY_LENGTH_TOTAL} characters). Please shorten it.`));
      return;
    }

    dispatch(clearGlobalError());
    dispatch(setProcessingMessage("Preparing story..."));

    if (isMultiPartStory) { 
        if (currentChunkIndex < storyChunks.length) {
            handleProcessStoryAndGeneratePrompts(storyChunks[currentChunkIndex], currentChunkIndex + 1, storyChunks.length);
        } else {
            dispatch(setGlobalError("All parts seem to be processed."));
            dispatch(setIsMultiPartStory(false)); // Reset
        }
    } else { 
        // Clear existing characters when starting a new story
        dispatch(clearCharacters());
        
        const chunks = splitStoryIntoChunks(storyInput, CHUNK_CHARACTER_LIMIT);
        if (chunks.length > 1) {
            dispatch(setStoryChunks(chunks));
            dispatch(setCurrentChunkIndex(0));
            dispatch(setIsMultiPartStory(true));
            dispatch(setProcessingMessage(`Story divided into ${chunks.length} parts. Click "Process Part 1 Prompts" to begin.`));
            dispatch(clearSequences()); 
        } else {
            dispatch(setIsMultiPartStory(false));
            dispatch(setStoryChunks(chunks)); 
            dispatch(setCurrentChunkIndex(0));
            handleProcessStoryAndGeneratePrompts(chunks[0], 1, 1);
        }
    }
  }, [dispatch, storyInput, isMultiPartStory, currentChunkIndex, storyChunks, handleProcessStoryAndGeneratePrompts]);


  const handleDownloadAllImages = useCallback(async () => {
    const completedSequences = sequences.filter(s => s.imageUrl && s.status === 'completed');
    if (completedSequences.length === 0) {
      dispatch(setGlobalError("No successfully generated images available to download."));
      return;
    }

    const zip = new JSZip();
    dispatch(setProcessingMessage("Preparing ZIP file for download..."));

    for (let i = 0; i < completedSequences.length; i++) {
      const sequence = completedSequences[i];
      if (sequence.imageUrl) { // Redundant due to filter, but safe
        const blob = dataURLtoBlob(sequence.imageUrl);
        if (blob) {
          const sceneName = sanitizeFilename(sequence.originalSceneText.split(' ').slice(0, 5).join('_'), 30);
          const filename = `part${sequence.partNumber || 1}_scene_${sequences.findIndex(s => s.id === sequence.id) + 1}_${sceneName || `image_${i+1}`}.jpeg`;
          zip.file(filename, blob);
        }
      }
    }
    
    try {
        const content = await zip.generateAsync({ type: "blob" });
        FileSaver.saveAs(content, "ai_story_visuals.zip");
        dispatch(setProcessingMessage("ZIP file download initiated."));
    } catch (err) {
        console.error("Error generating zip file:", err);
        dispatch(setGlobalError("Failed to generate ZIP file."));
        dispatch(setProcessingMessage("Failed to create ZIP."));
    }

  }, [dispatch, sequences]);

  const canDownload = sequences.some(s => s.imageUrl && s.status === 'completed') && !isProcessingGlobal;
  const showGenerateAllImagesButton = sequences.some(s => (s.status === 'prompt_generated' || s.status === 'awaiting_image_generation' || (s.status === 'error' && !s.imageUrl && !!s.currentPrompt)) && !s.imageUrl) && !isProcessingGlobal;
  
  const getButtonText = () => {
    if (isProcessingGlobal && processingMessage.includes("prompts")) return "Generating Prompts...";
    if (isProcessingGlobal) return "Processing..."; // Generic for image batch or other global states
    if (isMultiPartStory) {
        if (currentChunkIndex < storyChunks.length) {
            return `Process Part ${currentChunkIndex + 1} Prompts`;
        } else { 
            return "All Parts Processed for Prompts"; 
        }
    }
    return generationMode === 'story' 
        ? "Analyze Story & Generate Scene Prompts"
        : "Analyze Story & Generate Illustration Concepts";
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-sky-400 tracking-tight">AI Story Visualizer</h1>
          <p className="mt-3 text-lg text-gray-400">Transform your narratives into stunning visual sequences.</p>
          <p className="mt-1 text-xs text-gray-500">
              Stories over ~{CHUNK_CHARACTER_LIMIT/1000}k chars are split. Max total ~{MAX_STORY_LENGTH_TOTAL/1000}k.
          </p>
        </header>

        {apiKeyStatus && (
          <div className={`w-full max-w-3xl mx-auto p-3 mb-6 rounded-md text-sm shadow ${process.env.API_KEY ? 'bg-green-800 bg-opacity-50 text-green-300' : 'bg-red-800 bg-opacity-70 text-red-200'}`}>
            {apiKeyStatus}
          </div>
        )}

        <div className="w-full max-w-3xl mx-auto bg-gray-800 shadow-2xl rounded-xl p-6 md:p-8 mb-10">
          <div className="space-y-6">
            <div>
              <label htmlFor="storyInput" className="block text-sm font-medium text-sky-300 mb-1">
                {isMultiPartStory && currentChunkIndex < storyChunks.length ? `Story - Part ${currentChunkIndex + 1} of ${storyChunks.length}` : `Your Story / Text`}
              </label>
              <textarea
                id="storyInput"
                rows={isMultiPartStory ? 5 : 10}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-400 text-gray-100 resize-y text-sm"
                placeholder={isMultiPartStory && currentChunkIndex < storyChunks.length ? `Content for Part ${currentChunkIndex + 1}. Click button below to process its prompts.` : "Paste your full story, script, or text here..."}
                value={isMultiPartStory && currentChunkIndex < storyChunks.length ? storyChunks[currentChunkIndex] : storyInput}
                onChange={(e) => !isMultiPartStory ? dispatch(setStoryInput(e.target.value)) : null}
                disabled={isProcessingGlobal || (isMultiPartStory && currentChunkIndex < storyChunks.length)}
                aria-describedby="storyInputHelp"
              />
              <p id="storyInputHelp" className="text-xs text-gray-500 mt-1">
                  {isMultiPartStory ? `Showing Part ${currentChunkIndex + 1}. Total chars processed: ${storyChunks.slice(0, currentChunkIndex).join('').length}` : `Enter your story. Long stories will be split into parts.`}
              </p>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-sky-300 mb-2">Generation Mode</label>
                    <div className="flex space-x-4">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="generationMode"
                                value="story"
                                checked={generationMode === 'story'}
                                onChange={(e) => dispatch(setGenerationMode(e.target.value as GenerationMode))}
                                disabled={isProcessingGlobal}
                                className="text-sky-500 bg-gray-700 border-gray-600 focus:ring-sky-500 focus:ring-2"
                            />
                            <span className="ml-2 text-sm text-gray-300">
                                <strong>Story Mode</strong> - Scene-by-scene visualization
                            </span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="generationMode"
                                value="illustration"
                                checked={generationMode === 'illustration'}
                                onChange={(e) => dispatch(setGenerationMode(e.target.value as GenerationMode))}
                                disabled={isProcessingGlobal}
                                className="text-sky-500 bg-gray-700 border-gray-600 focus:ring-sky-500 focus:ring-2"
                            />
                            <span className="ml-2 text-sm text-gray-300">
                                <strong>Illustration Mode</strong> - Artistic concept illustrations
                            </span>
                        </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {generationMode === 'story' 
                            ? 'Breaks story into sequential scenes and creates images for each scene.'
                            : 'Identifies key themes and moments to create artistic illustrations that capture the essence of the story.'
                        }
                    </p>
                </div>
                
                {characters.length > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-sky-300">
                                Auto-Detected Characters ({characters.length})
                            </label>
                            <button
                                onClick={() => dispatch(clearCharacters())}
                                disabled={isProcessingGlobal}
                                className="text-xs text-red-400 hover:text-red-300 focus:outline-none disabled:opacity-50"
                                title="Clear detected characters"
                            >
                                Clear ✕
                            </button>
                        </div>
                        <div className="space-y-2">
                            {characters.map((char, index) => (
                                <div key={index} className="bg-gray-700 p-3 rounded border border-gray-600">
                                    <div className="font-medium text-sky-300 mb-1">{char.name}</div>
                                    <div className="text-sm text-gray-300 mb-1">{char.description}</div>
                                    {char.race && char.race !== 'any' && (
                                        <div className="text-xs text-gray-400">
                                            Race: {raceOptions.find(r => r.value === char.race)?.label || char.race}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Characters automatically detected from your story. Each scene will reference only relevant characters.
                        </p>
                    </div>
                )}
                
                <div>
                    <label htmlFor="characterRace" className="block text-sm font-medium text-sky-300 mb-1">
                        Character Race/Ethnicity (Optional)
                    </label>
                    <select 
                        id="characterRace"
                        value={characterRace}
                        onChange={(e) => dispatch(setCharacterRace(e.target.value as CharacterRace))}
                        disabled={isProcessingGlobal}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-100 text-sm"
                    >
                        {raceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        Specify the race/ethnicity for characters in generated images. Select "Any" to let the AI decide.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="imageStyle" className="block text-sm font-medium text-sky-300 mb-1">Image Style</label>
                        <select 
                            id="imageStyle"
                            value={selectedImageStyle}
                            onChange={(e) => dispatch(setSelectedImageStyle(e.target.value as ImageStyleType))}
                            disabled={isProcessingGlobal}
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-100 text-sm"
                        >
                            {imageStyleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="aspectRatio" className="block text-sm font-medium text-sky-300 mb-1">Aspect Ratio</label>
                        <select 
                            id="aspectRatio"
                            value={selectedAspectRatio}
                            onChange={(e) => dispatch(setSelectedAspectRatio(e.target.value as AspectRatioType))}
                            disabled={isProcessingGlobal}
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-100 text-sm"
                        >
                            {aspectRatioOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <button
              onClick={handleMainSubmit}
              disabled={isProcessingGlobal || (!isMultiPartStory && !storyInput.trim()) || !process.env.API_KEY || (isMultiPartStory && currentChunkIndex >= storyChunks.length) }
              className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-sky-500 disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {isProcessingGlobal && processingMessage.includes("Prompts") ? (
                <><LoadingSpinner size="sm" color="text-white" /><span className="ml-2">Generating Prompts...</span></>
              ) : isProcessingGlobal ? (
                 <><LoadingSpinner size="sm" color="text-white" /><span className="ml-2">Processing...</span></>
              ) : (
                getButtonText()
              )}
            </button>
          </div>
          {globalError && (
            <div className="mt-4 p-3 bg-red-800 bg-opacity-70 text-red-200 rounded-md text-sm whitespace-pre-wrap shadow" role="alert">
              <p className="font-semibold">Error:</p> {globalError}
            </div>
          )}
           {processingMessage && (
            <div className={`mt-4 p-3 rounded-md text-sm text-center shadow ${
                isProcessingGlobal ? 'bg-sky-800 bg-opacity-50 text-sky-300' 
                : (processingMessage.toLowerCase().includes("error") || processingMessage.toLowerCase().includes("failed")) ? 'bg-red-800 bg-opacity-60 text-red-300'
                : 'bg-green-800 bg-opacity-50 text-green-300'}`} 
                role="status">
              {processingMessage}
            </div>
          )}
        </div>
        
        <div className="w-full max-w-5xl mx-auto mb-6 text-center space-x-4">
            {showGenerateAllImagesButton && (
                 <button
                    onClick={handleGenerateAllPendingImages}
                    disabled={isProcessingGlobal}
                    className="px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isProcessingGlobal && processingMessage.includes("image")? 
                        <><LoadingSpinner size="sm" color="text-white" /><span className="ml-2">Generating Images...</span></>
                        : "Generate All Pending Images"
                    }
                </button>
            )}
            {canDownload && (
                <button
                    onClick={handleDownloadAllImages}
                    disabled={isProcessingGlobal} // Also disable if any global processing
                    className="px-6 py-3 border border-sky-500 text-base font-medium rounded-md shadow-sm text-sky-300 hover:bg-sky-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Download All Images as ZIP
                </button>
            )}
            {(sequences.length > 0 || storyInput.trim() || characters.length > 0) && (
                <button
                    onClick={resetState}
                    disabled={isProcessingGlobal}
                    className="px-6 py-3 border border-red-500 text-base font-medium rounded-md shadow-sm text-red-300 hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Clear all data and reset the application"
                >
                    Reset All Data
                </button>
            )}
        </div>

        {sequences.length > 0 && (
          <div className="w-full mt-2">
            <h2 className="text-2xl sm:text-3xl font-semibold text-sky-300 mb-6 text-center">
              Generated {generationMode === 'story' ? 'Story Sequences' : 'Illustration Concepts'}
              <span className="text-lg text-gray-400"> ({sequences.filter((s: ProcessedSequence) => s.status === 'completed' && s.imageUrl).length} / {sequences.filter((s: ProcessedSequence) => s.currentPrompt).length} Images Ready)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sequences.map((seq, index) => (
                <SequenceCard 
                    key={seq.id} 
                    sequence={seq} 
                    index={index} 
                    onUpdatePrompt={handleUpdatePrompt}
                    onGenerateImage={handleGenerateImageForSequence}
                    isGeneratingAllImages={isProcessingGlobal && processingMessage.includes("image")}
                />
              ))}
            </div>
          </div>
        )}
         {isProcessingGlobal && sequences.length === 0 && (
           <div className="mt-10 text-center" aria-live="polite">
              <LoadingSpinner size="lg" />
              <p className="text-sky-300 mt-3 text-lg">{processingMessage || 'Preparing your visual story...'}</p>
           </div>
         )}

        <footer className="w-full mt-16 pt-8 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-500">
            Powered by Google Gemini & Imagen APIs. UI refined for modern experience.
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Image generation includes delays (~{IMAGE_GENERATION_DELAY_MS/1000}s per image) to respect API rate limits.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
