import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';
import storyReducer from './storySlice';
import sequencesReducer from './sequencesSlice';
import settingsReducer from './settingsSlice';

// Root action to reset all state
export const RESET_STATE = 'RESET_STATE';

// Combine all reducers
const rootReducer = combineReducers({
  story: storyReducer,
  sequences: sequencesReducer,
  settings: settingsReducer,
});

// Enhanced root reducer with reset capability
const enhancedRootReducer = (state: any, action: any) => {
  // Reset all state to initial values when RESET_STATE action is dispatched
  if (action.type === RESET_STATE) {
    // Clear persisted state
    storage.removeItem('persist:root');
    state = undefined;
  }
  
  return rootReducer(state, action);
};

// Persistence configuration
const persistConfig = {
  key: 'root',
  storage,
  version: 1,
  // Optionally blacklist certain reducers or state properties
  // blacklist: ['story'] // Example: don't persist story processing state
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, enhancedRootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// Action creator for resetting all state
export const resetAllState = () => ({ type: RESET_STATE });

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 