declare module "mic" {
    import { Transform, TransformOptions } from "stream";

    export interface MicOptions {
        endian?: 'big' | 'little';
        bitwidth?: number;
        encoding?: 'signed-integer' | 'unsigned-integer';
        rate?: number;
        channels?: number;
        device?: string;
        exitOnSilence?: number;
        fileType?: string;
        debug?: boolean;
    }

    interface IsSilenceOptions extends TransformOptions {
        debug?: boolean;
    }

    class IsSilence extends Transform {
        constructor(options?: IsSilenceOptions);

        getNumSilenceFramesExitThresh(): number;
        getConsecSilenceCount(): number;
        setNumSilenceFramesExitThresh(thresh: number): void;
        incrConsecSilenceCount(): number;
        resetConsecSilenceCount(): void;
    }

    export default class mic {
        constructor(options?: MicOptions);

        start(): void;
        stop(): void;
        pause(): void;
        resume(): void;
        getAudioStream(): IsSilence;
    }
}