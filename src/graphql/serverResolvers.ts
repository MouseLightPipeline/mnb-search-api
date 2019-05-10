import {GraphQLScalarType} from "graphql";
import {Kind} from "graphql/language";
import {GraphQLServerContext, IQueryDataPage} from "./serverContext";
import {IQueryOperator, operators} from "../models/queryOperator";
import {ReleaseLevel, ServiceOptions} from "../options/serviceOptions";
import {IBrainArea} from "../models/search/brainArea";
import {IStructureIdentifierAttributes} from "../models/search/structureIdentifier";
import {ITracingStructureAttributes} from "../models/search/tracingStructure";
import {StorageManager} from "../data-access/storageManager";
import {INeuron, SearchScope} from "../models/search/neuron";
import {ISample} from "../models/search/sample";
import {contextFromFilters, IFilterInput, ISearchContextInput, SearchContext} from "../models/searchContext";
import {staticApiClient} from "../data-access/staticApiService";

const debug = require("debug")("mnb:search-api:resolvers");

type QueryDataArguments = {
    filters: IFilterInput[];
}

type SearchNeuronsArguments = {
    context: ISearchContextInput;
}

export const queryResolvers = {
    Query: {
        systemSettings(_, {searchScope}): any {
            return getSystemSettings(searchScope);
        },
        queryOperators(): IQueryOperator[] {
            return operators;
        },
        brainAreas(_, __, context: GraphQLServerContext): Promise<IBrainArea[]> {
            return context.getBrainAreas();
        },
        structureIdentifiers(_, __, context: GraphQLServerContext): Promise<IStructureIdentifierAttributes[]> {
            return context.getStructureIdentifiers();
        },
        tracingStructures(_, __, context: GraphQLServerContext): Promise<ITracingStructureAttributes[]> {
            return context.getTracingStructures();
        },
        samples(_, __, context: GraphQLServerContext): Promise<ISample[]> {
            return context.getSamples();
        },
        queryData(_, args: QueryDataArguments, context: GraphQLServerContext): Promise<IQueryDataPage> {
            try {
                return context.getNeuronsWithPredicates(new SearchContext(contextFromFilters(args.filters || [])));
            } catch (err) {
                debug(err);
            }
        },
        searchNeurons(_, args: SearchNeuronsArguments, context: GraphQLServerContext): Promise<IQueryDataPage> {
            try {
                return context.getNeuronsWithPredicates(new SearchContext(args.context));
            } catch (err) {
                debug(err);
            }
        },
        async tomographyMetadata(_, args: any, context: GraphQLServerContext): Promise<[]> {
            try {
                const resp = await staticApiClient.querySampleTomography();
                return resp.data.tomographyMetadata;
            } catch (err) {
                console.log(err);
            }

            return [];
        },
        systemMessage(): String {
            return systemMessage;
        }
    },
    Neuron: {
        async sample(neuron: INeuron, _, context: GraphQLServerContext): Promise<ISample> {
            return (await context.getSample(neuron.sampleId));
        }
    },
    Date: new GraphQLScalarType({
        name: "Date",
        description: "Date custom scalar type",
        parseValue: (value) => {
            return new Date(value); // value from the client
        },
        serialize: (value) => {
            return value.getTime(); // value sent to the client
        },
        parseLiteral: (ast) => {
            if (ast.kind === Kind.INT) {
                return parseInt(ast.value, 10); // ast value is always in string format
            }
            return null;
        },
    })
};

export const mutationResolvers = {
    Mutation: {
        syncBrainAreas(_, __, context: GraphQLServerContext): Promise<void> {
            if (ServiceOptions.release !== ReleaseLevel.Internal) {
                return Promise.resolve();
            }

            return context.syncBrainAreas();
        }, updateSample(_, {id}, context: GraphQLServerContext): Promise<boolean> {
            if (ServiceOptions.release !== ReleaseLevel.Internal) {
                return Promise.resolve(false);
            }

            return context.updateSample(id);
        },
        updateNeuron(_, {id}, context: GraphQLServerContext): Promise<boolean> {
            if (ServiceOptions.release !== ReleaseLevel.Internal) {
                return Promise.resolve(false);
            }

            return context.updateNeuron(id);
        }
    }
};

let systemMessage: String = "";

interface ISystemSettings {
    apiVersion: string;
    apiRelease: number;
    neuronCount: number;
}

async function getSystemSettings(searchScope: SearchScope): Promise<ISystemSettings> {
    const neuronCount = await StorageManager.Instance().neuronCount(searchScope);

    return {
        apiVersion: ServiceOptions.version,
        apiRelease: ServiceOptions.release,
        neuronCount
    }
}
