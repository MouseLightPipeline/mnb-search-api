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
}