import {IGraphQLServerContext, IQueryDataPage, IRequestExportOutput} from "./serverContext";

const debug = require("debug")("ndb:search:resolvers");

import {IQueryOperator, operators} from "../models/queryOperator";
import {ServiceOptions} from "../options/serviceOptions";
import {ExportFormat} from "../models/search/tracing";
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

interface IRequestExportArguments {
    tracingIds: string[];
    format?: ExportFormat;
}

const resolvers = {
    Query: {
        systemSettings(_, __, ___): any {
            return getSystemSettings();
        },
        queryOperators(_, __, ___): IQueryOperator[] {
            return operators;
        },
        brainAreas(_, __, context: IGraphQLServerContext): Promise<IBrainArea[]> {
            return context.getBrainAreas();
        },
        structureIdentifiers(_, __, context: IGraphQLServerContext): Promise<IStructureIdentifier[]> {
            return context.getStructureIdentifiers();
        },
        tracingStructures(_, __, context: IGraphQLServerContext): Promise<ITracingStructure[]> {
            return context.getTracingStructures();
        },
        queryData(_, args: IQueryDataArguments, context: IGraphQLServerContext): Promise<IQueryDataPage> {
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
        requestExport(_, args: IRequestExportArguments, context: IGraphQLServerContext): Promise<IRequestExportOutput[]> {
            return context.requestExport(args.tracingIds, args.format);
        },

        setSystemMessage(_, args: any): boolean {
            systemMessage = args.message;

            return true;
        },
        clearSystemMessage(): boolean {
            systemMessage = "";

            return true;
        }
    },
};

let systemMessage: String = "";

export default resolvers;

function getSystemSettings() {
    return {
        version: ServiceOptions.version,
        release: ServiceOptions.release
    }
}
