import type { SessionSnapshot } from '../../state/types.ts';

export type TimelineKeyframe = {
  readonly snapshot: SessionSnapshot;
  readonly label?: string;
};

export type TimelineState = {
  readonly keyframes: readonly TimelineKeyframe[];
  readonly currentTime: number; // 0 … keyframes.length-1, continuous float
  readonly isPlaying: boolean;
};
