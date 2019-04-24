import {SearchScope} from "./search/neuron";
import * as uuid from "uuid";

export enum PredicateType {
    UnknownPredicateType = -1,
    AnatomicalRegion = 1,
    CustomRegion = 2,
    IdOrDoi = 3,
    MixedPredicateType = 4
}

export interface IPosition {
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

export interface ISearchContextInput {
    scope: SearchScope;
    nonce: string;
    predicateType: number;
    predicates: IPredicate[];
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

export function contextFromFilters(filters: IFilterInput[]): ISearchContextInput {
    return {
        scope: SearchScope.Public,
        nonce: filters.length > 0 ? filters[0].nonce : "",
        predicateType: PredicateType.UnknownPredicateType,
        predicates: filters.map(f => Object.assign({}, f, {predicateType: predicateTypeForFilter(f)}))
    };
}

export class SearchContext {
    public constructor(input: ISearchContextInput) {
        input = input || SearchContext.createDefault();

        this._scope = input.scope;
        this._nonce = input.nonce;
        this._predicates = (!input.predicates || input.predicates.length === 0) ? SearchContext.createDefaultPredicates() : input.predicates;

        if (!this._predicates.every(f => f.predicateType === this._predicates[0].predicateType)) {
            this._predicateType = PredicateType.MixedPredicateType;
        }
    }

    private readonly _scope: SearchScope;

    public get Scope(): SearchScope {
        return this._scope;
    }

    private readonly _nonce: string;

    public get Nonce(): string {
        return this._nonce;
    }

    private readonly _predicateType: PredicateType;

    public get PredicateType(): PredicateType {
        return this._predicateType;
    }

    private readonly _predicates: IPredicate[];

    public get Predicates(): IPredicate[] {
        return this._predicates;
    }

    private static createDefault(): ISearchContextInput {
        return {
            scope: SearchScope.Public,
            nonce: uuid.v4(),
            predicateType: PredicateType.UnknownPredicateType,
            predicates: SearchContext.createDefaultPredicates()
        }
    }

    private static createDefaultPredicates(): IPredicate[] {
        return [{
            predicateType: PredicateType.AnatomicalRegion,
            tracingIdsOrDOIs: [],
            tracingIdsOrDOIsExactMatch: false,
            tracingStructureIds: [],
            nodeStructureIds: [],
            operatorId: "8905baf3-89bc-4e23-b542-e8d0947991f8",
            amount: 0,
            brainAreaIds: [],
            arbCenter: {
                x: 0,
                y: 0,
                z: 0
            },
            arbSize: 0,
            invert: false,
            composition: 0
        }];
    }
}