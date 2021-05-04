import * as _ from "lodash";
import {Op} from "sequelize";

import {CcfVersion, SearchContext} from "../models/query/searchContext";
import {BrainArea} from "../models/search-db/brainArea";
import {TracingStructure} from "../models/search-db/tracingStructure";
import {StructureIdentifier} from "../models/search-db/structureIdentifier";
import {Neuron} from "../models/search-db/neuron";
import {MetricsStorageManager} from "../data-access/metricsStorageManager";
import {Sample} from "../models/search-db/sample";
import {CcfV25SearchContent} from "../models/search-db/ccfV25SearchContent";
import {PredicateType} from "../models/query/queryPredicate";
import {SearchContentBase} from "../models/search-db/searchContent";
import {CcfV30SearchContent} from "../models/search-db/ccfV30SearchContent";

const debug = require("debug")("mnb:search-api:context");

export interface IQueryDataPage {
    nonce: string;
    ccfVersion: CcfVersion;
    queryTime: number;
    totalCount: number;
    neurons: Neuron[];
    error: Error;
}

export enum FilterComposition {
    and = 1,
    or = 2,
    not = 3
}

export class GraphQLServerContext {
    private _metricStorageManager = MetricsStorageManager.Instance();

    public async getStructureIdentifiers(): Promise<StructureIdentifier[]> {
        return StructureIdentifier.findAll({});
    }

    public async getTracingStructures(): Promise<TracingStructure[]> {
        return TracingStructure.findAll({});
    }

    public async getBrainAreas(ids: string[] = null): Promise<BrainArea[]> {
        if (!ids || ids.length === 0) {
            return BrainArea.findAll({});
        } else {
            return BrainArea.findAll({where: {id: {[Op.in]: ids}}});
        }
    }

    public async getSamples(): Promise<Sample[]> {
        return Sample.findAll();
    }

    public async getSample(id: string): Promise<Sample> {
        return Sample.findByPk(id);
    }

    public async syncBrainAreas(): Promise<void> {
        return BrainArea.syncBrainAreas();
    }

    public async getNeuronsWithPredicates(context: SearchContext): Promise<IQueryDataPage> {
        try {
            const start = Date.now();

            let neurons = await this.performNeuronsFilterQuery(context);

            const duration = Date.now() - start;

            const totalCount = Neuron.neuronCount(context.Scope);

            neurons = neurons.sort((b, a) => a.idString.localeCompare(b.idString));

            return {nonce: context.Nonce, ccfVersion: context.CcfVersion, queryTime: duration, totalCount, neurons, error: null};

        } catch (err) {
            debug(err);

            return {nonce: context.Nonce, ccfVersion: context.CcfVersion, queryTime: -1, totalCount: 0, neurons: [], error: err};
        }
    }
/*
    private queryFromFilter(filter: IQueryPredicate, searchScope: SearchScope): FindOptions {
        const query: FindOptions = {};

        switch (filter.predicateType) {
            case PredicateType.AnatomicalRegion:
                query.where = {searchScope: {[Op.gte]: searchScope}};

                // Zero means any, two is explicitly both types - either way, do not need to filter on structure id
                if (filter.tracingStructureIds.length === 1) {
                    query.where["tracingStructureId"] = filter.tracingStructureIds[0];
                }

                const wholeBrainId = BrainArea.wholeBrainId();

                // Asking for "Whole Brain" should not eliminate nodes (particularly soma) that are outside of the ontology
                // atlas.  It should be interpreted as an "all" request.  This also helps performance in that there isn't
                // a where statement with every structure id.
                const applicableCompartments = filter.brainAreaIds.filter(id => id != wholeBrainId);

                if (applicableCompartments.length > 0) {
                    // Find all brain areas that are these or children of in terms of structure path.
                    const comprehensiveBrainAreas = applicableCompartments.map(id => BrainArea.getComprehensiveBrainArea(id)).reduce((prev, curr) => {
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
                        const columnName = StructureIdentifier.countColumnName(s);

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
                    const columnName = StructureIdentifier.countColumnName(filter.nodeStructureIds[0]);

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
*/
    private async performNeuronsFilterQuery(context: SearchContext): Promise<Neuron[]> {
        const start = Date.now();

        const queries = context.Predicates.map((predicate) => {
            return predicate.createFindOptions(context.Scope);
        });

        const contentPromises: Promise<SearchContentBase[]>[] = queries.map(async (query) => {
            if (context.CcfVersion === CcfVersion.Ccf25) {
                return CcfV25SearchContent.findAll(query);
            } else {
                return CcfV30SearchContent.findAll(query);
            }
        });

        // An array (one for each filter entry) of an array of compartments (all returned for each filter).
        const contents: SearchContentBase[][] = await Promise.all(contentPromises);

        // Not interested in individual compartment results.  Just want unique tracings mapped back to neurons for
        // grouping.  Need to restructure by neurons before applying composition.
        const results: Neuron[][] = contents.map((c, index) => {
            let compartments = c;

            const predicate = context.Predicates[index];

            if (predicate.predicateType === PredicateType.CustomRegion && predicate.arbCenter && predicate.arbSize) {
                const pos = predicate.arbCenter;

                compartments = compartments.filter((comp) => {
                    const distance = Math.sqrt(Math.pow(pos.x - comp.somaX, 2) + Math.pow(pos.y - comp.somaY, 2) + Math.pow(pos.z - comp.somaZ, 2));

                    return distance <= predicate.arbSize;
                });
            }

            return compartments.map(c => {
                return Neuron.getOne(c.neuronId);
            });
        });

        let neurons = results.reduce((prev, curr, index) => {
            if (index === 0 || context.Predicates[index].composition === FilterComposition.or) {
                return _.uniqBy(prev.concat(curr), "id");
            } else if (context.Predicates[index].composition === FilterComposition.and) {
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
        console.log(id);
        return false;
    }

    public async updateNeuron(id: string): Promise<boolean> {
        console.log(id);
        return false;
    }
}
/*
function createOperator(operator: symbol, amount: number) {
    let obj = {};
    obj[operator] = amount;

    return obj;
}
*/