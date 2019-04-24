import {DataTypes, Instance, Model, Models} from "sequelize";

import {IMouseStrainAttributes, IMouseStrainTable} from "./mouseStrain";

export interface ISampleAttributes {
    id?: string,
    idNumber?: number;
    animalId?: string;
    tag?: string;
    comment?: string;
    sampleDate?: Date;
    mouseStrainId?: string;
    searchScope?: number;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

export interface ISample extends Instance<ISampleAttributes>, ISampleAttributes {
    getMouseStrain(): IMouseStrainAttributes;
}

export interface ISampleTable extends Model<ISample, ISampleAttributes> {
    MouseStrainTable: IMouseStrainTable;
}

export const TableName = "Sample";

// noinspection JSUnusedGlobalSymbols
export function sequelizeImport(sequelize, DataTypes: DataTypes): ISampleTable {
    const Sample: ISampleTable = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        idNumber: {
            type: DataTypes.INTEGER,
            defaultValue: -1
        },
        animalId: DataTypes.TEXT,
        tag: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        comment: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        searchScope: DataTypes.INTEGER
    }, {
        timestamps: true,
        freezeTableName: true
    });

    Sample.associate = (models: Models) => {
        Sample.belongsTo(models.MouseStrain, {foreignKey: "mouseStrainId", as: "mouseStrain"});

        Sample.MouseStrainTable = models.MouseStrain as IMouseStrainTable;
    };

    Sample.MouseStrainTable = null;

    return Sample;
}
