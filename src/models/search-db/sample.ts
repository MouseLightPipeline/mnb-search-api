import {
    BelongsToGetAssociationMixin,
    DataTypes, FindOptions,
    HasManyGetAssociationsMixin,
    Sequelize
} from "sequelize";

import {    BaseModel} from "./baseModel";
import {MouseStrain} from "./mouseStrain";


export class Sample extends BaseModel {
    public idNumber: number;
    public animalId: string;
    public tag: string;
    public comment: string;
    public sampleDate: Date;
    public searchScope?: number;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    public getMouseStrain!: BelongsToGetAssociationMixin<MouseStrain>;
}

export const modelInit = (sequelize: Sequelize) => {
    Sample.init({
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
        tableName: "Sample",
        timestamps: true,
        sequelize
    });
};

export const modelAssociate = () => {
    Sample.belongsTo(MouseStrain, {foreignKey: "mouseStrainId"});
};
