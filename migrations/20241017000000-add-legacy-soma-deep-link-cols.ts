const NeuronTable = "Neuron";
const CcfV25SearchContentTable = "CcfV25SearchContent";
const CcfV30SearchContentTable = "CcfV30SearchContent";

const legacySomaIds = "legacySomaIds";
const hortaDeepLink = "hortaDeepLink";

export = {
    up: async (queryInterface: any, Sequelize: any) => {
        await queryInterface.addColumn(NeuronTable, legacySomaIds,  {
            type: Sequelize.TEXT
        });

        await queryInterface.addColumn(NeuronTable, hortaDeepLink,  {
            type: Sequelize.TEXT
        });

        await queryInterface.addColumn(CcfV25SearchContentTable, legacySomaIds,  {
            type: Sequelize.TEXT
        });

        await queryInterface.addColumn(CcfV30SearchContentTable, legacySomaIds,  {
            type: Sequelize.TEXT
        });
    },

    down: async (queryInterface: any, Sequelize: any) => {
        await queryInterface.removeColumn(NeuronTable, legacySomaIds);
        await queryInterface.removeColumn(NeuronTable, hortaDeepLink);

        await queryInterface.removeColumn(CcfV25SearchContentTable, legacySomaIds);

        await queryInterface.removeColumn(CcfV30SearchContentTable, legacySomaIds);
    }
};
