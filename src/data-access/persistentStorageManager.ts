import * as path from "path";
import * as SequelizeFactory from "sequelize";
import {Sequelize, Op} from "sequelize";

const debug = require("debug")("mnb:search-api:storage-manager");

import {INeuronAttributes, INeuronTable} from "../models/search/neuron";
import {SequelizeOptions} from "../options/databaseOptions"
import {loadModels} from "./modelLoader";
import {loadTracingCache} from "../rawquery/tracingQueryMiddleware";

const reattemptConnectDelay = 10;

export class SearchTables {
    public constructor() {
        this.BrainArea = null;
        this.Neuron = null;
        this.NeuronBrainAreaMap = null;
        this.StructureIdentifier = null;
        this.Tracing = null;
        this.TracingNode = null;
        this.TracingStructure = null;
        this.TracingSomaMap = null;
    }

    BrainArea: any;
    Neuron: INeuronTable;
    NeuronBrainAreaMap: any;
    StructureIdentifier: any;
    Tracing: any;
    TracingNode: any;
    TracingStructure: any;
    TracingSomaMap: any;
}

export interface ISequelizeDatabase<T> {
    connection: Sequelize;
    tables: SearchTables;
}

export class PersistentStorageManager {
    private _searchDatabase: ISequelizeDatabase<SearchTables> = null;

    public static Instance(): PersistentStorageManager {
        return _manager;
    }

    private _neuronCache = new Map<string, INeuronAttributes>();

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
        const searchDatabase: ISequelizeDatabase<SearchTables> = createConnection();

        await new Promise(async (resolve) => {
            await this.authenticate(searchDatabase, resolve);
        });

        await this.prepareSearchContents(searchDatabase);

        this._searchDatabase = searchDatabase;
    }

    public async authenticate(searchDatabase: ISequelizeDatabase<SearchTables>, resolve) {
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

    public async prepareSearchContents(searchDatabase: ISequelizeDatabase<SearchTables>) {
        const neurons: any[] = await searchDatabase.tables.Neuron.findAll({
            include: [
                searchDatabase.tables.BrainArea,
                {
                    model: searchDatabase.tables.Tracing,
                    include: [searchDatabase.tables.TracingStructure]
                }
            ]
        });

        await Promise.all(neurons.map(async (n) => {
            const obj: any = n.toJSON();

            obj.tracings = n.Tracings;
            obj.Tracings = undefined;
            obj.brainArea = n.BrainArea;
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

function createConnection<T>() {
    let db: ISequelizeDatabase<T> = {
        connection: null,
        tables: new SearchTables()
    };

    debug(`initiating connection: ${SequelizeOptions.host}:${SequelizeOptions.port}#${SequelizeOptions.database}`);

    db.connection = new SequelizeFactory(SequelizeOptions.database, SequelizeOptions.username, SequelizeOptions.password, SequelizeOptions);

    return loadModels(db, path.normalize(path.join(__dirname, "..", "models", "search")));
}

const _manager: PersistentStorageManager = new PersistentStorageManager();

_manager.initialize().then(() => {
    debug("search database connection initialized");
});
