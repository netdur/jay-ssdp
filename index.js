"use strict";

var dgram = require("dgram");
var http = require("http");
var util = require("util");
var os = require("os");
var events = require("events");

var meta = require("./package.json");
var utils = require("./utils.js");
var NetworkServices = require("./networkServices.js");

function SSDP() {
	events.EventEmitter.call(this);

	var networkServices = new NetworkServices();
	var self = this;
	this.MX = 5;

	this.agentName = meta.name;
	this.agentVersion = meta.version;
	this.userAgent = os.type() +"/" +os.release() +" UPnP/1.1 " +this.agentName +"/" +this.agentVersion;

	this.listen = function() {
		var self = this;
		this.listener = dgram.createSocket("udp4");
		this.listener.on("message", function(message, info) {
			var data = utils.parseMessage(message.toString(), info);
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
				return;
			}
			service.emit("notify", data);
		});
		this.listener.on("error", function(err) {
			self.emit("error", err);
		});
		this.listener.on("listening", function() {
			self.listener.addMembership("239.255.255.250");
			self.listener.setMulticastTTL(1);
		});
		this.listener.bind(1900);
	}

	this.stop = function() {
		this.listener.close();
	}

	this.getNetworkServices = function(ST, callback) {
		this.ST = ST || "ssdp:all";
		//this.listen();

		var mSearch = dgram.createSocket("udp4");
		mSearch.on("message", function(message, info) {
			var data = utils.parseMessage(message, info);
			var service = networkServices.getServiceById(data["usn"]);
			if (!service) {
				networkServices.add(data);
			}
		});
		var message = new Buffer(
			"M-SEARCH * HTTP/1.1\r\n"
			+"HOST:239.255.255.250:1900\r\n"
			+"MAN:ssdp:discover\r\n"
			+"ST:" +this.ST +"\r\n"
			+"MX:" +this.MX +"\r\n"
			+"USER-AGENT:" +this.userAgent +"\r\n"
			+"\r\n"
		);
		mSearch.bind(function() {
			mSearch.send(message, 0, message.length, 1900, "239.255.255.250");
		});
		var mSearchTimeout = setTimeout(function() {
			mSearch.close();
			callback.call(self, networkServices);
			self.listen();
		}, this.MX * 1100);
	};
}
util.inherits(SSDP, events.EventEmitter);

exports = module.exports = SSDP;
