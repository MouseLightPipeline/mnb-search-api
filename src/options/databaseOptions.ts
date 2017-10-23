import {IConnectionOptions} from "ndb-data-models";

export interface IDatabases {
    search: IDatabaseEnv;
    metrics: IDatabaseEnv;
}

export interface IDatabaseEnv {
    development: IConnectionOptions;
    azure?: IConnectionOptions;
    production: IConnectionOptions;
}

export const Databases: IDatabases = {
    search: {
        development: {
            database: "search_development",
            username: "postgres",
            host: "search-db",
            port: 5432,
            dialect: "postgres",
            logging: null
        },
        azure: {
            database: "jrcndb",
            username: "JaNEadmin",
            password: "",
            host: "jrcndb.database.windows.net",
            dialect: "mssql",
            dialectOptions: {
                encrypt: true,
                requestTimeout: 60000
            },
            logging: null
        },
        production: {
            database: "search_production",
            username: "postgres",
            host: "search-db",
            port: 5432,
            dialect: "postgres",
            logging: null
        }
    },
    metrics: {
        development: {
            host: "localhost",
            port: 8086,
            database: "query_metrics_db"
        },
        production: {
            host: "metrics-db",
            port: 8086,
            database: "query_metrics_db"
        }
    }
};
