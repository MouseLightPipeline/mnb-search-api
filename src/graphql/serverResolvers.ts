import {GraphQLScalarType} from "graphql";
import {Kind} from "graphql/language";
import {GraphQLServerContext, IQueryDataPage} from "./serverContext";
import {IQueryOperator, operators} from "../models/queryOperator";
import {ReleaseLevel, ServiceOptions} from "../options/serviceOptions";
import {IBrainArea} from "../models/search/brainArea";
import {IStructureIdentifierAttributes} from "../models/search/structureIdentifier";
import {ITracingStructureAttributes} from "../models/search/tracingStructure";
import {StorageManager} from "../data-access/storageManager";
import {SearchScope} from "../models/search/neuron";

const debug = require("debug")("mnb:search-api:resolvers");

export enum PredicateType {
    AnatomicalRegion = 1,
    CustomRegion = 2,
    IdOrDoi = 3
}

export const UnknownPredicateType = -1;
export const MixedPredicateType = 4;

interface IPosition {
    x: number;
    y: number;
    z: number;
}

export interface IFilterInput {
    tracingIdsOrDOIs: string[];
    tracingIdsOrDOIsExactMatch: boolean;
    tracingStructureIds: string[];
    nodeStructureIds: string[];
    operatorId: string;
    amount: number;
    brainAreaIds: string[];
    arbCenter: IPosition;
    arbSize: number;
    invert: boolean;
    composition: number;
    nonce: string;
}

type QueryDataArguments = {
    filters: IFilterInput[];
}

export interface IPredicate {
    predicateType: PredicateType;
    tracingIdsOrDOIs: string[];
    tracingIdsOrDOIsExactMatch: boolean;
    tracingStructureIds: string[];
    nodeStructureIds: string[];
    operatorId: string;
    amount: number;
    brainAreaIds: string[];
    arbCenter: IPosition;
    arbSize: number;
    invert: boolean;
    composition: number;
}

export interface ISearchContext {
    scope: SearchScope;
    nonce: string;
    predicateType: number;
    predicates: IPredicate[];
}

type SearchNeuronsArguments = {
    context: ISearchContext;
}

export function predicateTypeForFilter(filter: IFilterInput): PredicateType {
    if (filter.tracingIdsOrDOIs.length > 0) {
        return PredicateType.IdOrDoi;
    }

    if (filter.arbCenter && filter.arbSize) {
        return PredicateType.CustomRegion;
    }

    return PredicateType.AnatomicalRegion;
}

function contextFromFilters(filters: IFilterInput[]): ISearchContext {
    return {
        scope: SearchScope.Public,
        nonce: filters.length > 0 ? filters[0].nonce : "",
        predicateType: UnknownPredicateType,
        predicates: filters.map(f => Object.assign({}, f, {predicateType: predicateTypeForFilter(f)}))
    };
}

const resolvers = {
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
        queryData(_, args: QueryDataArguments, context: GraphQLServerContext): Promise<IQueryDataPage> {
            try {
                return context.getNeuronsWithPredicates(contextFromFilters(args.filters || []));
            } catch (err) {
                debug(err);
            }
        },
        searchNeurons(_, args: SearchNeuronsArguments, context: GraphQLServerContext): Promise<IQueryDataPage> {
            try {
                return context.getNeuronsWithPredicates(args.context);
            } catch (err) {
                debug(err);
            }
        },
        systemMessage(): String {
            return systemMessage;
        }
    },
    Mutation: {
        updateSample(_, {id}, context: GraphQLServerContext): Promise<boolean> {
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

let systemMessage: String = "";

export default resolvers;

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
