import { HueApi, ILight, ILightGroup, lightState as LightState } from "node-hue-api";
import logger from "../util/logging";
import { sleep } from "../util/timing";
import Target from "./target";
import { State, setState } from "../util/state";

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
            return;
        }
        if (this.dropoutCount >= 10) {
            await this.cooldown(5000);
        }
        const stateJob: State = {
            target: {
                groups: groupsOverride || this.groupTargetIDs,
                lights: lightsOverride || this.lightTargetIDs
            },
            state
        };
        const elapsed = await setState(this.api, stateJob).catch(() => logger.warn('scene dropped a dispatch. dropouts: %s/10', this.dropoutCount++));
        this.latestMetric = (elapsed as number) || 0;
        logger.debug(`scene dispatched in ${elapsed}ms, average dispatch ${this.average.toFixed(2)}ms`);
    }

    private set latestMetric(value: number) {
        let averageSrc = this.average * this.averageCount;
        this.averageCount++;
        averageSrc += value;
        averageSrc /= this.averageCount;
        this.average = averageSrc;
    }

    private async cooldown(time: number) {
        logger.debug('scene keeps dropping out. cooling down for %sms.', time);
        await sleep(time);
        logger.debug('recovery cooldown done. resuming.');
        this.dropoutCount = 0;
    }
    
    private delayedNext(loop: boolean = false) {
        this.timer = setTimeout(async () => {
            await this.next();
            if (loop) this.delayedNext(loop);
        }, this.timeoutMS);
    }

    protected abstract next(): Promise<void>;

    protected get lightTargetIDs() {
        return (this.options.lights || []).map(l => typeof l === "object" ? l.uniqueid : l);
    }

    protected get groupTargetIDs() {
        return (this.options.groups || []).map(g => typeof g === "object" ? g.id : g);
    }
}