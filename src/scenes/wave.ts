import { Scene, BaseSceneOptions } from "../struct/scene";
import { HueApi, lightState } from "node-hue-api";
import { RGB } from "../util/colors";
import { sleep } from "../util/timing";
import logger from "../util/logging";

export interface WaveOptions extends BaseSceneOptions {
    lights: never;
    groups: string[];
}

export default class WaveScene extends Scene<WaveOptions> {
    constructor(api: HueApi, options: WaveOptions) {
        super(api, options, options.transition);
    }

    private lastIndex: number = -1;
    private _color: [number, number] = [0, 0];

    async next() {
        if (this.canPickNewColor && this.lastIndex !== -1) {
            logger.debug('wave scene doing catch-up sleep [normal]');
            await sleep(this.options.transition * 4);
        }

        const [x, y] = this.color, nextGroup = this.nextGroup;

        logger.debug('wave scene next - next color: %s, next group: %s', [x, y], nextGroup);

        const state = lightState.create().xy(x, y).on().transition(this.options.transition * 4);

        await this.dispatch(state, [nextGroup]);
    }

    private get nextGroup() {
        return this.options.groups[(this.lastIndex += 1) >= this.options.groups.length ? (this.lastIndex = 0) : this.lastIndex];
    }

    private get color() {
        if (this.canPickNewColor) {
            this._color = RGB.random().xy;
        }
        return this._color;
    }

    private get canPickNewColor() {
        return this.lastIndex === this.options.groups.length - 1 || this.lastIndex === -1;
    }
}