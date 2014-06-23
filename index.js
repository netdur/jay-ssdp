"use strict";

var dgram = require("dgram");
var http = require("http");
var util = require("util");
var os = require("os");
var events = require("events");

function NetworkService(networkService) {
	events.EventEmitter.call(this);
	var networkService = networkService;

	this.id = null;
	this.type = null;
	this.online = false;

	this.set = function(data) {
		var type = data["usn"].split("::");
		if (type.length === 2) {
			this.type = type[1];
		}
		this.id = data["usn"];
		this.online = true;
		for (var i in data) {
			this[i] = data[i];
		}
	}
}
util.inherits(NetworkService, events.EventEmitter);

function NetworkServices() {
	events.EventEmitter.call(this);
	var self = this;
	var services = [];
	this.add = function(data) {
		var networkService = new NetworkService(this);
		networkService.set(data);
		services.push(networkService);
		return networkService;
	}
	this.get = function(index) {
		return services[index];
	}
	this.getServices = function() {
		return services;
	}
	this.getServiceById = function(id) {
		for (var i in services) {
			if (services[i].id === id) {
				return services[i];
			}
		}
	}
	this.getServicesByType = function(type) {
		var list = [];
		for (var i in services) {
			var service = services[i];
			if (service.type === type) {
				list.push(service);
			}
		}
		return list;
	}
}
util.inherits(NetworkServices, events.EventEmitter);

function SSDP() {
	events.EventEmitter.call(this);
	var networkServices = new NetworkServices();
	var self = this;
	this.MX = 5;

	this.agentName = "Jay-SSDP";
	this.agentVersion = "0.1";
	this.userAgent = os.type() +"/" +os.release() +" UPnP/1.1 " +this.agentName +"/" +this.agentVersion;

	this.port = "1900";
	this.host = "239.255.255.250";

	this.parseMessage = function(message, info) {
		var data = info
		var headers = message.toString().split("\r\n");
		data.header = headers[0];

		for (var i = 1; i < headers.length; i++) {
			var header = headers[i];
			var kv = header.split(/:(.+)?/);
			if (kv[1] && kv[1] !== "undefined") {
				var key = kv[0].trim();
				key = key.toLowerCase();
				data[key] = kv[1].trim();
			}
		}
		return data;
	}
	this.listen = function() {
		this.listener = dgram.createSocket("udp4");
		this.listener.on("message", function(message, info) {
			var data = self.parseMessage(message.toString(), info);
			if (data["header"] !== "NOTIFY * HTTP/1.1") {
				return;
			}
			if (self.ST !== "ssdp:all") {
				if (self.ST !== data["nt"]) {
					return;
				}
			}
			var service = networkServices.getServiceById(data["usn"]);
			if (!service) {
				// sometime advertise byebye before going alive !!!
				service = networkServices.add(data);
				networkServices.emit("servicefound", service);
				return;
			}
			service.emit("notify", data);
			if (data["nts"] === "ssdp:byebye") {
				service.online = false;
				service.emit("unavailable");
				networkServices.emit("servicelost", service);
			}
			if (data["nts"] === "ssdp:alive") {
				service.online = true;
				service.emit("available");
			}
		});
		this.listener.bind(1900, function() {
			self.listener.addMembership(self.host);
		});
	}
	this.stop = function() {
		this.listener.close();
	}
	this.getNetworkServices = function(ST, callback) {
		this.ST = ST || "ssdp:all";

		var udp4Discover = dgram.createSocket("udp4");
		udp4Discover.on("message", function(message, info) {
			networkServices.add(self.parseMessage(message, info));
		});
		var message = new Buffer(
			"M-SEARCH * HTTP/1.1\r\n"
			+"HOST:" +this.host +":" +this.port +"\r\n"
			+"MAN:ssdp:discover\r\n"
			+"ST:" +this.ST +"\r\n"
			+"MX:" +this.MX +"\r\n"
			+"USER-AGENT:" +this.userAgent +"\r\n"
			+"\r\n"
		);
		udp4Discover.bind(function() {
			udp4Discover.send(message, 0, message.length, self.port, self.host);
		});
		var udp4DiscoverTimeout = setTimeout(function() {
			udp4Discover.close();
			callback.call(self, networkServices);
			self.listen();
		}, this.MX * 1100);
	};
}
util.inherits(SSDP, events.EventEmitter);

exports = module.exports = SSDP;
