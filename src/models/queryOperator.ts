export interface IQueryOperator {
    id: string;
    display: string;
    operator: string;
}

export const operators: IQueryOperator[] = [
    {
        id: "5f21a040-dd64-4116-aa9c-d00387b83db8",
        display: "=",
        operator: "$eq"
    },
    {
        id: "2060469a-aa88-4e61-b72c-e598d8e3e243",
        display: "≠",
        operator: "$ne"
    },
    {
        id: "f191e8b3-8fb9-4151-a48c-432c1a2382cd",
        display: ">",
        operator: "$gt"
    },
    {
        id: "ca6dc15b-bee7-4ee5-b53c-2d9f244b0312",
        display: "<",
        operator: "$lt"
    },
    {
        id: "8905baf3-89bc-4e23-b542-e8d0947991f8",
        display: "≥",
        operator: "$gte"
    },
    {
        id: "86934549-1d9c-41e2-8020-d29724ea505e",
        display: "≤",
        operator: "$lte"
    }
];

const _map = new Map<string, IQueryOperator>();

export function operatorIdValueMap() {
    if (_map.size === 0) {
        operators.forEach((operator) => {
            _map.set(operator.id, operator);
        })
    }

    return _map;
}