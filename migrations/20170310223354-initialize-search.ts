const TracingTable = "Tracing";
const TracingNodeTable = "TracingNode";
const NeuronTable = "Neuron";
const SearchContentTable = "SearchContent";
const BrainAreaTable = "BrainArea";
const StructureIdentifierTable = "StructureIdentifier";
const TracingStructureTable = "TracingStructure";

export = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            BrainAreaTable,
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                structureId: Sequelize.INTEGER,
                atlasId: Sequelize.INTEGER,
                graphId: Sequelize.INTEGER,
                graphOrder: Sequelize.INTEGER,
                hemisphereId: Sequelize.INTEGER,
                depth: Sequelize.INTEGER,
                parentStructureId: Sequelize.INTEGER,
                structureIdPath: Sequelize.TEXT,
                name: Sequelize.TEXT,
                safeName: Sequelize.TEXT,
                aliases: Sequelize.TEXT,
                geometryFile: {
                    type: Sequelize.TEXT,
                    defaultValue: ""
                },
                geometryColor: {
                    type: Sequelize.TEXT,
                    defaultValue: ""
                },
                geometryEnable: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false
                },
                acronym: Sequelize.TEXT,
                createdAt: Sequelize.DATE,
                updatedAt: Sequelize.DATE,
            });

        await queryInterface.addIndex(BrainAreaTable, ["depth"]);
        await queryInterface.addIndex(BrainAreaTable, ["structureId"]);
        await queryInterface.addIndex(BrainAreaTable, ["parentStructureId"]);
        await queryInterface.addIndex(BrainAreaTable, ["geometryEnable"]);

        await queryInterface.createTable(
            NeuronTable,
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                idString: Sequelize.TEXT,
                tag: Sequelize.TEXT,
                keywords: Sequelize.TEXT,
                x: Sequelize.DOUBLE,
                y: Sequelize.DOUBLE,
                z: Sequelize.DOUBLE,
                doi: Sequelize.TEXT,
                searchScope: Sequelize.INTEGER,
                brainAreaId: {
                    type: Sequelize.UUID,
                    references: {
                        model: BrainAreaTable,
                        key: "id"
                    }
                },
                createdAt: Sequelize.DATE,
                updatedAt: Sequelize.DATE,
            });

        await queryInterface.addIndex(NeuronTable, ["brainAreaId"]);

        await queryInterface.createTable(
            StructureIdentifierTable,
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                name: Sequelize.TEXT,
                value: Sequelize.INTEGER,
                createdAt: Sequelize.DATE,
                updatedAt: Sequelize.DATE,
            });

        await queryInterface.createTable(
            TracingStructureTable,
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                name: Sequelize.TEXT,
                value: Sequelize.INTEGER,
                createdAt: Sequelize.DATE,
                updatedAt: Sequelize.DATE,
            });

        await queryInterface.createTable(
            TracingTable,
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                transformedAt: Sequelize.DATE,
                nodeCount: Sequelize.INTEGER,
                pathCount: Sequelize.INTEGER,
                branchCount: Sequelize.INTEGER,
                endCount: Sequelize.INTEGER,
                tracingStructureId: {
                    type: Sequelize.UUID,
                    references: {
                        model: TracingStructureTable,
                        key: "id"
                    }
                },
                neuronId: {
                    type: Sequelize.UUID,
                    references: {
                        model: NeuronTable,
                        key: "id"
                    }
                },
                createdAt: Sequelize.DATE,
                updatedAt: Sequelize.DATE,
            });

        await queryInterface.addIndex(TracingTable, ["neuronId"]);
        await queryInterface.addIndex(TracingTable, ["tracingStructureId"]);

        await queryInterface.createTable(
            TracingNodeTable,
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                sampleNumber: Sequelize.INTEGER,
                parentNumber: Sequelize.INTEGER,
                x: Sequelize.DOUBLE,
                y: Sequelize.DOUBLE,
                z: Sequelize.DOUBLE,
                radius: Sequelize.DOUBLE,
                lengthToParent: Sequelize.DOUBLE,
                swcNodeId: Sequelize.UUID,
                brainAreaId: {
                    type: Sequelize.UUID,
                    references: {
                        model: BrainAreaTable,
                        key: "id"
                    }
                },
                structureIdentifierId: {
                    type: Sequelize.UUID,
                    references: {
                        model: StructureIdentifierTable,
                        key: "id"
                    }
                },
                tracingId: {
                    type: Sequelize.UUID,
                    references: {
                        model: TracingTable,
                        key: "id"
                    }
                }
            });

        await queryInterface.addIndex(TracingNodeTable, ["tracingId"]);
        await queryInterface.addIndex(TracingNodeTable, ["brainAreaId"]);
        await queryInterface.addIndex(TracingNodeTable, ["structureIdentifierId"]);

        await queryInterface.createTable(
            SearchContentTable,
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                somaX: Sequelize.DOUBLE,
                somaY: Sequelize.DOUBLE,
                somaZ: Sequelize.DOUBLE,
                nodeCount: Sequelize.INTEGER,
                somaCount: Sequelize.INTEGER,
                pathCount: Sequelize.INTEGER,
                branchCount: Sequelize.INTEGER,
                endCount: Sequelize.INTEGER,
                neuronIdString: Sequelize.TEXT,
                neuronDOI: Sequelize.TEXT,
                searchScope: Sequelize.INTEGER,
                tracingId: {
                    type: Sequelize.UUID,
                    references: {
                        model: TracingTable,
                        key: "id"
                    }
                },
                brainAreaId: {
                    type: Sequelize.UUID,
                    references: {
                        model: BrainAreaTable,
                        key: "id"
                    }
                },
                neuronId: {
                    type: Sequelize.UUID,
                    references: {
                        model: NeuronTable,
                        key: "id"
                    }
                },
                tracingStructureId: {
                    type: Sequelize.UUID,
                    references: {
                        model: TracingStructureTable,
                        key: "id"
                    }
                }
            });

        await queryInterface.addIndex(SearchContentTable, ["neuronId"]);
        await queryInterface.addIndex(SearchContentTable, ["tracingId"]);
        await queryInterface.addIndex(SearchContentTable, ["brainAreaId"]);
        await queryInterface.addIndex(SearchContentTable, ["tracingStructureId"]);
        await queryInterface.addIndex(SearchContentTable, ["nodeCount"]);
        await queryInterface.addIndex(SearchContentTable, ["somaCount"]);
        await queryInterface.addIndex(SearchContentTable, ["pathCount"]);
        await queryInterface.addIndex(SearchContentTable, ["branchCount"]);
        await queryInterface.addIndex(SearchContentTable, ["endCount"]);

        // Add after both Tracing and TracingNode tables are created.
        await queryInterface.addColumn(TracingTable, "somaId", {
            type: Sequelize.UUID,
                references: {
                model: TracingNodeTable,
                    key: "id"
            }
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable(TracingNodeTable);
        await queryInterface.dropTable(TracingTable);
        await queryInterface.dropTable(NeuronTable);
        await queryInterface.dropTable(SearchContentTable);
        await queryInterface.dropTable(BrainAreaTable);
        await queryInterface.dropTable(StructureIdentifierTable);
        await queryInterface.dropTable(TracingStructureTable);
    }
};
