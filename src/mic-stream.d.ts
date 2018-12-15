declare module "mic-stream" {
    import { Stream } from "stream";

    export interface Format {
        signed?: boolean;
        float?: boolean;
        bitDepth?: number;
        byteOrder?: 'LE';
        channels?: number;
        sampleRate?: number;
        interleaved?: boolean;
        samplesPerFrame?: number;
        sampleSize?: number;
        id?: string;
        max?: number;
        min?: number;
    }

    export default function micStream(options?: Format): Stream;
}