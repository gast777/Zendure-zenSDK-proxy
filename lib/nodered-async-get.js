function httpJson(method, urlString, body) {
    const http = require('http');
    const https = require('https');
    const u = new URL(urlString);
    const lib = u.protocol === 'https:' ? https : http;
    const port = u.port || (u.protocol === 'https:' ? 443 : 80);
    const pathOnly = u.pathname + u.search;
    const opts = { hostname: u.hostname, port, path: pathOnly, method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: 15000 };
    return new Promise((resolve, reject) => {
        const req = lib.request(opts, (res) => {
            let raw = '';
            res.on('data', (c) => { raw += c; });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new Error('HTTP ' + res.statusCode));
                    return;
                }
                try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(new Error('timeout')); });
        if (body && method === 'POST') req.write(JSON.stringify(body));
        req.end();
    });
}

function mergeReportN(origs, ctx) {
    const flow = ctx.flow;
    const N = origs.length;
    const latestPowerCmd = flow.get('latestPowerCmd') || 0;
    const latestPowerCmd_1 = flow.get('latestPowerCmd_1') || 0;
    const latestPowerCmd_2 = flow.get('latestPowerCmd_2') || 0;
    const latestPowerCmd_3 = flow.get('latestPowerCmd_3') || 0;
    const singleMode = flow.get('singleMode') || 0;
    const singleMode_activedevice = flow.get('singleMode_activedevice') || 0;
    const singleMode_standby_device_A = flow.get('singleMode_standby_device_A') || 0;
    const singleMode_standby_device_B = flow.get('singleMode_standby_device_B') || 0;
    const singleMode_standby_device_C = flow.get('singleMode_standby_device_C') || 0;
    const dualMode_force_start_timestamp = flow.get('dualMode_force_start_timestamp') || 1;
    const singleToDualModeTransition_start_timestamp = flow.get('singleToDualModeTransition_start_timestamp') || 1;
    const singleModeDeviceChangeTranstion_timer = flow.get('singleModeDeviceChangeTranstion_timer') || 1;
    const equalMode = flow.get('equalMode') || 0;
    const alwaysDualMode = flow.get('alwaysDualMode') || 0;
    const solarPowerInfo = flow.get('solarPowerInfo') || 0;
    const proxyVersion = flow.get('proxyVersion') || '0';
    const dualmode_damper_enable = flow.get('dualmode_damper_enable') || 0;
    const currentTime = Math.floor(Date.now() / 1000);

    const sns = [];
    for (let i = 0; i < N; i++) sns.push(origs[i].sn);

    const values = { properties: {}, original: {} };
    for (let i = 0; i < N; i++) {
        values.original[i] = JSON.parse(JSON.stringify(origs[i]));
    }

    let packData = [];
    for (let i = 0; i < N; i++) {
        packData = packData.concat([...values.original[i].packData]);
    }
    values.packData = packData;

    const el = [];
    const chargeMax = [];
    const inverseMax = [];
    const socLimitArr = [];
    const socStatusArr = [];
    const smartModeArr = [];
    const hyperTmpArr = [];
    const minSocArr = [];
    const socSetArr = [];

    for (let i = 0; i < N; i++) {
        const p = values.original[i].properties;
        el[i] = p.electricLevel;
        chargeMax[i] = p.chargeMaxLimit;
        inverseMax[i] = p.inverseMaxPower;
        socLimitArr[i] = p.socLimit;
        socStatusArr[i] = p.socStatus;
        smartModeArr[i] = p.smartMode;
        hyperTmpArr[i] = p.hyperTmp;
        minSocArr[i] = p.minSoc;
        socSetArr[i] = p.socSet;
        flow.set(i === 0 ? 'electricLevel_A' : i === 1 ? 'electricLevel_B' : 'electricLevel_C', el[i]);
    }

    flow.set('latestGETMessage_timestamp_epoch', currentTime);

    const maxPower_in = Math.min.apply(null, chargeMax);
    const maxPower_out = Math.min.apply(null, inverseMax);
    flow.set('maxPower_in', maxPower_in);
    flow.set('maxPower_out', maxPower_out);

    values.proxyVersion = proxyVersion;
    const product = values.original[0].product || values.original[N - 1].product;
    values.product = product;

    let outputLimit = 0;
    let inputLimit = 0;
    let outputPackPower = 0;
    let packInputPower = 0;
    let gridInputPower = 0;
    let outputHomePower = 0;
    for (let i = 0; i < N; i++) {
        const p = values.original[i].properties;
        outputLimit += p.outputLimit;
        inputLimit += p.inputLimit;
        outputPackPower += p.outputPackPower;
        packInputPower += p.packInputPower;
        gridInputPower += p.gridInputPower;
        outputHomePower += p.outputHomePower;
    }
    values.properties.outputLimit = outputLimit;
    values.properties.inputLimit = inputLimit;
    values.properties.outputPackPower = outputPackPower;
    values.properties.packInputPower = packInputPower;
    values.properties.gridInputPower = gridInputPower;
    values.properties.outputHomePower = outputHomePower;

    const minSoc = Math.max.apply(null, minSocArr);
    const socSet = Math.min.apply(null, socSetArr);
    values.properties.minSoc = minSoc;
    values.properties.socSet = socSet;
    for (let i = 0; i < N; i++) {
        flow.set(i === 0 ? 'minSoc_A' : i === 1 ? 'minSoc_B' : 'minSoc_C', minSocArr[i]);
        flow.set(i === 0 ? 'socSet_A' : i === 1 ? 'socSet_B' : 'socSet_C', socSetArr[i]);
    }
    flow.set('minSoc', minSoc);
    flow.set('socSet', socSet);

    let socLimit = 0;
    const all0 = socLimitArr.every((x) => x === 0);
    const all1 = socLimitArr.every((x) => x === 1);
    const all2 = socLimitArr.every((x) => x === 2);
    if (all0) socLimit = 0;
    else if (all1) socLimit = 1;
    else if (all2) socLimit = 2;
    else socLimit = 0;
    values.properties.socLimit = socLimit;
    flow.set('socLimit', socLimit);
    for (let i = 0; i < N; i++) {
        flow.set(i === 0 ? 'socLimit_A' : i === 1 ? 'socLimit_B' : 'socLimit_C', socLimitArr[i]);
    }

    let elCalc = el.slice();
    const atDischargeLimit = socLimitArr.map((s) => s === 2);
    const xorAnyDischarge = atDischargeLimit.some(Boolean) && !atDischargeLimit.every(Boolean);
    if (xorAnyDischarge) {
        for (let i = 0; i < N; i++) {
            if (atDischargeLimit[i]) elCalc[i] = minSoc / 10;
        }
    }

    let electricLevel;
    const allNearEmpty =
        xorAnyDischarge && elCalc.every((v) => v <= minSoc / 10 + 1);
    if (allNearEmpty) {
        electricLevel = Math.ceil(elCalc.reduce((a, b) => a + b, 0) / N);
    } else {
        electricLevel = Math.floor(elCalc.reduce((a, b) => a + b, 0) / N);
    }
    values.properties.electricLevel = electricLevel;

    let deviceTransition_active = 0;
    if (
        currentTime - singleToDualModeTransition_start_timestamp < singleModeDeviceChangeTranstion_timer + 10 ||
        currentTime - dualMode_force_start_timestamp < singleModeDeviceChangeTranstion_timer + 10
    ) {
        deviceTransition_active = 1;
    }

    const standbyFlags = [singleMode_standby_device_A, singleMode_standby_device_B, singleMode_standby_device_C].slice(0, N);
    let smartMode;
    if (standbyFlags.some((x) => x === 1) || deviceTransition_active === 1) {
        smartMode = Math.max.apply(null, smartModeArr);
    } else {
        smartMode = smartModeArr.reduce((a, b) => a * b, 1);
    }
    values.properties.smartMode = smartMode;
    for (let i = 0; i < N; i++) {
        flow.set(i === 0 ? 'smartMode_A' : i === 1 ? 'smartMode_B' : 'smartMode_C', smartModeArr[i]);
    }

    let BatVolt = 0;
    let remainOutTime = 0;
    let gridReverseSum = 0;
    for (let i = 0; i < N; i++) {
        const p = values.original[i].properties;
        BatVolt += p.BatVolt;
        remainOutTime += p.remainOutTime;
        gridReverseSum += p.gridReverse;
    }
    values.properties.BatVolt = BatVolt / N;
    values.properties.remainOutTime = remainOutTime / N;
    values.properties.hyperTmp = Math.max.apply(null, hyperTmpArr);

    let chargeMaxLimit = 0;
    let inverseMaxPower = 0;
    let packNum = 0;
    for (let i = 0; i < N; i++) {
        const p = values.original[i].properties;
        chargeMaxLimit += p.chargeMaxLimit;
        inverseMaxPower += p.inverseMaxPower;
        packNum += p.packNum;
    }
    values.properties.chargeMaxLimit = chargeMaxLimit;
    values.properties.inverseMaxPower = inverseMaxPower;
    values.properties.packNum = packNum;
    for (let i = 0; i < N; i++) {
        flow.set(i === 0 ? 'chargeMaxLimit_A' : i === 1 ? 'chargeMaxLimit_B' : 'chargeMaxLimit_C', chargeMax[i]);
        flow.set(i === 0 ? 'inverseMaxPower_A' : i === 1 ? 'inverseMaxPower_B' : 'inverseMaxPower_C', inverseMax[i]);
    }

    values.properties.rssi = Math.min.apply(
        null,
        origs.map((o) => o.properties.rssi)
    );
    values.properties.is_error = Math.max.apply(
        null,
        origs.map((o) => o.properties.is_error)
    );

    const socStatus = Math.min.apply(null, socStatusArr);
    values.properties.socStatus = socStatus;
    for (let i = 0; i < N; i++) {
        flow.set(i === 0 ? 'socStatus_A' : i === 1 ? 'socStatus_B' : 'socStatus_C', socStatusArr[i]);
    }

    if (solarPowerInfo === 1 && N <= 2) {
        values.properties.solarPower1 = values.original[0].properties.solarPower1;
        values.properties.solarPower2 = values.original[0].properties.solarPower2;
        values.properties.solarPower3 = values.original[0].properties.solarPower3;
        values.properties.solarPower4 = values.original[0].properties.solarPower4;
        values.properties.solarPower7 = values.original[1].properties.solarPower1;
        values.properties.solarPower8 = values.original[1].properties.solarPower2;
        values.properties.solarPower9 = values.original[1].properties.solarPower3;
        values.properties.solarPower10 = values.original[1].properties.solarPower4;
    } else if (solarPowerInfo === 1 && N === 3) {
        values.properties.solarPower1 = values.original[0].properties.solarPower1;
        values.properties.solarPower2 = values.original[0].properties.solarPower2;
        values.properties.solarPower3 = values.original[0].properties.solarPower3;
        values.properties.solarPower4 = values.original[0].properties.solarPower4;
        values.properties.solarPower7 = values.original[1].properties.solarPower1;
        values.properties.solarPower8 = values.original[1].properties.solarPower2;
        values.properties.solarPower9 = values.original[1].properties.solarPower3;
        values.properties.solarPower10 = values.original[1].properties.solarPower4;
    }

    values.properties.gridReverse = gridReverseSum / N;

    const hasBat = origs.every((o) => 'batCalTime' in o.properties);
    if (hasBat) {
        const bts = origs.map((o) => o.properties.batCalTime);
        const same = bts.every((b) => b === bts[0]);
        values.properties.batCalTime = same ? bts[0] : -1;
        for (let i = 0; i < N; i++) {
            values.properties['batCalTime_' + (i + 1)] = bts[i];
        }
    }

    values.sn = '0000-PROXY-0000';
    for (let i = 0; i < N; i++) {
        values['product_' + (i + 1)] = values.original[i].product;
        values['sn_' + (i + 1)] = values.original[i].sn;
        values.properties['socStatus_' + (i + 1)] = socStatusArr[i];
        values.properties['socLimit_' + (i + 1)] = socLimitArr[i];
        values.properties['electricLevel_' + (i + 1)] = el[i];
        values.properties['hyperTmp_' + (i + 1)] = hyperTmpArr[i];
        values.properties['smartMode_' + (i + 1)] = smartModeArr[i];
        values.properties['outputPackPower_' + (i + 1)] = values.original[i].properties.outputPackPower;
        values.properties['packInputPower_' + (i + 1)] = values.original[i].properties.packInputPower;
        values.properties['gridInputPower_' + (i + 1)] = values.original[i].properties.gridInputPower;
        values.properties['outputHomePower_' + (i + 1)] = values.original[i].properties.outputHomePower;
    }

    values.properties.latestPowerCmd = latestPowerCmd;
    values.properties.latestPowerCmd_1 = latestPowerCmd_1;
    values.properties.latestPowerCmd_2 = latestPowerCmd_2;
    if (N >= 3) values.properties.latestPowerCmd_3 = latestPowerCmd_3;

    let acMode;
    if (singleMode === 1) {
        const idx = Math.min(singleMode_activedevice, N - 1);
        values.properties.acMode = values.original[idx].properties.acMode;
    } else {
        let s = 0;
        for (let i = 0; i < N; i++) s += values.original[i].properties.acMode;
        values.properties.acMode = Math.floor(s / N);
    }

    const charging_limit_powerzero =
        latestPowerCmd > 0 && socLimit === 1 && outputPackPower === 0;
    const discharging_limit_powerzero =
        latestPowerCmd < 0 && socLimit === 2 && packInputPower === 0;
    if (latestPowerCmd === 0 || charging_limit_powerzero || discharging_limit_powerzero) {
        values.properties.activeDevice = -1;
    } else if (singleMode === 1) {
        values.properties.activeDevice = Math.min(singleMode_activedevice, N - 1) + 1;
    } else {
        values.properties.activeDevice = 0;
    }

    values.properties.equalMode = equalMode === 1 ? 1 : 0;
    values.properties.alwaysDualMode = alwaysDualMode === 1 ? 1 : 0;
    values.properties.dualModeDamper = dualmode_damper_enable === 1 ? 1 : 0;

    delete values.original;
    return values;
}

