export interface ITracingStructure {
    id: string;
    name: string;
    value: number;
}

export const TableName = "TracingStructure";

export function sequelizeImport(sequelize, DataTypes) {
    const TracingStructure = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.TEXT,
        value: DataTypes.INTEGER
    }, {
        timestamps: false,
    });

    TracingStructure.associate = models => {
        TracingStructure.hasMany(models.Tracing, {foreignKey: "tracingStructureId"});
    };

    return TracingStructure;
}
