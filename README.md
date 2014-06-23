Simple Service Discovery Protocol library for Node.js

Jay is J in javascript, Jay is a beautiful bird

###Class SSDP
```
attribute agentName; // default "Jay-SSDP" user agent name
attribute agentVersion; // default "0.1" user agent version
  
attribute port; // default "1900" multicast port
attribute host; // default "239.255.255.250" multicast address
  
attribute MX; // default 5, Maximum time (in seconds) to wait for response of host
  
method  getNetworkServices(type, callback); // type default "ssdp:all"
```

Examples:
```javascript
var ssdp = new SSDP();
ssdp.getNetworkServices("zeroconf:_xbmc-jsonrpc._tcp", function(networkServices) {
});
```

```javascript
var ssdp = new SSDP();
ssdp.getNetworkServices("upnp:urn:schemas-upnp-org:service:ContentDirectory:1", function(networkServices) {
});
```

```javascript
var ssdp = new SSDP();
ssdp.getNetworkServices("ssdp:all", function(networkServices) {
});
```

##Class NetworkServices
```
event servicefound;
event servicelost;
  
method  get(index);
method  getServices();
method  getServiceById(id);
method  getServicesByType(type);
```

Examples:
```javascript
var ssdp = new SSDP();
ssdp.getNetworkServices("ssdp:all", function(networkServices) {
	var services = networkServices.getServicesByType("upnp:urn:schemas-upnp-org:service:ContentDirectory:1");
	for (var i in services) {
		console.log(services[i]);
	}
});
```

```javascript
var ssdp = new SSDP();
ssdp.getNetworkServices("upnp:urn:schemas-upnp-org:service:ContentDirectory:1", function(networkServices) {
	var services = networkServices.getServices();
	for (var i in services) {
		console.log(services[i]);
	}
	networkServices.on("servicefound", function(service) {
		console.log("found", service);
	});
	networkServices.on("servicelost", function(service) {
		console.log("lost", service);
	});
});
```

##Class NetworkService
```
event available;
event unavailable;
event notify;
  
attribute id;
attribute type;
attribute online;
```
Examples:
```javascript
var ssdp = new SSDP();
ssdp.getNetworkServices("upnp:urn:schemas-upnp-org:service:ContentDirectory:1", function(networkServices) {
	var services = networkServices.getServices();
	for (var i in services) {
		console.log(services[i]);
		services[i].on("unavailable", function(e) {
      			console.log("lost", services[i]);
    		});
	}
});
```
