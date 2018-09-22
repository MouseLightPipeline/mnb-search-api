import * as fs from "fs";

import {Databases} from "./databaseOptions";
import * as path from "path";

export interface IServerOptions {
    port: number;
    graphQlEndpoint: string;
    graphiQlEndpoint: string;
}


export interface IDataBaseOptions {
    search: any;
    metrics: any;
}

export interface IServiceOptions {
    envName: string;
    serverOptions: IServerOptions;
    databaseOptions: IDataBaseOptions;
    release: string;
    version: string;
}

interface IConfiguration<T> {
    development: T;
    production: T;
}

const configurations: IConfiguration<IServiceOptions> = {
    development: {
        envName: "",
        serverOptions: {
            port: 9681,
            graphQlEndpoint: "/graphql",
            graphiQlEndpoint: "/graphiql"
        },
        databaseOptions: {
            search: null,
            metrics: null
        },
        release: "internal",
        version: ""
    },
    production: {
        envName: "",
        serverOptions: {
            port: 9681,
            graphQlEndpoint: "/graphql",
            graphiQlEndpoint: "/graphiql"
        },
        databaseOptions: {
            search: null,
            metrics: null
        },
        release: "public",
        version: ""
    }
};

function loadConfiguration(): IServiceOptions {
    const envName = process.env.NODE_ENV || "development";

    const c = configurations[envName];

    c.envName = envName;

    c.ontologyPath = process.env.ONTOLOGY_PATH || c.ontologyPath;

    c.release =  process.env.NEURON_BROWSER_RELEASE || c.release;

    c.version = readSystemVersion();

    const dbEnvName = process.env.DATABASE_ENV || envName;

    c.databaseOptions.search = Databases.search[dbEnvName];
    c.databaseOptions.search.host = process.env.SEARCH_DB_HOST || c.databaseOptions.search.host;
    c.databaseOptions.search.port = process.env.SEARCH_DB_PORT || c.databaseOptions.search.port;
    c.databaseOptions.search.user = process.env.DATABASE_USER || c.databaseOptions.search.user;
    c.databaseOptions.search.password = process.env.DATABASE_PW || "pgsecret";

    c.databaseOptions.metrics = Databases.metrics[dbEnvName];

    // Can be null if not implemented in a particular deployment environment.
    if (c.databaseOptions.metrics) {
        c.databaseOptions.metrics.host = process.env.METRICS_DB_HOST || c.databaseOptions.metrics.host;
        c.databaseOptions.metrics.port = process.env.METRICS_DB_PORT || c.databaseOptions.metrics.port;
    }

    return c;
}

export const ServiceOptions: IServiceOptions = loadConfiguration();

export const DatabaseOptions: IDataBaseOptions = ServiceOptions.databaseOptions;

function readSystemVersion(): string {
    try {
        const contents = JSON.parse(fs.readFileSync(path.resolve("package.json")).toString());
        return contents.version;
    } catch (err) {
        console.log(err);
        return "";
    }
}