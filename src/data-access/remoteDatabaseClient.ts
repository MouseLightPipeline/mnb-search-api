import * as path from "path";
import * as fs from "fs";

import {Sequelize, Options, Op} from "sequelize";
import {loadTracingCache} from "../rawquery/tracingQueryMiddleware";
import {Neuron} from "../models/search-db/neuron";
import {BrainArea} from "../models/search-db/brainArea";

const debug = require("debug")("mnb:search-api:storage-manager");

export class RemoteDatabaseClient {
    public static async Start(name: string, options: Options, prepareContents: boolean = false): Promise<RemoteDatabaseClient> {
        const client = new RemoteDatabaseClient(options);
        await client.start(name, prepareContents);
        return client;
    }

    private _connection: Sequelize;
    private readonly _options: Options;

    private constructor(options: Options) {
        this._options = options;
    }

    private async start(name: string, prepareContents: boolean) {
        this.createConnection(name, this._options);
        await this.authenticate(name);

        if (prepareContents) {
            await RemoteDatabaseClient.prepareSearchContents();
        }
    }

    private createConnection(name: string, options: Options) {
        this._connection = new Sequelize(options.database, options.username, options.password, options);

        this.loadModels(path.normalize(path.join(__dirname, "..", "models", name)));
    }

    private async authenticate(name: string) {
        try {
            await this._connection.authenticate();

            debug(`successful database connection: ${name}`);

        } catch (err) {
            if (err.name === "SequelizeConnectionRefusedError") {
                debug(`failed database connection: ${name} (connection refused - is it running?) - delaying 5 seconds`);
            } else {
                debug(`failed database connection: ${name} - delaying 5 seconds`);
                debug(err);
            }

            setTimeout(() => this.authenticate(name), 5000);
        }
    }

    private loadModels(modelLocation: string) {
        const modules = [];

        fs.readdirSync(modelLocation).filter(file => {
            return (file.indexOf(".") !== 0) && (file.slice(-3) === ".js");
        }).forEach(file => {
            let modelModule = require(path.join(modelLocation, file.slice(0, -3)));

            if (modelModule.modelInit != null) {
                modelModule.modelInit(this._connection);
                modules.push(modelModule);
            }
        });

        modules.forEach(modelModule => {
            if (modelModule.modelAssociate != null) {
                modelModule.modelAssociate();
            }
        });
    }


    private static async prepareSearchContents() {
        debug(`preparing search contents`);

        await BrainArea.loadCompartmentCache();

        await Neuron.loadNeuronCache();

        await loadTracingCache();
    }
}
