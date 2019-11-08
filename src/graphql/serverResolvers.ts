import {GraphQLScalarType} from "graphql";
import {Kind} from "graphql/language";
import {GraphQLServerContext, IQueryDataPage} from "./serverContext";
import {IQueryOperator, operators} from "../models/queryOperator";
import {ReleaseLevel, ServiceOptions} from "../options/serviceOptions";
import {BrainArea} from "../models/search/brainArea";
import {StructureIdentifier} from "../models/search/structureIdentifier";
import {TracingStructure} from "../models/search/tracingStructure";
import {Neuron, SearchScope} from "../models/search/neuron";
import {Sample} from "../models/search/sample";
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
        brainAreas(_, __, context: GraphQLServerContext): Promise<BrainArea[]> {
            return context.getBrainAreas();
        },
        structureIdentifiers(_, __, context: GraphQLServerContext): Promise<StructureIdentifier[]> {
            return context.getStructureIdentifiers();
        },
        tracingStructures(_, __, context: GraphQLServerContext): Promise<TracingStructure[]> {
            return context.getTracingStructures();
        },
        samples(_, __, context: GraphQLServerContext): Promise<Sample[]> {
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
        sample(neuron: Neuron): Promise<Sample> {
            return neuron.getSample();
        },
        brainArea(neuron: Neuron): BrainArea {
            return neuron.brainArea;
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
    const neuronCount = await Neuron.neuronCount(searchScope);

    return {
        apiVersion: ServiceOptions.version,
        apiRelease: ServiceOptions.release,
        neuronCount
    }
}
