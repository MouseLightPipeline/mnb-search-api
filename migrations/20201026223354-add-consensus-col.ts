const NeuronTableName = "Neuron";
const SearchContentTableName = "SearchContent";

export = {
    up: async (queryInterface: any, Sequelize: any) => {
        await queryInterface.addColumn(NeuronTableName, "consensus", {
            type: Sequelize.INTEGER,
            defaultValue: 0
        });

        await queryInterface.addIndex(NeuronTableName, ["consensus"]);

        await queryInterface.addColumn(SearchContentTableName, "consensus", {
            type: Sequelize.INTEGER,
            defaultValue: 0
        });

        await queryInterface.addIndex(SearchContentTableName, ["consensus"]);
    },

    down: async (queryInterface: any, Sequelize: any) => {
        await queryInterface.dropTable(NeuronTableName);

        await queryInterface.dropTable(SearchContentTableName);
    }
};
