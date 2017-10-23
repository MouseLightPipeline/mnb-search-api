import {graphqlExpress, graphiqlExpress} from "graphql-server-express";

import {schema} from "./schema";
import {GraphQLServerContext} from "../serverContext";

export function graphQLMiddleware() {
    return graphqlExpress(graphqlRequestHandler);
}

export function graphiQLMiddleware(configuration) {
    return graphiqlExpress({endpointURL: configuration.graphQlEndpoint});
}

function graphqlRequestHandler(req) {
    // Get the query, the same way express-graphql does it.
    // https://github.com/graphql/express-graphql/blob/3fa6e68582d6d933d37fa9e841da5d2aa39261cd/src/index.js#L257
    const query = req.query.query || req.body.query;

    if (query && query.length > 30000) {
        // None of our app"s queries are this long.  Probably indicates someone trying to send an overly expensive query.
        throw new Error("Query too large.");
    }

    const appContext = new GraphQLServerContext();

    return {
        schema: schema,
        context: appContext,
        rootValue: { }
    };
}
