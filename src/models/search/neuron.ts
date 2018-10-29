import {Sequelize, DataTypes, Instance, Model} from "sequelize";
import {ITracing} from "./tracing";
import {IBrainArea} from "./brainArea";

export interface INeuronAttributes {
    id: string;
    idString: string;
    tag: string;
    keywords: string;
    x: number;
    y: number;
    z: number;
    sharing: number;
    doi: string;
    brainArea: IBrainArea;
    tracings: ITracing[];
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
        idString: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        tag: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        keywords: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        x: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        y: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        z: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        sharing: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        doi: {
            type: DataTypes.TEXT
        }
    }, {
        timestamps: true
    });

    Neuron.associate = (models: any) => {
        Neuron.belongsTo(models.BrainArea, {foreignKey: {name: "brainAreaId", allowNull: true}});
        Neuron.hasMany(models.NeuronBrainAreaMap, {foreignKey: "neuronId"});
        Neuron.hasMany(models.Tracing, {foreignKey: "neuronId", as: "tracings"});
    };

    return Neuron;
}

