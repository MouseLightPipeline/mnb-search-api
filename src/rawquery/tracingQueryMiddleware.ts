import * as path from "path";

import {ServiceOptions} from "../options/serviceOptions";
import {Tracing} from "../models/search-db/tracing";
import {TracingNode} from "../models/search-db/tracingNode";
import {StaticPool} from "node-worker-threads-pool";

const debug = require("debug")("mnb:search-db-api:raw-query");

const compiledMap = new Map<string, any>();

let cacheReady = false;

let timerStart;

export async function loadTracingCache(performDelay = true) {
    if (performDelay) {
        const delay = Math.random() * ServiceOptions.tracingLoadMaxDelay;

        debug(`delaying ${delay.toFixed(0)} seconds before initiating cache load`);

        setTimeout(async () => {
            await loadTracingCache(false)
        }, delay * 1000);

        return;
    }

    debug("loading cache");

    const totalCount = await Tracing.count();

    const pool = new StaticPool({
        size: 3,
        shareEnv: true,
        task: path.join(__dirname, "tracingCacheWorker.js")
    });

    timerStart = process.hrtime();

    for (let idx = 0; idx < totalCount; idx += ServiceOptions.tracingLoadLimit) {
        (async () => {
            const res: any[] = await pool.exec({offset: idx, limit: ServiceOptions.tracingLoadLimit}) as any[];

            res.forEach(r => compiledMap.set(r.id, r));

            if (compiledMap.size == totalCount) {
                const hrend = process.hrtime(timerStart);
                debug("tracing cache loaded");
                debug('execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000);
            }
        })();
        // debug(res);
    }

    // loadCacheSubset(0, ServiceOptions.tracingLoadLimit, totalCount).then();
}
/*
async function loadCacheSubset(offset: number, limit: number, totalCount: number) {
    if (offset > totalCount) {
        cacheReady = true;
        const hrend = process.hrtime(timerStart);
        debug("tracing cache loaded");
        debug('execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000)
        return;
    }

    const loaded = await Tracing.findAll({
        include: [{model: TracingNode, as: "nodes"}],
        limit,
        offset
    });

    debug(`compiling tracings ${offset} through ${offset + limit - 1}`);

    loaded.map(t => {
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

        compiledMap.set(obj.id, obj);
    });

    setTimeout(() => {
        loadCacheSubset(offset + limit, limit, totalCount).then();
    }, 2500);
}
*/
export async function tracingQueryMiddleware(req, res) {
    const ids = req.body.ids;

    if (!ids || ids.length === 0) {
        res.json({
            tracings: [],
            timing: {
                sent: Date.now().valueOf(),
                total: 0,
                load: 0,
                map: 0
            }
        });

        return;
    }

    try {
        res.json({
            tracings: ids.map(id => compiledMap.get(id)),
            timing: {
                sent: Date.now().valueOf(),
                total: 0,
                load: 0,
                map: 0
            }
        });
    } catch (err) {
        console.log(err);
        res.json({
            tracings: [],
            timing: {
                sent: Date.now().valueOf(),
                total: 0,
                load: 0,
                map: 0
            }
        });
    }
}
