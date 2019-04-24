const MouseStrainTable = "MouseStrain";
const SampleTable = "Sample";
const NeuronTable = "Neuron";

export = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            MouseStrainTable,
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                name: Sequelize.TEXT,
                createdAt: Sequelize.DATE,
                updatedAt: Sequelize.DATE
            });

        await queryInterface.createTable(
            SampleTable,
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                idNumber: {
                    type: Sequelize.INTEGER,
                    defaultValue: -1
                },
                animalId: Sequelize.TEXT,
                tag: {
                    type: Sequelize.TEXT,
                    defaultValue: ""
                },
                comment: {
                    type: Sequelize.TEXT,
                    defaultValue: ""
                },
                mouseStrainId: {
                    type: Sequelize.UUID,
                    references: {
                        model: MouseStrainTable,
                        key: "id"
                    }
                },
                searchScope: {
                    type: Sequelize.INTEGER
                },
                createdAt: Sequelize.DATE,
                updatedAt: Sequelize.DATE
            });

        await queryInterface.addColumn(NeuronTable, "sampleId",  {
            type: Sequelize.UUID,
            references: {
                model: SampleTable,
                key: "id"
            }
        });

        await queryInterface.addIndex(SampleTable, ["mouseStrainId"]);

        await queryInterface.addIndex(NeuronTable, ["sampleId"]);
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable(SampleTable);
        await queryInterface.dropTable(MouseStrainTable);
    }
};
