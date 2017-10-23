import * as fs from "fs";
import * as Archiver from "archiver";
import * as _ from "lodash";
import {FindOptions} from "sequelize";
import * as uuid from "uuid";

const debug = require("debug")("ndb:search:context");

import {PersistentStorageManager} from "../models/databaseConnector";
import {IFilterInput} from "./serverResolvers";
import {isNullOrUndefined} from "util";
import {operatorIdValueMap} from "../models/queryOperator";
import {IBrainArea} from "../models/search/brainArea";
import {ExportFormat, ITracing} from "../models/search/tracing";
import {ITracingStructure} from "../models/search/tracingStructure";
import {IStructureIdentifier} from "../models/search/structureIdentifier";
import {INeuron} from "../models/search/neuron";
import {ITracingNode} from "../models/search/tracingNode";

export interface IQueryDataPage {
    neurons: INeuron[];
    totalCount: number;
    queryTime: number;
    nonce: string;
    error: Error;
}

export interface IRequestExportOutput {
    filename: string;
    contents: string;
}

export enum FilterComposition {
    and = 1,
    or = 2,
    not = 3
}

export interface IGraphQLServerContext {
    getBrainAreas(): Promise<IBrainArea[]>;

    getStructureIdentifiers(): Promise<IStructureIdentifier[]>;

    getTracingStructures(): Promise<ITracingStructure[]>;

    getNeuronsWithFilters(filters: IFilterInput[]): Promise<IQueryDataPage>;

    // Mutations
    requestExport(tracingIds: string[], format: ExportFormat): Promise<IRequestExportOutput[]>;
}

export class GraphQLServerContext implements IGraphQLServerContext {
    private _storageManager = PersistentStorageManager.Instance();

    public async getStructureIdentifiers(): Promise<IStructureIdentifier[]> {
        return this._storageManager.StructureIdentifiers.findAll({});
    }

     public async getTracingStructures(): Promise<ITracingStructure[]> {
        return this._storageManager.TracingStructures.findAll({});
    }

    public async getBrainAreas(ids: string[] = null): Promise<IBrainArea[]> {
        if (!ids || ids.length == 0) {
            return this._storageManager.BrainAreas.findAll({});
        } else {
            return this._storageManager.BrainAreas.findAll({where: {id: {$in: ids}}});
        }
    }

    public async getNeuronsWithFilters(filters: IFilterInput[]): Promise<IQueryDataPage> {
        let nonce = "";

        if (filters.length > 0) {
            nonce = filters[0].nonce;
        }

        try {

            let {neurons, duration} = await this.performNeuronsFilterQuery(filters);

            const totalCount = neurons.length;

            neurons = neurons.sort((b, a) => a.idString.localeCompare(b.idString));

            return {neurons: neurons, queryTime: duration, totalCount, nonce, error: null};

        } catch (err) {
            debug(err);

            return {neurons: [], queryTime: -1, totalCount: 0, nonce, error: err};
        }
    }

