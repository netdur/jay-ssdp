"Strict mode";

var deviceInfo = require("./deviceInfo.js");
var SSDP = require("./index.js");

var ssdp = new SSDP();
ssdp.MX = 1;
ssdp.getNetworkServices("urn:schemas-upnp-org:service:ContentDirectory:1", function(networkServices) {
	var services = networkServices.getServices();

	if (services.length === 0) {
		console.log("content directory was not found");
		return;
	}

	var device = new deviceInfo(services[0]);
	console.log("media server found:", device.getFriendlyName());
	var cd = device.getService("urn:schemas-upnp-org:service:ContentDirectory:1");
	var res = cd.sendAction("Browse", {
		ObjectID: 0,
		BrowseFlag: "BrowseDirectChildren",
		Filter: "*",
		StartingIndex: 0,
		RequestedCount: 10,
		SortCriteria: "*"
	});
	for (var i in res.Result) {
		var c = res.Result[i];
		console.log(c.get("./dc:title", res.dc).text());
	}
});

var ssdp = new SSDP();
ssdp.MX = 1;
ssdp.getNetworkServices("urn:schemas-upnp-org:service:WANIPConnection:1", function(networkServices) {
	var services = networkServices.getServices();

	if (services.length === 0) {
		console.log("router was not found");
		return;
	}

	var device = new deviceInfo(services[0]);
	console.log("router found:", device.getFriendlyName());
	var wan = device.getService("urn:schemas-upnp-org:service:WANIPConnection:1");
	var res = wan.sendAction("GetExternalIPAddress");
	console.log("my ip address is", res.NewExternalIPAddress);
});

/*
var JaySSDP = require("./index.js");
var ssdp = new JaySSDP();
ssdp.MX = 1;
ssdp.getNetworkServices("upnp:rootdevice", function(networkServices) {
	var services = networkServices.getServices();
	console.log("found", services.length);
	for (var i in services) {
		var service = services[i];
		var device = new deviceInfo(service);
		console.log("#", device.getFriendlyName());
		var subD = device.listDevices();
		if (subD.length !== 0) {
			console.log("\t#### SUB D ####");
			for (var y in subD) {
				console.log("\t", subD[y].getFriendlyName());
				var subsubD = subD[y].listDevices();
				if (subsubD.length !== 0) {
					console.log("\t\t#### SUBSUB D ####");
					for (var x in subsubD) {
						console.log("\t\t", subsubD[x].getFriendlyName());
					}
				}
			}
		}
	}
});
*/

/*
var JaySSDP = require("./index.js");

var ssdp = new JaySSDP();
ssdp.getNetworkServices("upnp:rootdevice", function(networkServices) {
	var services = networkServices.getServices();
	console.log("found", services.length);
	for (var i in services) {
		(function(service) {
			console.log("service found by msearch", service.address, service.server);
			service.on("available", function() {
				console.log("available", service.address, service.server);
			});
			service.on("lost", function() {
				console.log("lost", service.address, service.server);
			});
		})(services[i]);
	}
	networkServices.on("service-found", function(service) {
		console.log("(new) service-found", service.address, service.server);
	});
	networkServices.on("service-lost", function(service) {
		console.log("service-lost", service.address, service.server);
	});
	networkServices.on("service-available", function(service) {
		console.log("service-available", service.address, service.server);
	});
});
*/
