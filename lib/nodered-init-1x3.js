
// === Zendure proxy: IP’s en tunables (Gielz / zenSDK) ===
// deviceCount wordt NIET hier overschreven als die al gezet is (via knoppen "deviceCount = 1|2|3").
// Eerste keer (flow leeg): default deviceCount = 2.
// Na wijzigingen: Deploy of trigger "Initialize".

const defaultDeviceCount = 2; // alleen als flow.get('deviceCount') nog niet bestaat

if (flow.get('deviceCount') === undefined) {
    flow.set('deviceCount', defaultDeviceCount);
}

let ipZendure1 = '192.168.x.x';
let ipZendure2 = '192.168.x.y';
let ipZendure3 = '192.168.x.z'; // alleen gebruikt als deviceCount === 3

let solarPowerInfo = 0;
let singleMode_upperlimit_percent = 100;
let singleMode_lowerlimit_percent = 40;
let singleMode_change_device_diff = 5;
let singleMode_delayed_standby_timer = 300;
let dualmode_damper_enable = 0;
let dualmode_damper_timer = 60;
let dualmode_damper_amount = 150;

let manualMode_messageRepeat = 1;
let singleModeDeviceChangeTranstion_timer = 40;
let balancingFactor = 1.15;
let singleMode_enable = 1;
let singleMode_delayed_standby_charging_enable = 1;
let singleMode_delayed_standby_discharging_enable = 1;

let proxyVersion = '20260323-1x3-async';

let balancingFactor_reduced = ((balancingFactor - 1) / 2) + 1;

flow.set('ipZendure1', ipZendure1);
flow.set('ipZendure2', ipZendure2);
flow.set('ipZendure3', ipZendure3);
flow.set('singleMode_enable', singleMode_enable);
flow.set('balancingFactor', balancingFactor);
flow.set('balancingFactor_reduced', balancingFactor_reduced);
flow.set('manualMode_messageRepeat', manualMode_messageRepeat);
flow.set('singleMode_change_device_diff', singleMode_change_device_diff);
flow.set('singleMode_delayed_standby_charging_enable', singleMode_delayed_standby_charging_enable);
flow.set('singleMode_delayed_standby_discharging_enable', singleMode_delayed_standby_discharging_enable);
flow.set('singleMode_delayed_standby_timer', singleMode_delayed_standby_timer);
flow.set('singleModeDeviceChangeTranstion_timer', singleModeDeviceChangeTranstion_timer);
flow.set('singleMode_upperlimit_percent', singleMode_upperlimit_percent);
flow.set('singleMode_lowerlimit_percent', singleMode_lowerlimit_percent);
flow.set('solarPowerInfo', solarPowerInfo);
flow.set('proxyVersion', proxyVersion);
flow.set('dualmode_damper_enable', dualmode_damper_enable);
flow.set('dualmode_damper_timer', dualmode_damper_timer);
flow.set('dualmode_damper_amount', dualmode_damper_amount);

flow.set('snZendure1', '0');
flow.set('snZendure2', '0');
flow.set('snZendure3', '0');

return msg;
