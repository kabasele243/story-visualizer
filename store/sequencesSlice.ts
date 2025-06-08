import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ProcessedSequence } from '../types';

export interface SequencesState {
  sequences: ProcessedSequence[];
}

const initialState: SequencesState = {
  sequences: [],
};

const sequencesSlice = createSlice({
  name: 'sequences',
  initialState,
  reducers: {
    setSequences: (state, action: PayloadAction<ProcessedSequence[]>) => {
      state.sequences = action.payload;
    },
    addSequences: (state, action: PayloadAction<ProcessedSequence[]>) => {
      state.sequences.push(...action.payload);
    },
    clearSequences: (state) => {
      state.sequences = [];
    },
    updateSequence: (state, action: PayloadAction<{ id: string; updates: Partial<ProcessedSequence> }>) => {
      const { id, updates } = action.payload;
      const index = state.sequences.findIndex(seq => seq.id === id);
      if (index !== -1) {
        state.sequences[index] = { ...state.sequences[index], ...updates };
      }
    },
    updateSequencePrompt: (state, action: PayloadAction<{ sequenceId: string; newPrompt: string }>) => {
      const { sequenceId, newPrompt } = action.payload;
      const sequence = state.sequences.find(s => s.id === sequenceId);
      if (sequence) {
        sequence.currentPrompt = newPrompt;
        sequence.isPromptEdited = sequence.generatedPrompt !== newPrompt;
        sequence.status = 'prompt_generated';
      }
    },
    updateSequenceStatus: (state, action: PayloadAction<{ id: string; status: ProcessedSequence['status']; error?: string }>) => {
      const { id, status, error } = action.payload;
      const sequence = state.sequences.find(s => s.id === id);
      if (sequence) {
        sequence.status = status;
        if (error) {
          sequence.error = error;
        }
      }
    },
    updateSequenceImage: (state, action: PayloadAction<{ id: string; imageUrl: string }>) => {
      const { id, imageUrl } = action.payload;
      const sequence = state.sequences.find(s => s.id === id);
      if (sequence) {
        sequence.imageUrl = imageUrl;
        sequence.status = 'completed';
      }
    },
    updateMultipleSequences: (state, action: PayloadAction<(seq: ProcessedSequence) => ProcessedSequence>) => {
      const updateFn = action.payload;
      state.sequences = state.sequences.map(updateFn);
    },
  },
});

export const {
  setSequences,
  addSequences,
  clearSequences,
  updateSequence,
  updateSequencePrompt,
  updateSequenceStatus,
  updateSequenceImage,
  updateMultipleSequences,
} = sequencesSlice.actions;

export default sequencesSlice.reducer; 