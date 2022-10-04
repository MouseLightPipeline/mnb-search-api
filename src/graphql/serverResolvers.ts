import {GraphQLScalarType} from "graphql";
import {Kind} from "graphql/language";
import {GraphQLServerContext, IQueryDataPage} from "./serverContext";
import {IQueryOperator, operators} from "../models/query/queryOperator";
import {ReleaseLevel, ServiceOptions} from "../options/serviceOptions";
import {BrainArea} from "../models/search-db/brainArea";
import {StructureIdentifier} from "../models/search-db/structureIdentifier";
import {TracingStructure} from "../models/search-db/tracingStructure";
import {Neuron, SearchScope} from "../models/search-db/neuron";
import {Sample} from "../models/search-db/sample";
import {CcfVersion, ISearchContextInput, SearchContext} from "../models/query/searchContext";
import {staticApiClient} from "../data-access/staticApiService";
import {IFilterInput, PredicateType, QueryPredicate} from "../models/query/queryPredicate";

const debug = require("debug")("mnb:search-db-api:resolvers");

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
        neurons(_, __, context: GraphQLServerContext): Promise<Neuron[]> {
            return context.getNeurons();
        },
        queryData(_, args: QueryDataArguments, context: GraphQLServerContext): Promise<IQueryDataPage> {
            try {
                const nonce = args.filters.length > 0 ? args.filters[0].nonce : "";
                const predicates = QueryPredicate.predicatesFromFilters(args.filters);

                return context.getNeuronsWithPredicates(SearchContext.fromPredicates(nonce, predicates));
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
        }
    }),
    PredicateType: {
        ANATOMICAL: PredicateType.AnatomicalRegion,
        CUSTOM: PredicateType.CustomRegion,
        ID: PredicateType.IdOrDoi,
    },
    CcfVersion: {
        CCFV25: CcfVersion.Ccf25,
        CCFV30: CcfVersion.Ccf30
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
