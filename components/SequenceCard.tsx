import React, { useState, useEffect, useCallback } from 'react';
import { ProcessedSequence } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface SequenceCardProps {
  sequence: ProcessedSequence;
  index: number;
  onUpdatePrompt: (sequenceId: string, newPrompt: string) => void;
  onGenerateImage: (sequenceId: string, promptToUse: string) => Promise<void>; // Make it async
  isGeneratingAllImages: boolean; // To disable buttons when global generation is active
}

const PROMPT_TRUNCATE_LENGTH = 150; // Keep this for display if not editing

const SequenceCard: React.FC<SequenceCardProps> = ({ sequence, index, onUpdatePrompt, onGenerateImage, isGeneratingAllImages }) => {
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState(sequence.currentPrompt || '');
  const [isPromptExpanded, setIsPromptExpanded] = useState(false); // For non-editing view
  const [isGeneratingThisImage, setIsGeneratingThisImage] = useState(false);

  useEffect(() => {
    // If the sequence.currentPrompt changes from App.tsx (e.g. initial generation), update local editablePrompt
    // only if not currently editing, to avoid overwriting user's ongoing edits.
    if (!isEditingPrompt && sequence.currentPrompt !== editablePrompt) {
      setEditablePrompt(sequence.currentPrompt || '');
    }
  }, [sequence.currentPrompt, isEditingPrompt]);


  const handleEditPrompt = () => {
    setIsEditingPrompt(true);
  };

  const handleSavePrompt = () => {
    onUpdatePrompt(sequence.id, editablePrompt);
    setIsEditingPrompt(false);
  };

  const handleCancelEdit = () => {
    setEditablePrompt(sequence.currentPrompt || ''); // Reset to last saved/generated prompt
    setIsEditingPrompt(false);
  };

  const handleGenerateImageClick = async () => {
    if (isGeneratingThisImage || isGeneratingAllImages) return;
    setIsGeneratingThisImage(true);
    try {
      await onGenerateImage(sequence.id, editablePrompt);
    } catch (e) {
      // Error is handled by App.tsx by updating sequence status/error
      console.error("Error generating image for sequence card:", e);
    } finally {
      setIsGeneratingThisImage(false);
    }
  };

  const togglePromptExpansion = () => {
    setIsPromptExpanded(!isPromptExpanded);
  };
  
  const getStatusMessage = () => {
    switch (sequence.status) {
      case 'segmenting': return 'Segmenting...';
      case 'prompting': return 'AI Generating Prompt...';
      case 'prompt_generated': return 'Prompt ready. Review or generate image.';
      case 'awaiting_image_generation': return 'Queued for image generation.';
      case 'image_generating': return 'AI Generating Image...';
      case 'completed': return 'Image Ready!';
      case 'error': return `Error: ${sequence.error || 'Unknown'}`;
      default: return 'Pending...';
    }
  };

  const canEditPrompt = sequence.status === 'prompt_generated' || (sequence.status === 'completed' && !sequence.imageUrl); // Allow edit if prompt is ready or if completed but image failed
  const canGenerateImage = 
    (sequence.status === 'prompt_generated' || sequence.status === 'awaiting_image_generation' || (sequence.status === 'error' && !!sequence.currentPrompt)) && 
    !sequence.imageUrl && // Don't regenerate if image already exists, unless we add a "regenerate" feature
    !!editablePrompt.trim();


  const renderGeneratedPromptDisplay = () => {
    if (!sequence.currentPrompt && sequence.status !== 'prompting') return null;
    if (sequence.status === 'prompting') {
      return (
        <div className="mb-3 p-3 bg-gray-700 rounded animate-pulse">
          <h4 className="text-sm font-medium text-gray-400 mb-1">Generated Prompt:</h4>
          <p className="text-sm text-gray-300 italic">AI is thinking...</p>
        </div>
      );
    }

    const isLongPrompt = (sequence.currentPrompt || '').length > PROMPT_TRUNCATE_LENGTH;
    const displayText = isPromptExpanded || !isLongPrompt 
      ? sequence.currentPrompt 
      : `${(sequence.currentPrompt || '').substring(0, PROMPT_TRUNCATE_LENGTH)}...`;

    return (
      <div className="mb-3 p-3 bg-gray-700 rounded">
        <div className="flex justify-between items-center mb-1">
          <h4 className="text-sm font-medium text-gray-400">Generated Prompt:</h4>
          {canEditPrompt && !isEditingPrompt && (
            <button
              onClick={handleEditPrompt}
              disabled={isGeneratingThisImage || isGeneratingAllImages}
              className="text-xs text-sky-400 hover:text-sky-300 focus:outline-none disabled:opacity-50"
              aria-label="Edit prompt"
            >
              Edit <span role="img" aria-label="pencil icon">✏️</span>
            </button>
          )}
        </div>
        <p className="text-sm text-gray-200 italic whitespace-pre-wrap">{displayText}</p>
        {isLongPrompt && !isEditingPrompt && (
          <button 
            onClick={togglePromptExpansion} 
            className="text-xs text-sky-400 hover:text-sky-300 mt-1 focus:outline-none"
            aria-expanded={isPromptExpanded}
          >
            {isPromptExpanded ? 'See Less' : 'See More'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-xl flex flex-col transition-all duration-300 ease-in-out">
      <h3 className="text-lg font-semibold text-sky-400 mb-3 border-b border-gray-700 pb-2">
        {sequence.mode === 'story' ? 'Scene' : 'Concept'} {index + 1} {sequence.partNumber ? `(Part ${sequence.partNumber})` : ''}
        {sequence.mode && (
          <span className="text-xs text-gray-500 ml-2 font-normal">
            ({sequence.mode === 'story' ? 'Story Mode' : 'Illustration Mode'})
          </span>
        )}
      </h3>
      
      <div className="mb-3 p-3 bg-gray-700 bg-opacity-50 rounded">
        <h4 className="text-sm font-medium text-gray-400 mb-1">
          {sequence.mode === 'story' ? 'Original Scene Text:' : 'Concept Description:'}
        </h4>
        <p className="text-sm text-gray-300 whitespace-pre-wrap">{sequence.originalSceneText}</p>
      </div>

      {sequence.relevantCharacters && sequence.relevantCharacters.length > 0 && (
        <div className="mb-3 p-2 bg-sky-900 bg-opacity-30 rounded border border-sky-700">
          <h4 className="text-sm font-medium text-sky-300 mb-1">
            Characters in this {sequence.mode === 'story' ? 'scene' : 'concept'}:
          </h4>
          <div className="space-y-1">
            {sequence.relevantCharacters.map((char, charIndex) => (
              <div key={charIndex} className="text-xs text-sky-200">
                <span className="font-medium">{char.name}:</span> {char.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {sequence.status === 'error' && sequence.error && (
        <div className="my-2 p-3 bg-red-800 bg-opacity-70 text-red-200 rounded-md text-xs">
          <p className="font-semibold">Error:</p>
          <p>{sequence.error}</p>
        </div>
      )}

      {isEditingPrompt ? (
        <div className="mb-3 p-3 bg-gray-700 rounded">
          <h4 className="text-sm font-medium text-gray-400 mb-1">Edit Prompt:</h4>
          <textarea
            value={editablePrompt}
            onChange={(e) => setEditablePrompt(e.target.value)}
            rows={5}
            className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md shadow-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-gray-100 text-sm"
            aria-label="Editable image prompt"
          />
          <div className="mt-2 space-x-2">
            <button onClick={handleSavePrompt} className="text-xs px-3 py-1 bg-sky-600 hover:bg-sky-500 rounded text-white focus:outline-none">Save</button>
            <button onClick={handleCancelEdit} className="text-xs px-3 py-1 bg-gray-500 hover:bg-gray-400 rounded text-white focus:outline-none">Cancel</button>
          </div>
        </div>
      ) : (
        renderGeneratedPromptDisplay()
      )}
      
      <div className="mt-auto text-center py-2 min-h-[60px]"> {/* min-h to prevent layout shift */}
        {(isGeneratingThisImage || (sequence.status === 'image_generating' && !isGeneratingThisImage)) && (
          <div className="flex flex-col items-center text-sky-300 py-4">
            <LoadingSpinner size="md" />
            <span className="text-xs mt-2">AI Generating Image...</span>
          </div>
        )}
        {sequence.imageUrl && sequence.status === 'completed' && !isGeneratingThisImage && (
          <img 
            src={sequence.imageUrl} 
            alt={`Generated for ${sequence.mode === 'story' ? 'scene' : 'concept'} ${index + 1}`}
            className="w-full h-auto max-h-96 object-contain rounded-md border-2 border-gray-700 shadow-md my-2"
            loading="lazy"
          />
        )}
        {sequence.status === 'error' && !sequence.imageUrl && !isGeneratingThisImage && (
           <div className="w-full min-h-[100px] flex items-center justify-center bg-gray-700 rounded-md border-2 border-red-700 my-2">
             <p className="text-red-400 text-sm p-2">Image generation failed for this {sequence.mode === 'story' ? 'scene' : 'concept'}.</p>
           </div>
        )}
         { (sequence.status === 'prompt_generated' || sequence.status === 'awaiting_image_generation' || (sequence.status === 'completed' && !sequence.imageUrl) ) && !isGeneratingThisImage && !sequence.imageUrl && (
            <div className="w-full min-h-[100px] flex items-center justify-center bg-gray-700 rounded-md border-2 border-gray-600 my-2">
             <p className="text-gray-500 text-sm p-2">Image will appear here</p>
           </div>
         )}
      </div>
      
      {canGenerateImage && !isEditingPrompt && !isGeneratingThisImage && sequence.status !== 'completed' && (
        <button
          onClick={handleGenerateImageClick}
          disabled={isGeneratingAllImages || isGeneratingThisImage}
          className="w-full mt-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {isGeneratingThisImage ? 'Generating...' : `Generate Image for this ${sequence.mode === 'story' ? 'Scene' : 'Concept'}`}
        </button>
      )}

      <div className="mt-2 text-center">
        <p className="text-xs text-gray-500">{getStatusMessage()}</p>
      </div>
    </div>
  );
};

export default SequenceCard;
