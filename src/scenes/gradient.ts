import { Scene, BaseSceneOptions } from "../struct/scene";
import { HueApi, ILight, ILightGroup, lightState as LightState } from "node-hue-api";
import { RGB, randomNumber, RGBRange } from "../util/colors";

import tinygradient from "tinygradient";
import { ColorFormats } from "tinycolor2";

export interface GradientOptions extends BaseSceneOptions {
    brightnessRange?: number[];
    colorRange?: RGBRange;
    transitionModifier?: boolean | number;
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

export async function generateRGB(constraint?: RGBRange) {
    if (constraint) {
        if (!constraint.rangeR) constraint.rangeR = [0, 255];
        if (!constraint.rangeG) constraint.rangeG = [0, 255];
        if (!constraint.rangeB) constraint.rangeB = [0, 255];
    }

    const loop: Array<{r: number, g: number, b: number}> = [];

    for (let i = 0; i < RGB_LOOP_SIZE; i++) {
        loop[i] = RGB.random(constraint);
    }

    return loop;
}

export default class GradientScene extends Scene<GradientOptions> {
    constructor(api: HueApi, options: GradientOptions) {
        super(api, options, (options.transitionModifier === true || options.transitionModifier === undefined) ? options.transition * 1.5 : (options.transitionModifier === false) ? options.transition : (options.transition * options.transitionModifier));
    }

    private gradientSteps: ColorFormats.RGB[];
    private position: number = 0;
    private reversing: boolean = false;

    async init() {
        const loop = await generateRGB(this.options.colorRange);

        const gradient = tinygradient(loop);
        this.gradientSteps = gradient.rgb(500).map(c => c.toRgb());
    }

    async next() {
        const state = LightState.create().xy(...RGB.from(this.color).xy).transition(this.options.transition).turnOn();

        if (this.options.brightnessRange) {
            state.brightness(randomNumber(this.options.brightnessRange));
        }

        await this.dispatch(state);
    }

    private get color(): ColorFormats.RGB {
        const gradient = this.gradientSteps[this.position];

        if (this.reversing) {
            this.position--;
        } else {
            this.position++;
        }

        if (this.position >= this.gradientSteps.length) {
            this.position = this.gradientSteps.length - 1;
            this.reversing = true;
        } else if (this.position === -1) {
            this.position = 0;
            this.reversing = false;
        }

        return gradient;
    }
}