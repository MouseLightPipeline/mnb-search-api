import * as _ from "lodash";
import {FindOptions} from "sequelize";
import * as Sequelize from "sequelize";

const debug = require("debug")("mnb:search-api:context");

import {PersistentStorageManager} from "../data-access/persistentStorageManager";
import {IFilterInput} from "./serverResolvers";
import {operatorIdValueMap} from "../models/queryOperator";
import {IBrainArea} from "../models/search/brainArea";
import {ITracingStructure} from "../models/search/tracingStructure";
import {IStructureIdentifier} from "../models/search/structureIdentifier";
import {INeuron} from "../models/search/neuron";
import {INeuronBrainMap} from "../models/search/neuronBrainAreaMap";
import {MetricsStorageManager} from "../data-access/metricsStorageManager";

const Op = Sequelize.Op;

export interface IQueryDataPage {
    neurons: INeuron[];
    totalCount: number;
    queryTime: number;
    nonce: string;
    error: Error;
}

export enum FilterComposition {
    and = 1,
    or = 2,
    not = 3
}

export class GraphQLServerContext {
    private _storageManager = PersistentStorageManager.Instance();
    private _metricStorageManager = MetricsStorageManager.Instance();

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
            return this._storageManager.BrainAreas.findAll({where: {id: {[Op.in]: ids}}});
        }
    }

    public async getNeuronsWithFilters(filters: IFilterInput[]): Promise<IQueryDataPage> {
        let nonce = "";

        if (filters.length > 0) {
            nonce = filters[0].nonce;
        }

        try {

            let {neurons, duration} = await this.performNeuronsFilterQuery(filters);

            const totalCount = this._storageManager.NeuronCount;

            neurons = neurons.sort((b, a) => a.idString.localeCompare(b.idString));

            return {neurons: neurons, queryTime: duration, totalCount, nonce, error: null};

        } catch (err) {
            debug(err);

            return {neurons: [], queryTime: -1, totalCount: 0, nonce, error: err};
        }
    }
    private queryFromFilter(filter: IFilterInput) {
        let query: FindOptions<INeuronBrainMap> = {
            where: {},
            // include: [this._storageManager.Neurons]
        };

        // Zero means any, two is explicitly both types - either way, do not need to filter on structure id
        if (filter.tracingStructureIds.length === 1) {
            query.where["tracingStructureId"] = filter.tracingStructureIds[0];
        }

        if (filter.brainAreaIds.length > 0) {
            // Find all brain areas that are these or children of in terms of structure path.
            const comprehensiveBrainAreas = filter.brainAreaIds.map(id => this._storageManager.ComprehensiveBrainAreas(id)).reduce((prev, curr) => {
                return prev.concat(curr);
            }, []);

            query.where["brainAreaId"] = {
                [Op.in]: comprehensiveBrainAreas
            };
        }

        // Currently this blows away any brain area where clauses.  The client should only be sending a list of brain
        // areas or ids (or neither if a custom region filter).  However, if that changes and somehow both can be in the
        // same filter, this would have to be changes to merge the where.
        if (filter.tracingIdsOrDOIs.length > 0) {
            let where = {};

            if (filter.tracingIdsOrDOIsExactMatch) {
                where = {
                    [Op.or]: [
                        {
                            neuronIdString: {
                                [Op.in]: filter.tracingIdsOrDOIs
                            }
                        },
                        {
                            neuronDOI: {
                                [Op.in]: filter.tracingIdsOrDOIs
                            }
                        }
                    ]
                };
            } else {
                where = {
                    [Op.or]: [
                        {
                            neuronIdString: {
                                [Op.iLike]: `%${filter.tracingIdsOrDOIs[0]}%`
                            }
                        },
                        {
                            neuronDOI: {
                                [Op.iLike]: `%${filter.tracingIdsOrDOIs[0]}%`
                            }
                        }
                    ]
                };
            }

            query.where = where;
        }

        let opCode = null;
        let amount = 0;

        if (filter.operatorId && filter.operatorId.length > 0) {
            const operator = operatorIdValueMap().get(filter.operatorId);
            if (operator) {
                opCode = operator.operatorSymbol;
            }
            amount = filter.amount;
            debug(`found operator ${operator} with opCode ${operator.operator2} for amount ${amount}`);
        } else {
            opCode = Op.gt;
            amount = 0;
            debug(`operator is null, using opCode $gt for amount ${amount}`);
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
                    query.where[Op.or] = subQ;
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

        const queries = filters.map((filter) => {
            return this.queryFromFilter(filter);
        });

        const resultPromises = queries.map(async (query) => {
            return await this._storageManager.BrainCompartment.findAll(query);
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

        this.logQueries(filters, queries, duration).then(() => {});

        return {neurons, duration};
    }

    private async logQueries(filters: IFilterInput[], queries: FindOptions<INeuronBrainMap>[], duration) {
        try {
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

            await this._metricStorageManager.logQuery(filters, [queryLog], "", duration);
        } catch (err) {
            console.log(err);
        }
    }
}

function createOperator(operator: symbol, amount: number) {
    let obj = {};
    obj[operator] = amount;

    return obj;
}
