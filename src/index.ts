import "./util/patches";

import hue, { HueApi } from "node-hue-api";
import fs from "fs-extra";
import readline from "readline-sync";
import GradientScene, { ColorRangeSamples } from "./scenes/gradient";
import StrobeScene from "./scenes/strobe";
import { RGB } from "./util/Colors";

export default async function initializeLibrary() {
    let api: HueApi;

    if (await fs.pathExists("./bridge.json")) {
        const { host, username } = await fs.readJSON("./bridge.json");

        api = new HueApi(host, username);
    } else {
        const [bridge] = await hue.nupnpSearch();

        if (!bridge) {
            console.error("No bridge found.");
            process.exit(-1);
        }

        console.log(bridge);

        api = new HueApi();

        readline.question("Please press link, then hit enter.");

        const username = await api.createUser(bridge.ipaddress, "HueTools User");

        await fs.writeJSON("./bridge.json", {
            host: bridge.ipaddress,
            username
        });

        api = new HueApi(bridge.ipaddress, username);
    }

    return api;
};