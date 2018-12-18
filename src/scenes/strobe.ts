import { Scene, BaseSceneOptions } from "../struct/scene";
import { HueApi, lightState } from "node-hue-api";
import { randomNumber, RGB } from "../util/Colors";
import logger from "../util/logging";

export interface StrobeOptions extends BaseSceneOptions {
    activeColorGenerator?: () => RGB
    inactiveColorGenerator?: () => RGB
}

export const ColorGenerators: {[key: string]: () => RGB} = {
    random() {
        return RGB.random();
    }
}

export const BASE_STATE = lightState.create().turnOn().brightness(0).xy(...new RGB(255, 255, 255).xy).transitionInstant();

export default class StrobeScene extends Scene<StrobeOptions> {
    private lights: string[];
    private currentLight: string | undefined;

    constructor(api: HueApi, options: StrobeOptions) {
        super(api, options, options.transition);
    }

    async init() {
        const lightTargets = this.lightTargetIDs;
        const groupTargets = this.groupTargetIDs;

        const groups = await Promise.all(groupTargets.map(g => this.api.getGroup(g)));

        this.lights = lightTargets.concat(
            groups.map(group => group.lights || []).reduce((arr, lights) => arr.concat(lights), []));

        await this.dispatch(BASE_STATE);

        logger.debug('strobe lights set to base');
    }

    async next() {
        await Promise.all([this.dispatch(this.nextBaseState, [], this.currentLight ? [this.currentLight] : []), this.dispatch(this.nextState, [], [this.nextLight])]);
        logger.debug('strobe');
    }

    private get nextState() {
        return lightState.create().brightness(100).transitionInstant().xy(...(this.options.activeColorGenerator ? this.options.activeColorGenerator() : new RGB(255, 255, 255)).xy);
    }

    private get nextBaseState() {
        return lightState.create().turnOn().brightness(0).xy(...(this.options.inactiveColorGenerator ? this.options.inactiveColorGenerator() : new RGB(255, 255, 255)).xy).transitionInstant();
    }

    private get nextLight(): string {
        return this.currentLight = this.lights[<any>randomNumber([0, this.lights.length - 1]).toFixed(0) * 1];
    }
}