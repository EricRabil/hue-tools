import { lightState } from "node-hue-api";
import yargs from "yargs";
import initializeLibrary from ".";
import { createGroup, DeleteEntity, GetEntity, ListEntities } from "./management/list-lights";
import GradientScene, { ColorRangeSamples } from "./scenes/gradient";
import StrobeScene, { ColorGenerators } from "./scenes/strobe";
import fs from "fs-extra";
import SoundScene from "./scenes/sounds";
import WaveScene from "./scenes/wave";
import logger from "./util/logging";
import { RGB } from "./util/colors";

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
            ).command('list', 'list groups', yarg =>
                yarg.option('save', {type: "boolean"})
            ).command('get', 'get groups', yarg =>
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
                    .option('transition', { default: 1000 })
                    .array('brightnessRange')
                    .array('rangeR')
                    .array('rangeG')
                    .array('rangeB')
                    .option('disableTransitionModifier', { default: false })
                    .option('rgbProfile', {})
                    .number('gradientSteps')
                    .number('gradientStops')
            ).command('strobe', 'start the strobe scene', yarg =>
                yarg.array('lights')
                    .array('groups')
                    .option('transition', { demandOption: true })
                    .option('activeColorGenerator', {})
                    .option('inactiveColorGenerator', {})
            ).command('sound', 'start the sound scene', yarg =>
                yarg.array('lights')
                    .array('groups')
                    .option('transition', { demandOption: true })
            ).command('wave', 'start the wave scene', yarg =>
                yarg.array('groups')
                    .option('transition', { demandOption: true })
            )
        )
    )
    .command('state', 'set light state', yarg =>
        yarg.array('lights')
            .array('groups')
            .option('save', {demand: false})
            .option('load', {demand: false})
    )

let [command, ...directives] = argv.argv._;

initializeLibrary().then(async api => {
    switch (command) {
        case "manage":
            {
                let [target, directive] = directives;

                switch (directive) {
                    case "list":
                        const entities = await (<any>ListEntities)[target](api);
                        if (argv.argv.save) {
                            await fs.writeJSON('./entities.json', entities);
                        }
                        console.log(entities);
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
                            let { id } = argv.argv;
                            (<any>GetEntity)[target](api, id).then(console.log);
                        }
                        break;
                    case "delete":
                        {
                            let { id } = argv.argv;
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
                    const { lights, groups, transition } = argv.argv;
                    switch (sceneName) {
                        case "gradient":
                            const { gradientSteps, gradientStops, load, save, brightnessRange, rangeR, rangeG, rangeB, disableTransitionModifier, rgbProfile } = argv.argv;
                            
                            const profile = await fs.readJSON("./bridge.json");

                            let gradient: GradientScene;

                            if (load && typeof load === "string" && load.length > 0) {
                                gradient = new GradientScene(api, {
                                    ...profile.gradientProfiles[load]
                                });
                            } else {
                                const colorRange = rgbProfile && ColorRangeSamples[rgbProfile] || {
                                    rangeR,
                                    rangeG,
                                    rangeB
                                };

                                gradient = new GradientScene(api, {
                                    lights,
                                    groups,
                                    transition,
                                    brightnessRange,
                                    colorRange,
                                    transitionModifier: !disableTransitionModifier,
                                    gradientSteps,
                                    gradientStops
                                });

                                if (save && typeof save === "string" && save.length > 0) {
                                    const gradientProfiles = profile.gradientProfiles || (profile.gradientProfiles = {});
    
                                    gradientProfiles[save] = {
                                        lights,
                                        groups,
                                        transition,
                                        brightnessRange,
                                        colorRange,
                                        transitionModifier: !disableTransitionModifier,
                                        gradientSteps,
                                        gradientStops
                                    };
    
                                    await fs.writeJSON("./bridge.json", profile);
                                }
                            }

                            await gradient.start();
                            break;
                        case "strobe":
                            const { activeColorGenerator, inactiveColorGenerator } = argv.argv;

                            const strobe = new StrobeScene(api, {
                                lights,
                                groups,
                                transition,
                                activeColorGenerator: ColorGenerators[activeColorGenerator],
                                inactiveColorGenerator: ColorGenerators[inactiveColorGenerator]
                            });

                            await strobe.start();
                            break;
                        case "sound":
                            const soundScene = new SoundScene(api, {
                                lights,
                                groups,
                                transition
                            });

                            await soundScene.start();
                            break;
                        case "wave":
                            const waveScene = new WaveScene(api, {
                                lights: undefined as any as never,
                                groups,
                                transition
                            });

                            await waveScene.start();
                    }
                    break;
            }
            break;
        case "state":
            let { lights, groups, load, save, state } = argv.argv;

            const profile = await fs.readJSON("./bridge.json");

            if (load && profile.states && profile.states[load]) {
                logger.info('loading state from profile');
                const stateArchive = profile.states[load];

                lights = stateArchive.lights;
                groups = stateArchive.groups;
                state = stateArchive.state;
            } else {
                logger.info('setting state from argv');
                lights = lights || [];
                groups = groups || [];
            }

            const newState = lightState.create(state);

            if (save) {
                (profile.states || (profile.states = {}))[save] = {
                    lights,
                    groups,
                    state: (<any>newState)._values
                };

                await fs.writeJSON("./bridge.json", profile);
            }

            const operations: Array<Promise<any>> = groups.map((g: any) => api.setGroupLightState(g, newState)).concat(lights.map((l: any) => api.setLightState(l, newState)));

            await Promise.all(operations);

            console.log("Done.");
            break;
        default:
            argv.showHelp();
    }
});