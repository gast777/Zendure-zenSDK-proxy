# Zendure-zenSDK-proxy

versie 20260106


## Instructies ##

De Gielz automatisering voor Zendure ( https://github.com/Gielz1986/Zendure-HA-zenSDK ) werkt heel goed om een Zendure thuisbatterij die de ZenSDK API ondersteunt, lokaal aan te sturen, waarbij geen cloud communicatie nodig is. Een beperking van de Gielz automatisering is echter dat die slechts 1 Zendure device (omvormer) ondersteunt.

Deze Node-Red flow vormt een proxy server die het mogelijk maakt de Gielz automatisering te gebruiken met twee Zendure devices, zoals 2x Solarflow 2400AC.

<br/>

![Preview](images/proxy-HA-Zendure-diagram.png)   

<br/>
<br/>


Het werkt als volgt: De HA (Gielz) zal met de proxy praten, in plaats van met een Zendure. De proxy praat met de twee Zendure devices. Vanuit HA (Gielz) gezien lijkt het nog steeds alsof er maar 1 Zendure device is, maar dan wel eentje die twee keer zo veel vermogen aan kan. De proxy verdeelt het vermogen dat HA (Gielz) aanstuurt over de twee Zendures.

Het vermogen wordt op intelligente wijze verdeeld over de Zendures. Als er een verschil is in SoC (State of Charge, batterij % Laadpercentage) van de twee Zendures, zal degene met het laagste SoC sneller laden of de volste juist sneller ontladen. Zo blijft de de SoC van de beide Zendures dicht bij elkaar. Tevens zal bij lagere vermogens slechts 1 van de twee Zendures tegelijk gaan laden/ontladen, om redenen van efficiency.

Na importeren van deze Node-Red flow in je Node-Red server, kun je de IP adressen en de serienummers van je twee Zendure devices invullen. Hieronder staat aangegeven waar je dat kunt doen.

Vervolgens moet je ook een paar kleine aanpassingen doen in de Gielz automatisering in HomeAssistant, zoals in onderstaande instructies te zien is. Daarna kan hij aan het werk :)<br/>
<br/>

### Node-Red ###
<br/>

- [ ] Vul in het blok "Vul hier de Zendure IP adressen en serienummers in" de IP adressen en de serienummers van de Zendure devices in.<br/>
<br/>

![Preview](images/node-red-flow-image.png) 

<br/>

### HomeAssistant ###
<br/>

- [ ] Op een HA Dashboard heb je als het goed is reeds het invulveld "Zendure 2400 AC IP-adres" beschikbaar, als onderdeel van de Gielz instructies. Zo niet, voeg die alsnog toe. Vul het IP adres en poort van de Node-Red proxy in voor "Zendure 2400 AC IP-adres" (input_text.zendure_2400_ac_ip_adres). Bijvoorbeeld: 192.168.x.x:1880

![Preview](images/HA-gielz-ip-port.png) 

Als in de blokken "API Proxy In" staat "The url will be relative to /endpoint", dan vul hier in IP_adres:poort/endpoint 

![Preview](images/HA-gielz-ip-port-endpoint.png) 

Als Node-Red op de HomeAssistant server zelf is geinstalleerd als Add-On, vul in "localhost:1880/endpoint".

![Preview](images/HA-gielz-ip-port-AddOn.png) 


<br/>

- [ ] In automations.yaml, zoek en vervang alle
```
cap = 2400
```
door
```
cap = 4800
```

Hiermee wordt het maximale vermogen verhoogd naar het maximale wat de 2x SolarFlow 2400AC's (oftewel een virtuele SolarFlow 4800AC) aankunnen.

<br/>


- [ ] In configuration.yaml, onder alle rest_command items, voeg deze HTTP regels toe:

_NB: vanaf de Februari 2026 versie van de Gielz ZenSDK is deze stap niet meer nodig._

```
    headers:
      Content-Type: application/json
      Content-Encoding: identity
```

