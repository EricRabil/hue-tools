import { HueApi, ILight, ILightGroup, lightState as LightState } from "node-hue-api";

export interface BaseSceneOptions {
    transition: number;
    lights?: string[];
    groups?: string[];
}

export abstract class Scene<T extends BaseSceneOptions = BaseSceneOptions> {
    private timer: NodeJS.Timeout;

    protected constructor(protected readonly api: HueApi, protected options: T, private timeoutMS: number) {

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
        let {groups, lights} = this.options;
        groups = groupsOverride || groups || [];
        lights = lightsOverride || lights || [];

        await Promise.all(groups.map(group =>
            this.api.setGroupLightState(group, state))
                .concat(lights.map(light => this.api.setLightState(light, state)))
        ).catch(e => console.warn("Couldn't complete one or more dispatches :("));
    }
    
    private delayedNext(loop: boolean = false) {
        this.timer = setTimeout(async () => {
            await this.next();
            if (loop) this.delayedNext(loop);
        }, this.timeoutMS);
    }

    protected abstract next(): Promise<void>;
}