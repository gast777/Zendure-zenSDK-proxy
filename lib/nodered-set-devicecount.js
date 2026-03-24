// Zet flow.deviceCount op 1, 2 of 3. Payload komt van de Inject-knop (getal).
const n = Number(msg.payload);
if (n === 1 || n === 2 || n === 3) {
    flow.set('deviceCount', n);
    node.status({ fill: 'green', shape: 'dot', text: 'N=' + n });
} else {
    node.status({ fill: 'red', shape: 'ring', text: 'payload must be 1,2,3' });
}
return null;
