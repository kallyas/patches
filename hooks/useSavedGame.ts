import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SavedGame, loadSavedGame } from '@/game/storage';

/**
 * Reads the saved-game snapshot from AsyncStorage and refreshes it whenever
 * the host screen regains focus (e.g. when the player navigates Home from
 * the game screen). Used by the Home screen to decide whether to show
 * "Continue" alongside "New game".
 */
export function useSavedGame() {
  const [savedGame, setSavedGame] = useState<SavedGame | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const g = await loadSavedGame();
    setSavedGame(g);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadSavedGame().then((g) => {
        if (cancelled) return;
        setSavedGame(g);
        setLoaded(true);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return { savedGame, loaded, refresh };
}
