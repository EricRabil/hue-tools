import { lightState } from "node-hue-api";
import { RGB } from "./colors";

const oldCreate = lightState.create;

lightState.create = function(...args: any[]) {
    const state = oldCreate(...args);

    if ((<any>state)._values.rgb) {
        const oldRGB = (<any>state)._values.rgb;
        delete (<any>state)._values.rgb;
        const xy = new RGB(...(oldRGB as [number, number, number])).xy;
        state.xy(...xy);
    }

    state.rgb = function(r, g, b) {
        return this.xy(...new RGB(r, g, b).xy);
    }

    return state;
} as any;