import {GraphQLServerContext, IQueryDataPage} from "./serverContext";

const debug = require("debug")("mnb:search-api:resolvers");

import {IQueryOperator, operators} from "../models/queryOperator";
import {ServiceOptions} from "../options/serviceOptions";
import {IBrainArea} from "../models/search/brainArea";
import {IStructureIdentifier} from "../models/search/structureIdentifier";
import {ITracingStructure} from "../models/search/tracingStructure";

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
        systemSettings(_, __, ___): any {
            return getSystemSettings();
        },
        queryOperators(_, __, ___): IQueryOperator[] {
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
    }
};

let systemMessage: String = "";

export default resolvers;

function getSystemSettings() {
    return {
        version: ServiceOptions.version,
        release: ServiceOptions.release
    }
}
