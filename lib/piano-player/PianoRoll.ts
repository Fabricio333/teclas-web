import {
  canvasText,
  highlightDark,
  highlight,
  noteHit,
  pianoRollFps,
  secondsPerViewport,
  sharpKeyWidthFactor,
  canvasScaleFactor,
} from './constants';
import type { Piano } from './Piano';
import defaultConfig from './config';
import type { Midi, Note } from './Midi';

export class PianoRoll {
  public width: number = 0;
  public height: number = 0;
  public time: number = 0;
  public bpm: number = 120;
  public ticksPerBeat: number = 1;
  public viewportTicks: number = 96 * 50;
  public speedFactor: number = 1;

  private deltaTicks: number = 1;
  private naturalKeyWidth: number = 0;
  private sharpKeyWidth: number = 0;

  private piano: Piano;
  private canvas: HTMLCanvasElement | null = null;
  private midi: Midi | null = null;

  private _isPlaying: boolean = false;
  private autoPlay: boolean = false;
  private stopUntilNotePress: boolean = false;
  private unsubConfig: (() => void) | null = null;

  constructor(piano: Piano) {
    this.piano = piano;
    this.piano.subscribe(() => {
      this.calculateKeyWidths();
    });

    this.calculateKeyWidths();

    this.unsubConfig = defaultConfig.subscribe((v) => {
      this.autoPlay = v.autoPlay;
      this.stopUntilNotePress = v.stopUntilNotePress;
    });
  }

  public dispose() {
    this.unsubConfig?.();
  }

  private calculateKeyWidths() {
    this.naturalKeyWidth = this.width / this.piano.getNumNaturalKeys();
    this.sharpKeyWidth = this.naturalKeyWidth * sharpKeyWidthFactor;
  }

