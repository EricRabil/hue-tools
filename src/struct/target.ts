import { ILight, ILightGroup } from "node-hue-api";

export default interface Target {
    lights?: Array<ILight | string>;
    groups?: Array<ILightGroup | string>;
}