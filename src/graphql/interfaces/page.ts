export interface IPageInput {
    tracingId: string;
    offset: number;
    limit: number;
}

const MAX_INT32 = Math.pow(2, 31) - 1;

export function validatePageInput(page: IPageInput): IPageInput {
    let offset = 0;
    let limit = MAX_INT32;

    if (!page) {
        return {tracingId: null, offset: offset, limit: limit};
    }

    if (page.offset === null || page.offset === undefined) {
        page.offset = offset;
    }

    if (page.limit === null && page.limit === undefined) {
        page.limit = limit;
    }

    return page;
}
