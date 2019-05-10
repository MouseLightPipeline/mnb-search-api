export interface IGraphQLServiceOptions {
    host: string;
    port: number;
    graphQLEndpoint: string;
}

const graphQLServices = {
    sample: {
        host: "sample-api",
        port: 5000,
        graphQLEndpoint: "graphql"
    },
    staticApi: {
        host: "static-api",
        port: 5000,
        graphQLEndpoint: "graphql"
    }
};

const services = {
    graphQL: graphQLServices
};

function loadGraphQLOptions(options): any {
    options.sample.host = process.env.SAMPLE_API_HOST || process.env.CORE_SERVICES_HOST || options.sample.host;
    options.sample.port = parseInt(process.env.SAMPLE_API_PORT) || options.sample.port;
    options.sample.graphQLEndpoint = process.env.SAMPLE_API_ENDPOINT || process.env.CORE_SERVICES_ENDPOINT || options.sample.graphQLEndpoint;

    options.staticApi.host = process.env.STATIC_API_HOST || process.env.CORE_SERVICES_HOST || options.staticApi.host;
    options.staticApi.port = parseInt(process.env.STATIC_API_PORT) || options.staticApi.port;
    options.staticApi.graphQLEndpoint = process.env.STATIC_API_ENDPOINT || process.env.CORE_SERVICES_ENDPOINT || options.staticApi.graphQLEndpoint;

    return options;
}

function loadConfiguration() {
    const c = Object.assign({}, services);

    c.graphQL = loadGraphQLOptions(c.graphQL);

    return c;
}

export const CoreServiceOptions = loadConfiguration();

export const SampleServiceOptions: IGraphQLServiceOptions = CoreServiceOptions.graphQL.sample;

export const StaticServiceOptions: IGraphQLServiceOptions = CoreServiceOptions.graphQL.staticApi;
