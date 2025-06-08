import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GenerationMode } from '../types';

export interface StoryState {
  storyInput: string;
  storyChunks: string[];
  currentChunkIndex: number;
  isMultiPartStory: boolean;
  generationMode: GenerationMode;
  isProcessingGlobal: boolean;
  processingMessage: string;
  globalError: string | null;
}

const initialState: StoryState = {
  storyInput: '',
  storyChunks: [],
  currentChunkIndex: 0,
  isMultiPartStory: false,
  generationMode: 'story',
  isProcessingGlobal: false,
  processingMessage: '',
  globalError: null,
};

const storySlice = createSlice({
  name: 'story',
  initialState,
  reducers: {
    setStoryInput: (state, action: PayloadAction<string>) => {
      state.storyInput = action.payload;
    },
    setStoryChunks: (state, action: PayloadAction<string[]>) => {
      state.storyChunks = action.payload;
    },
    setCurrentChunkIndex: (state, action: PayloadAction<number>) => {
      state.currentChunkIndex = action.payload;
    },
    incrementChunkIndex: (state) => {
      state.currentChunkIndex += 1;
    },
    setIsMultiPartStory: (state, action: PayloadAction<boolean>) => {
      state.isMultiPartStory = action.payload;
    },
    setGenerationMode: (state, action: PayloadAction<GenerationMode>) => {
      state.generationMode = action.payload;
    },
    setIsProcessingGlobal: (state, action: PayloadAction<boolean>) => {
      state.isProcessingGlobal = action.payload;
    },
    setProcessingMessage: (state, action: PayloadAction<string>) => {
      state.processingMessage = action.payload;
    },
    setGlobalError: (state, action: PayloadAction<string | null>) => {
      state.globalError = action.payload;
    },
    clearGlobalError: (state) => {
      state.globalError = null;
    },
    resetStoryState: (state) => {
      state.storyInput = '';
      state.storyChunks = [];
      state.currentChunkIndex = 0;
      state.isMultiPartStory = false;
      state.globalError = null;
      state.processingMessage = '';
    },
  },
});

export const {
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
  resetStoryState,
} = storySlice.actions;

export default storySlice.reducer; 