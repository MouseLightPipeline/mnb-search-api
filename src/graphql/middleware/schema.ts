import {makeExecutableSchema, addMockFunctionsToSchema} from "graphql-tools";

import typeDefinitions from "../typeDefinitions";
import resolvers from "../serverResolvers";

let executableSchema = makeExecutableSchema({
    typeDefs: typeDefinitions,
    resolvers: resolvers,
    resolverValidationOptions: {
        requireResolversForNonScalar: false
    }
});

if (process.env.NOD_ENV === "production") {
    addMockFunctionsToSchema({
        schema: executableSchema,
        mocks: {
            String: () => "Not implemented",
            DateTime: () => Date.now()
        },
        preserveResolvers: true
    });
}

export {executableSchema as schema};
