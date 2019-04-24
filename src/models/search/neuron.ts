import {Sequelize, DataTypes, Instance, Model} from "sequelize";
import {ITracing} from "./tracing";
import {IBrainArea} from "./brainArea";
import {ISample} from "./sample";

// Currently using Team, Internal, and Public when generating this database and composing queries.  Allowing for
// additional future fidelity without having to break any existing clients.
export enum SearchScope {
    Private = 0,
    Team = 1,
    Division = 2,
    Internal = 3,
    Moderated = 4,
    External = 5,
    Public = 6,
    Published
}

export interface INeuronAttributes {
    id: string;
    idString: string;
    doi: string;
    tag: string;
    keywords: string;
    x: number;
    y: number;
    z: number;
    searchScope: SearchScope;
    brainAreaId: string;
    brainArea: IBrainArea;
    sampleId: string;
    sample: ISample;
}

export interface INeuron extends Instance<INeuronAttributes>, INeuronAttributes {
    tracings: ITracing[];
    getTracings(): ITracing[];

    brainArea: IBrainArea;
    getBrainArea(): IBrainArea;
}

export interface INeuronTable extends Model<INeuron, INeuronAttributes> {
}

export const TableName = "Neuron";

export function sequelizeImport(sequelize: Sequelize, DataTypes: DataTypes): any {
    const Neuron = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        idString: DataTypes.TEXT,
        tag: DataTypes.TEXT,
        keywords: DataTypes.TEXT,
        x: DataTypes.DOUBLE,
        y: DataTypes.DOUBLE,
        z: DataTypes.DOUBLE,
        searchScope: DataTypes.INTEGER,
        doi: DataTypes.TEXT
    }, {
        timestamps: true,
        freezeTableName: true
    });

    Neuron.associate = (models: any) => {
        Neuron.belongsTo(models.BrainArea, {foreignKey: {name: "brainAreaId", allowNull: true}, as: "brainArea"});
        Neuron.hasMany(models.SearchContent, {foreignKey: "neuronId"});
        Neuron.hasMany(models.Tracing, {foreignKey: "neuronId", as: "tracings"});
        Neuron.belongsTo(models.Sample, {foreignKey: {name: "sampleId"}, as: "sample"});
    };

    return Neuron;
}

