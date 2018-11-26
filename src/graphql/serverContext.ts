import * as _ from "lodash";
import * as Sequelize from "sequelize";
import {FindOptions} from "sequelize";
import {StorageManager} from "../data-access/storageManager";
import {IPredicate, ISearchContext, MixedPredicateType, PredicateType, UnknownPredicateType} from "./serverResolvers";
import {operatorIdValueMap} from "../models/queryOperator";
import {IBrainArea} from "../models/search/brainArea";
import {ITracingStructureAttributes} from "../models/search/tracingStructure";
import {IStructureIdentifierAttributes} from "../models/search/structureIdentifier";
import {INeuronAttributes, SearchScope} from "../models/search/neuron";
import {MetricsStorageManager} from "../data-access/metricsStorageManager";
import {ISearchContent} from "../models/search/searchContent";

const debug = require("debug")("mnb:search-api:context");

const Op = Sequelize.Op;

export interface IQueryDataPage {
    neurons: INeuronAttributes[];
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
    private _storageManager = StorageManager.Instance();
    private _metricStorageManager = MetricsStorageManager.Instance();

    public async getStructureIdentifiers(): Promise<IStructureIdentifierAttributes[]> {
        return this._storageManager.StructureIdentifiers.findAll({});
    }

    public async getTracingStructures(): Promise<ITracingStructureAttributes[]> {
        return this._storageManager.TracingStructures.findAll({});
    }

    public async getBrainAreas(ids: string[] = null): Promise<IBrainArea[]> {
        if (!ids || ids.length === 0) {
            return this._storageManager.BrainAreas.findAll({});
        } else {
            return this._storageManager.BrainAreas.findAll({where: {id: {[Op.in]: ids}}});
        }
    }

    public async getNeuronsWithPredicates(context: ISearchContext): Promise<IQueryDataPage> {
        try {
            context.predicateType = UnknownPredicateType;

            if (context.predicates.length === 1) {
                context.predicateType = context.predicates[0].predicateType;
            } else if (context.predicates.length > 1) {
                context.predicateType = context.predicates[0].predicateType;

                if (!context.predicates.every(f => f.predicateType === context.predicateType)) {
                    context.predicateType = MixedPredicateType;
                }
            }

            const start = Date.now();

            let neurons = await this.performNeuronsFilterQuery(context);

            const duration = Date.now() - start;

            const totalCount = this._storageManager.neuronCount(context.scope);

            neurons = neurons.sort((b, a) => a.idString.localeCompare(b.idString));

            return {neurons, queryTime: duration, totalCount, nonce: context.nonce, error: null};

        } catch (err) {
            debug(err);

            return {neurons: [], queryTime: -1, totalCount: 0, nonce: context.nonce, error: err};
        }
    }

    private queryFromFilter(filter: IPredicate, searchScope: SearchScope): FindOptions<ISearchContent> {
        const query: FindOptions<ISearchContent> = {};

        switch (filter.predicateType) {
            case PredicateType.AnatomicalRegion:
                query.where = {searchScope: {[Op.gte]: searchScope}};

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
                break;
            case PredicateType.CustomRegion:
                query.where = {searchScope: {[Op.gte]: searchScope}};
                break;
            case PredicateType.IdOrDoi:
                let where = null;

                if (filter.tracingIdsOrDOIsExactMatch || filter.tracingIdsOrDOIs.length === 0) {
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
                    if (filter.tracingIdsOrDOIs.length === 1) {
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
                    } else {
                        const ors = filter.tracingIdsOrDOIs.map(id => {
                            return {
                                [Op.or]: [
                                    {
                                        neuronIdString: {
                                            [Op.iLike]: `%${id}%`
                                        }
                                    },
                                    {
                                        neuronDOI: {
                                            [Op.iLike]: `%${id}%`
                                        }
                                    }
                                ]
                            }
                        });

                        where = {
                            [Op.or]: ors
                        }
                    }
                }

                if (where) {
                    query.where = {
                        [Op.and]: [
                            where,
                            {searchScope: {[Op.gte]: searchScope}}
                        ]
                    }
                } else {
                    query.where = {searchScope: {[Op.gte]: searchScope}};
                }
                break;
        }

        if (filter.predicateType !== PredicateType.IdOrDoi) {
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
        }

        return query;
    }

    private async performNeuronsFilterQuery(context: ISearchContext): Promise<INeuronAttributes[]> {
        const start = Date.now();

        const queries = context.predicates.map((filter) => {
            return this.queryFromFilter(filter, context.scope);
        });

        const contentPromises: Promise<ISearchContent[]>[] = queries.map(async (query) => {
            return await this._storageManager.SearchContent.findAll(query);
        });

        // An array (one for each filter entry) of an array of compartments (all returned for each filter).
        const contents: ISearchContent[][] = await Promise.all(contentPromises);

        // Not interested in individual compartment results.  Just want unique tracings mapped back to neurons for
        // grouping.  Need to restructure by neurons before applying composition.
        const results: INeuronAttributes[][] = contents.map((c, index) => {
            let compartments = c;

            const predicate = context.predicates[index];

            if (predicate.predicateType === PredicateType.CustomRegion && predicate.arbCenter && predicate.arbSize) {
                const pos = predicate.arbCenter;

                compartments = compartments.filter((comp) => {
                    const distance = Math.sqrt(Math.pow(pos.x - comp.somaX, 2) + Math.pow(pos.y - comp.somaY, 2) + Math.pow(pos.z - comp.somaZ, 2));

                    return distance <= predicate.arbSize;
                });
            }

            return compartments.map(c => {
                return this._storageManager.Neuron(c.neuronId);
            });
        });

        let neurons = results.reduce((prev, curr, index) => {
            if (index === 0 || context.predicates[index].composition === FilterComposition.or) {
                return _.uniqBy(prev.concat(curr), "id");
            } else if (context.predicates[index].composition === FilterComposition.and) {
                return _.uniqBy(_.intersectionBy(prev, curr, "id"), "id");
            } else {
                // Not
                return _.uniqBy(_.differenceBy(prev, curr, "id"), "id");
            }
        }, []);

        const duration = Date.now() - start;

        await this._metricStorageManager.logQuery(context, queries, "", duration);

        return neurons;
    }

    public async updateSample(id: string): Promise<boolean> {
        return false;
    }

    public async updateNeuron(id: string): Promise<boolean> {
        return false;
    }
}

function createOperator(operator: symbol, amount: number) {
    let obj = {};
    obj[operator] = amount;

    return obj;
}
