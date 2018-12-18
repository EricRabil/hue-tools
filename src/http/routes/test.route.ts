import { Route } from "../types";

export const test: Route = {
    url: "/test",
    method: "get",
    handler: (ctx) => ctx.body = "hey bitch"
};

export const testFile: Route = {
    url: "/file",
    method: "get",
    file: __filename
};