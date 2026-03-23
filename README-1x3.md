# Zendure zenSDK proxy – 1, 2 of 3 omvormers (async fork)

Deze map bevat een **uitbreiding** op de oorspronkelijke [gast777/Zendure-zenSDK-proxy](https://github.com/gast777/Zendure-zenSDK-proxy) flow: je kunt **`deviceCount`** instellen op **1**, **2** of **3** en daarmee dezelfde Gielz Home Assistant-integratie ([Zendure-HA-zenSDK](https://github.com/Gielz1986/Zendure-HA-zenSDK)) gebruiken met één virtueel apparaat richting Home Assistant.

## Bestanden

| Bestand | Betekenis |
|--------|-----------|
| `Zendure-proxy-Node-Red-flow.json` | Originele gast777 flow (2× Zendure, bewezen gedrag). |
| `Zendure-proxy-Node-Red-flow-1x3-async.json` | **Nieuwe** flow: async GET/POST, **1–3** devices via `deviceCount`. |
| `lib/mergeReportN.js` | Bron voor samenvoegen van `/properties/report` (N devices). |
| `lib/nodered-async-get.js` / `nodered-async-post.js` | Geëmbed in de JSON; opnieuw bouwen met `scripts/build-flow-1x3.mjs`. |
| `lib/nodered-init-1x3.js` | Initialize: IP’s en tunables; `deviceCount` alleen default **2** als die nog niet in de flow-context staat. |
| `lib/nodered-set-devicecount.js` | Knooppunt **Set deviceCount (1–3)**; gekoppeld aan drie inject-knoppen. |

## Aantal Zendures kiezen (in Node-RED)

Na import zie je **drie inject-knoppen**: `deviceCount = 1`, `= 2`, `= 3`. Die zetten `flow.deviceCount` zonder de Initialize-code te bewerken. Het knooppunt **Set deviceCount (1–3)** toont onder de node een groene status `N=1`, `N=2` of `N=3`.

**Aanbevolen volgorde**

1. **Deploy** na import.
2. (Optioneel) Klik eerst het gewenste aantal (**1**, **2** of **3**). Sla je dit over, dan zet **Initialize** (eenmalig bij start) `deviceCount` op **2** als de flow-context nog leeg is.
3. Open **Config IPs + tunables** (Initialize-function) en vul **`ipZendure1`**, **`ipZendure2`**, en bij drie units ook **`ipZendure3`** in. Bij `deviceCount` 1 of 2 worden alleen de eerste IP’s gebruikt; `ipZendure3` wordt genegeerd tot je **3** kiest.
4. Trigger **Initialize** opnieuw (knop links) na IP-wijzigingen, dan **Deploy**.

## Node-RED import

1. Importeer **`Zendure-proxy-Node-Red-flow-1x3-async.json`** (Menu → Import).
2. Stel het aantal Zendures in met de inject-knoppen **deviceCount = 1 / 2 / 3** (zie hierboven).
3. Open het knooppunt **Config IPs + tunables** en stel **`ipZendure1` … `ipZendure3`** in (alleen zoveel als nodig voor jouw `deviceCount`).
4. Deploy.
5. In Home Assistant (Gielz package, maart 2026+): `input_text.zendure_2400_ac_ip_adres` = `host:1880` of `host:1880/endpoint` naar deze Node-RED instance.
6. **Max vermogen** op het dashboard:
   - 1× 2400 W → 2400
   - 2× 2400 W → 4800
   - 3× 2400 W → **7200**

## Gedrag en beperkingen

- **GET** (`/properties/report`): samengevoegde status volgt dezelfde ideeën als gast777 (sommen, max/min, gemiddelde SoC, per-device velden `electricLevel_1…3`, `latestPowerCmd_1…3`, enz.).
- **POST** (`/properties/write`): voor **2 of 3** devices gebruikt deze async flow een **vereenvoudigde** vermogensverdeling ( proportioneel o.b.v. beschikbare SoC-ruimte, single-device modus onder de lagere drempel). Dit is **niet byte-voor-byte identiek** aan de originele gast777 state machine (transities, dual-mode demper, handmatige repeat, standby-timers).
- Voor **maximale gelijkenis** met upstream op **exact 2** Zendures: gebruik **`Zendure-proxy-Node-Red-flow.json`** (origineel).
- Features die in de originele flow zitten (periodieke POST-repeat, standby smartMode, “Check stuff”, timeout-trigger): zitten **niet** in de async 1×3-tab; voeg die desgewenst handmatig toe of combineer tabs.

## Home Assistant: derde proxy-sensoren (optioneel)

Als je `deviceCount === 3` gebruikt, kun je naast de bestaande [gast777 monitoring](https://github.com/gast777/Zendure-zenSDK-proxy) REST-sensoren een derde reeks toevoegen, analoog aan `electricLevel_3`, `latestPowerCmd_3`, `hyperTmp_3`, `sn_3` (zelfde `value_json`-patroon als voor 1 en 2).

## Versie

`proxyVersion` in de Initialize-node staat op `20260323-1x3-async` (pas aan indien je fork bijwerkt).
