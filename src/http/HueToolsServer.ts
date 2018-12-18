import views from "co-views";
import fs from "fs-extra";
import Koa from "koa";
import Router, { IMiddleware } from "koa-router";
import path from "path";

import { isRoute, isRoutes, Route, Routes, RoutingHelpers } from "./types";
import { collapse } from "../util/array";
import { ListenOptions } from "net";
import { Server } from "http";
import { flattenDirectory } from "../util/fs";

export interface ServerSettings {
    routesDirectory: string;
}

/**
 * Subclass of Koa; adds route abstraction
 */
export default class HueToolsServer extends Koa {
    constructor(private settings: ServerSettings) {
        super();
    }

    /**
     * The root router where routes will be loaded into
     */
    protected router = new Router();

    /**
     * Overrides Koa listen to initialize the routing portion
     * @param args any listening arguments
     */
    listen(...args: any[]): Server {
        this.init();
        return super.listen(...args);
    }

    /**
     * Initialize routing
     */
    protected init() {
        let files = flattenDirectory(this.settings.routesDirectory);
        files = files.filter(file => file.endsWith(".route.js"));

        const routes = RoutingHelpers.parseRoutes(files);

        routes.route.forEach(r => RoutingHelpers.loadRoute(this.router, r));

        routes.routes.forEach(r => RoutingHelpers.loadRouteRouter(this.router, r));

        this.use(this.router.routes()).use(this.router.allowedMethods());
    }








}