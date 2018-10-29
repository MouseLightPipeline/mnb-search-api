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
    swc: {
        host: "swc-api",
        port: 5000,
        graphQLEndpoint: "graphql"
    },
    transform: {
        host: "transform-api",
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

    options.swc.host = process.env.SWC_API_HOST || process.env.CORE_SERVICES_HOST || options.swc.host;
    options.swc.port = parseInt(process.env.SWC_API_PORT) || options.swc.port;
    options.swc.graphQLEndpoint = process.env.SWC_API_ENDPOINT || process.env.CORE_SERVICES_ENDPOINT || options.swc.graphQLEndpoint;

    options.transform.host = process.env.TRANSFORM_API_HOST || process.env.CORE_SERVICES_HOST || options.transform.host;
    options.transform.port = parseInt(process.env.TRANSFORM_API_PORT) || options.transform.port;
    options.transform.graphQLEndpoint = process.env.TRANSFORM_API_ENDPOINT || process.env.CORE_SERVICES_ENDPOINT || options.transform.graphQLEndpoint;

    return options;
}

function loadConfiguration() {
    const c = Object.assign({}, services);

    c.graphQL = loadGraphQLOptions(c.graphQL);

    return c;
}

export const CoreServiceOptions = loadConfiguration();

export const SampleServiceOptions: IGraphQLServiceOptions = CoreServiceOptions.graphQL.sample;

export const SwcServiceOptions: IGraphQLServiceOptions = CoreServiceOptions.graphQL.swc;

export const TransformServiceOptions: IGraphQLServiceOptions = CoreServiceOptions.graphQL.transform;
