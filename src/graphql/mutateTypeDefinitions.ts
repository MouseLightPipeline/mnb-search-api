export const MutateTypeDefinitions = `
type Mutation {
    syncBrainAreas: Boolean
    updateSample(id: String!): Boolean
    updateNeuron(id: String!): Boolean
}
`;
