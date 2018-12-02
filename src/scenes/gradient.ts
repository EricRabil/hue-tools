import { Scene, BaseSceneOptions } from "../struct/scene";
import { HueApi, ILight, ILightGroup, lightState as LightState } from "node-hue-api";
import { RGB, randomNumber, RGBRange } from "../util/Colors";

export interface GradientOptions extends BaseSceneOptions {
    transition: number;
    brightnessRange?: number[];
    colorRange?: RGBRange;
}

export default class GradientScene extends Scene {
    private timer: NodeJS.Timeout;

    constructor(api: HueApi, private options: GradientOptions) {
        super(api, options);
    }

    public async start(): Promise<void> {
        this.delayedNext(true);
    }

    public async stop(): Promise<void> {
        clearTimeout(this.timer);
    }

    private delayedNext(loop: boolean = false) {
        this.timer = setTimeout(async () => {
            await this.next();
            if (loop) this.delayedNext(loop);
        }, this.options.transition * 1.5);
    }

    private async next() {
        const state = LightState.create().xy(...RGB.random(this.options.colorRange).xy).transition(this.options.transition);

        if (this.options.brightnessRange) {
            state.brightness(randomNumber(this.options.brightnessRange));
        }

        await this.dispatch(state);
    }
}