  public setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const { width, height } = canvas.getBoundingClientRect();
    this.width = width;
    this.height = height;
    this.calculateKeyWidths();
  }

  public setNotes(midi: Midi) {
    this.midi = midi;
  }

  public hasNotes() {
    return this.midi !== null;
  }

  public getNoteWidth(midi: number) {
    return this.piano.isNoteNatural(midi)
      ? this.naturalKeyWidth
      : this.sharpKeyWidth;
  }

  public getNoteX(midi: number) {
    let res = 0;
    const octaveWidth = this.naturalKeyWidth * 7;
    const relativeIndex = midi - this.piano.getLeftMostMidiKey();
    const octaves = Math.floor(relativeIndex / 12);
    res += octaves * octaveWidth;
    const remainder = relativeIndex % 12;

    let naturals = 0;
    switch (remainder) {
      case 0:
      case 1:
        naturals = 0;
        break;
      case 2:
      case 3:
        naturals = 1;
        break;
      case 4:
        naturals = 2;
        break;
      case 5:
      case 6:
        naturals = 3;
        break;
      case 7:
      case 8:
        naturals = 4;
        break;
      case 9:
      case 10:
        naturals = 5;
        break;
      case 11:
        naturals = 6;
        break;
    }

    res += naturals * this.naturalKeyWidth;

    if (!this.piano.isNoteNatural(midi))
      res += this.naturalKeyWidth - this.sharpKeyWidth / 2;

    return res;
  }

  public draw() {
    if (this.canvas === null) return;
    if (this.midi === null) return;

    const ctx = this.canvas.getContext('2d');
    if (ctx === null) return;

    const bps = this.bpm / 60;
    const tickHeight =
      this.height / (secondsPerViewport * bps * this.ticksPerBeat) / 2;

    ctx.clearRect(0, 0, this.width, this.height);

    if (this.midi.getTrack(0).length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = canvasText;
      ctx.font = '35px Courier New, Courier, monospace';
      ctx.fillStyle = canvasText;
      for (
        let i = 0;
        i < this.height / tickHeight / this.ticksPerBeat + 1;
        i++
      ) {
        ctx.moveTo(
          0,
          this.height +
            (this.time % this.ticksPerBeat) * tickHeight -
            i * this.ticksPerBeat * tickHeight,
        );
        ctx.lineTo(
          this.width,
          this.height +
            (this.time % this.ticksPerBeat) * tickHeight -
            i * this.ticksPerBeat * tickHeight,
        );
        ctx.strokeText(
          String(Math.floor(this.time / this.ticksPerBeat) + i),
          10,
          this.height +
            (this.time % this.ticksPerBeat) * tickHeight -
            i * this.ticksPerBeat * tickHeight +
            35,
        );
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.fillStyle = highlight;
    const notePaddingFactor = 0.9;

    const highlightedNotes: Note[] = [];
    for (const note of this.midi.getTrack(0)) {
      if (this.piano.isNoteNatural(note.midiNumber)) {
        ctx.fillStyle = highlight;
      } else {
        ctx.fillStyle = highlightDark;
      }

      const x = this.getNoteX(note.midiNumber);
      const y =
        this.height - note.startTime * tickHeight + this.time * tickHeight;
      const w = this.getNoteWidth(note.midiNumber);
      const h = note.duration * tickHeight;

      const padding = (1 - notePaddingFactor) * w;

      ctx.beginPath();
      ctx.roundRect(
        x + padding / 2,
        y - h + 1,
        w - padding,
        h - 1,
        8 * canvasScaleFactor,
      );
      ctx.stroke();
      ctx.fill();
      ctx.closePath();

      if (this.autoPlay) {
        if (
          this.time > note.startTime &&
          this.time < note.startTime + note.duration
        ) {
          highlightedNotes.push(note);
        }

        if (
          this.time - this.deltaTicks <= note.startTime &&
          this.time > note.startTime
        ) {
          this.piano.press(note.midiNumber);
        } else if (
          this.time - this.deltaTicks < note.startTime + note.duration &&
          this.time > note.startTime + note.duration &&
          this.piano.isNoteDown(note.midiNumber)
        ) {
          this.piano.release(note.midiNumber);
        }
      }
    }

    ctx.resetTransform();
    for (let i = 0; i < highlightedNotes.length; i++) {
      const note = highlightedNotes[i];
      const x = this.getNoteX(note.midiNumber);
      const w = this.getNoteWidth(note.midiNumber);
      const h = note.duration * tickHeight;

      ctx.beginPath();
      const grad = ctx.createRadialGradient(
        x + w / 2,
        this.height + 20,
        0,
        x + w / 2,
        this.height + 20,
        40,
      );
      grad.addColorStop(0.7, noteHit);
      grad.addColorStop(1, '#ffffff00');
      ctx.fillStyle = grad;
      ctx.fillRect(
        x + w / 2 - this.naturalKeyWidth,
        this.height - h / 2,
        this.naturalKeyWidth * 2,
        h / 2,
      );
      ctx.stroke();
      ctx.fill();
      ctx.closePath();
    }
    ctx.resetTransform();
  }

  public resize(newWidth: number, newHeight: number) {
    this.width = newWidth;
    this.height = newHeight;
    this.calculateKeyWidths();
  }

  public setBpm(bpm: number) {
    this.bpm = bpm;
    this.calculateDeltaTicks();
  }

  public setSpeedFactor(factor: number) {
    this.speedFactor = factor;
    this.calculateDeltaTicks();
  }

  public setTicksPerBeat(ticks: number) {
    this.ticksPerBeat = ticks;
    this.viewportTicks =
      (secondsPerViewport / (1 / (this.bpm / 60))) * this.ticksPerBeat;
    this.calculateDeltaTicks();
  }

  public isPlaying() {
    return this._isPlaying;
  }

  public tick() {
    if (this.midi === null) return;

    if (this.stopUntilNotePress) {
      let allNecessaryNotesDown = true;
      for (const note of this.midi.getTrack(0)) {
        if (
          this.time - this.deltaTicks <= note.startTime &&
          this.time > note.startTime
        ) {
          if (!this.piano.isNoteDown(note.midiNumber)) {
            allNecessaryNotesDown = false;
          }
        }
      }
      if (!allNecessaryNotesDown) return;
    }

    if (this.time + this.deltaTicks > this.midi.trackLength) {
      this.time = this.midi.trackLength + this.deltaTicks - 1;
      this.stop();
    } else {
      this.time += this.deltaTicks;
    }
  }

  private calculateDeltaTicks() {
    const bps = this.bpm / 60;
    const deltaMs = 1000 / pianoRollFps;
    const deltaBeats = bps * (deltaMs / 1000);
    this.deltaTicks = deltaBeats * this.ticksPerBeat * this.speedFactor;
  }

  public play(updateCallback?: () => void, onEnd?: () => void) {
    this._isPlaying = true;
    const intervalTimeout = 1000 / pianoRollFps;

    const timer = setInterval(() => {
      if (!this.isPlaying()) {
        clearInterval(timer);
        return;
      }
      if (updateCallback !== undefined) {
        updateCallback();
      }
      this.tick();
      this.draw();
      if (onEnd !== undefined && !this._isPlaying) onEnd();
    }, intervalTimeout);
  }

  public stop() {
    this._isPlaying = false;
  }

  public getTimeMs() {
    return this.toTimeMs(this.time);
  }

  public toTimeMs(ticks: number) {
    const bps = this.bpm / 60;
    const spb = 1 / bps;
    const mspb = spb * 1000;
    const beats = ticks / this.ticksPerBeat;
    return beats * mspb;
  }

  public reset() {
    this.time = 0;
    this.draw();
  }
}
