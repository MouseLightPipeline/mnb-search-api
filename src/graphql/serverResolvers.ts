import {GraphQLScalarType} from 'graphql';
import {Kind} from 'graphql/language';
import {GraphQLServerContext, IQueryDataPage} from "./serverContext";
import {IQueryOperator, operators} from "../models/queryOperator";
import {ReleaseLevel, ServiceOptions} from "../options/serviceOptions";
import {IBrainArea} from "../models/search/brainArea";
import {IStructureIdentifier} from "../models/search/structureIdentifier";
import {ITracingStructure} from "../models/search/tracingStructure";

const debug = require("debug")("mnb:search-api:resolvers");

interface IPosition {
    x: number;
    y: number;
    z: number;
}

interface IQueryDataArguments {
    filters: IFilterInput[];
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

const resolvers = {
    Query: {
        systemSettings(): any {
            return getSystemSettings();
        },
        queryOperators(): IQueryOperator[] {
            return operators;
        },
        brainAreas(_, __, context: GraphQLServerContext): Promise<IBrainArea[]> {
            return context.getBrainAreas();
        },
        structureIdentifiers(_, __, context: GraphQLServerContext): Promise<IStructureIdentifier[]> {
            return context.getStructureIdentifiers();
        },
        tracingStructures(_, __, context: GraphQLServerContext): Promise<ITracingStructure[]> {
            return context.getTracingStructures();
        },
        queryData(_, args: IQueryDataArguments, context: GraphQLServerContext): Promise<IQueryDataPage> {
            try {
                return context.getNeuronsWithFilters(args.filters || []);
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
        name: 'Date',
        description: 'Date custom scalar type',
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
    version: string;
    release: string;
}

function getSystemSettings(): ISystemSettings {
    return {
        version: ServiceOptions.version,
        release: ReleaseLevel[ServiceOptions.release]
    }
}
