function httpJson(method, urlString, body) {
    const http = require('http');
    const https = require('https');
    const u = new URL(urlString);
    const lib = u.protocol === 'https:' ? https : http;
    const port = u.port || (u.protocol === 'https:' ? 443 : 80);
    const pathOnly = u.pathname + u.search;
    const opts = {
        hostname: u.hostname,
        port,
        path: pathOnly,
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: 20000
    };
    return new Promise((resolve, reject) => {
        const req = lib.request(opts, (res) => {
            let raw = '';
            res.on('data', (c) => {
                raw += c;
            });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new Error('HTTP ' + res.statusCode));
                    return;
                }
                try {
                    resolve(raw ? JSON.parse(raw) : {});
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy(new Error('timeout'));
        });
        if (body && method === 'POST') {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function splitLimits(total, n, maxEach) {
    const base = Math.floor(total / n);
    const rem = total - base * n;
    const out = new Array(n).fill(base);
    for (let i = 0; i < rem; i++) out[i] += 1;
    for (let i = 0; i < n; i++) {
        if (out[i] > maxEach) out[i] = maxEach;
    }
    return out;
}

return (async function () {
    const dc = flow.get('deviceCount');
    const deviceCount = dc === 1 || dc === 2 || dc === 3 ? dc : 2;
    const ip = [flow.get('ipZendure1'), flow.get('ipZendure2'), flow.get('ipZendure3')].slice(0, deviceCount);
    const sn = [flow.get('snZendure1'), flow.get('snZendure2'), flow.get('snZendure3')].slice(0, deviceCount);
    const maxIn = flow.get('maxPower_in') || 2400;
    const maxOut = flow.get('maxPower_out') || 2400;
    const balancingFactor = flow.get('balancingFactor') || 1.15;
    const minSoc = flow.get('minSoc') || 100;
    const socSet = flow.get('socSet') || 1000;
    const el = [
        flow.get('electricLevel_A'),
        flow.get('electricLevel_B'),
        flow.get('electricLevel_C')
    ].slice(0, deviceCount);
    const socStatus = [
        flow.get('socStatus_A') || 0,
        flow.get('socStatus_B') || 0,
        flow.get('socStatus_C') || 0
    ].slice(0, deviceCount);
    const socLimit = [
        flow.get('socLimit_A') || 0,
        flow.get('socLimit_B') || 0,
        flow.get('socLimit_C') || 0
    ].slice(0, deviceCount);

    const data = msg.payload;
    if (data.properties && 'equalMode' in data.properties) {
        flow.set('equalMode', data.properties.equalMode);
        msg.payload = '';
        msg.statusCode = 200;
        return msg;
    }
    if (data.properties && 'alwaysDualMode' in data.properties) {
        flow.set('alwaysDualMode', data.properties.alwaysDualMode);
        msg.payload = '';
        msg.statusCode = 200;
        return msg;
    }
    if (data.properties && 'dualModeDamper' in data.properties) {
        flow.set('dualmode_damper_enable', data.properties.dualModeDamper);
        msg.payload = '';
        msg.statusCode = 200;
        return msg;
    }

    const servers = ip.map((h) => 'http://' + h + '/properties/write');

    if (deviceCount === 1) {
        const p = JSON.parse(JSON.stringify(data));
        p.sn = sn[0];
        try {
            await httpJson('POST', servers[0], p);
        } catch (e) {
            msg.statusCode = 502;
            msg.payload = { error: String(e.message || e) };
            return msg;
        }
        msg.payload = '';
        msg.statusCode = 200;
        return msg;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    let singleMode_upperlimit_in = flow.get('singleMode_upperlimit_in') || maxIn;
    let singleMode_upperlimit_out = flow.get('singleMode_upperlimit_out') || maxOut;
    let singleMode_lowerlimit_in = flow.get('singleMode_lowerlimit_in') || maxIn * 0.4;
    let singleMode_lowerlimit_out = flow.get('singleMode_lowerlimit_out') || maxOut * 0.4;

    const payloads = [];
    for (let i = 0; i < deviceCount; i++) {
        payloads.push(JSON.parse(JSON.stringify(data)));
        payloads[i].sn = sn[i];
    }

    if (data.properties && 'chargeMaxLimit' in data.properties) {
        const t = data.properties.chargeMaxLimit;
        const parts = splitLimits(t, deviceCount, maxIn);
        for (let i = 0; i < deviceCount; i++) payloads[i].properties.chargeMaxLimit = parts[i];
    }
    if (data.properties && 'inverseMaxPower' in data.properties) {
        const t = data.properties.inverseMaxPower;
        const parts = splitLimits(t, deviceCount, maxOut);
        for (let i = 0; i < deviceCount; i++) payloads[i].properties.inverseMaxPower = parts[i];
    }

    if (data.properties && 'inputLimit' in data.properties) {
        const inputLimit = data.properties.inputLimit;
        let Avail = [];
        for (let i = 0; i < deviceCount; i++) {
            let a = socSet / 10 - el[i];
            if (a < 0 || socStatus[i] === 1) a = 0;
            Avail.push(a);
        }
        let powers;
        const totalAvail = Avail.reduce((s, v) => s + v, 0);
        if (inputLimit === 0) {
            powers = new Array(deviceCount).fill(0);
        } else if (inputLimit < singleMode_lowerlimit_in) {
            let idx = 0;
            let minEl = el[0];
            for (let i = 1; i < deviceCount; i++) {
                if (el[i] < minEl) {
                    minEl = el[i];
                    idx = i;
                }
            }
            powers = new Array(deviceCount).fill(0);
            powers[idx] = Math.min(inputLimit, maxIn);
        } else {
            if (totalAvail <= 0) {
                powers = new Array(deviceCount).fill(0);
            } else {
                powers = new Array(deviceCount).fill(0);
                let rem = inputLimit;
                const w = Avail.map((a) => (a / totalAvail) * balancingFactor);
                const sw = w.reduce((s, v) => s + v, 0);
                for (let i = 0; i < deviceCount; i++) {
                    powers[i] = Math.floor((w[i] / sw) * inputLimit);
                    if (powers[i] > maxIn) powers[i] = maxIn;
                }
                let sum = powers.reduce((s, v) => s + v, 0);
                let j = 0;
                while (sum < inputLimit && j < deviceCount * 4) {
                    const k = j % deviceCount;
                    if (powers[k] < maxIn) {
                        powers[k] += 1;
                        sum += 1;
                    }
                    j += 1;
                }
            }
        }
        for (let i = 0; i < deviceCount; i++) payloads[i].properties.inputLimit = powers[i];
        flow.set('latestPowerCmd', inputLimit);
        for (let i = 0; i < deviceCount; i++) {
            flow.set(i === 0 ? 'latestPowerCmd_1' : i === 1 ? 'latestPowerCmd_2' : 'latestPowerCmd_3', powers[i]);
        }
    }

    if (data.properties && 'outputLimit' in data.properties) {
        let outputLimit = data.properties.outputLimit;
        let Avail = [];
        for (let i = 0; i < deviceCount; i++) {
            let a = el[i] - minSoc / 10;
            if (a < 0 || socStatus[i] === 1) a = 0;
            Avail.push(a);
        }
        let powers;
        const totalAvail = Avail.reduce((s, v) => s + v, 0);
        if (outputLimit === 0) {
            powers = new Array(deviceCount).fill(0);
        } else if (outputLimit < singleMode_lowerlimit_out) {
            let idx = 0;
            let maxEl = el[0];
            for (let i = 1; i < deviceCount; i++) {
                if (el[i] > maxEl) {
                    maxEl = el[i];
                    idx = i;
                }
            }
            powers = new Array(deviceCount).fill(0);
            powers[idx] = Math.min(outputLimit, maxOut);
        } else {
            if (totalAvail <= 0) {
                powers = new Array(deviceCount).fill(0);
            } else {
                powers = new Array(deviceCount).fill(0);
                const w = Avail.map((a) => (a / totalAvail) * balancingFactor);
                const sw = w.reduce((s, v) => s + v, 0);
                for (let i = 0; i < deviceCount; i++) {
                    powers[i] = Math.floor((w[i] / sw) * outputLimit);
                    if (powers[i] > maxOut) powers[i] = maxOut;
                }
                let sum = powers.reduce((s, v) => s + v, 0);
                let j = 0;
                while (sum < outputLimit && j < deviceCount * 4) {
                    const k = j % deviceCount;
                    if (powers[k] < maxOut) {
                        powers[k] += 1;
                        sum += 1;
                    }
                    j += 1;
                }
            }
        }
        for (let i = 0; i < deviceCount; i++) payloads[i].properties.outputLimit = powers[i];
        flow.set('latestPowerCmd', -outputLimit);
        for (let i = 0; i < deviceCount; i++) {
            flow.set(i === 0 ? 'latestPowerCmd_1' : i === 1 ? 'latestPowerCmd_2' : 'latestPowerCmd_3', -powers[i]);
        }
    }

    if (data.properties && 'acMode' in data.properties) {
        const m = data.properties.acMode;
        for (let i = 0; i < deviceCount; i++) payloads[i].properties.acMode = m;
        flow.set('acMode', m);
    }

    try {
        await Promise.all(payloads.map((p, i) => httpJson('POST', servers[i], p)));
    } catch (e) {
        msg.statusCode = 502;
        msg.payload = { error: String(e.message || e) };
        return msg;
    }
    flow.set('latestPowerMessage_timestamp_epoch', currentTime);
    msg.payload = '';
    msg.statusCode = 200;
    return msg;
})();
