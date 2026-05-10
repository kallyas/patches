import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = '@patches/intro-seen/v1';

/**
 * Tracks whether the player has finished (or skipped) the first-launch
 * tutorial. Persisted so the tutorial only auto-runs once; can still be
 * replayed manually from the About screen.
 */
export function useIntroSeen() {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setSeen(v === '1'))
      .catch(() => setSeen(false));
  }, []);

  const markSeen = useCallback(async () => {
    setSeen(true);
    try {
      await AsyncStorage.setItem(KEY, '1');
    } catch {}
  }, []);

  return { seen, loading: seen === null, markSeen };
}
