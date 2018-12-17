import { Scene, BaseSceneOptions } from "../struct/scene";
import { HueApi, ILight, ILightGroup, lightState as LightState } from "node-hue-api";
import { RGB, randomNumber, RGBRange } from "../util/colors";

import tinygradient from "tinygradient";
import { ColorFormats } from "tinycolor2";
import logger from "../util/logging";

export interface GradientOptions extends BaseSceneOptions {
    brightnessRange?: number[];
    colorRange?: RGBRange;
    transitionModifier?: boolean | number;
    gradientSteps?: number;
    gradientStops?: number;
}

export const ColorRangeSamples: {[key: string]: RGBRange} = {
    sunset: {
        rangeR: [244,244],
        rangeG: [86, 170],
        rangeB: [66,66]
    },
    sky: {
        rangeR: [0,0],
        rangeG: [50,50]
    }
}

const RGB_LOOP_SIZE: number = 50;

export async function generateRGB(constraint?: RGBRange, stops?: number) {
    if (constraint) {
        if (!constraint.rangeR) constraint.rangeR = [0, 255];
        if (!constraint.rangeG) constraint.rangeG = [0, 255];
        if (!constraint.rangeB) constraint.rangeB = [0, 255];
    }

    const loop: Array<{r: number, g: number, b: number}> = [];

    for (let i = 0; i < (stops || RGB_LOOP_SIZE); i++) {
        loop[i] = RGB.random(constraint);
    }

    return loop;
}

export default class GradientScene extends Scene<GradientOptions> {
    constructor(api: HueApi, options: GradientOptions) {
        super(api, options, (options.transitionModifier === true || options.transitionModifier === undefined) ? options.transition * 1.5 : (options.transitionModifier === false) ? options.transition : (options.transition * options.transitionModifier));
    }

    private gradientSteps: ColorFormats.RGB[];
    private gradientPosition: number = 0;
    private gradientReversing: boolean = false;

    /**
     * this is not good but it works please dont kill me i just wanted to reduce complexity
     * 
     * the brightness key is r, the rest are always zero. r only goes from 0-100. thank you.
     */
    private brightnessSteps: ColorFormats.RGB[];
    private brightnessPosition: number = 0;
    private brightnessReversing: boolean = false;

    async init() {
        const [gradientLoop, brightnessLoop] = await Promise.all([generateRGB(this.options.colorRange, this.options.gradientStops), generateRGB({rangeR: this.options.brightnessRange, rangeG: [0, 0], rangeB: [0, 0]}, this.options.gradientStops)]);

        const gradient = tinygradient(gradientLoop);
        this.gradientSteps = gradient.rgb(this.options.gradientSteps || 500).map(c => c.toRgb());

        const brightness = tinygradient(brightnessLoop);
        this.brightnessSteps = brightness.rgb(this.options.gradientSteps || 500).map(c => c.toRgb());
    }

    async next() {
        const state = LightState.create().xy(...RGB.from(this.color).xy).transition(this.options.transition).turnOn();

        if (this.options.brightnessRange) {
            state.brightness(this.brightness.r);
        }

        await this.dispatch(state);
    }

    private nextProp(prefix: "gradient" | "brightness"): ColorFormats.RGB {
        const gradient = (this as any)[prefix + "Steps"][(this as any)[prefix + "Position"]];
        logger.debug('next %s: %s', prefix, JSON.stringify(gradient));
        logger.debug(prefix + ' position: %s/%s', (this as any)[prefix + "Position"], (this as any)[prefix + "Steps"].length - 1)

        if ((this as any)[prefix + "Reversing"]) {
            (this as any)[prefix + "Position"]--;
        } else {
            (this as any)[prefix + "Position"]++;
        }

        if ((this as any)[prefix + "Position"] >= (this as any)[prefix + "Steps"].length) {
            (this as any)[prefix + "Position"] = (this as any)[prefix + "Steps"].length - 2;
            logger.debug(prefix + ' is now reversing');
            (this as any)[prefix + "Reversing"] = true;
        } else if ((this as any)[prefix + "Position"] === -1) {
            (this as any)[prefix + "Position"] = 1;
            logger.debug(prefix + ' is done reversing');
            (this as any)[prefix + "Reversing"] = false;
        }

        return gradient;
    }

    private get color() {
        return this.nextProp("gradient");
    }

    private get brightness() {
        return this.nextProp("brightness");
    }
}