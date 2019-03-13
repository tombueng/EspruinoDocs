/* Copyright (c) 2019 thomas@buengener.de. See the file LICENSE for copying permission. */
/*
Esp 8266 WifiManager
based on https://github.com/tzapu/WiFiManager/
and https://gist.github.com/MaBecker/ae9dade26b44524e076ca19f5fd72fab
*/



/** 'private' constants */
var C = {
  DNSIPSTR : "192.168.4.1",
  APNAME : "ESP8266",
};


/** WifiManager constructor */
function WifiManager(options) {
  options = options || {};
  this.options=options;
  this.minimumQuality = options.minimumQuality || -1;
  this.wifiScanInterval = options.wifiScanInterval || 30000;
  this.apName = options.apName || C.APNAME;
  this.title = options.title || C.APNAME;
  this.wifiitems = "";
  this.params = [];
  this.paramscallback = options.paramscallback;
  this.connectedcallback = options.connectedcallback;
  this.log = options.log || console.log;
  this.restart = options.restart || function(){require('ESP8266').reboot()};
}

WifiManager.prototype.start = function() {
  var wifi=require('Wifi');
  if (wifi.getStatus().station=='connecting') {
    setTimeout(this.start,500);
    return false;
  }
  this.log(wifi.getStatus());
  this.log(wifi.getIP());
  if( wifi.getIP().ip === "0.0.0.0" ) {
    this.log('No wifi connection. Starting setup. Connect to ap '+this.apName+' for setup.');
    //create captive portal for setup wifi credentials
    wifi.setConfig({powersave : "none"});
    wifi.startAP(this.apName,{"authMode":'open',"password" : null},function(err) {
      if (err) {
        this.log(err);
        this.restart(err);
      }
      this.log("AP started");
      startSetupHttpServer();
      startDNSServer();
      setTimeout(wifiScan,2000);
    });
  } else {
    this.log('wifi connected. IP: '+wifi.getIP().ip);
    wifi.stopAP();
    return true;
  }
};

WifiManager.prototype.params = function() {
  return this.params;
}

var HTTP_HEAD = `
<!DOCTYPE html>
<html lang='en'>

  <head>
    <meta charset='UTF-8' name='viewport' content='width=device-width, initial-scale=1, user-scalable=no' />
    <title>{v}</title>
    <style>
      .c {
        text-align: center;
      }
      div, input {
        padding: 5px;
        font-size: 1em;
      }

      input {
        width: 95%;
      }

      body {
        text-align: center;
        font-family: verdana;
      }

      button {
        border: 0;
        border-radius: 0.3rem;
        background-color: #1fa3ec;
        color: #fff;
        line-height: 2.4rem;
        font-size: 1.2rem;
        width: 100%;
      }

      .q {
        float: right;
        width: 64px;
        text-align: right;
      }

      .l {
        background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAALVBMVEX///8EBwfBwsLw8PAzNjaCg4NTVVUjJiZDRUUUFxdiZGSho6OSk5Pg4eFydHTCjaf3AAAAZElEQVQ4je2NSw7AIAhEBamKn97/uMXEGBvozkWb9C2Zx4xzWykBhFAeYp9gkLyZE0zIMno9n4g19hmdY39scwqVkOXaxph0ZCXQcqxSpgQpONa59wkRDOL93eAXvimwlbPbwwVAegLS1HGfZAAAAABJRU5ErkJggg==') no-repeat left center;
        background-size: 1em;
      }

    </style>
    <script>
      function c(l) {
        document.getElementById('s').value = l.innerText || l.textContent;
        document.getElementById('p').focus();
      }

    </script>
  </head>

  <body>
    <div style='text-align:left;display:inline-block;min-width:260px;'>
`;
var HTTP_ITEM = `
  <div>
    <a href='#p' onclick='c(this)'>{v}</a>&nbsp;
    <span class='q {i}'>{r}%</span>
  </div>`;
var HTTP_FORM_START = `
    <form method='get' action='/s'>
      <input id='s' name='s' length=32 placeholder='SSID'><br/>
      <input id='p' name='p' length=64 type='password' placeholder='password'><br/>
      <input id='n' name='n' length=32 placeholder='Device name' value='{n}'><br/>
      <br/>
`;
var HTTP_FORM_PARAM = `
    <input id='{i}' name='{n}' maxlength={l} placeholder='{p}' value='{v}' {c}>
    <br/>
`;
var HTTP_FORM_END = `
    <br/>
    <button type='submit'>Save and connect</button>
    </form>`;
var HTTP_SCAN_LINK = `
    <br/>
    <div class='c'>
      <a href='/'>Scan for networks</a>
    </div>
`;
var HTTP_SAVED = `
    <div>
      Credentials Saved!<br/>
      Trying to connect ESP to network...<br/>
      If it fails reconnect to AP to try again.
    </div>
`;
var HTTP_END = `
  </div></body></html>`;


function onPageRequest(req, res) { 
  var a = url.parse(req.url, true);
  if (a.pathname === '/' || a.pathname === '') handleRoot(req,res,a);
  else if (a.pathname === '/s') handleWifiSave(req,res,a);
  else if (a.pathname === '/i') handleInfo(req,res,a);
  else if (a.pathname === '/r') handleReset(req,res,a);
  //else if (a.pathname == '/generate_204') handle204(req,res,a);
  else handle404(req,res,a);
}

