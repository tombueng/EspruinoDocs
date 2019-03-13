<!--- Copyright (c) 2019 Thomas Büngener. See the file LICENSE for copying permission. -->
WifiManager
===========================

based on https://github.com/tzapu/WiFiManager/
based on https://gist.github.com/MaBecker/ae9dade26b44524e076ca19f5fd72fab

* KEYWORDS: Module,WifiManager,ESP8266,Captive Portal,Setup

JavaScript module that does basic Wifi setup proceudre unsign captive portal mode.
Will turn on Access Point mode when no wifi is saved or cannot be connect.
Captive portal will catch all request by providing DNS server that answers all request with the own IP adress.

## How to use

Using the Espruino Web IDE you can just require the module directly:

```
var wifimanager = require("WifiManager");
```

### Without config options

```
require("WifiManager").start();
```
### With config options

```
require("WifiManager").start({
  minimumQuality: -1, //minimum wifi quality, -1: No minimum
  wifiScanInterval: 30000, //Scan for access point every wifiScanInterval ms, default: 30000
  apName: 'ESP8266', //Access Point name
  title: 'ESP8266', //html page title
  params: {}, //custom setup parameters
  paramscallback: function(params){...},
  connectedcallback: function(){...},
  log: : function(e){console.log(e);},
  restart: function(){require('ESP8266').reboot()}
});

require("WifiManager").start({
  wifiScanInterval:5000,
  paramscallback:function(p){console.log(p);},
  params:[
    {id:'a',value:'dummy',placeholder:'enter value'},
    {id:'b',value:'dummy2',placeholder:'enter value2'},
  ]
});
```

## Callbacks

### paramscallback(params)

called with parsed params when wifi is connected.

### connectedcallback()

called when wifi is connected.

### log(e)

logging callback, defaults to console.log(e);

### restart(err)

called when unrecoverable error occurs like http or dns server fails to start.
defaults to "require('ESP8266').reboot()".

## Custom setup parameters

```
{
  id: 'ms', //if id is present, fill template, use customHTML solely otherwise
  placeholder: 'MQTT Server',
  valueLength: '50',
  value: 'mqqt.example.org',
  customHTML: 'style="..."'
}
```
will fill and use the following provided template:

```
<input id='{id}' name='{id}' maxlength={valueLength} placeholder='{placeholder}' value='{value}' {customHTML}><br/>
```

Or use customHTML and name only and create own display. Form data will be written to params[param.name]
```
{
  name: 'ms', //html form field name
  customHTML: "<input name='ms' value='Mqtt Server'><br/>"
}
```


## Credits go to

WifiManger C implementation https://github.com/tzapu/WiFiManager/
And @MaBecker for his https://gist.github.com/MaBecker/ae9dade26b44524e076ca19f5fd72fab
