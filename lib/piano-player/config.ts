import { WritableStore } from './store';

export type Config = {
  speedFactor: number;
  drawNoteLabels: boolean;
  drawBeatLabels: boolean;
  drawBeatLines: boolean;
  autoPlay: boolean;
  stopUntilNotePress: boolean;
  numOctaves: number;
  volume: number;
};

const defaultConfig = new WritableStore<Config>({
  speedFactor: 1,
  drawNoteLabels: false,
  drawBeatLabels: false,
  drawBeatLines: true,
  autoPlay: false,
  stopUntilNotePress: true,
  numOctaves: 4,
  volume: 0.5,
});

export function setAutoPlay(enabled: boolean) {
  defaultConfig.update((v) => {
    v.autoPlay = enabled;
    return v;
  });
}

export function setNumOctaves(num: number): boolean {
  if (num < 1 || num > 7) return false;
  defaultConfig.update((v) => {
    v.numOctaves = num;
    return v;
  });
  return true;
}

export function setVolume(volume: number): boolean {
  if (volume < 0 || volume > 1) return false;
  defaultConfig.update((v) => {
    v.volume = volume;
    return v;
  });
  return true;
}

export function setDrawNoteLabels(draw: boolean) {
  defaultConfig.update((v) => {
    v.drawNoteLabels = draw;
    return v;
  });
}

export function setStopUntilNotePress(enabled: boolean) {
  defaultConfig.update((v) => {
    v.stopUntilNotePress = enabled;
    return v;
  });
}

export default defaultConfig;