Voorbeeld:
```
  zendure_stop_met_ontladen:
    url: http://{{ states('input_text.zendure_2400_ac_ip_adres') }}/properties/write
    method: POST
    headers:
      Content-Type: application/json
      Content-Encoding: identity
    payload: '{"sn":"{{sn}}","properties":{"acMode": 2, "outputLimit": 0 }}'
```

NB: Let op de juiste inspringing van de tekst. 

Hiermee wordt de json content niet gecomprimeerd door HA en kan de Node-Red HTTP-in node het lezen. Zonder deze aanpassing zullen de POST opdrachten niet werken.<br/>
<br/>

- [ ] In configuration.yaml, verander hier de "min: -2400" en "max: 2400" naar "min: -4800" en "max: 4800":

_NB: vanaf de Februari 2026 versie van de Gielz ZenSDK is deze stap niet meer nodig._

```
input_number:
  zendure_2400_ac_handmatig_vermogen:
    name: Zendure 2400 AC Handmatig Vermogen
    min: -2400     <<<< verander naar -4800
    max: 2400      <<<< verander naar 4800
    step: 1
    mode: box
    unit_of_measurement: "W"
```
Daarmee kun je handmatig laden/leveren tot 4800W in plaats van 2400W.<br/>
<br/>


- [ ] Optioneel: Als je het vermogen wilt aanpassen van de drop-down opties "Opladen met 2400 Watt" en "Ontladen met 2400 Watt", dan kun je het vermogen hieronder aanpassen in configuration.yaml. Verander de inputLimit/outputLimit van 2400 naar de gewenste waarde, bijvoorbeeld 4800 of 4500.

NB: Bij 4500 Watt is er nog wat bewegingsruimte over om de SoC percentages van de beide Zendures te balanceren, indien gewenst.

```
  zendure_snel_laden:
    url: http://{{ states('input_text.zendure_2400_ac_ip_adres') }}/properties/write
    method: POST
    headers:
      Content-Type: application/json
      Content-Encoding: identity
    payload: '{"sn":"{{sn}}","properties":{"acMode": 1, "inputLimit": 2400 }}'  <<<<<<< hier
```

```
  zendure_snel_ontladen:
    url: http://{{ states('input_text.zendure_2400_ac_ip_adres') }}/properties/write
    method: POST
    headers:
      Content-Type: application/json
      Content-Encoding: identity
    payload: '{"sn":"{{sn}}","properties":{"acMode": 2, "outputLimit": 2400 }}'  <<<<<<< hier
```

Tevens zou je de namen van de opties "Opladen met 2400 Watt" en "Ontladen met 2400 Watt" kunnen veranderen in zowel configuration.yaml als automations.yaml.

<br/>

## Node-Red als HomeAssistant Add-on ##

Indien Node-Red op de HomeAssistant server zelf is geinstalleerd als Add-on, volg deze stappen om de flow direct te laten werken:<br/>

1) HomeAssistant Add-On Configuratie van Node-Red:
- Zet "ssl" uit
- Zet "Show unused optional configuration options" aan
- Zet "leave_front_door_open" aan
- Save de configuratie
- Herstart Node-Red<br/>

2) Op het HA Dashboard, configureer als "Zendure 2400 AC IP-adres": <br />
localhost:1880/endpoint<br/>
<br/>

## Features ##
- SoC balancering - De SoC (state of charge) van de twee devices wordt dicht bij elkaar gehouden doordat de volste batterij het snelst ontlaadt en de leegste batterij het snelst oplaadt. Bij gelijke SoC laden ze beide even snel.
- Herhaling van instructies om te laden/ontladen, zodat SoC balancing tussen de Zendures ook werkt voor Handmatige mode.
- Single Mode - Bij lagere vermogens laadt/ontlaadt slechts een van de Zendures tegelijk. Dit wordt afgewisseld aan de hand van de SoC van de beide devices, waardoor de SoC waardes gebalanceerd blijven.
- In Single Mode overschakelen naar ander device laden/ontladen bij meer dan 1% punt verschil in SoC (standaard bij 2% verschil). Hierdoor wordt minder vaak overgeschakeld.
<br/>

