import { Sequelize, DataTypes, HasManyGetAssociationsMixin} from "sequelize";

import {BaseModel} from "../baseModel";
import {TracingNode} from "./tracingNode";

export enum StructureIdentifiers {
    undefined = 0,
    soma = 1,
    axon = 2,
    basalDendrite = 3,
    apicalDendrite = 4,
    forkPoint = 5,
    endPoint = 6
}

export class StructureIdentifier extends BaseModel {
    public name: string;
    public value: StructureIdentifiers;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    public getNodes!: HasManyGetAssociationsMixin<TracingNode>;

    public static valueIdMap = new Map<number, string>();
    public static idValueMap = new Map<string, number>();

    public static async buildIdValueMap()  {
        if (this.valueIdMap.size === 0) {
            const all = await StructureIdentifier.findAll({});
            all.forEach(s => {
                this.valueIdMap.set(s.value, s.id);
                this.idValueMap.set(s.id, s.value);
            });
        }
    }

    public static idForValue(val: number) {
        return this.valueIdMap.get(val);
    }

    public static valueForId(id: string) {
        return this.idValueMap.get(id);
    }

    public static structuresAreLoaded () {
        return this.valueIdMap.size > 0;
    }

    public static countColumnName(s: number | string | StructureIdentifier): string {
        if (s === null || s === undefined) {
            return null;
        }

        let value: number = null;

        if (typeof s === "number") {
            value = s;
        } else if (typeof s === "string") {
            value = this.idValueMap.get(s);
        } else {
            value = s.value;
        }

        if (value === null || value === undefined) {
            return null;
        }

        switch (value) {
            case StructureIdentifiers.soma:
                return "somaCount";
            case StructureIdentifiers.undefined:
                return "pathCount";
            case StructureIdentifiers.forkPoint:
                return "branchCount";
            case  StructureIdentifiers.endPoint:
                return "endCount";
        }

        return null;
    };
}

export const modelInit = (sequelize: Sequelize) => {
    StructureIdentifier.init({
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.TEXT,
        value: DataTypes.INTEGER,
    }, {
        tableName: "StructureIdentifier",
        timestamps: true,
        sequelize
    });
};

export const modelAssociate = () => {
    StructureIdentifier.hasMany(TracingNode, {foreignKey: "structureIdentifierId", as: "nodes"});

    StructureIdentifier.buildIdValueMap().then();
};
