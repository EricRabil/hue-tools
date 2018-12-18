import fs from "fs-extra";
import hue, { HueApi } from "node-hue-api";
import path from "path";
import readline from "readline-sync";
import HueToolsServer from "./http/HueToolsServer";
import "./util/patches";


export default async function initializeLibrary() {
    let api: HueApi;

    if (await fs.pathExists("./bridge.json")) {
        const { host, username } = await fs.readJSON("./bridge.json");

        api = new HueApi(host, username);
    } else {
        const bridges = await hue.nupnpSearch();

        if (bridges.length === 0) {
            console.error("No bridge found.");
            process.exit(-1);
        }

        console.log(bridges);

        const host = readline.question("What is your bridge IP?\n");

        api = new HueApi();

        readline.question("Please press link, then hit enter.");

        const username = await api.createUser(host, "HueTools User");

        await fs.writeJSON("./bridge.json", {
            host,
            username
        });

        api = new HueApi(host, username);
    }

    return api;
};

const server = new HueToolsServer({
    routesDirectory: path.resolve(__dirname, "http", "routes")
});

server.listen(3030);