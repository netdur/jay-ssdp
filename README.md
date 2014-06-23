jay-ssdp
========

Simple Service Discovery Protocol library for Node.js

Jay is J in javascript
Jay is a beautiful bird

Examples:
```javascript
var ssdp = new SSDP();
ssdp.getNetworkServices("zeroconf:_boxee-jsonrpc._tcp", function(networkServices) {
	var services = networkServices.getServices();
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
});
```
