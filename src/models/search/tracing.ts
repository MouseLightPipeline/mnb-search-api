import {Instance, Model} from "sequelize";

import {ITracingStructureAttributes} from "./tracingStructure";
import {ITracingNode, ITracingNodeAttributes} from "./tracingNode";

export interface ITracingAttributes {
    id: string;
    neuronId: string;
    tracingStructureId: string;
    tracingStructure: ITracingStructureAttributes;
    nodeCount: number;
    pathCount: number;
    branchCount: number;
    endCount: number;
    soma: ITracingNodeAttributes;
    transformedAt: Date;
}

export interface ITracing extends Instance<ITracingAttributes>, ITracingAttributes {
    nodes: ITracingNode[];
}

export interface ITracingTable extends Model<ITracing, ITracingAttributes> {
}

export const TableName = "Tracing";

export function sequelizeImport(sequelize, DataTypes) {
    let Tracing = sequelize.define(TableName, {
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
        timestamps: true,
        freezeTableName: true
    });

    Tracing.associate = models => {
        Tracing.hasMany(models.TracingNode, {foreignKey: "tracingId", as: "nodes"});
        Tracing.hasMany(models.SearchContent, {foreignKey: "tracingId"});
        Tracing.belongsTo(models.Neuron, {foreignKey: "neuronId"});
        Tracing.belongsTo(models.TracingStructure, {foreignKey: "tracingStructureId", as: "tracingStructure"});
        Tracing.belongsTo(models.TracingNode, {foreignKey: "somaId", as: "soma"});
    };

    return Tracing;
}
