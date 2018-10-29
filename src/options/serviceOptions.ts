import * as fs from "fs";
import * as path from "path";

export enum ReleaseLevel {
    Internal = 0,
    Public
}

export interface IServiceOptions {
    port: number;
    graphQLEndpoint: string;
    tracingLoadMaxDelay: number;
    tracingLoadLimit: number;
    release: ReleaseLevel;
    version: string;
}

const configuration: IServiceOptions = {
    port: 5000,
    graphQLEndpoint: "/graphql",
    tracingLoadMaxDelay: 10,
    tracingLoadLimit: 100,
    release: ReleaseLevel.Public,
    version: ""
};

function loadConfiguration(): IServiceOptions {
    const options = Object.assign({}, configuration);

    options.port = parseInt(process.env.SEARCH_API_PORT) || options.port;
    options.graphQLEndpoint = process.env.SEARCH_API_ENDPOINT || process.env.CORE_SERVICES_ENDPOINT || options.graphQLEndpoint;

    options.tracingLoadMaxDelay = parseInt(process.env.NEURON_BROWSER_LOAD_MAX_DELAY) || options.tracingLoadMaxDelay;
    options.tracingLoadLimit = parseInt(process.env.NEURON_BROWSER_LOAD_LIMIT) || options.tracingLoadLimit;
    options.release = process.env.SEARCH_API_RELEASE_LEVEL ? parseInt(process.env.SEARCH_API_RELEASE_LEVEL) : options.release;
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