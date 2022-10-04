const BrainAreaTable = "BrainArea";
const NeuronTable = "Neuron";
const CcfV25SearchContentTable = "CcfV25SearchContent";
const CcfV30SearchContentTable = "CcfV30SearchContent";

const ManualSomaCompartmentId = "manualSomaCompartmentId";

export = {
    up: async (queryInterface: any, Sequelize: any) => {
        await queryInterface.addColumn(NeuronTable, ManualSomaCompartmentId,  {
            type: Sequelize.UUID,
            references: {
                model: BrainAreaTable,
                key: "id"
            }
        });

        await queryInterface.addIndex(NeuronTable,  [ManualSomaCompartmentId]);

        await queryInterface.addColumn(CcfV25SearchContentTable, ManualSomaCompartmentId,  {
            type: Sequelize.UUID,
            references: {
                model: BrainAreaTable,
                key: "id"
            }
        });

        await queryInterface.addIndex(CcfV25SearchContentTable, [ManualSomaCompartmentId]);

        await queryInterface.addColumn(CcfV30SearchContentTable, ManualSomaCompartmentId,  {
            type: Sequelize.UUID,
            references: {
                model: BrainAreaTable,
                key: "id"
            }
        });

        await queryInterface.addIndex(CcfV30SearchContentTable, [ManualSomaCompartmentId]);
    },

    down: async (queryInterface: any, Sequelize: any) => {
        await queryInterface.removeIndex(NeuronTable, ManualSomaCompartmentId);
        await queryInterface.removeColumn(NeuronTable, ManualSomaCompartmentId);

        await queryInterface.removeIndex(CcfV25SearchContentTable, ManualSomaCompartmentId);
        await queryInterface.removeColumn(CcfV25SearchContentTable, ManualSomaCompartmentId);

        await queryInterface.removeIndex(CcfV30SearchContentTable, ManualSomaCompartmentId);
        await queryInterface.removeColumn(CcfV30SearchContentTable, ManualSomaCompartmentId);
    }
};
