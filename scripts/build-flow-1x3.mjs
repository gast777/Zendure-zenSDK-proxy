#!/usr/bin/env node
/**
 * Builds Zendure-proxy-Node-Red-flow-1x3-async.json from lib/*.js sources.
 * Sources: nodered-async-get/post, nodered-init-1x3, nodered-set-devicecount.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function read(name) {
    return fs.readFileSync(path.join(root, name), 'utf8');
}

function jsonEscape(s) {
    return JSON.stringify(s);
}

const mergeReportN = read('lib/mergeReportN.js').replace(/\nmodule\.exports[\s\S]*$/, '\n');

const asyncGet = read('lib/nodered-async-get.js');
const asyncPost = read('lib/nodered-async-post.js');
const initFn = read('lib/nodered-init-1x3.js');
const setDeviceCountFn = read('lib/nodered-set-devicecount.js');

const tabId = 'z1x3tab001';
const flow = [
    { id: tabId, type: 'tab', label: 'Zendure proxy 1x3 (async)', disabled: false, info: '' },
    {
        id: 'z1x3httpget',
        type: 'http in',
        z: tabId,
        name: 'GET /properties/report',
        url: '/properties/report',
        method: 'get',
        upload: false,
        x: 120,
        y: 220,
        wires: [['z1x3fnget']]
    },
    {
        id: 'z1x3fnget',
        type: 'function',
        z: tabId,
        name: 'Async GET 1x3',
        func: asyncGet,
        outputs: 1,
        noerr: 0,
        libs: [],
        x: 360,
        y: 220,
        wires: [['z1x3respget']]
    },
    {
        id: 'z1x3respget',
        type: 'http response',
        z: tabId,
        name: 'GET response',
        statusCode: '',
        headers: {},
        x: 580,
        y: 220,
        wires: []
    },
    {
        id: 'z1x3httppost',
        type: 'http in',
        z: tabId,
        name: 'POST /properties/write',
        url: '/properties/write',
        method: 'post',
        upload: false,
        x: 120,
        y: 300,
        wires: [['z1x3fnpost']]
    },
    {
        id: 'z1x3fnpost',
        type: 'function',
        z: tabId,
        name: 'Async POST 1x3',
        func: asyncPost,
        outputs: 1,
        noerr: 0,
        libs: [],
        x: 360,
        y: 300,
        wires: [['z1x3resppost']]
    },
    {
        id: 'z1x3resppost',
        type: 'http response',
        z: tabId,
        name: 'POST response',
        statusCode: '',
        headers: {},
        x: 580,
        y: 300,
        wires: []
    },
    {
        id: 'z1x3inj',
        type: 'inject',
        z: tabId,
        name: 'Initialize',
        repeat: '',
        crontab: '',
        once: true,
        onceDelay: 0.1,
        topic: '',
        payload: '',
        payloadType: 'date',
        x: 120,
        y: 40,
        wires: [['z1x3init']]
    },
    {
        id: 'z1x3init',
        type: 'function',
        z: tabId,
        name: 'Config IPs + tunables (geen deviceCount overschrijven)',
        func: initFn,
        outputs: 1,
        noerr: 0,
        libs: [],
        x: 360,
        y: 40,
        wires: []
    },
    {
        id: 'z1x3injN1',
        type: 'inject',
        z: tabId,
        name: 'deviceCount = 1',
        repeat: '',
        crontab: '',
        once: false,
        topic: '',
        payload: 1,
        payloadType: 'num',
        x: 120,
        y: 100,
        wires: [['z1x3setdc']]
    },
    {
        id: 'z1x3injN2',
        type: 'inject',
        z: tabId,
        name: 'deviceCount = 2',
        repeat: '',
        crontab: '',
        once: false,
        topic: '',
        payload: 2,
        payloadType: 'num',
        x: 120,
        y: 130,
        wires: [['z1x3setdc']]
    },
    {
        id: 'z1x3injN3',
        type: 'inject',
        z: tabId,
        name: 'deviceCount = 3',
        repeat: '',
        crontab: '',
        once: false,
        topic: '',
        payload: 3,
        payloadType: 'num',
        x: 120,
        y: 160,
        wires: [['z1x3setdc']]
    },
    {
        id: 'z1x3setdc',
        type: 'function',
        z: tabId,
        name: 'Set deviceCount (1–3)',
        func: setDeviceCountFn,
        outputs: 1,
        noerr: 0,
        libs: [],
        x: 360,
        y: 130,
        wires: []
    },
    {
        id: 'z1x3cmt',
        type: 'comment',
        z: tabId,
        name: 'Zendure zenSDK proxy 1–3 devices',
        info: 'Kies aantal Zendures met de drie inject-knoppen (deviceCount = 1/2/3). Zet IP-adressen in "Config IPs + tunables". Eerste deploy: Initialize zet default deviceCount=2 alleen als nog niet gezet. Zie README-1x3.md.',
        x: 320,
        y: 400,
        wires: []
    }
];

const outPath = path.join(root, 'Zendure-proxy-Node-Red-flow-1x3-async.json');
fs.writeFileSync(outPath, JSON.stringify(flow, null, 4), 'utf8');
console.log('Wrote', outPath);
