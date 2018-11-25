import {FieldType, InfluxDB} from "influx";

const debug = require("debug")("mnb:search-api:metrics");

import {MetricsOptions} from "../options/databaseOptions";
import {ISearchContext} from "../graphql/serverResolvers";

const reattemptConnectDelay = 10;

export class MetricsStorageManager {
    private _influxDatabase: InfluxDB = null;

    public static Instance(): MetricsStorageManager {
        return _manager;
    }

    public async logQuery(context: ISearchContext, querySql: any, errors: any, duration: number) {
        if (this._influxDatabase) {
            try {
                await this._influxDatabase.writePoints([
                    {
                        measurement: MetricsOptions.measurement,
                        tags: {
                            user: "UNAUTHENTICATED",
                            search_scope: context.scope.toFixed(0),
                            predicate_count: context.predicates.length.toFixed(0),
                            predicate_type: context.predicateType.toFixed(0)
                        },
                        fields: {
                            queryObject: JSON.stringify(context),
                            querySql: JSON.stringify(querySql),
                            errors: JSON.stringify(errors),
                            duration
                        },
                    }
                ]);
            } catch (err) {
                debug("loq query request failed");
                debug(err);
            }
        }
    }

    public async initialize() {
        return new Promise(async (resolve) => {
            await this.authenticate(resolve);
        });
    }

    private async authenticate(resolve) {
        try {
            this._influxDatabase = await establishConnection();
            resolve();
        } catch (err) {
            debug(`failed to connect to metrics database (${err.toString()}) - reattempt in ${reattemptConnectDelay} seconds`);
            setTimeout(() => this.authenticate(resolve), reattemptConnectDelay * 1000);
        }
    }
}

async function establishConnection(): Promise<InfluxDB> {
    await ensureExportDatabase();

    return new InfluxDB({
        host: MetricsOptions.host,
        port: MetricsOptions.port,
        database: MetricsOptions.database,
        schema: [
            {
                measurement: MetricsOptions.measurement,
                fields: {
                    queryObject: FieldType.STRING,
                    querySql: FieldType.STRING,
                    errors: FieldType.STRING,
                    duration: FieldType.INTEGER
                },
                tags: [
                    "user",
                    "search_scope",
                    "predicate_count",
                    "predicate_type"
                ]
            }
        ]
    });
}

async function ensureExportDatabase() {
    const influx = new InfluxDB({
        host: MetricsOptions.host,
        port: MetricsOptions.port
    });

    const names: string[] = await influx.getDatabaseNames();

    if (names.indexOf(MetricsOptions.database) === -1) {
        await influx.createDatabase(MetricsOptions.database);
    }

    debug(`metrics ${MetricsOptions.database} database verified`);
}

const _manager: MetricsStorageManager = new MetricsStorageManager();

_manager.initialize().then(() => {
    debug("metrics database connection initialized");
});