## Vereisten ## 
- 2x Zendure SolarFlow 2400 AC (2x Zendure SolarFlow 800 Pro zal ook werken als je "let maxPower = 2400" verandert naar "let maxPower = 800" in het blok "Vul hier de Zendure IP adressen en serienummers in").
- Zorg dat op beide Zendures hetzelfde maximale en minimale laadpercentage (SoC percentages) ingesteld staan.
- Beide Zendures moeten hetzelfde aantal batterijen hebben.
- De beide Zendures en de Node-Red server moeten een vast IP adres hebben.
- Beide Zendures moeten beschikbaar zijn en werken.
<br/>

## Beperkingen ##
- Bij een instructie van 0 Watt laden levert een Zendure device soms rond de 20 Watt. Dit is momenteel Zendure gedrag en geen probleem.
- In Single Mode overschakelen naar ander device bij meer dan 1% punt verschil in SoC wordt aleen toegepast als geen van de devices een SoC limiet heeft bereikt.
- Met Node-Red 4.0.9 zijn er door een gebruiker problemen gerapporteerd, die met versie 4.1.2 niet meer optraden (thanks [Freemann](https://tweakers.net/gallery/45846/)). Node-Red versie 4.1.1 is ook getest en werkt prima.
<br/>

## Monitoring ##

Om real-time te kunnen monitoren met welk vermogen de proxy opdracht wordt geven te laden/ontladen en hoe dat vervolgens over de beide Zendure devices verdeeld wordt, worden er wat extra gegevens toegevoegd aan de bestaande [REST API van Zendure](https://github.com/Zendure/zenSDK/blob/main/docs/en_properties.md). Ook worden de SoC percentages van beide Zendure devices meegestuurd. 

De Node-Red proxy voegt deze nieuwe attributen toe aan de bestaande reply messages op de GET requests, die elke seconde gedaan worden door de Gielz REST configuratie. Om deze gevens op je HomeAssistant Dashboard te kunnen zetten, volg onderstaand voorbeeld.

De toegevoegde attributen zijn:

*payload.properties.electricLevel_1* - Laadpercentage van de Zendure 1<br/>
*payload.properties.electricLevel_2* - Laadpercentage van de Zendure 2<br/>
*payload.properties.latestPowerCmd* - Het vermogen van de meest recente opdracht aan de proxy om te laden of ontladen<br/>
*payload.properties.latestPowerCmd_1* - Het vermogen van de meest recente opdracht aan de Zendure 1 om te laden of ontladen<br/>
*payload.properties.latestPowerCmd_2* - Het vermogen van de meest recente opdracht aan de Zendure 2 om te laden of ontladen<br/>
<br/>
Om deze in Homeassistant te monitoren, kan het volgende toegevoegd worden aan configuration.yaml. Daarna kunnen deze toegevoegd worden aan een dashboard.

Onder deze bestaande rest configuratie van Gielz:
```
rest:
  - resource_template: "http://{{ states('input_text.zendure_2400_ac_ip_adres') }}/properties/report"
    scan_interval: 1
    sensor:
```
Voeg het volgende toe:
```
## Hieronder niet verwijderen bij upgrade van Gielz

      - name: "Zendure 1 Laadpercentage"
        value_template: "{{ value_json['properties']['electricLevel_1'] }}"
        device_class: battery
        unit_of_measurement: "%"
        state_class: measurement
        unique_id: Zendure_1_Laadpercentage

      - name: "Zendure 2 Laadpercentage"
        value_template: "{{ value_json['properties']['electricLevel_2'] }}"
        device_class: battery
        unit_of_measurement: "%"
        state_class: measurement
        unique_id: Zendure_2_Laadpercentage

      - name: "Latest power command"
        value_template: "{{ value_json['properties']['latestPowerCmd'] | int }}"
        unique_id: latest_power_command
        unit_of_measurement: "W"
        state_class: measurement
        device_class: power

      - name: "Latest power command Zendure 1"
        value_template: "{{ value_json['properties']['latestPowerCmd_1'] | int }}"
        unique_id: latest_power_command_1
        unit_of_measurement: "W"
        state_class: measurement
        device_class: power

      - name: "Latest power command Zendure 2"
        value_template: "{{ value_json['properties']['latestPowerCmd_2'] | int }}"
        unique_id: latest_power_command_2
        unit_of_measurement: "W"
        state_class: measurement
        device_class: power
```

Deze entiteiten kunnen vervolgens aan het dashboard worden toegevoegd en gemonitord zoals in het volgende voorbeeld.

![Preview](images/batterijbediening.gif) 



<br/>
<br/>Tip: Om andere gegevens van de individuele Zendure devices uit te lezen, die minder real-time hoeven te zijn, kun je een minder frequente REST polling toevoegen, rechtstreeks naar de Zendure devices IP adressen.<br/>
<br/>
Voorbeeld:
<br/>

```
rest:
<..snip..>

  - resource: http://192.168.x.x/properties/report
    scan_interval: 60
    sensor:

      - name: "Zendure 1 Omvormer Serienummer"
        unique_id: Zendure_1_Omvormer_Serienummer
        value_template: "{{ value_json.sn }}"

      - name: "Zendure 1 Omvormer Temperatuur"
        value_template: >
          {% set maxTemp = value_json['properties']['hyperTmp'] | int %}
          {{ (maxTemp - 2731) / 10.0 }}
        unique_id: Zendure_1_Omvormer_Temperatuur
        unit_of_measurement: "°C"
        state_class: measurement
        device_class: temperature
        icon: mdi:thermometer


  - resource: http://192.168.x.y/properties/report
    scan_interval: 60
    sensor:

      - name: "Zendure 2 Omvormer Serienummer"
        unique_id: Zendure_2_Omvormer_Serienummer
        value_template: "{{ value_json.sn }}"

      - name: "Zendure 2 Omvormer Temperatuur"
        value_template: >
          {% set maxTemp = value_json['properties']['hyperTmp'] | int %}
          {{ (maxTemp - 2731) / 10.0 }}
        unique_id: Zendure_2_Omvormer_Temperatuur
        unit_of_measurement: "°C"
        state_class: measurement
        device_class: temperature
        icon: mdi:thermometer

        
```
<br/>
Tip: om te zien welke attributen er beschikbaar zijn om te monitoren, kun je in Node-Red de debug node (groen blokje) aanzetten die verbonden is met het blok "GET Response handling". Vervolgens verschijnen de messages rechts in het debug venster (de tab met het kevertje). Deze messages kun je uitvouwen om te zien welke informatie erin meegestuurd wordt.
<br/>
<br/>

## Nieuw in versie 20260106 ##

- Optimalisaties voor laden en ontladen rondom de minSoc en tegen de 100% Soc.
- De singleMode_upperlimit_percent default is verhoogd van 80% naar 90% (van 2400 Watt). Boven deze waarde gaat hij dual mode gebruiken, dus beide Zendures tegelijk laden/ontladen. De singleMode_lowerlimit_percent, waaronder single mode altijd gebruikt wordt is 40% gebleven.
- De messageRepeat interval voor de POST opdrachten is verlaagd van 60 naar 30 seconden. In handmatige modus zal de opdracht daardoor elke 30 seconden herhaald worden, zodat het vermogen opnieuw verdeeld kan worden op basis van de SoC van beide devices op dat moment. Het herhalen wordt gestopt indien er 30 seconden geen GET messages vanuit HomeAssistant zijn ontvangen, die normaliter elke 1 seconde aankomen. Dit voorkomt het blijven herhalen van de POST opdrachten wanneer de Node-Red proxy niet meer gebruikt wordt door HomeAssistant.


