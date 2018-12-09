import {HttpLink} from "apollo-link-http";
import {ApolloClient} from "apollo-client";
import {InMemoryCache} from "apollo-cache-inmemory";

const gql = require("graphql-tag");

require("isomorphic-fetch");

const debug = require("debug")("mnb:sample-api:swc-client");

import {SampleServiceOptions} from "../../options/coreServicesOptions";

export class SampleApiClient {
    private _client: any;

    public constructor() {
        const url = `http://${SampleServiceOptions.host}:${SampleServiceOptions.port}/${SampleServiceOptions.graphQLEndpoint}`;

        debug(`creating apollo client for SWC service ${url}`);

        this._client = new ApolloClient({
            link: new HttpLink({uri: url}),
            cache: new InMemoryCache()
        });
    }

    public async queryBrainAreas() {
        const result = await this._client.query({
            query: gql`
                query {
                    brainAreas {
                        id
                        structureId
                        depth
                        name
                        parentStructureId
                        structureIdPath
                        safeName
                        acronym
                        atlasId
                        aliases
                        graphId
                        graphOrder
                        hemisphereId
                        geometryFile
                        geometryColor
                        geometryEnable
                    }
                }`,
            fetchPolicy: "network-only"
        });

        return result.data.brainAreas;
    }
}

export const sampleApiClient = new SampleApiClient();
