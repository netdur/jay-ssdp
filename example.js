var ssdp = require("./index.js");

var ssdp = new ssdp();
ssdp.getNetworkServices("upnp:rootdevice", function(services) {
	console.log("found", services.getServices().length);
	services.on("servicefound", function(service) {
		console.log("servicefound", service);
	});
	services.on("servicelost", function(service) {
		console.log("servicelost", service);
	});
});