    public async requestExport(tracingIds: string[], format: ExportFormat): Promise<IRequestExportOutput[]> {
        if (!tracingIds || tracingIds.length === 0) {
            return [];
        }

        const tracings = await this._storageManager.Tracings.findAll({where: {id: {$in: tracingIds}}});

        if (tracings.length === 0) {
            return [];
        }

        const idFunc = this._storageManager.StructureIdentifiers.idValue;

        const promises: Promise<IRequestExportOutput>[] = (tracings.map((async (tracing) => {
            const nodes: ITracingNode[] = await this._storageManager.Nodes.findAll({
                where: {tracingId: tracing.id},
                order: [["sampleNumber", "ASC"]]
            });

            const neuron: INeuron = await this._storageManager.Neuron(tracing.neuronId);

            if (format === ExportFormat.SWC) {
                return {
                    contents: mapToSwc(tracing, neuron, nodes, idFunc),
                    filename: neuron.idString
                };
            } else {
                return {
                    contents: mapToJSON(tracing, neuron, nodes, idFunc),
                    filename: neuron.idString
                };
            }
        })));

        const data = await Promise.all(promises);

        if (data.length > 1) {
            if (format === ExportFormat.SWC) {
                const tempFile = uuid.v4();

                return new Promise<IRequestExportOutput[]>(async (resolve) => {
                    const output = fs.createWriteStream(tempFile);

                    output.on("finish", () => {
                        const readData = fs.readFileSync(tempFile);

                        const encoded = readData.toString("base64");

                        fs.unlinkSync(tempFile);

                        resolve([{
                            contents: encoded,
                            filename: "ndb-export-data.zip"
                        }]);
                    });

                    const archive = Archiver("zip", {zlib: {level: 9}});

                    archive.pipe(output);

                    data.forEach(d => {
                        archive.append(d.contents, {name: d.filename + ".swc"});
                    });

                    await archive.finalize();
                });

            } else {
                const obj = data.reduce((prev: any, d) => {
                    prev[d.filename] = d.contents;

                    return prev;
                }, {});

                return [{
                    contents: JSON.stringify(obj),
                    filename: "mlnb-export-data.json"
                }]
            }
        } else {
            data[0].filename += format === ExportFormat.SWC ? ".swc" : ".json";

            if (format === ExportFormat.JSON) {
                data[0].contents = JSON.stringify(data[0].contents)
            }

            return data;
        }
    }

    private async queryFromFilter(filter: IFilterInput) {
        let query: FindOptions = {
            where: {},
            // include: [this._storageManager.Neurons]
        };

        // Zero means any, two is explicitly both types - either way, do not need to filter on structure id
        if (filter.tracingStructureIds.length === 1) {
            query.where["tracingStructureId"] = filter.tracingStructureIds[0];
        }

        if (filter.brainAreaIds.length > 0) {
            // Structure paths of the selected brain areas.
            const brainStructurePaths = (await this._storageManager.BrainAreas.findAll({
                attributes: ["structureIdPath"],
                where: {id: {$in: filter.brainAreaIds}}
            })).map(o => o.structureIdPath + "%");

            // Find all brain areas that are these or children of in terms of structure path.
            const comprehensiveBrainAreaObjs = (await this._storageManager.BrainAreas.findAll({
                attributes: ["id", "structureIdPath"],
                where: {structureIdPath: {$like: {$any: brainStructurePaths}}}
            }));

            const comprehensiveBrainAreaIds = comprehensiveBrainAreaObjs.map(o => o.id);

            query.where["brainAreaId"] = {
                $in: comprehensiveBrainAreaIds
            };
        }

        let opCode = null;
        let amount = 0;

        if (filter.operatorId && filter.operatorId.length > 0) {
            const operator = operatorIdValueMap().get(filter.operatorId);
            if (operator) {
                opCode = operator.operator;
            }
            amount = filter.amount;
            debug(`found operator ${operator} with opCode ${opCode} for amount ${amount}`);
        } else {
            opCode = "$gt";
            amount = 0;
            debug(`operator is null, using opCode ${opCode} for amount ${amount}`);
        }

        if (opCode) {
            if (filter.nodeStructureIds.length > 1) {
                let subQ = filter.nodeStructureIds.map(s => {
                    const columnName = this._storageManager.StructureIdentifiers.countColumnName(s);

                    if (columnName) {
                        let obj = {};

                        obj[columnName] = createOperator(opCode, amount);

                        return obj;
                    }

                    debug(`Failed to identify column name for count of structure id ${s}`);

                    return null;
                }).filter(q => q !== null);

                if (subQ.length > 0) {
                    query.where["$or"] = subQ;
                }
            } else if (filter.nodeStructureIds.length > 0) {
                const columnName = this._storageManager.StructureIdentifiers.countColumnName(filter.nodeStructureIds[0]);

                if (columnName) {
                    query.where[columnName] = createOperator(opCode, amount);
                } else {
                    debug(`Failed to identify column name for count of structure id ${filter.nodeStructureIds[0]}`);
                }
            } else {
                query.where["nodeCount"] = createOperator(opCode, amount);
            }
        } else {
            // TODO return error
            debug("failed to find operator");
        }

        return query;
    }

