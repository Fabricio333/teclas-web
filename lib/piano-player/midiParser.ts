/* eslint-disable @typescript-eslint/no-explicit-any */
/*
Project Name : midi-parser-js
Project Url  : https://github.com/colxi/midi-parser-js/
Author       : colxi
Author URL   : http://www.colxi.info/
Description  : MidiParser library reads .MID binary files, Base64 encoded MIDI Data,
or UInt8 Arrays, and outputs as a readable and structured JS object.
*/

'use strict';

const _atob = function (string: string) {
  const b64 =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  // eslint-disable-next-line no-useless-escape
  const b64re =
    /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
  string = string.replace(/^.*?base64,/, '');
  string = String(string).replace(/[\t\n\f\r ]+/g, '');
  if (!b64re.test(string))
    throw new TypeError(
      'Failed to execute _atob() : The string to be decoded is not correctly encoded.',
    );

  string += '=='.slice(2 - (string.length & 3));
  let bitmap,
    result = '';
  let r1,
    r2,
    i = 0;
  for (; i < string.length;) {
    bitmap =
      (b64.indexOf(string.charAt(i++)) << 18) |
      (b64.indexOf(string.charAt(i++)) << 12) |
      ((r1 = b64.indexOf(string.charAt(i++))) << 6) |
      (r2 = b64.indexOf(string.charAt(i++)));

    result +=
      r1 === 64
        ? String.fromCharCode((bitmap >> 16) & 255)
        : r2 === 64
          ? String.fromCharCode((bitmap >> 16) & 255, (bitmap >> 8) & 255)
          : String.fromCharCode(
              (bitmap >> 16) & 255,
              (bitmap >> 8) & 255,
              bitmap & 255,
            );
  }
  return result;
};

export enum MIDIEventType {
  NoteOff = 8,
  NoteOn = 9,
  NoteAftertouch = 10,
  Controller = 11,
  ProgramChange = 12,
  ChannelAftertouch = 13,
  PitchBend = 14,
  SetTempo = 0x51,
}

class midiFile {
  public data: any = null;
  public pointer: number = 0;

  movePointer(_bytes: number): number {
    this.pointer += _bytes;
    return this.pointer;
  }

  readInt(_bytes: number) {
    _bytes = Math.min(_bytes, this.data.byteLength - this.pointer);
    if (_bytes < 1) return -1;
    let value = 0;
    if (_bytes > 1) {
      for (let i = 1; i <= _bytes - 1; i++) {
        value += this.data.getUint8(this.pointer) * Math.pow(256, _bytes - i);
        this.pointer++;
      }
    }
    value += this.data.getUint8(this.pointer);
    this.pointer++;
    return value;
  }

  readStr(_bytes: number) {
    let text = '';
    for (let char = 1; char <= _bytes; char++)
      text += String.fromCharCode(this.readInt(1));
    return text;
  }

  readIntVLV() {
    let value = 0;
    if (this.pointer >= this.data.byteLength) {
      return -1;
    } else if (this.data.getUint8(this.pointer) < 128) {
      value = this.readInt(1);
    } else {
      const FirstBytes = [];
      while (this.data.getUint8(this.pointer) >= 128) {
        FirstBytes.push(this.readInt(1) - 128);
      }
      const lastByte = this.readInt(1);
      for (let dt = 1; dt <= FirstBytes.length; dt++) {
        value += FirstBytes[FirstBytes.length - dt] * Math.pow(128, dt);
      }
      value += lastByte;
    }
    return value;
  }
}

export type MIDIEventData = {
  data: any;
  deltaTime: number;
  metaType: number;
  type: number;
  channel?: number;
};

export class MIDI {
  public data: unknown | null = null;
  public formatType: number = 0;
  public tracks: number = 0;
  public track: Array<{ event: MIDIEventData[] }> = [];
  public timeDivision: Array<any> | number = [];
  public bpm: number = 120;
}

export class MidiParser {
  private debug: boolean = false;

  parse(input: unknown): MIDI | boolean {
    if (input instanceof Uint8Array) return this.Uint8(input);
    else if (typeof input === 'string') return this.Base64(input);
    else throw new Error('MidiParser.parse() : Invalid input provided');
  }

  Base64(b64String: string) {
    b64String = String(b64String);
    const raw = _atob(b64String);
    const rawLength = raw.length;
    const t_array = new Uint8Array(new ArrayBuffer(rawLength));
    for (let i = 0; i < rawLength; i++) t_array[i] = raw.charCodeAt(i);
    return this.Uint8(t_array);
  }

