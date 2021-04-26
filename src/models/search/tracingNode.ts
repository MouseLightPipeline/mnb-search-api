import {BelongsToGetAssociationMixin, DataTypes, Sequelize} from "sequelize";

import {BaseModel} from "../baseModel";
import {Tracing} from "./tracing";
import {StructureIdentifier} from "./structureIdentifier";
import {BrainArea} from "./brainArea";

export interface IPageInput {
    tracingId: string;
    offset: number;
    limit: number;
}

export interface INodePage {
    offset: number;
    limit: number;
    totalCount: number;
    hasNextPage: boolean;
    nodes: TracingNode[];
}

export class TracingNode extends BaseModel {
    public sampleNumber: number;
    public parentNumber: number;
    public x: number;
    public y: number;
    public z: number;
    public radius: number;
    public lengthToParent: number;
    public structureIdentifierId: string;
    public brainAreaIdCcfV25: string;
    public brainAreaIdCcfV30: string;

    public getTracing!: BelongsToGetAssociationMixin<Tracing>;
}

export const modelInit = (sequelize: Sequelize) => {
    TracingNode.init({
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        // Unchanged values
        sampleNumber: DataTypes.INTEGER,
        parentNumber: DataTypes.INTEGER,
        radius: DataTypes.DOUBLE,
        lengthToParent: DataTypes.DOUBLE,
        structureIdentifierId: DataTypes.UUID,
        // Modified values
        x: DataTypes.DOUBLE,
        y: DataTypes.DOUBLE,
        z: DataTypes.DOUBLE,
        // Outside refs
        swcNodeId: DataTypes.UUID,
        brainAreaIdCcfV25: DataTypes.UUID,
        brainAreaIdCcfV30: DataTypes.UUID
    }, {
        tableName: "TracingNode",
        timestamps: false,
        sequelize
    });
};

export const modelAssociate = () => {
    TracingNode.belongsTo(Tracing, {foreignKey: "tracingId"});
    TracingNode.belongsTo(StructureIdentifier, {foreignKey: "structureIdentifierId"});
    TracingNode.belongsTo(BrainArea, {foreignKey: "brainAreaIdCcfV25", as: "brainAreaCcfV25"});
    TracingNode.belongsTo(BrainArea, {foreignKey: "brainAreaIdCcfV30", as: "brainAreaCcfV30"});
};