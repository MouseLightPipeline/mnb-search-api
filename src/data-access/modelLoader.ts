const fs = require("fs");
const path = require("path");

const debug = require("debug")("mnb:search-api:model-loader");

import {ISequelizeDatabase} from "./storageManager";

export function loadModels<T>(db: ISequelizeDatabase<T>, modelLocation: string) {
    fs.readdirSync(modelLocation).filter((file: string) => {
        return (file.indexOf(".") !== 0) && (file.slice(-3) === ".js");
    }).forEach((file: string) => {
        let modelModule = require(path.join(modelLocation, file));

        const table = db.connection.import(modelModule.TableName, modelModule.sequelizeImport);

        db.tables[table.name] = table;
    });

    Object.keys(db.tables).forEach(modelName => {
        if (!db.tables[modelName]) {
            debug(`missing expected table definition for ${modelName}`);
            return;
        }

        if (db.tables[modelName].associate) {
            db.tables[modelName].associate(db.tables);
        }
    });

    return db;
}
