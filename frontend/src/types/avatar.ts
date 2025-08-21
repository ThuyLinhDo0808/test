export type AvatarMessage = {
  animation: string;
  facialExpression: string;
  lipsync: {
    mouthCues: {
      start: number;
      end: number;
      value: string;
    }[];
  };
  audio: string;
};

export interface LipsyncMouthCue {
  start: number;
  end: number;
  value: string;
}

export interface Lipsync {
  mouthCues: LipsyncMouthCue[];
}