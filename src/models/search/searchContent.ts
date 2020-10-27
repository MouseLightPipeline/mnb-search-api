import {Sequelize, DataTypes} from "sequelize";

import {ConsensusStatus, Neuron, SearchScope} from "./neuron";
import {BaseModel} from "../baseModel";
import {TracingStructure} from "./tracingStructure";
import {Tracing} from "./tracing";
import {BrainArea} from "./brainArea";

export class SearchContent extends BaseModel {
    public neuronId: string;
    public searchScope: SearchScope;
    public neuronIdString: string;
    public neuronDOI: string;
    public neuronConsensus: ConsensusStatus;
    public somaX: number;
    public somaY: number;
    public somaZ: number;
    public nodeCount: number;
    public somaCount: number;
    public pathCount: number;
    public branchCount: number;
    public endCount: number;
}

export const modelInit = (sequelize: Sequelize) => {
    SearchContent.init({
        id: {
            primaryKey: true,
            type: DataTypes.UUID
        },
        neuronIdString: DataTypes.TEXT,
        neuronDOI: DataTypes.TEXT,
        searchScope: DataTypes.INTEGER,
        neuronConsensus: DataTypes.INTEGER,
        somaX: DataTypes.DOUBLE,
        somaY: DataTypes.DOUBLE,
        somaZ: DataTypes.DOUBLE,
        nodeCount: DataTypes.INTEGER,
        somaCount: DataTypes.INTEGER,
        pathCount: DataTypes.INTEGER,
        branchCount: DataTypes.INTEGER,
        endCount: DataTypes.INTEGER
    }, {
        tableName: "SearchContent",
        timestamps: false,
        sequelize
    });
};

export const modelAssociate = () => {
    SearchContent.belongsTo(Tracing, {foreignKey: "tracingId"});
    SearchContent.belongsTo(BrainArea, {foreignKey: "brainAreaId"});
    SearchContent.belongsTo(Neuron, {foreignKey: "neuronId"});
    SearchContent.belongsTo(TracingStructure, {foreignKey: "tracingStructureId"});
};
