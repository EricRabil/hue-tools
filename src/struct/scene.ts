import { HueApi, ILight, ILightGroup, lightState as LightState } from "node-hue-api";
import logger from "../util/logging";
import { sleep } from "../util/timing";
import Target from "./target";

export interface BaseSceneOptions extends Target {
    transition: number;
}

export abstract class Scene<T extends BaseSceneOptions = BaseSceneOptions> {
    private timer: NodeJS.Timeout;

    private dropoutCount: number = 0;

    private average: number = 0;
    private averageCount: number = 0;

    private stopped: boolean = true;

    protected constructor(protected readonly api: HueApi, protected options: T, protected timeoutMS: number) {
        if (timeoutMS < 150) {
            logger.warn('transitions under 150ms may cause lags and cooldowns.');
        }
        setInterval(() => {
            if (this.dropoutCount > 0) {
                logger.info('resetting dropout counter');
            }
            this.dropoutCount = 0
        }, 60000);
    }

    public async start(): Promise<void> {
        this.stopped = false;
        await this.init();
        this.delayedNext(true);
    }

    public async stop(): Promise<void> {
        this.stopped = true;
        clearTimeout(this.timer);
    }

    /**
     * Initialization code for implementing scenes
     */
    protected async init(): Promise<void> {
    }

    protected async dispatch(state: LightState.State, groupsOverride?: string[], lightsOverride?: string[]) {
        if (this.stopped) {
            logger.debug('dispatch called but scene is stopped. blocking.');
            return;
        }
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
            this.api.setGroupLightState(typeof group === "string" ? group : group.id, state))
                .concat(lights.map(light => this.api.setLightState(typeof light === "string" ? light : light.uniqueid, state)))
        ).catch(e => {logger.warn('scene dropped a dispatch. dropouts: %s/10', this.dropoutCount + 1); this.dropoutCount++;});
        const endTime = Date.now();
        const elapsed = endTime - startTime;
        let averageSrc = this.average * this.averageCount;
        this.averageCount++;
        averageSrc += elapsed;
        averageSrc /= this.averageCount;
        this.average = averageSrc;
        logger.debug(`scene dispatched in ${elapsed}ms, average dispatch ${averageSrc.toFixed(2)}ms`);
    }
    
    private delayedNext(loop: boolean = false) {
        this.timer = setTimeout(async () => {
            await this.next();
            if (loop) this.delayedNext(loop);
        }, this.timeoutMS);
    }

    protected abstract next(): Promise<void>;

    protected get lightTargetIDs() {
        return (this.options.lights || []).map(l => typeof l === "string" ? l : l.uniqueid);
    }

    protected get groupTargetIDs() {
        return (this.options.groups || []).map(g => typeof g === "string" ? g : g.id);
    }
}