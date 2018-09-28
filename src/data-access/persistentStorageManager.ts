import * as path from "path";
import * as Sequelize from "sequelize";

const debug = require("debug")("mnb:search-api:storage-manager");

import {INeuron} from "../models/search/neuron";
import {SequelizeOptions} from "../options/databaseOptions"
import {loadModels} from "./modelLoader";
import {loadTracingCache} from "../rawquery/tracingQueryMiddleware";

const Op = Sequelize.Op;

const reattemptConnectDelay = 10;

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
    tables: T;
}

export class PersistentStorageManager {
    private _searchDatabase: ISequelizeDatabase<ISearchDatabaseModels> = null;

    public static Instance(): PersistentStorageManager {
        return _manager;
    }

    private _neuronCache = new Map<string, INeuron>();

    // The area and all subareas, so that searching the parent is same as searching in all the children.
    private _comprehensiveBrainAreaLookup = new Map<string, string[]>();

    public get BrainAreas() {
        return this._searchDatabase.tables.BrainArea;
    }

    public get Neurons() {
        return this._searchDatabase.tables.Neuron;
    }

    public get TracingStructures() {
        return this._searchDatabase.tables.TracingStructure;
    }

    public get StructureIdentifiers() {
        return this._searchDatabase.tables.StructureIdentifier;
    }

    public get Tracings() {
        return this._searchDatabase.tables.Tracing;
    }

    public get Nodes() {
        return this._searchDatabase.tables.TracingNode;
    }

    public get BrainCompartment() {
        return this._searchDatabase.tables.NeuronBrainAreaMap;
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

    public async initialize() {
        const searchDatabase: ISequelizeDatabase<ISearchDatabaseModels> = createConnection({});

        await new Promise(async (resolve) => {
            await this.authenticate(searchDatabase, resolve);
        });

        await this.prepareSearchContents(searchDatabase);

        this._searchDatabase = searchDatabase;
    }

    public async authenticate(searchDatabase: ISequelizeDatabase<ISearchDatabaseModels>, resolve) {
        try {
            await searchDatabase.connection.authenticate();


            Object.keys(searchDatabase.tables).forEach(modelName => {
                if (searchDatabase.tables[modelName].prepareContents) {
                    searchDatabase.tables[modelName].prepareContents(searchDatabase.tables);
                }
            });

            resolve();
        } catch (err) {
            debug(`failed to connect to search database (${err.toString()}) - reattempt in ${reattemptConnectDelay} seconds`);
            setTimeout(() => this.authenticate(searchDatabase, resolve), reattemptConnectDelay * 1000);
        }
    }

    public async prepareSearchContents(searchDatabase: ISequelizeDatabase<ISearchDatabaseModels>) {
        const neurons = await searchDatabase.tables.Neuron.findAll({
            include: [searchDatabase.tables.BrainArea, {
                model: searchDatabase.tables.Tracing,
                include: [searchDatabase.tables.TracingStructure]
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

                const map = await searchDatabase.tables.TracingSomaMap.findOne({where: {tracingId: t.id}});

                if (map) {
                    const node = await searchDatabase.tables.TracingNode.findById(map.somaId);

                    t.soma = node.toJSON();
                }
            }));

            this._neuronCache.set(obj.id, obj);
        }));

        const brainAreas = await searchDatabase.tables.BrainArea.findAll({});

        await Promise.all(brainAreas.map(async (b) => {
            const result = await searchDatabase.tables.BrainArea.findAll({
                attributes: ["id", "structureIdPath"],
                where: {structureIdPath: {[Op.like]: b.structureIdPath + "%"}}
            });
            this._comprehensiveBrainAreaLookup.set(b.id, result.map(r => r.id));
        }));

        await loadTracingCache();
    }
}

function createConnection<T>(tables: T) {
    let db: ISequelizeDatabase<T> = {
        connection: null,
        tables: tables
    };

    debug(`initiating connection: ${SequelizeOptions.host}:${SequelizeOptions.port}#${SequelizeOptions.database}`);

    db.connection = new Sequelize(SequelizeOptions.database, SequelizeOptions.username, SequelizeOptions.password, SequelizeOptions);

    return loadModels(db, path.normalize(path.join(__dirname, "..", "models", "search")));
}

const _manager: PersistentStorageManager = new PersistentStorageManager();

_manager.initialize().then(() => {
    debug("search database connection initialized");
});
