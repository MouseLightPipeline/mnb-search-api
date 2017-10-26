import {PersistentStorageManager} from "../models/databaseConnector";

const debug = require("debug")("ndb:search:raw-query");

const compiledMap = new Map<string, any>();

let cacheReady = false;

export async function loadTracingCache() {
    debug("loading cache");

    const loaded = await PersistentStorageManager.Instance().Tracings.findAll({
        include: [{model: PersistentStorageManager.Instance().Nodes, as: "nodes"}]
    });


    debug("compiling tracings");

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

    cacheReady = true;

    debug("tracing cache loaded");
    console.log("tracing cache loaded");
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

function convertTiming(duration: [number, number]) {
    return duration[0] + duration[1] / 1000000000
}
