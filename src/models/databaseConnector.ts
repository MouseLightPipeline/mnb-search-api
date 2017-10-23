import {INeuron} from "./search/neuron";

const Influx = require("influx");
const Sequelize = require("sequelize");

const debug = require("debug")("ndb:search:database-connector");

import {DatabaseOptions} from "../options/serviceOptions"

import {loadModels} from "./modelLoader";
import {loadTracingCache} from "../rawquery/tracingQueryMiddleware";

export interface ISearchDatabaseModels {
    BrainArea?: any
    StructureIdentifier?: any;
    TracingStructure?: any;
    Neuron?: any;
    Tracing?: any;
    TracingNode?: any;
    NeuronBrainAreaMap?: any;
    TracingSomaMap?: any;
}

export interface ISequelizeDatabase<T> {
    connection: any;
    models: T;
    isConnected: boolean;
}

export class PersistentStorageManager {
    public static Instance(): PersistentStorageManager {
        return _manager;
    }

    private _neuronCache = new Map<string, INeuron>();

    public get SearchConnection() {
        return this.searchDatabase.connection;
    }

    public get BrainAreas() {
        return this.searchDatabase.models.BrainArea;
    }

    public get Neurons() {
        return this.searchDatabase.models.Neuron;
    }

    public get TracingStructures() {
        return this.searchDatabase.models.TracingStructure;
    }

    public get StructureIdentifiers() {
        return this.searchDatabase.models.StructureIdentifier;
    }

    public get Tracings() {
        return this.searchDatabase.models.Tracing;
    }

    public get Nodes() {
        return this.searchDatabase.models.TracingNode;
    }

    public get BrainCompartment() {
        return this.searchDatabase.models.NeuronBrainAreaMap;
    }

    public Neuron(id: string) {
        return this._neuronCache.get(id);
    }

    public async logQuery(queryObject: any, querySql: any, errors: any, duration: number) {
        try {
            if (this.influxDatabase) {
                this.influxDatabase.writePoints([
                    {
                        measurement: "query_response_times",
                        tags: {user: "none"},
                        fields: {
                            queryObject: JSON.stringify(queryObject),
                            querySql: JSON.stringify(querySql),
                            errors: JSON.stringify(errors),
                            duration
                        },
                    }
                ]).then();
            }
        } catch (err) {
            debug("loq query failed.");
            debug(err);
        }
    }

    public async initialize() {
        await authenticate(this.searchDatabase, "search");

        const neurons = await this.Neurons.findAll({include: [this.BrainAreas, {model: this.Tracings, include: [this.TracingStructures]}]});

        await Promise.all(neurons.map(async (n) => {
            const obj = n.toJSON();
            obj.tracings = obj.Tracings;
            obj.Tracings = undefined;
            obj.brainArea = obj.BrainArea;
            obj.BrainArea = undefined;

            await Promise.all(obj.tracings.map(async(t)=> {
                t.tracingStructure = t.TracingStructure;

                const map = await this.searchDatabase.models.TracingSomaMap.findOne({where: {tracingId: t.id}});

                if (map) {
                    const node = await this.Nodes.findById(map.somaId);

                    t.soma = node.toJSON();
                }
            }));

            this._neuronCache.set(obj.id, obj);
        }));

        await loadTracingCache();
    }

    private searchDatabase: ISequelizeDatabase<ISearchDatabaseModels> = createConnection("search", {});
    private influxDatabase = establishInfluxConnection();
}

async function authenticate(database, name) {
    try {
        await database.connection.authenticate();

        database.isConnected = true;

        debug(`successful database connection: ${name}`);

        Object.keys(database.models).forEach(modelName => {
            if (database.models[modelName].prepareContents) {
                database.models[modelName].prepareContents(database.models);
            }
        });
    } catch (err) {
        debug(`failed database connection: ${name}`);
        debug(err);
        setTimeout(() => authenticate(database, name), 5000);
    }
}

function createConnection<T>(name: string, models: T) {
    let databaseConfig = DatabaseOptions[name];

    let db: ISequelizeDatabase<T> = {
        connection: null,
        models: models,
        isConnected: false
    };

    debug(`initiating connection: ${databaseConfig.host}:${databaseConfig.port}#${databaseConfig.database}`);

    db.connection = new Sequelize(databaseConfig.database, databaseConfig.username, databaseConfig.password, databaseConfig);

    return loadModels(db, __dirname + "/" + name);
}

function establishInfluxConnection() {
    if (DatabaseOptions["metrics"]) {
        const databaseConfig = DatabaseOptions["metrics"];

        return new Influx.InfluxDB({
            host: databaseConfig.host,
            port: databaseConfig.port,
            database: databaseConfig.database,
            schema: [
                {
                    measurement: "query_response_times",
                    fields: {
                        queryObject: Influx.FieldType.STRING,
                        querySql: Influx.FieldType.STRING,
                        errors: Influx.FieldType.STRING,
                        duration: Influx.FieldType.INTEGER
                    },
                    tags: [
                        "user"
                    ]
                }
            ]
        });
    } else {
        return null;
    }
}

const _manager: PersistentStorageManager = new PersistentStorageManager();

_manager.initialize().then(() => {
});
