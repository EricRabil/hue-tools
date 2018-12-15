import { Scene, BaseSceneOptions } from "../struct/scene";
import { HueApi, ILight, ILightGroup, lightState as LightState } from "node-hue-api";
import { RGB, randomNumber, RGBRange } from "../util/colors";

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

export default class GradientScene extends Scene<GradientOptions> {
    constructor(api: HueApi, options: GradientOptions) {
        super(api, options, (options.transitionModifier === true || options.transitionModifier === undefined) ? options.transition * 1.5 : (options.transitionModifier === false) ? options.transition : (options.transition * options.transitionModifier));
    }

    async next() {
        const state = LightState.create().xy(...RGB.random(this.options.colorRange).xy).transition(this.options.transition).turnOn();

        if (this.options.brightnessRange) {
            state.brightness(randomNumber(this.options.brightnessRange));
        }

        await this.dispatch(state);
    }
}