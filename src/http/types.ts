import { IMiddleware } from "koa-router";

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