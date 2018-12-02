import { HueApi, ILight, ILightGroup, lightState as LightState } from "node-hue-api";

export interface BaseSceneOptions {
    lights?: ILight[];
    groups?: ILightGroup[];
}

export abstract class Scene {
    protected constructor(private api: HueApi, private targets: BaseSceneOptions) {

    }

    protected async dispatch(state: LightState.State) {
        let {groups, lights} = this.targets;
        groups = groups || [];
        lights = lights || [];

        await Promise.all(groups.map(group => this.api.setGroupLightState(group.id, state)).concat(lights.map(light => this.api.setLightState(light.uniqueid, state))));
    }
}