import { HueApi, ILight, ILightGroup } from "node-hue-api";
import logger from "../util/logging";

export function createGroup(api: HueApi, name: string, lights: string[]): Promise<void> {
    return api.createGroup(name, lights).catch(e => void 0).then(r => void 0);
}

export namespace ListEntities {
    export function lights(api: HueApi): Promise<ILight[]> {
        return api.getLights().then(res => res.lights);
    }

    export function groups(api: HueApi): Promise<ILightGroup[]> {
        return api.getAllGroups();
    }
}

export namespace GetEntity {
    export function lights(api: HueApi, id: string): Promise<ILight> {
        return api.getLightStatus(id);
    }

    export function groups(api: HueApi, id: string): Promise<ILightGroup> {
        return api.getGroup(id);
    }
}

export namespace DeleteEntity {
    export function groups(api: HueApi, id: string) {
        return api.deleteGroup(id);
    }

    export async function lights() {
        return 'lights cannot be deleted.';
    }
}