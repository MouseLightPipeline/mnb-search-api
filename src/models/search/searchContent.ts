import {SearchScope} from "./neuron";
import {Instance, Model} from "sequelize";

export interface ISearchContentAttributes {
    id: string;
    searchScope: SearchScope;
    neuronId: string;
    tracingId: string;
    brainAreaId: string;
    neuronIdString: string;
    neuronDOI: string;
    somaX: number;
    somaY: number;
    somaZ: number;
    nodeCount: number;
    somaCount: number;
    pathCount: number;
    branchCount: number;
    endCount: number;
}

export interface ISearchContent extends Instance<ISearchContentAttributes>, ISearchContentAttributes {
}

export interface ISearchContentTable extends Model<ISearchContent, ISearchContentAttributes> {
}

export const TableName = "SearchContent";

export function sequelizeImport(sequelize, DataTypes) {
    let NeuronBrainAreaMap = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID
        },
        neuronIdString: DataTypes.TEXT,
        neuronDOI: DataTypes.TEXT,
        searchScope: DataTypes.INTEGER,
        somaX: DataTypes.DOUBLE,
        somaY: DataTypes.DOUBLE,
        somaZ: DataTypes.DOUBLE,
        nodeCount: DataTypes.INTEGER,
        somaCount: DataTypes.INTEGER,
        pathCount: DataTypes.INTEGER,
        branchCount: DataTypes.INTEGER,
        endCount: DataTypes.INTEGER
    }, {
        timestamps: false,
        freezeTableName: true
    });

    NeuronBrainAreaMap.associate = models => {
        NeuronBrainAreaMap.belongsTo(models.Tracing, {foreignKey: "tracingId"});
        NeuronBrainAreaMap.belongsTo(models.BrainArea, {foreignKey: "brainAreaId"});
        NeuronBrainAreaMap.belongsTo(models.Neuron, {foreignKey: "neuronId"});
        NeuronBrainAreaMap.belongsTo(models.TracingStructure, {foreignKey: "tracingStructureId"});
    };

    return NeuronBrainAreaMap;
}