return (async function() {
    const key = 'http_' + msg._msgid;
    flow.set(key, { req: msg.req, res: msg.res });
    function restoreHttp() {
        const h = flow.get(key);
        if (h) {
            msg.req = h.req;
            msg.res = h.res;
            flow.set(key, null);
        }
    }
    try {
        const dc = flow.get('deviceCount');
        const deviceCount = (dc === 1 || dc === 2 || dc === 3) ? dc : 2;
        const ips = [flow.get('ipZendure1'), flow.get('ipZendure2'), flow.get('ipZendure3')].slice(0, deviceCount);
        if (ips.some((ip) => !ip || ip === '0' || ip.indexOf('x.x') !== -1)) {
            msg.statusCode = 503;
            msg.payload = { error: 'Configure deviceCount and ipZendure* in Initialize node' };
            return msg;
        }
        const urls = ips.map((ip) => 'http://' + ip + '/properties/report');
        let origs;
        try {
            origs = await Promise.all(urls.map((u) => httpJson('GET', u)));
        } catch (e) {
            msg.statusCode = 504;
            msg.payload = { error: String(e.message || e) };
            return msg;
        }
        for (let i = 0; i < deviceCount; i++) {
            const sn = origs[i].sn;
            if (sn) flow.set(i === 0 ? 'snZendure1' : i === 1 ? 'snZendure2' : 'snZendure3', String(sn));
        }
        const expect = [flow.get('snZendure1'), flow.get('snZendure2'), flow.get('snZendure3')].slice(0, deviceCount);
        for (let i = 0; i < deviceCount; i++) {
            if (expect[i] && expect[i] !== '0' && String(origs[i].sn) !== String(expect[i])) {
                msg.statusCode = 502;
                msg.payload = { error: 'Serial mismatch device ' + (i + 1) };
                return msg;
            }
        }
        msg.payload = mergeReportN(origs, { flow });
        msg.statusCode = 200;
        return msg;
    } finally {
        restoreHttp();
    }
})();
