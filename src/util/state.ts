import Target from "../struct/target";
import { lightState, HueApi } from "node-hue-api";

export interface State {
    target: Target;
    state: lightState.State;
}

export function setState(api: HueApi, state: State) {
    const start = Date.now();
    return Promise.all(
        (state.target.lights || []).map(light => api.setLightState(typeof light === "object" ? light.uniqueid : light, state.state)).concat(
            (state.target.groups || []).map(group => api.setGroupLightState(typeof group === "object" ? group.id : group, state.state))
        )
    ).then(() => Date.now() - start);
}

export function setBulkState(api: HueApi, states: State[]) {
    return Promise.all(states.map(state => setState(api, state)));
}