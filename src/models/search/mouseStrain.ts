import {DataTypes, Instance, Model, Models} from "sequelize";

import {ISampleAttributes} from "./sample";

export interface IMouseStrainAttributes {
    id?: string;
    name?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IMouseStrain extends Instance<IMouseStrainAttributes>, IMouseStrainAttributes {
    getSamples(): ISampleAttributes[];
}

export interface IMouseStrainTable extends Model<IMouseStrain, IMouseStrainAttributes> {
}

export const TableName = "MouseStrain";

// noinspection JSUnusedGlobalSymbols
export function sequelizeImport(sequelize, DataTypes: DataTypes): IMouseStrainTable {
    const MouseStrain: IMouseStrainTable = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.TEXT
    }, {
        timestamps: true,
        freezeTableName: true
    });

    MouseStrain.associate = (models: Models) => {
        MouseStrain.hasMany(models.Sample, {foreignKey: "mouseStrainId", as: "samples"});
    };

    return MouseStrain;
}
