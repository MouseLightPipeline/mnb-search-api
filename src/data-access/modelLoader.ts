const fs = require("fs");
const path = require("path");

import {ISequelizeDatabase} from "./persistentStorageManager";

export function loadModels<T>(db: ISequelizeDatabase<T>, modelLocation: string) {
    fs.readdirSync(modelLocation).filter(file => {
        return (file.indexOf(".") !== 0) && (file.slice(-3) === ".js");
    }).forEach(file => {
        let modelModule = require(path.join(modelLocation, file));

        const table = db.connection.import(modelModule.TableName, modelModule.sequelizeImport);

        db.tables[table.name] = table;
    });

    Object.keys(db.tables).forEach(modelName => {
        if (db.tables[modelName].associate) {
            db.tables[modelName].associate(db.tables);
        }
    });

    return db;
}
