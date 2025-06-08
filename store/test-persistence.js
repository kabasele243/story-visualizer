// Test script to verify state persistence functionality
// This can be run in the browser console to test persistence

console.log('=== Redux State Persistence Test ===');

// Check if Redux DevTools is available
if (window.__REDUX_DEVTOOLS_EXTENSION__) {
  console.log('✓ Redux DevTools detected - you can monitor state changes');
} else {
  console.log('ℹ Redux DevTools not detected - install extension for better debugging');
}

// Function to test state persistence
function testStatePersistence() {
  console.log('Testing state persistence functionality...');
  
  // Get current state
  const initialState = store.getState();
  console.log('Initial state:', initialState);
  
  // Simulate some state changes
  console.log('Setting test data...');
  store.dispatch(setStoryInput('Test story for persistence'));
  store.dispatch(setProcessingMessage('Testing persistence...'));
  store.dispatch(setCharacters([{ 
    name: 'Test Character', 
    description: 'A persistent test character',
    race: 'human'
  }]));
  
  const stateAfterChanges = store.getState();
  console.log('State after changes:', stateAfterChanges);
  
  // Check localStorage
  const persistedData = localStorage.getItem('persist:root');
  console.log('Persisted data in localStorage:', persistedData ? 'Found' : 'Not found');
  
  if (persistedData) {
    try {
      const parsed = JSON.parse(persistedData);
      console.log('Parsed persisted data keys:', Object.keys(parsed));
    } catch (e) {
      console.error('Error parsing persisted data:', e);
    }
  }
  
  console.log(`
✓ Test complete! Now:
1. Refresh the page
2. Check if your test data is still there
3. The story input should contain: "Test story for persistence"
4. Characters should include: "Test Character"

To reset and clear persistence:
- Click "Reset All Data" button
- Or call testStateReset() in console
  `);
  
  return true;
}

// Function to test state reset
function testStateReset() {
  console.log('Testing state reset (clearing persistence)...');
  
  const beforeReset = store.getState();
  console.log('State before reset:', beforeReset);
  
  // Reset state
  store.dispatch(resetAllState());
  
  const afterReset = store.getState();
  console.log('State after reset:', afterReset);
  
  // Check if localStorage was cleared
  const persistedData = localStorage.getItem('persist:root');
  console.log('Persisted data after reset:', persistedData ? 'Still exists' : 'Cleared');
  
  // Verify reset worked
  const isReset = (
    afterReset.story.storyInput === '' &&
    afterReset.story.processingMessage === '' &&
    afterReset.sequences.sequences.length === 0 &&
    afterReset.settings.characters.length === 0
  );
  
  console.log(isReset ? '✓ State reset successful!' : '✗ State reset failed!');
  
  console.log(`
✓ Reset test complete! 
- Refresh the page to verify persistence was cleared
- State should start fresh with empty values
  `);
  
  return isReset;
}

// Instructions for manual testing
console.log(`
=== Manual Testing Instructions ===

PERSISTENCE TEST:
1. Call testStatePersistence() in console
2. Refresh the page
3. Verify your test data is still there

RESET TEST:
1. Add some data to the app (story, characters, etc.)
2. Call testStateReset() OR click "Reset All Data" button
3. Refresh the page
4. Verify everything starts fresh

BROWSER SESSION TEST:
1. Add data to the app
2. Close the browser completely
3. Reopen and navigate back to the app
4. Verify your data is restored

Available functions:
- testStatePersistence() - Test saving data
- testStateReset() - Test clearing data and persistence
`);

// Export for use in console
if (typeof window !== 'undefined') {
  window.testStatePersistence = testStatePersistence;
  window.testStateReset = testStateReset;
} 