# Redux Store Implementation

This directory contains the Redux Toolkit implementation with state persistence for the AI Story Visualizer application.

## Structure

### Store Slices

#### 1. `storySlice.ts`
Manages the core story processing state:
- `storyInput`: The user's input text
- `storyChunks`: Story divided into processable chunks
- `currentChunkIndex`: Current chunk being processed
- `isMultiPartStory`: Whether story was split into multiple parts
- `generationMode`: 'story' or 'illustration' mode
- `isProcessingGlobal`: Global processing state
- `processingMessage`: Current processing status message
- `globalError`: Error messages

#### 2. `sequencesSlice.ts`
Manages generated sequences and images:
- `sequences`: Array of processed sequences with prompts and images
- Actions for updating individual sequences, prompts, and image generation status

#### 3. `settingsSlice.ts`
Manages application settings:
- `selectedImageStyle`: Image generation style (cinematic, anime, etc.)
- `selectedAspectRatio`: Image aspect ratio preference
- `characterRace`: Default character race/ethnicity
- `characters`: Auto-detected characters from story
- `apiKeyStatus`: API key validation status

### Core Files

#### `index.ts`
Main store configuration combining all slices and exporting TypeScript types.
- Includes redux-persist configuration for localStorage persistence
- Root reset functionality to clear all persisted state when needed

#### `hooks.ts`
Typed React-Redux hooks for TypeScript integration:
- `useAppDispatch`: Typed dispatch hook
- `useAppSelector`: Typed selector hook
- `useStateReset`: Hook for manual state clearing (removes persisted data)

## State Persistence

### Automatic State Persistence
The application automatically persists state in these scenarios:
- **All Redux State**: Automatically saved to localStorage on every change
- **Page Refresh**: State is restored from localStorage when the app loads
- **Browser Close/Reopen**: Your work is preserved between sessions
- **Accidental Navigation**: No data loss if you navigate away and return

### Manual State Reset
- **Reset Button**: "Reset All Data" button clears all state and localStorage
- **Programmatic Reset**: Use `resetAllState()` action or `resetState()` from `useStateReset`

### What Gets Persisted
- ✅ Story input text
- ✅ Generated sequences and images
- ✅ Character descriptions
- ✅ User preferences (style, aspect ratio, etc.)
- ✅ Processing progress (for multi-part stories)

### Implementation Details
```typescript
// Persistence configuration
const persistConfig = {
  key: 'root',
  storage, // localStorage
  version: 1
};

// Manual reset (clears localStorage too)
const resetState = useStateReset();
resetState(); // Clears all data and localStorage
```

## Usage

### In Components
```typescript
import { useAppDispatch, useAppSelector, useStateReset } from './store/hooks';
import { setStoryInput, setGlobalError } from './store/storySlice';

const MyComponent = () => {
  const dispatch = useAppDispatch();
  const { storyInput, isProcessingGlobal } = useAppSelector(state => state.story);
  const resetState = useStateReset(); // Manual reset function
  
  const handleInputChange = (value: string) => {
    dispatch(setStoryInput(value)); // Automatically persisted
  };
  
  const handleReset = () => {
    resetState(); // Manually clear all persisted state
  };
  
  // ... component logic
};
```

### State Access Patterns
- Use `useAppSelector` to access state from any slice
- Use `useAppDispatch` to dispatch actions (automatically persisted)
- State is automatically restored on app startup
- Use `useStateReset` for manual reset capability

## Migration from useState

The app was refactored from local `useState` hooks to Redux Toolkit with persistence:
- All state management moved to Redux slices
- Actions replace direct state setters
- Selectors replace direct state access
- Added automatic state persistence across browser sessions
- Better separation of concerns and state organization

## Benefits

1. **Centralized State**: All application state in one predictable location
2. **Better DevTools**: Redux DevTools for debugging and time travel
3. **Type Safety**: Full TypeScript integration with typed hooks
4. **Scalability**: Easy to add new features and state management
5. **Testing**: Easier to test with predictable state updates
6. **Performance**: React-Redux optimizations for re-renders
7. **Data Persistence**: Never lose your work - state survives refreshes and sessions
8. **User Experience**: Continue where you left off, no data loss

## Persistence Details

- **Storage**: localStorage (survives browser restarts)
- **Serialization**: Automatic JSON serialization/deserialization
- **Version Management**: Built-in migration support for future updates
- **Reset Capability**: Complete reset removes all localStorage data
- **Loading State**: PersistGate shows loading while rehydrating state 