var ssdp = require("./index.js");

var ssdp = new ssdp();
ssdp.getNetworkServices("upnp:rootdevice", function(networkServices) {
	var services = networkServices.getServices();
	for (var i in services) {
		console.log(services[i]);
	}
	console.log("found", services.length);

	networkServices.on("servicefound", function(service) {
		console.log("servicefound", service);
	});
	networkServices.on("servicelost", function(service) {
		console.log("servicelost", service);
	});
});


