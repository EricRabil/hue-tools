import { HueApi, ILight, ILightGroup, lightState as LightState } from "node-hue-api";
import logger from "../util/logging";
import { sleep } from "../util/timing";

export interface BaseSceneOptions {
    transition: number;
    lights?: string[];
    groups?: string[];
}

export abstract class Scene<T extends BaseSceneOptions = BaseSceneOptions> {
    private timer: NodeJS.Timeout;

    private dropoutCount: number = 0;

    protected constructor(protected readonly api: HueApi, protected options: T, private timeoutMS: number) {
        if (timeoutMS < 150) {
            logger.warn('transitions under 150ms may cause lags and cooldowns.');
        }
        setInterval(() => this.dropoutCount = 0, 60000);
    }

    public async start(): Promise<void> {
        await this.init();
        this.delayedNext(true);
    }

    public async stop(): Promise<void> {
        clearTimeout(this.timer);
    }

    /**
     * Initialization code for implementing scenes
     */
    protected async init(): Promise<void> {
    }

    protected async dispatch(state: LightState.State, groupsOverride?: string[], lightsOverride?: string[]) {
        if (this.dropoutCount >= 10) {
            logger.debug('scene keeps dropping out. cooling down.');
            await sleep(5000);
            logger.debug('recovery cooldown done. resuming.');
            this.dropoutCount = 0;
        }
        let {groups, lights} = this.options;
        groups = groupsOverride || groups || [];
        lights = lightsOverride || lights || [];
        const startTime = Date.now();
        await Promise.all(groups.map(group =>
            this.api.setGroupLightState(group, state))
                .concat(lights.map(light => this.api.setLightState(light, state)))
        ).catch(e => {logger.warn('scene dropped a dispatch'); this.dropoutCount++;});
        const endTime = Date.now();
        const elapsed = endTime - startTime;
        logger.debug(`scene dispatched in ${elapsed}ms`);
    }
    
    private delayedNext(loop: boolean = false) {
        this.timer = setTimeout(async () => {
            await this.next();
            if (loop) this.delayedNext(loop);
        }, this.timeoutMS);
    }

    protected abstract next(): Promise<void>;
}