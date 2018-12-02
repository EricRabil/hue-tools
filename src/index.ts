import hue, { HueApi } from "node-hue-api";
import fs from "fs-extra";
import readline from "readline-sync";
import GradientScene from "./scenes/gradient";

(async function () {
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

        api = new HueApi();

        readline.question("Please press link, then hit enter.");

        const username = await api.createUser(bridge.ipaddress, "HueTools User");

        await fs.writeJSON("./bridge.json", {
            host: bridge.ipaddress,
            username
        });

        api = new HueApi(bridge.ipaddress, username);
    }

    const [rootGroup] = await api.getAllGroups();

    const gradient = new GradientScene(api, {
        transition: 2500,
        brightnessRange: [5, 15],
        colorRange: {
            rangeR: [0,0],
            rangeG: [50,50]
        },
        groups: [rootGroup]
    });

    await gradient.start();
})();