  Uint8(FileAsUint8Array: Uint8Array) {
    const file = new midiFile();
    file.data = new DataView(
      FileAsUint8Array.buffer,
      FileAsUint8Array.byteOffset,
      FileAsUint8Array.byteLength,
    );

    if (file.readInt(4) !== 0x4d546864) {
      console.warn(
        'Header validation failed (not MIDI standard or file corrupt.)',
      );
      return false;
    }

    file.readInt(4); // header size
    const midi = new MIDI();
    midi.formatType = file.readInt(2);
    midi.tracks = file.readInt(2);
    midi.track = [];
    const timeDivisionByte1 = file.readInt(1);
    const timeDivisionByte2 = file.readInt(1);
    if (timeDivisionByte1 >= 128) {
      midi.timeDivision = [];
      midi.timeDivision[0] = timeDivisionByte1 - 128;
      midi.timeDivision[1] = timeDivisionByte2;
    } else midi.timeDivision = timeDivisionByte1 * 256 + timeDivisionByte2;

    for (let t = 1; t <= midi.tracks; t++) {
      midi.track[t - 1] = { event: [] };
      const headerValidation = file.readInt(4);
      if (headerValidation === -1) break;
      if (headerValidation !== 0x4d54726b) return false;
      file.readInt(4);
      let e = 0;
      let endOfTrack = false;
      let statusByte;
      let laststatusByte: any;
      while (!endOfTrack) {
        e++;
        midi.track[t - 1].event[e - 1] = {
          data: [],
          deltaTime: 0,
          metaType: 0,
          type: 0,
        };
        midi.track[t - 1].event[e - 1].deltaTime = file.readIntVLV();
        statusByte = file.readInt(1);
        if (statusByte === -1) break;
        else if (statusByte >= 128) laststatusByte = statusByte;
        else {
          statusByte = laststatusByte;
          file.movePointer(-1);
        }

        if (statusByte === 0xff) {
          midi.track[t - 1].event[e - 1].type = 0xff;
          midi.track[t - 1].event[e - 1].metaType = file.readInt(1);
          const metaEventLength = file.readIntVLV();
          switch (midi.track[t - 1].event[e - 1].metaType) {
            case 0x2f:
            case -1:
              endOfTrack = true;
              break;
            case 0x01:
            case 0x02:
            case 0x03:
            case 0x04:
            case 0x05:
            case 0x07:
            case 0x06:
              midi.track[t - 1].event[e - 1].data =
                file.readStr(metaEventLength);
              break;
            case 0x21:
            case 0x59:
            case 0x51:
              midi.track[t - 1].event[e - 1].data =
                file.readInt(metaEventLength);
              break;
            case 0x54:
              midi.track[t - 1].event[e - 1].data = [];
              midi.track[t - 1].event[e - 1].data[0] = file.readInt(1);
              midi.track[t - 1].event[e - 1].data[1] = file.readInt(1);
              midi.track[t - 1].event[e - 1].data[2] = file.readInt(1);
              midi.track[t - 1].event[e - 1].data[3] = file.readInt(1);
              midi.track[t - 1].event[e - 1].data[4] = file.readInt(1);
              break;
            case 0x58:
              midi.track[t - 1].event[e - 1].data = [];
              midi.track[t - 1].event[e - 1].data[0] = file.readInt(1);
              midi.track[t - 1].event[e - 1].data[1] = file.readInt(1);
              midi.track[t - 1].event[e - 1].data[2] = file.readInt(1);
              midi.track[t - 1].event[e - 1].data[3] = file.readInt(1);
              break;
            default:
              if (this.customInterpreter !== null) {
                midi.track[t - 1].event[e - 1].data = this.customInterpreter(
                  midi.track[t - 1].event[e - 1].metaType,
                  file,
                  metaEventLength,
                );
              }
              if (
                this.customInterpreter === null ||
                midi.track[t - 1].event[e - 1].data === false
              ) {
                file.readInt(metaEventLength);
                midi.track[t - 1].event[e - 1].data =
                  file.readInt(metaEventLength);
                if (this.debug)
                  console.info(
                    'Unimplemented 0xFF meta event! data block readed as Integer',
                  );
              }
          }
        } else if (statusByte !== undefined) {
          statusByte = statusByte.toString(16).split('');
          if (!statusByte[1]) statusByte.unshift('0');
          midi.track[t - 1].event[e - 1].type = parseInt(statusByte[0], 16);
          midi.track[t - 1].event[e - 1].channel = parseInt(statusByte[1], 16);
          switch (midi.track[t - 1].event[e - 1].type) {
            case 0xf: {
              if (this.customInterpreter !== null) {
                midi.track[t - 1].event[e - 1].data = this.customInterpreter(
                  midi.track[t - 1].event[e - 1].type,
                  file,
                  false,
                );
              }
              if (
                this.customInterpreter === null ||
                midi.track[t - 1].event[e - 1].data === false
              ) {
                const event_length = file.readIntVLV();
                midi.track[t - 1].event[e - 1].data =
                  file.readInt(event_length);
                if (this.debug)
                  console.info(
                    'Unimplemented 0xF exclusive events! data block readed as Integer',
                  );
              }
              break;
            }
            case 0xa:
            case 0xb:
            case 0xe:
            case 0x8:
            case 0x9:
              midi.track[t - 1].event[e - 1].data = [];
              midi.track[t - 1].event[e - 1].data[0] = file.readInt(1);
              midi.track[t - 1].event[e - 1].data[1] = file.readInt(1);
              break;
            case 0xc:
            case 0xd:
              midi.track[t - 1].event[e - 1].data = file.readInt(1);
              break;
            case -1:
              endOfTrack = true;
              break;
            default:
              if (this.customInterpreter !== null) {
                midi.track[t - 1].event[e - 1].data = this.customInterpreter(
                  midi.track[t - 1].event[e - 1].metaType,
                  file,
                  false,
                );
              }
              if (
                this.customInterpreter === null ||
                midi.track[t - 1].event[e - 1].data === false
              ) {
                console.log('Unknown EVENT detected... reading cancelled!');
                return false;
              }
          }
        }
      }
    }

    for (let i = 0; i < midi.track.length; i++) {
      for (let j = 0; j < midi.track[i].event.length; j++) {
        const event = midi.track[i].event[j];
        if (event.metaType === MIDIEventType.SetTempo) {
          if (typeof event.data === 'number') {
            midi.bpm = (1 / (event.data / 1000000)) * 60;
          }
        }
      }
    }

    return midi;
  }

  public customInterpreter:
    | ((
        e_type: unknown,
        arrayBuffer: unknown,
        metaEventLength: unknown,
      ) => number)
    | null = null;
}
