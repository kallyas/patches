import { formatTime } from '@/hooks/useStats';

export interface ShareInput {
  puzzleNumber: number;
  timeMs: number;
  redraws: number;
  /** Current win streak (>= 1 to be included). */
  streak: number;
  /** Optional URL appended on its own line. */
  url?: string;
}

/**
 * Build the LinkedIn-style share string. Sample output:
 *
 *   Patches #52 | 0:46 🧶
 *   With 3 redraws
 *   🏅 I'm on a 51-win streak!
 *
 * The URL line is optional so a self-hosted clone doesn't have to point at
 * any specific destination.
 */
export function buildShareText(input: ShareInput): string {
  const { puzzleNumber, timeMs, redraws, streak, url } = input;
  const lines: string[] = [];
  lines.push(`Patches #${puzzleNumber} | ${formatTime(timeMs)} 🧶`);
  if (redraws > 0) {
    lines.push(`With ${redraws} ${redraws === 1 ? 'redraw' : 'redraws'}`);
  } else {
    lines.push('Solved on the first try ✨');
  }
  if (streak >= 2) {
    lines.push(`🏅 I'm on a ${streak}-win streak!`);
  }
  if (url) lines.push(url);
  return lines.join('\n');
}
