import {PersistentStorageManager} from "../data-access/persistentStorageManager";
import {ServiceOptions} from "../options/serviceOptions";

const debug = require("debug")("mnb:search-api:raw-query");

const compiledMap = new Map<string, any>();

let cacheReady = false;

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

    const totalCount = await PersistentStorageManager.Instance().Tracings.count();

    loadCacheSubset(0, ServiceOptions.tracingLoadLimit, totalCount).then();
}

async function loadCacheSubset(offset: number, limit: number, totalCount: number) {
    if (offset > totalCount) {
        cacheReady = true;
        debug("tracing cache loaded");
        return;
    }

    const loaded = await PersistentStorageManager.Instance().Tracings.findAll({
        include: [{model: PersistentStorageManager.Instance().Nodes, as: "nodes"}],
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
            brainAreaId: n.brainAreaId,
            structureIdentifierId: n.structureIdentifierId
        }));

        compiledMap.set(obj.id, obj);
    });

    setTimeout(() => {
        loadCacheSubset(offset + limit, limit, totalCount).then();
    }, 2500);
}

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
