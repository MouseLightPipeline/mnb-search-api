import {DataTypes, BelongsToGetAssociationMixin} from "sequelize";

import {ConsensusStatus, Neuron, SearchScope} from "./neuron";
import {BaseModel} from "./baseModel";
import {TracingStructure} from "./tracingStructure";
import {Tracing} from "./tracing";
import {BrainArea} from "./brainArea";

export class SearchContentBase extends BaseModel {
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

    public brainArea?: BrainArea;
    public neuron?: Neuron;
    public tracing?: Tracing;
    public tracingStructure?: TracingStructure;
    public manualSomaCompartment?: BrainArea;
    public legacySomaCompartments?: BrainArea[];

    public getBrainArea!: BelongsToGetAssociationMixin<BrainArea>;
    public getNeuron!: BelongsToGetAssociationMixin<Neuron>;
    public getTracing!: BelongsToGetAssociationMixin<Tracing>;
    public getTracingStructure!: BelongsToGetAssociationMixin<TracingStructure>;
    public getManualSomaCompartment!: BelongsToGetAssociationMixin<BrainArea>;
}

export const SearchContentModelAttributes = {
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
    endCount: DataTypes.INTEGER,
    legacySomaIds: DataTypes.TEXT,
    legacySomaCompartments: {
        type: DataTypes.VIRTUAL(DataTypes.ARRAY, ["legacySomaIds"]),
        get: function (): string[] {
            const ids = JSON.parse(this.getDataValue("legacySomaIds")) || [];
            return ids.map(id => BrainArea.getOne(id));
        },
        set: function (value: string[]) {
            if (value && value.length === 0) {
                value = null;
            }

            this.setDataValue("legacySomaIds", JSON.stringify(value));
        }
    }
};
