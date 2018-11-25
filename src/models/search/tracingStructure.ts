import {Instance, Model} from "sequelize";

export interface ITracingStructureAttributes {
    id: string;
    name: string;
    value: number;
}

export interface ITracingStructure extends Instance<ITracingStructureAttributes>, ITracingStructureAttributes {
}

export interface ITracingStructureTable extends Model<ITracingStructure, ITracingStructureAttributes> {
}

export const TableName = "TracingStructure";

export function sequelizeImport(sequelize, DataTypes) {
    const TracingStructure = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.TEXT,
        value: DataTypes.INTEGER
    }, {
        timestamps: false,
        freezeTableName: true
    });

    TracingStructure.associate = models => {
        TracingStructure.hasMany(models.Tracing, {foreignKey: "tracingStructureId"});
    };

    return TracingStructure;
}
