var JaySSDP = require("./index.js");

var ssdp = new JaySSDP();
ssdp.getNetworkServices("urn:schemas-upnp-org:service:AVTransport:1", function(networkServices) {
	var services = networkServices.getServices();
	console.log("found", services.length);
	for (var i in services) {
		var service = services[i];
		console.log(1, service.address, service.server);
	}
	networkServices.on("servicefound", function(service) {
		console.log(2, service.address, service.server);
	});
	networkServices.on("servicelost", function(service) {
		console.log(3, service.address, service.server);
	});
	/*
	var CDTypes = [
		"urn:schemas-upnp-org:service:ContentDirectory:1",
		"urn:schemas-upnp-org:service:ContentDirectory:2",
		"urn:schemas-upnp-org:service:ContentDirectory:3",
		"urn:schemas-upnp-org:service:ContentDirectory:4"
	];
	var services = networkServices.getServicesByType(CDTypes);
	console.log("found", services.length);
	for (var i in services) {
		var service = services[i];
		console.log(1, service.address, service.type);
	}
	*/
});
/*
var ssdp = new JaySSDP();
ssdp.getNetworkServices("urn:schemas-upnp-org:service:ContentDirectory:1", function(networkServices) {
	var services = networkServices.getServices();
	console.log("found", services.length);
	for (var i in services) {
		var service = services[i];
		console.log(2, service.address, service.type);
		service.on("unavailable", function() {
			console.log(service.type, "unavailable");
		});
	}
	networkServices.on("servicelost", function(service) {
		console.log(service.type, "servicelost");
	});
});
*/
