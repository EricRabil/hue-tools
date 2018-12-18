import views from "co-views";
import fs from "fs-extra";
import Koa from "koa";
import Router, { IMiddleware } from "koa-router";
import path from "path";

import { isRoute, isRoutes, Route, Routes } from "./types";
import { collapse } from "../util/array";
import { ListenOptions } from "net";
import { Server } from "http";

const render = views(path.resolve(__dirname, "templates"), {
    ext: "ejs"
});

export interface ServerSettings {
    routesDirectory: string;
}

function flattenDirectory(directory: string) {
    let files = (fs.readdirSync(directory)).map(file => path.resolve(directory, file));

    files.forEach(async file => {
        const stat = await fs.stat(file);

        if (!stat.isDirectory()) return;

        files = files.concat(flattenDirectory(file));
    });

    return files;
}

export default class HueToolsServer extends Koa {
    constructor(private settings: ServerSettings) {
        super();
    }

    protected router = new Router();

    listen(...args: any[]): Server {
        this.init();
        return super.listen(...args);
    }

    protected init() {
        let files = flattenDirectory(this.settings.routesDirectory);
        files = files.filter(file => file.endsWith(".route.js"));

        const routes = this.parseRoutes(files);

        routes.route.forEach(r => HueToolsServer.loadRoute(this.router, r));

        routes.routes.forEach(r => HueToolsServer.loadRouteRouter(this.router, r));

        this.use(this.router.routes()).use(this.router.allowedMethods());
    }

    protected parseRoutes(files: string[]) {
        const mixed: Array<Route | Routes> = collapse(files.map(file => require(file)).map(obj => Object.values(obj)).map(obj => obj.filter(r => isRoute(r) || isRoutes(r)) as Array<Route | Routes>));
        const route: Route[] = mixed.filter(r => isRoute(r)) as any;
        const routes: Routes[] = mixed.filter(r => isRoutes(r)) as any;

        return {
            mixed,
            route,
            routes
        }
    }

    protected static loadRouteRouter(router: Router, routes: Routes) {
        const subRouter = new Router();

        routes.routes.forEach(r => isRoute(r) ? this.loadRoute(subRouter, r) : this.loadRouteRouter(subRouter, r));

        router.use(subRouter.routes()).use(subRouter.allowedMethods());
    }

    protected static loadRoute(router: Router, route: Route) {
        (router[route.method] as any)(route.url, ...(route.middleware || []), this.generateExecutor(route));
    }

    protected static generateExecutor(route: Route): IMiddleware {
        if (route.handler) return route.handler;

        if (route.file) {
            return async (ctx, next) => {
                ctx.body = fs.createReadStream(route.file!);
                ctx.ty
                next();
            }
        } else if (route.template) {
            return async (ctx, next) => {
                ctx.body = await render(route.template!, ctx.state);
            }
        }

        return null as any;
    }
}