const NeuronTable = "Neuron";
const JaneliaXColumn = "janeliaX";
const JaneliaYColumn = "janeliaY";
const JaneliaZColumn = "janeliaZ";
const SwcNameColumn = "swcName";

export = {
    up: async (queryInterface, Sequelize) => {

        await queryInterface.addColumn(NeuronTable, JaneliaXColumn, Sequelize.DOUBLE);
        await queryInterface.addColumn(NeuronTable, JaneliaYColumn, Sequelize.DOUBLE);
        await queryInterface.addColumn(NeuronTable, JaneliaZColumn, Sequelize.DOUBLE);
        await queryInterface.addColumn(NeuronTable, SwcNameColumn, Sequelize.DOUBLE);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn(NeuronTable, JaneliaXColumn);
        await queryInterface.removeColumn(NeuronTable, JaneliaYColumn);
        await queryInterface.removeColumn(NeuronTable, JaneliaZColumn);
        await queryInterface.removeColumn(NeuronTable, SwcNameColumn);
    }
};
