import * as Sequelize from "sequelize";
const Influx = require("influx");

const debug = require("debug")("mdb:search:database-connector");

import {INeuron} from "./search/neuron";
import {SequelizeOptions} from "../options/databaseOptions"
import {MetricsOptions} from "../options/databaseOptions"
import {loadModels} from "./modelLoader";
import {loadTracingCache} from "../rawquery/tracingQueryMiddleware";


const Op = Sequelize.Op;

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

    // The area and all subareas, so that searching the parent is same as searching in all the children.
    private _comprehensiveBrainAreaLookup = new Map<string, string[]>();

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

    public ComprehensiveBrainAreas(id: string): string[] {
        return this._comprehensiveBrainAreaLookup.get(id);
    }

    public Neuron(id: string) {
        return this._neuronCache.get(id);
    }

    public get NeuronCount() {
        return this._neuronCache.size;
    }

    public async logQuery(queryObject: any, querySql: any, errors: any, duration: number) {
        try {
            if (this.influxDatabase) {
                await this.influxDatabase.writePoints([
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
                ]);
            }
        } catch (err) {
            debug("loq query failed.");
            debug(err);
        }
    }

    public async initialize() {
        await authenticate(this.searchDatabase, "search");

        const neurons = await this.Neurons.findAll({
            include: [this.BrainAreas, {
                model: this.Tracings,
                include: [this.TracingStructures]
            }]
        });

        await Promise.all(neurons.map(async (n) => {
            const obj = n.toJSON();
            obj.tracings = obj.Tracings;
            obj.Tracings = undefined;
            obj.brainArea = obj.BrainArea;
            obj.BrainArea = undefined;

            await Promise.all(obj.tracings.map(async (t) => {
                t.tracingStructure = t.TracingStructure;

                const map = await this.searchDatabase.models.TracingSomaMap.findOne({where: {tracingId: t.id}});

                if (map) {
                    const node = await this.Nodes.findById(map.somaId);

                    t.soma = node.toJSON();
                }
            }));

            this._neuronCache.set(obj.id, obj);
        }));

        const brainAreas = await this.BrainAreas.findAll({});

        await Promise.all(brainAreas.map(async (b) => {
            const result = await this.BrainAreas.findAll({
                attributes: ["id", "structureIdPath"],
                where: {structureIdPath: {[Op.like]: b.structureIdPath + "%"}}
            });
            this._comprehensiveBrainAreaLookup.set(b.id, result.map(r => r.id));
        }));

        await loadTracingCache();
    }

    private searchDatabase: ISequelizeDatabase<ISearchDatabaseModels> = createConnection({});
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

function createConnection<T>(models: T) {
    let db: ISequelizeDatabase<T> = {
        connection: null,
        models: models,
        isConnected: false
    };

    debug(`initiating connection: ${SequelizeOptions.host}:${SequelizeOptions.port}#${SequelizeOptions.database}`);

    db.connection = new Sequelize(SequelizeOptions.database, SequelizeOptions.username, SequelizeOptions.password, SequelizeOptions);

    return loadModels(db, __dirname + "/" + "search");
}

function establishInfluxConnection() {
    if (MetricsOptions) {
        return new Influx.InfluxDB({
            host: MetricsOptions.host,
            port: MetricsOptions.port,
            database: MetricsOptions.database,
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
