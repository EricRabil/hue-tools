import views from "co-views";
import fs from "fs-extra";
import Router, { IMiddleware } from "koa-router";
import path from "path";
import { collapse } from "../util/array";

const render = views(path.resolve(__dirname, "templates"), {
    ext: "ejs"
});

export type RequestMethod = "use" | "get" | "post" | "put" | "link" | "unlink" | "delete" | "del" | "head" | "options" | "patch" | "all";

export function isRoute(obj: any): obj is Route {
    return typeof obj === "object"
        && typeof obj.url === "string"
        && typeof obj.method === "string";
}

export function isRoutes(obj: any): obj is Routes {
    return typeof obj === "object"
        && typeof obj.base === "string"
        && typeof obj.routes === "object"
        && Array.isArray(obj.routes)
        && obj.routes.every((r: any) => isRoute(r) || isRoutes(r));
}

export interface Route {
    url: string;
    method: RequestMethod;
    middleware?: IMiddleware[];
    handler?: IMiddleware;
    template?: string;
    file?: string;
}

export interface Routes {
    base: string;
    routes: Array<Route | Routes>;
    middleware?: IMiddleware[];
}

export namespace RoutingHelpers {
    /**
     * Parse raw files into a series of routes
     * @param files the filenames to load
     */
    export function parseRoutes(files: string[]) {
        const mixed: Array<Route | Routes> = collapse(files.map(file => require(file)).map(obj => Object.values(obj)).map(obj => obj.filter(r => isRoute(r) || isRoutes(r)) as Array<Route | Routes>));
        const route: Route[] = mixed.filter(r => isRoute(r)) as any;
        const routes: Routes[] = mixed.filter(r => isRoutes(r)) as any;

        return {
            mixed,
            route,
            routes
        }
    }

    /**
     * Loads a Routes object into a router
     * @param router the router to load into
     * @param routes the routes to load
     */
    export function loadRouteRouter(router: Router, routes: Routes) {
        const subRouter = new Router();

        routes.routes.forEach(r => isRoute(r) ? loadRoute(subRouter, r) : loadRouteRouter(subRouter, r));

        router.use(subRouter.routes()).use(subRouter.allowedMethods());
    }

    /**
     * Loads a route into a router
     * @param router the router to load into
     * @param route the route to load
     */
    export function loadRoute(router: Router, route: Route) {
        (router[route.method] as any)(route.url, ...(route.middleware || []), generateExecutor(route));
    }

    /**
     * Returns the appropriate route executor
     * @param route the route to parse
     */
    export function generateExecutor(route: Route): IMiddleware {
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