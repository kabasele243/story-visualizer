import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';
import { resetAllState } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Hook for manual state reset (removed automatic clearing for persistence)
export const useStateReset = () => {
  const dispatch = useAppDispatch();
  
  // Return function to manually reset state
  return () => dispatch(resetAllState());
}; 