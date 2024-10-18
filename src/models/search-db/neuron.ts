import {Sequelize, DataTypes, BelongsToGetAssociationMixin, HasManyGetAssociationsMixin} from "sequelize";

const debug = require("debug")("mnb:search-api:neuron-model");

import {BaseModel} from "./baseModel";
import {BrainArea} from "./brainArea";
import {Tracing} from "./tracing";
import {Sample} from "./sample";
import {TracingStructure} from "./tracingStructure";
import {TracingNode} from "./tracingNode";
import {CcfV25SearchContent} from "./ccfV25SearchContent";
import {CcfV30SearchContent} from "./ccfV30SearchContent";

export enum ConsensusStatus {
    Full,
    Partial,
    Single,
    Pending,
    None
}

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

type NeuronCache = Map<string, Neuron>;

class NeuronCounts {
    [key: number]: number;
}

export class Neuron extends BaseModel {
    public idString: string;
    public tag: string;
    public keywords: string;
    public x: number;
    public y: number;
    public z: number;
    public doi: string;
    public consensus: ConsensusStatus;
    public searchScope: SearchScope;
    public legacySomaIds: string;
    public hortaDeepLink: string;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    public getBrainArea!: BelongsToGetAssociationMixin<BrainArea>;
    public getSample!: BelongsToGetAssociationMixin<Sample>;
    public getTracings!: HasManyGetAssociationsMixin<Tracing>;
    public getManualSomaCompartment!: BelongsToGetAssociationMixin<BrainArea>;

    public tracings?: Tracing[];
    public brainArea?: BrainArea;
    public manualSomaCompartment?: BrainArea;
    public legacySomaCompartments?: BrainArea[];

    private static _neuronCache: NeuronCache = new Map<string, Neuron>();

    private static _neuronCounts = new NeuronCounts();

    public static getOne(id: string): Neuron {
        return this._neuronCache.get(id);
    }

    public static neuronCount(scope: SearchScope) {
        if (scope === null || scope === undefined) {
            return this._neuronCounts[SearchScope.Published];
        }

        return this._neuronCounts[scope];
    }

    public static async loadNeuronCache() {
        debug(`loading neurons`);

        const neurons: Neuron[] = await Neuron.findAll({
            include: [
                {
                    model: BrainArea,
                    as: "brainArea"
                },
                {
                    model: BrainArea,
                    as: "manualSomaCompartment"
                },
                {
                    model: Tracing,
                    as: "tracings",
                    include: [{
                        model: TracingStructure,
                        as: "tracingStructure"
                    }, {
                        model: TracingNode,
                        as: "soma"
                    }]
                }
            ]
        });

        debug(`loaded ${neurons.length} neurons`);

        neurons.map((n) => {
            if (n.brainArea === null && n.tracings.length > 0 && n.tracings[0].soma) {
                n.brainArea = BrainArea.getOne(n.tracings[0].soma.brainAreaIdCcfV25);
            }

            this._neuronCache.set(n.id, n);

            if (n.idString == "AA1030") {
                debug(JSON.stringify(n));
            }
        });

        this._neuronCounts[SearchScope.Private] = this._neuronCounts[SearchScope.Team] = neurons.length;

        this._neuronCounts[SearchScope.Division] = this._neuronCounts[SearchScope.Internal] = this._neuronCounts[SearchScope.Moderated] = neurons.filter(n => n.searchScope >= SearchScope.Division).length;

        this._neuronCounts[SearchScope.External] = this._neuronCounts[SearchScope.Public] = this._neuronCounts[SearchScope.Published] = neurons.filter(n => n.searchScope >= SearchScope.External).length;

        debug(`${this.neuronCount(SearchScope.Team)} team-visible neurons`);
        debug(`${this.neuronCount(SearchScope.Internal)} internal-visible neurons`);
        debug(`${this.neuronCount(SearchScope.Public)} public-visible neurons`);
    }
}

export const modelInit = (sequelize: Sequelize) => {
    Neuron.init({
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
        consensus: DataTypes.INTEGER,
        doi: DataTypes.TEXT,
        hortaDeepLink: DataTypes.TEXT,
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
    }, {
        tableName: "Neuron",
        timestamps: true,
        sequelize
    });
};

export const modelAssociate = () => {
    Neuron.belongsTo(Sample, {foreignKey: {name: "sampleId"}});
    Neuron.belongsTo(BrainArea, {foreignKey: {name: "brainAreaId", allowNull: true}, as: "brainArea"});
    Neuron.belongsTo(BrainArea, {foreignKey: "manualSomaCompartmentId", as: "manualSomaCompartment"});
    Neuron.hasMany(Tracing, {foreignKey: "neuronId", as: "tracings"});
    Neuron.hasMany(CcfV25SearchContent, {foreignKey: "neuronId"});
    Neuron.hasMany(CcfV30SearchContent, {foreignKey: "neuronId"});
};
