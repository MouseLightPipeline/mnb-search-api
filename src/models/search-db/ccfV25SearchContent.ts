import { Sequelize} from "sequelize";
import {Tracing} from "./tracing";
import {BrainArea} from "./brainArea";
import {Neuron} from "./neuron";
import {TracingStructure} from "./tracingStructure";
import {SearchContentBase, SearchContentModelAttributes} from "./searchContent";

export class CcfV25SearchContent extends SearchContentBase {}

export const modelInit = (sequelize: Sequelize) => {
    CcfV25SearchContent.init(SearchContentModelAttributes, {
        tableName: "CcfV25SearchContent",
        timestamps: false,
        sequelize
    });
};

export const modelAssociate = () => {
    CcfV25SearchContent.belongsTo(Tracing, {foreignKey: "tracingId", as: "tracing"});
    CcfV25SearchContent.belongsTo(BrainArea, {foreignKey: "brainAreaId", as: "brainArea"});
    CcfV25SearchContent.belongsTo(Neuron, {foreignKey: "neuronId", as: "neuron"});
    CcfV25SearchContent.belongsTo(TracingStructure, {foreignKey: "tracingStructureId", as: "tracingStructure"});
};
