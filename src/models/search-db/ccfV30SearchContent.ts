import { Sequelize} from "sequelize";
import {Tracing} from "./tracing";
import {BrainArea} from "./brainArea";
import {Neuron} from "./neuron";
import {TracingStructure} from "./tracingStructure";
import {SearchContentBase, SearchContentModelAttributes} from "./searchContent";

export class CcfV30SearchContent extends SearchContentBase {}

export const modelInit = (sequelize: Sequelize) => {
    CcfV30SearchContent.init(SearchContentModelAttributes, {
        tableName: "CcfV30SearchContent",
        timestamps: false,
        sequelize
    });
};

export const modelAssociate = () => {
    CcfV30SearchContent.belongsTo(Tracing, {foreignKey: "tracingId", as: "tracing"});
    CcfV30SearchContent.belongsTo(BrainArea, {foreignKey: "brainAreaId", as: "brainArea"});
    CcfV30SearchContent.belongsTo(Neuron, {foreignKey: "neuronId", as: "neuron"});
    CcfV30SearchContent.belongsTo(TracingStructure, {foreignKey: "tracingStructureId", as: "tracingStructure"});
};
