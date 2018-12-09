import {Instance, Model} from "sequelize";
import {sampleApiClient} from "../../graphql/services/sampleApiService";

const debug = require("debug")("mnb:search-api:brain-area");

export interface IBrainAreaAttributes {
    id: string;
    structureId: number;
    depth: number;
    name: string;
    parentStructureId: number;
    structureIdPath: string;
    safeName: string;
    acronym: string;
    aliases: string[];
    atlasId: number;
    graphId: number;
    graphOrder: number;
    hemisphereId: number;
    geometryFile: string;
    geometryColor: string;
    geometryEnable: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IBrainArea extends Instance<IBrainAreaAttributes>, IBrainAreaAttributes {
}

export interface IBrainAreaTable extends Model<IBrainArea, IBrainAreaAttributes> {
    syncBrainAreas(): Promise<void>;
}

export const TableName = "BrainArea";

export function sequelizeImport(sequelize, DataTypes) {
    const BrainArea = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        structureId: DataTypes.INTEGER,
        depth: DataTypes.INTEGER,
        name: DataTypes.TEXT,
        parentStructureId: DataTypes.INTEGER,
        structureIdPath: DataTypes.TEXT,
        safeName: DataTypes.TEXT,
        acronym: DataTypes.TEXT,
        aliases: DataTypes.TEXT,
        atlasId: DataTypes.INTEGER,
        graphId: DataTypes.INTEGER,
        graphOrder: DataTypes.INTEGER,
        hemisphereId: DataTypes.INTEGER,
        geometryFile: DataTypes.TEXT,
        geometryColor: DataTypes.TEXT,
        geometryEnable: DataTypes.BOOLEAN,
    }, {
        getterMethods: {
            aliases: function () {
                return JSON.parse(this.getDataValue("aliases")) || [];
            }
        },
        setterMethods: {
            aliases: function (value) {
                if (!value || value.length === 0) {
                    this.setDataValue("aliases", null);
                } else {
                    this.setDataValue("aliases", JSON.stringify(value));
                }
            }
        },
        timestamps: false,
        freezeTableName: true
    });

    BrainArea.associate = (models: any) => {
        BrainArea.hasMany(models.Neuron, {foreignKey: "brainAreaId"});
    };

    BrainArea.syncBrainAreas = async (): Promise<void> => {
        const brainAreas = await sampleApiClient.queryBrainAreas();

        debug(`sync ${brainAreas.length} brain areas`);

        await Promise.all(brainAreas.map(async (b) => {
            if (!b.aliases || b.aliases.length === 0) {
                b.aliases = null;
            }
            await BrainArea.upsert(b);
        }));
    };

    return BrainArea;
}
