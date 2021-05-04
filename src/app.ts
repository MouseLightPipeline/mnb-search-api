import * as express from "express";
import * as bodyParser from "body-parser";
import {gql} from "apollo-server-express";

const debug = require("debug")("mnb:search-db-api:server");

import {ReleaseLevel, ServiceOptions} from "./options/serviceOptions";

import {tracingQueryMiddleware} from "./rawquery/tracingQueryMiddleware";
import * as os from "os";
import {ApolloServer} from "apollo-server-express";
import {mutationResolvers, queryResolvers} from "./graphql/serverResolvers";
import {GraphQLServerContext} from "./graphql/serverContext";
import {QueryTypeDefinitions} from "./graphql/queryTypeDefinitions";
import {MutateTypeDefinitions} from "./graphql/mutateTypeDefinitions";
import {SequelizeOptions} from "./options/databaseOptions";
import {RemoteDatabaseClient} from "./data-access/remoteDatabaseClient";

start().then().catch((err) => debug(err));

async function start() {
    await RemoteDatabaseClient.Start("search-db", SequelizeOptions, true);

    const app = express();

    app.use(bodyParser.urlencoded({extended: true}));

    app.use(bodyParser.json());

    app.use("/tracings", tracingQueryMiddleware);

    let typeDefinitions = QueryTypeDefinitions;

    let resolvers = queryResolvers;

    if (ServiceOptions.release === ReleaseLevel.Internal) {
        debug(`release level is internal`);
        typeDefinitions += MutateTypeDefinitions + `schema {\n\tquery: Query\n\tmutation: Mutation\n}`;
        resolvers = Object.assign(resolvers, mutationResolvers);
    } else {
        debug(`release level is public`);
        typeDefinitions += `schema {\n\tquery: Query\n}`;
    }

    const server = new ApolloServer({
        typeDefs: gql`${typeDefinitions}`,
        resolvers,
        introspection: true,
        playground: true,
        context: () => new GraphQLServerContext()
    });

    server.applyMiddleware({app, path: ServiceOptions.graphQLEndpoint});

    app.listen(ServiceOptions.port, () => debug(`search api server is now running on http://${os.hostname()}:${ServiceOptions.port}/graphql`));
}