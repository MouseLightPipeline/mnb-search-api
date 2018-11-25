import * as path from "path";
import * as SequelizeFactory from "sequelize";
import {Op, Sequelize} from "sequelize";
import {INeuron, INeuronTable, SearchScope} from "../models/search/neuron";
import {SequelizeOptions} from "../options/databaseOptions"
import {loadModels} from "./modelLoader";
import {loadTracingCache} from "../rawquery/tracingQueryMiddleware";
import {ISearchContentTable} from "../models/search/searchContent";
import {IBrainAreaTable} from "../models/search/brainArea";
import {IStructureIdentifierTable} from "../models/search/structureIdentifier";
import {ITracingTable} from "../models/search/tracing";
import {ITracingNodeTable} from "../models/search/tracingNode";
import {ITracingStructureTable} from "../models/search/tracingStructure";

const debug = require("debug")("mnb:search-api:storage-manager");

const reattemptConnectDelay = 10;

export class SearchTables {
    public constructor() {
        this.BrainArea = null;
        this.Neuron = null;
        this.SearchContent = null;
        this.StructureIdentifier = null;
        this.Tracing = null;
        this.TracingNode = null;
        this.TracingStructure = null;
    }

    BrainArea: IBrainAreaTable;
    Neuron: INeuronTable;
    SearchContent: ISearchContentTable;
    StructureIdentifier: IStructureIdentifierTable;
    Tracing: ITracingTable;
    TracingNode: ITracingNodeTable;
    TracingStructure: ITracingStructureTable;
}

class NeuronCounts {
    [key: number]: number;
}

export interface ISequelizeDatabase<T> {
    connection: Sequelize;
    tables: SearchTables;
}

export class StorageManager {
    private _searchDatabase: ISequelizeDatabase<SearchTables> = null;

    public static Instance(): StorageManager {
        return _manager;
    }

    private _neuronCache = new Map<string, INeuron>();

    private _neuronCounts = new NeuronCounts();

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

    public get SearchContent() {
        return this._searchDatabase.tables.SearchContent;
    }

    public ComprehensiveBrainAreas(id: string): string[] {
        return this._comprehensiveBrainAreaLookup.get(id);
    }

    public Neuron(id: string) {
        return this._neuronCache.get(id);
    }

    public neuronCount(scope: SearchScope) {
        if (scope === null || scope === undefined) {
            return this._neuronCounts[SearchScope.Published];
        }

        return this._neuronCounts[scope];
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
                    searchDatabase.tables[modelName].prepareContents();
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
                {
                    model: searchDatabase.tables.BrainArea,
                    as: "brainArea"
                },
                {
                    model: searchDatabase.tables.Tracing,
                    as: "tracings",
                    include: [{
                        model: searchDatabase.tables.TracingStructure,
                        as: "tracingStructure"
                    }, {
                        model: searchDatabase.tables.TracingNode,
                        as: "soma"
                    }]
                }
            ]
        });

        neurons.map((n) => {
            const obj: any = n.toJSON();
            this._neuronCache.set(obj.id, obj);
        });

        this._neuronCounts[SearchScope.Private] = this._neuronCounts[SearchScope.Team] = this._neuronCache.size;

        this._neuronCounts[SearchScope.Division] = this._neuronCounts[SearchScope.Internal] = this._neuronCounts[SearchScope.Moderated] = Array.from(this._neuronCache.values()).filter(n => n.searchScope >= SearchScope.Division).length;

        this._neuronCounts[SearchScope.External] = this._neuronCounts[SearchScope.Public] = this._neuronCounts[SearchScope.Published] = Array.from(this._neuronCache.values()).filter(n => n.searchScope >= SearchScope.External).length;

        debug(`${this.neuronCount(SearchScope.Team)} team-visible neurons`);
        debug(`${this.neuronCount(SearchScope.Internal)} internal-visible neurons`);
        debug(`${this.neuronCount(SearchScope.Public)} public-visible neurons`);

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

const _manager: StorageManager = new StorageManager();

_manager.initialize().then(() => {
    debug("search database connection initialized");
});
