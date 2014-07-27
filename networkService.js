"use strict";

var util = require("util");
var events = require("events");

function networkService(networkServices) {
	events.EventEmitter.call(this);

	var self = this;
	this.id = null;
	this.type = null;
	this.online = false;
	this.timeout = null;

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
		self.emit("available");
		networkServices.emit("service-found", self);
		this.setTimeout(data);
	}

	this.setTimeout = function(data) {
		if (data["nts"] === "ssdp:byebye") {
			// byebye
			clearTimeout(this.timeout);
			return;
		}
		var expire = data["cache-control"].split("=")[1];
		clearTimeout(this.timeout);
		this.timeout = setTimeout(function() {
			self.leave();
		}, expire * 1000); // seconds to ms
	}

	this.leave = function() {
		self.online = false;
		self.emit("lost");
		networkServices.emit("service-lost", self);
	}

	this.on("notify", function(data) {
		if (data["nts"] === "ssdp:byebye") {
			self.leave();
		}
		if (data["nts"] === "ssdp:alive") {
			self.online = true;
			self.emit("available");
			networkServices.emit("service-available", self);
			self.setTimeout(data);
		}
	});
}
util.inherits(networkService, events.EventEmitter);

exports = module.exports = networkService;
