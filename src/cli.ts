import yargs from "yargs";
import initializeLibrary from ".";
import { ListEntities, createGroup, GetEntity, DeleteEntity } from "./management/list-lights";
import { lightState } from "node-hue-api";
import GradientScene, { ColorRangeSamples } from "./scenes/gradient";
import StrobeScene from "./scenes/strobe";

const argv = yargs.usage('Usage: $0 <cmd> [options]')
    .command('manage', 'manage your hue bridge', yarg => 
        yarg.command('groups', 'manage groups', yarg => 
            yarg.command('add', 'add a group', yarg =>
                yarg.options('name', {
                    default: "Hue Group"
                }).array('lights')
            ).command('delete', 'delete a group', yarg =>
                yarg.options('id', {
                    required: true
                })
            ).command('list', 'list groups')
             .command('get', 'get groups', yarg =>
                yarg.options('id', {
                    required: true
                })
            )
        ).command('lights', 'manage lights', yarg =>
            yarg.command('list', 'list lights')
                .command('get', 'get lights', yarg =>
                    yarg.options('id', {
                        required: true
                    })
                )
        )
    )
    .command('scene', 'manage scene states', yarg =>
        yarg.command('start', 'start a scene', yarg =>
            yarg.command('gradient', 'start the gradient scene', yarg =>
                yarg.array('lights')
                    .array('groups')
                    .option('transition', {demandOption: true})
                    .array('brightnessRange')
                    .array('rangeR')
                    .array('rangeG')
                    .array('rangeB')
                    .option('disableTransitionModifier', {default: false})
                    .option('rgbProfile', {})
            ).command('strobe', 'start the strobe scene', yarg =>
                yarg.array('lights')
                    .array('groups')
                    .option('transition', {demandOption: true})
                    .option('activeColorGenerator', {})
                    .option('inactiveColorGenerator', {})
            )
        )
    )
    .command('state', 'set light state', yarg =>
        yarg.array('lights')
            .array('groups')
    )

let [command, ...directives] = argv.argv._;

initializeLibrary().then(async api => {
    switch (command) {
        case "manage":
            {
                let [target, directive] = directives;
                
                switch (directive) {
                    case "list":
                    (<any>ListEntities)[target](api).then(console.log);
                    break;
                    case "add":
                        switch (target) {
                            case "groups":
                            const name: string = argv.argv.name;
                            const lights: string[] = argv.argv.lights;
            
                            await createGroup(api, name, lights).then(() => console.log("Done."));
                        }
                    break
                    case "get":
                    {
                        let {id} = argv.argv;
                        (<any>GetEntity)[target](api, id).then(console.log);
                    }
                    break;
                    case "delete":
                    {
                        let {id} = argv.argv;
                        (<any>DeleteEntity)[target](api, id).then(console.log);
                    }
                    break;
                }
                break;
            }
        case "scene":
            const [directive, ...data] = directives;
            switch (directive) {
                case "start":
                const [sceneName, ...sceneData] = data;
                const {lights, groups, transition} = argv.argv;
                switch (sceneName) {
                    case "gradient":
                    const {brightnessRange, rangeR, rangeG, rangeB, disableTransitionModifier, rgbProfile} = argv.argv;

                    const colorRange = rgbProfile && ColorRangeSamples[rgbProfile] || {
                        rangeR,
                        rangeG,
                        rangeB
                    };

                    const gradient = new GradientScene(api, {
                        lights,
                        groups,
                        transition,
                        brightnessRange,
                        colorRange,
                        transitionModifier: !disableTransitionModifier
                    });

                    await gradient.start();
                    break;
                    case "strobe":
                    const {activeColorGenerator, inactiveColorGenerator} = argv.argv;

                    const strobe = new StrobeScene(api, {
                        lights,
                        groups,
                        transition
                    });

                    await strobe.start();
                    break;
                }
                break;
            }
            break;
        case "state":
            let {lights, groups, state} = argv.argv;
            lights = lights || [];
            groups = groups || [];

            const newState = lightState.create(state);
            
            console.log(state);

            const operations: Array<Promise<any>> = groups.map((g: any) => api.setGroupLightState(g, newState)).concat(lights.map((l: any) => api.setLightState(l, newState)));

            await Promise.all(operations);

            console.log("Done.");
            break;
        default:
            argv.showHelp();
    }
});