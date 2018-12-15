import { Scene, BaseSceneOptions } from "../struct/scene";
import { HueApi, lightState } from "node-hue-api";
import mic from "mic-stream";
import { EventEmitter } from "events";
import logger from "../util/logging";

const { YIN } = require('node-pitchfinder');
const WavDecoder = require("wav-decoder");

const coreAudio = require("node-core-audio");
const fft = require("fft-js").fft;
const fftUtil = require("fft-js").util;

class Interpreter extends EventEmitter implements NodeJS.WritableStream {
    writable: boolean;
    write(buffer: Buffer | string, cb?: string | Function): boolean;
    write(str: Buffer | string, encoding?: string | Function, cb?: Function): boolean {
        return this.emit("data", str);
    }
    end(cb?: Function | undefined): void;
    end(buffer: Buffer, cb?: Function | undefined): void;
    end(str: string, cb?: Function | undefined): void;
    end(str: string, encoding?: string | undefined, cb?: Function | undefined): void;
    end(str?: any, encoding?: any, cb?: any) {
    }
}

const average = (arr: number[]) => arr.reduce((a, c) => a + c, 0) / arr.length;

function scaleNumber(n: number, rMin: number, rMax: number, tMin: number, tMax: number) {
    let scaled = ((n - rMin) / (rMax - rMin)) * (tMax - tMin) + tMin;
    if (scaled > tMax) scaled = tMax;
    return scaled;
}

var sampleSize = 256;
var sampleRate = 44100; // Or whatever in use (Hz)
var tone = 1000; // tone to detect in Hz
var sin500Hz = Array(sampleSize);
var cos500Hz = Array(sampleSize);
for (var i = 0; i < sampleSize; i++) {
    sin500Hz[i] = Math.sin(2*Math.PI*tone/sampleRate*i)/Math.sqrt(sampleSize); 
    cos500Hz[i] = Math.cos(2*Math.PI*tone/sampleRate*i)/Math.sqrt(sampleSize); 
}

function findTone(inputSamples: Buffer) {
    var amplitudeSin = 0;
    var amplitudeCos = 0;

    let tones: number[] = [];
    for (var i = 0; i < inputSamples.length; i++) {
        //Pan two sound-waves back and forth, opposing
        var val1 = Math.sin(i * 110.0 * 2 * Math.PI / 44100.0) * 0.25, val2 = Math.sin(i * 440.0 * 2 * Math.PI / 44100.0) * 0.25;
        var pan1 = Math.sin(1 * Math.PI * i / 44100.0), pan2 = 1 - pan1;

        tones.push(val1 * pan1 + val2 * pan2); //left channel
    }
    for (var i = 0; i < sampleSize; i++) {
      amplitudeSin += inputSamples[i]*sin500Hz[i]; 
      amplitudeCos += inputSamples[i]*cos500Hz[i]; 
    }
    return Math.sqrt(amplitudeSin*amplitudeSin + amplitudeCos*amplitudeCos); 
}

function noiseLevel(inputSamples: Buffer) {
    var power = 0;
    var average = 0;
    for (var i = 0; i < inputSamples.length; i++) {
      average += inputSamples[i]; 
    }
    average /= inputSamples.length;
    for (var i = 0; i < inputSamples.length; i++) {
      power += Math.pow(inputSamples[i] - average, 2); 
    }
    return Math.sqrt(power); 
}

export default class SoundScene extends Scene {
    constructor(api: HueApi, options: BaseSceneOptions) {
        super(api, options, options.transition);
    }

    private tones: number[] = [];
    private levels: number[] = [];
    private prevRGB: number[];

    private rawSignals: Buffer[] = [];

    async startAudioEngine() {
        const engine = coreAudio.createNewAudioEngine({ inputChannels: 1, outputChannels: 2, interleaved: true, sendOutput: false});

        const processAudio = (inputBuffer: Buffer) => {
            // this.rawSignals.push(inputBuffer);

            const tone = findTone(inputBuffer) * 100;
            const level = findTone(inputBuffer) * 100;

            this.tones.push(tone);
            this.levels.push(level);

            return inputBuffer;
        }

        engine.addAudioCallback(processAudio);
    }

    init(): Promise<void> {
        return new Promise((resolve) => {
            this.startAudioEngine();
            resolve();
        });
    }

    async next() {
        const prevRGB = this.prevRGB, rgb = this.rgb, brightness = this.brightness;

        this.tones = [];
        this.levels = [];

        if (prevRGB && rgb.every((c, i) => {
            const diff = Math.abs(prevRGB[i] - c);
            
            if (diff < 5) return true;
            return false;
        })) {
            logger.debug('sound scene not updating, too little change');
            return;
        }

        logger.debug('sound scene new rgb: %s, new brightness: %s', rgb, brightness);

        await this.dispatch(lightState.create().rgb(rgb[0], rgb[1], rgb[2]).bri(brightness).transition(this.options.transition / 2));
    }

    private get toneAvg() {
        return average(this.tones);
    }

    private get levelAvg() {
        return average(this.levels);
    }

    private get rgb() {
        const size = this.tones.length;
        const chunkSize = parseInt((size / 3).toFixed(0));

        const chunks: number[] = [];

        chunks.push(average(this.tones.slice(0, chunkSize)));

        chunks.push(average(this.tones.slice(chunkSize + 1, chunkSize * 2)));

        chunks.push(average(this.tones.slice((chunkSize * 2) + 1)));

        const seed = this.toneAvg;

        const SEED_CIEL: number = 40;

        const r = Math.abs(scaleNumber(seed, 5, 15, 10, 255));
        const g = Math.abs(scaleNumber(seed, 1, 40, 10, 127.5));
        const b = Math.abs(scaleNumber(seed, 1, 15, 10, 255));

        return this.prevRGB = [r, g, b];
    }

    private get brightness() {
        let bri = this.levelAvg * 15;

        bri = bri > 100 ? 100 : bri;
        
        return parseInt(bri.toFixed(0));
    }

    private get frequencies(): number[] {
        const freq: number[] = [];

        this.rawSignals.forEach((signal, i) => {
            const fftArray: number[][] = fft(signal);

            let magnitude: number[] = fftArray.map(([real, imaginary]) => Math.sqrt(real * real + imaginary * imaginary))

            let maxMagnitude = magnitude[0];
            let maxIndex = 0;
            for (let i = 0; i < magnitude.length; i++) {
                if (magnitude[i] > maxMagnitude) {
                    maxMagnitude = magnitude[i];
                    maxIndex = i;
                }
            }

            freq[i] = (44100 * maxIndex) / (signal.length * 20);
        });

        this.rawSignals = [];

        return freq;
    }

    private get frequency() {
        return average(this.frequencies);
    }
}