import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ImageStyleType, AspectRatioType, CharacterRace, CharacterSet } from '../types';

export interface SettingsState {
  selectedImageStyle: ImageStyleType;
  selectedAspectRatio: AspectRatioType;
  characterRace: CharacterRace;
  characters: CharacterSet;
  apiKeyStatus: string;
}

const initialState: SettingsState = {
  selectedImageStyle: 'cinematic',
  selectedAspectRatio: 'auto',
  characterRace: 'any',
  characters: [],
  apiKeyStatus: '',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSelectedImageStyle: (state, action: PayloadAction<ImageStyleType>) => {
      state.selectedImageStyle = action.payload;
    },
    setSelectedAspectRatio: (state, action: PayloadAction<AspectRatioType>) => {
      state.selectedAspectRatio = action.payload;
    },
    setCharacterRace: (state, action: PayloadAction<CharacterRace>) => {
      state.characterRace = action.payload;
    },
    setCharacters: (state, action: PayloadAction<CharacterSet>) => {
      state.characters = action.payload;
    },
    clearCharacters: (state) => {
      state.characters = [];
    },
    setApiKeyStatus: (state, action: PayloadAction<string>) => {
      state.apiKeyStatus = action.payload;
    },
  },
});

export const {
  setSelectedImageStyle,
  setSelectedAspectRatio,
  setCharacterRace,
  setCharacters,
  clearCharacters,
  setApiKeyStatus,
} = settingsSlice.actions;

export default settingsSlice.reducer; 