import {BelongsToGetAssociationMixin, DataTypes, HasManyGetAssociationsMixin, Sequelize} from "sequelize";

import {BaseModel} from "./baseModel";
import {TracingNode} from "./tracingNode";
import {TracingStructure} from "./tracingStructure";
import {Neuron} from "./neuron";
import {CcfV25SearchContent} from "./ccfV25SearchContent";
import {CcfV30SearchContent} from "./ccfV30SearchContent";

export class Tracing extends BaseModel {
    public nodeCount: number;
    public pathCount: number;
    public branchCount: number;
    public endCount: number;
    public transformedAt: Date;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    public getNodes!: HasManyGetAssociationsMixin<TracingNode>;
    public getSoma!: BelongsToGetAssociationMixin<TracingNode>;
    public getNeuron!: BelongsToGetAssociationMixin<Neuron>;
    public getTracingStructure!: BelongsToGetAssociationMixin<TracingStructure>;

    public nodes?: TracingNode[];
    public soma?: TracingNode;
    public tracingStructure?: TracingStructure;
}

export const modelInit = (sequelize: Sequelize) => {
    Tracing.init({
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        nodeCount: DataTypes.INTEGER,
        pathCount: DataTypes.INTEGER,
        branchCount: DataTypes.INTEGER,
        endCount: DataTypes.INTEGER,
        transformedAt: DataTypes.DATE
    }, {
        tableName: "Tracing",
        timestamps: true,
        sequelize
    });
};

export const modelAssociate = () => {
    Tracing.belongsTo(TracingStructure, {foreignKey: "tracingStructureId", as: "tracingStructure"});
    Tracing.hasMany(TracingNode, {foreignKey: "tracingId", as: "nodes"});
    Tracing.belongsTo(TracingNode, {foreignKey: "somaId", as: "soma"});
    Tracing.belongsTo(Neuron, {foreignKey: "neuronId"});
    Tracing.hasMany(CcfV25SearchContent, {foreignKey: "tracingId"});
    Tracing.hasMany(CcfV30SearchContent, {foreignKey: "tracingId"});
};
