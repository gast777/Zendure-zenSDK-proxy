/**
 * Minimal HTTP JSON helper for Node-RED function nodes (CommonJS).
 * @param {'GET'|'POST'} method
 * @param {string} urlString
 * @param {object} [body] POST JSON body
 */
function httpJson(method, urlString, body) {
    const http = require('http');
    const https = require('https');
    const u = new URL(urlString);
    const lib = u.protocol === 'https:' ? https : http;
    const port = u.port || (u.protocol === 'https:' ? 443 : 80);
    const path = u.pathname + u.search;
    const opts = {
        hostname: u.hostname,
        port,
        path,
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: 15000
    };
    return new Promise((resolve, reject) => {
        const req = lib.request(opts, (res) => {
            let raw = '';
            res.on('data', (c) => { raw += c; });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new Error('HTTP ' + res.statusCode + ' ' + raw.slice(0, 200)));
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
        req.on('timeout', () => { req.destroy(new Error('timeout')); });
        if (body && method === 'POST') {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

module.exports = { httpJson };
