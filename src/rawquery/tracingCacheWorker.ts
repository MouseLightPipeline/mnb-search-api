import { parentPort, workerData } from "worker_threads";

import {Tracing} from "../models/search-db/tracing";
import {TracingNode} from "../models/search-db/tracingNode";
import {RemoteDatabaseClient} from "../data-access/remoteDatabaseClient";
import {SequelizeOptions} from "../options/databaseOptions";

const debug = require("debug")("mnb:search-api:tracing-cache-worker");

export interface ITracingCacheWorkerInput {
    offset: number;
    limit: number;
}

parentPort.on("message", async (param: ITracingCacheWorkerInput) => {
    await RemoteDatabaseClient.Start("search-db", SequelizeOptions);

    const loaded = await Tracing.findAll({
        include: [{model: TracingNode, as: "nodes"}],
        limit: param.limit,
        offset: param.offset
    });

    debug(`compiling tracings ${param.offset} through ${param.offset + param.limit - 1}`);

    const mapped = loaded.map(t => {
        const obj = Object.assign({}, {id: t.id, nodes: []});

        obj.nodes = t.nodes.map(n => Object.assign({}, {
            id: n.id,
            x: n.x,
            y: n.y,
            z: n.z,
            radius: n.radius,
            parentNumber: n.parentNumber,
            sampleNumber: n.sampleNumber,
            brainAreaIdCcfV25: n.brainAreaIdCcfV25,
            brainAreaIdCcfV30: n.brainAreaIdCcfV30,
            structureIdentifierId: n.structureIdentifierId
        }));

        return obj;
    });

    parentPort.postMessage(mapped);
})