    private async performNeuronsFilterQuery(filters: IFilterInput[]) {
        const start = Date.now();

        const promises = filters.map(async (filter) => {
            return this.queryFromFilter(filter);
        });

        const queries = await Promise.all(promises);

        const resultPromises = queries.map(async (query) => {
            const data = await this._storageManager.BrainCompartment.findAll(query);
            return data;
        });

        // An array (one for each filter entry) of an array of compartments (all returned for each filter).
        let results = await Promise.all(resultPromises);

        // Not interested in individual compartment results.  Just want unique tracings mapped back to neurons for
        // grouping.  Need to reorg by neurons before applying composition.
        results = results.map((c, index) => {
            let compartments = c;

            if (filters[index].arbCenter && filters[index].arbSize) {
                const pos = filters[index].arbCenter;

                compartments = compartments.filter((comp) => {
                    const distance = Math.sqrt(Math.pow(pos.x - comp.somaX, 2) + Math.pow(pos.y - comp.somaY, 2) + Math.pow(pos.z - comp.somaZ, 2));

                    return distance <= filters[index].arbSize;
                });
            }


            return compartments.map(c => {
                return this._storageManager.Neuron(c.neuronId);
            });
        });

        let neurons = results.reduce((prev, curr, index) => {
            if (index === 0 || filters[index].composition === FilterComposition.or) {
                return _.uniqBy(prev.concat(curr), "id");
            } else if  (filters[index].composition === FilterComposition.and) {
                return _.uniqBy(_.intersectionBy(prev, curr, "id"), "id");
            } else {
                // Not
                return _.uniqBy(_.differenceBy(prev, curr, "id"), "id");
            }
        }, []);

        const duration = Date.now() - start;

        await this.logQueries(filters, queries, duration);

        return {neurons, duration};
    }

    private async logQueries(filters: IFilterInput[], queries: FindOptions[], duration) {
        // Fixes json -> string for model circular reference when logging.
        const queryLog = queries ? queries.map(q => {
            let ql = {where: q.where};
            if (q.include) {
                const include: any = q.include[0];

                ql["include"] = [{
                    model: "Tracings",
                    where: include.where
                }];
            }
            return ql;
        }) : [{}];

        await this._storageManager.logQuery(filters, [queryLog], "", duration);
    }
}

function mapToSwc(tracing: ITracing, neuron: INeuron, nodes: ITracingNode[], idFunc: any): string {
    const header = `# Registered tracing exported from Mouse Light neuron data browser.\n`
        + `# Exported: ${(new Date()).toUTCString()}\n`
        + `# Neuron Id: ${neuron.idString}\n`
        + `# Transformed: ${(new Date(tracing.transformedAt)).toUTCString()}\n`;

    return nodes.reduce((prev, node) => {
        return prev + `${node.sampleNumber}\t${idFunc(node.structureIdentifierId)}\t${node.x.toFixed(6)}\t${node.y.toFixed(6)}\t${node.z.toFixed(6)}\t${node.radius.toFixed(6)}\t${node.parentNumber}\n`;
    }, header);
}

function mapToJSON(tracing: ITracing, neuron: INeuron, nodes: ITracingNode[], idFunc: any): any {
    const obj = {
        info: {
            exported: (new Date()).toUTCString(),
            neuronId: neuron.idString,
            transformed: (new Date(tracing.transformedAt)).toUTCString()
        },
        nodes: []
    };

    obj.nodes = nodes.map(n => {
        return {
            sampleNumber: n.sampleNumber,
            structureIdentifier: idFunc(n.structureIdentifierId),
            x: n.x,
            y: n.y,
            z: n.z,
            radius: n.radius,
            parentSample: n.parentNumber
        }
    });

    return obj;
}

function createOperator(operator: string, amount: number) {
    let obj = {};
    obj[operator] = amount;

    return obj;
}
