import Target from "../struct/target";
import { lightState, HueApi } from "node-hue-api";

export interface State {
    target: Target;
    state: lightState.State;
}

export function setState(api: HueApi, state: State) {
    return Promise.all(
        (state.target.lights || []).map(light => api.setLightState(typeof light === "string" ? light : light.uniqueid, state)).concat(
            (state.target.groups || []).map(group => api.setGroupLightState(typeof group === "string" ? group : group.id, state))
        )
    );
}

export function setBulkState(api: HueApi, states: State[]) {
    return Promise.all(states.map(state => setState(api, state)));
}