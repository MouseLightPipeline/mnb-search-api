import * as fs from "fs";
import * as path from "path";

export interface IServerOptions {
    port: number;
    graphQlEndpoint: string;
    graphiQlEndpoint: string;
}

export interface IServiceOptions {
    serverOptions: IServerOptions;
    tracingLoadMaxDelay: number;
    tracingLoadLimit: number;
    release: string;
    version: string;
}

const configuration: IServiceOptions = {
    serverOptions: {
        port: 9681,
        graphQlEndpoint: "/graphql",
        graphiQlEndpoint: "/graphiql"
    },
    tracingLoadMaxDelay: 10,
    tracingLoadLimit: 100,
    release: "public",
    version: ""
};

function loadConfiguration(): IServiceOptions {
    const options = Object.assign({}, configuration);

    options.tracingLoadMaxDelay = parseInt(process.env.NEURON_BROWSER_LOAD_MAX_DELAY) || options.tracingLoadMaxDelay;
    options.tracingLoadLimit = parseInt(process.env.NEURON_BROWSER_LOAD_LIMIT) || options.tracingLoadLimit;
    options.release = process.env.NEURON_BROWSER_RELEASE || options.release;
    options.version = readSystemVersion();

    return options;
}

export const ServiceOptions: IServiceOptions = loadConfiguration();

function readSystemVersion(): string {
    try {
        const contents = JSON.parse(fs.readFileSync(path.resolve("package.json")).toString());
        return contents.version;
    } catch (err) {
        console.log(err);
        return "";
    }
}