function handle404(req,res,a) {
  res.writeHead(302, {'Location': 'http://'+C.DNSIPSTR+'/'});
}

function handleRoot(req,res,a) {
  var page = HTTP_HEAD.replace("{v}", "Config ESP");
  page += "<h1>" + this.title + "</h1>";
  page += "<h3>Setup Wifi</h3>";
  page += HTTP_FORM_START.replace('{n}',this.apName);
  page += wifiitems;
  // add the extra parameters to the form
  for (const p of this.params) {
    var pitem = HTTP_FORM_PARAM;
    if (p.id) {
      pitem.replace("{i}", p.id);
      pitem.replace("{n}", p.id);
      pitem.replace("{p}", p.placeholder);
      pitem.replace("{l}", p.valueLength);
      pitem.replace("{v}", p.value);
      pitem.replace("{c}", p.customHTML);
    } else {
      pitem = p.customHTML;
    }
    page += pitem;
  }
  page += HTTP_FORM_END;
  page += HTTP_SCAN_LINK;

  page += HTTP_END;

  res.writeHead(200,{'Content-Length':page.length,'Content-Type': 'text/html'});
  res.end(page);
}

function getRSSIasQuality(RSSI) {
  var  quality = 0;
  if (RSSI <= -100) {
    quality = 0;
  } else if (RSSI >= -50) {
    quality = 100;
  } else {
    quality = 2 * (RSSI + 100);
  }
  return quality;
}


function handleWifiSave(req,res,a) {
  var wifi = require('Wifi');
  //parameters
  for (const p of this.params) {
    p.value = a.query[p.id];
  }
  var page = HTTP_HEAD.replace("{v}", "Credentials Saved");
  page += HTTP_SAVED;
  page += HTTP_END;
  res.writeHead(200,{'Content-Length':page.length,'Content-Type': 'text/html'});
  res.end(page);
  wifi.setHostname(a.query.n);
  wifi.connect(a.query.s, {password:a.query.p},
     function(err) {
        if (err) {
          this.log('error connecting to wifi: '+err);
          return;
        }
        this.log('wifi connected');
        setTimeout(wifi.save,200);
        wifi.stopAP(function(){
          if (this.connectedcallback) this.connectedcallback(); else setTimeout(this.restart,1000);
        });
   });
   if (this.paramscallback) this.paramscallback(this.params);
}


function handleReset(req,res,a) {
  var page = HTTP_HEAD.replace("{v}", "Info");
  page += "Module will reset in a few seconds.";
  page += HTTP_END;
  res.writeHead(200,{'Content-Length':page.length,'Content-Type': 'text/html'});
  res.end(page);
  setTimeout(this.restart,200);
}


// get Query name out of message
// offset = 12
// end \x00
function dnsQname(msg) {
  var i = 12;
  var qname = '';
  while ( msg[i] !== '\x00' ) {
    qname +=  msg[i];
    i++;
  }
  return qname + '\x00';
}

function dnsResponse(msg,dns_ip){
  return msg[0]+msg[1] + '\x81\x80\x00\x01\x00\x01\x00\x00\x00\x00' +
         dnsQname(msg) + '\x00\x01\x00\x01\xc0\x0c\x00\x01\x00\x01\x00\x00\x00\xf9\x00\x04' + dns_ip  ;
}

function startDNSServer(){ 
  this.dns = require('dgram').createSocket('udp4');
  var dnsIP = C.DNSIPSTR.split('.').map(n => String.fromCharCode(parseInt(n, 10))).join('');
  this.dns.on('error', (err) => {
    this.log('error starting dns server: '+err);
    this.restart();
  });
  this.dns.on('message', (msg, info) => {
    if ( msg[msg.length-3] === '\x01') {
      dns.send(dnsResponse(msg,dnsIP),info.port,info.address);
    }
  });
  this.dns.bind(53);
}


// start http server
function startSetupHttpServer(){
  this.server = require('http').createServer(onPageRequest);
  this.server.listen(80);
}

function wifiScan() {
  var wifi=require('Wifi');
  this.log('scan wifi...');
  wifi.scan( function(res){
    //sort by rssi
    res = res.sort((a,b) => (b.rssi - a.rssi)); 
    // remove dubs
    res = res.filter((t, i, s) => i === s.findIndex((th) => (th.ssid === t.ssid)));
    var count=0;
    var scantxt='';
    for (const e of res) {
      var quality = getRSSIasQuality(e.rssi);
      if (this.minimumQuality == -1 || this.minimumQuality < quality) {
        count++;
        scantxt += HTTP_ITEM
        .replace("{v}", e.ssid)
        .replace("{r}", quality)
        .replace("{i}", e.authmode == 'open' ? '' : 'l');
      }
    }
    if (count===0) scantxt = "No networks found.";
    wifiitems="<br/>"+scantxt;
    this.log('wifi scan done. found '+count+' networks.');
    setTimeout(wifiScan,this.wifiScanInterval);
  });
}


/* Exports *************************************/

/** This is 'exported' so it can be used with `require('WifiManager.js').create(options)` */

exports.create = function(options) {
  return new WifiManager(options);
}

exports.start = function(options) {
  return new WifiManager(options).start();
}



