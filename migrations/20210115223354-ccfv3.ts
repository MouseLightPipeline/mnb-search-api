const TracingTable = "Tracing";
const TracingNodesTable = "TracingNode";
const BrainAreaTable = "BrainArea";
const NeuronTable = "Neuron";
const TracingStructureTable = "TracingStructure";
const SearchContentTable = "SearchContent";
const CcfV25SearchContentTable = "CcfV25SearchContent";
const CcfV30SearchContentTable = "CcfV30SearchContent";
const CcfV25BrainCompartmentColumn = "brainAreaIdCcfV25";
const CcfV30BrainCompartmentColumn = "brainAreaIdCcfV30";

export = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            CcfV30SearchContentTable,
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
                neuronConsensus: {
                    type: Sequelize.INTEGER,
                    defaultValue: 0
                },
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

        await queryInterface.addIndex(CcfV30SearchContentTable, ["neuronId"]);
        await queryInterface.addIndex(CcfV30SearchContentTable, ["tracingId"]);
        await queryInterface.addIndex(CcfV30SearchContentTable, ["brainAreaId"]);
        await queryInterface.addIndex(CcfV30SearchContentTable, ["tracingStructureId"]);
        await queryInterface.addIndex(CcfV30SearchContentTable, ["nodeCount"]);
        await queryInterface.addIndex(CcfV30SearchContentTable, ["somaCount"]);
        await queryInterface.addIndex(CcfV30SearchContentTable, ["pathCount"]);
        await queryInterface.addIndex(CcfV30SearchContentTable, ["branchCount"]);
        await queryInterface.addIndex(CcfV30SearchContentTable, ["endCount"]);


        await queryInterface.renameTable(SearchContentTable, CcfV25SearchContentTable);

        await queryInterface.renameColumn(TracingNodesTable, "brainAreaId", CcfV25BrainCompartmentColumn);

        await queryInterface.addColumn(TracingNodesTable, CcfV30BrainCompartmentColumn, Sequelize.UUID);
        await queryInterface.addIndex(TracingNodesTable, [CcfV30BrainCompartmentColumn]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable(CcfV30SearchContentTable);

        await queryInterface.renameTable(CcfV25SearchContentTable, SearchContentTable);

        await queryInterface.renameColumn(TracingNodesTable, CcfV25BrainCompartmentColumn, "brainAreaId");

        await queryInterface.removeIndex(TracingNodesTable, CcfV30BrainCompartmentColumn);
        await queryInterface.removeColumn(TracingNodesTable, CcfV30BrainCompartmentColumn);
    }
};
