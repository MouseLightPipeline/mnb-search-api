import {Sequelize, DataTypes, HasManyGetAssociationsMixin} from "sequelize";

import {BaseModel} from "./baseModel";
import {Sample} from "./sample";

export class MouseStrain extends BaseModel {
    public name: string;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    public getSamples!: HasManyGetAssociationsMixin<Sample>;
}

export const modelInit = (sequelize: Sequelize) => {
    MouseStrain.init({
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.TEXT
    }, {
        tableName: "MouseStrain",
        timestamps: true,
        sequelize
    });
};

export const modelAssociate = () => {
    MouseStrain.hasMany(Sample, {foreignKey: "mouseStrainId"});
};
