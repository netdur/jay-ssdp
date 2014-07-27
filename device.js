"use strict";
//@TODO: support for sub device

var http = require("http");
var dgram = require("dgram");
var util = require("util");
var event = require("events");
var os = require("os");
var fs = require("fs");

var libxmljs = require("libxmljs");

var meta = require("./package.json");
var utils = require("./utils.js");

var device = function(descriptionXML) {
	event.EventEmitter.call(this);
	var self = this;

	// socket server, responds to M-SEARCH
	var listener = null;

	// http server, responds with XML document (descriptionXML)
	var HTTPServer = null;

	// xml description in format of json
	var description = null;

	// xml description
	var XML = null;
	var ns = {upnp:"urn:schemas-upnp-org:device-1-0"};

	// all service types
	var STS = [];

	// version and agent name, used on SERVER attribute
	this.version = meta.version;
	this.software = meta.name;

	// trying to determine IP address
	var ip = "127.0.0.1";
	this.getIP = function() {
		return ip;
	}
	this.setIP = function(ip) {
		ip = ip;
	}
	var ifaces = os.networkInterfaces();
	for (var i in ifaces) {
		var iface = ifaces[i];
		iface.forEach(function(IP) {
			if (IP.address !== "127.0.0.1" && IP.family === "IPv4" && IP.internal === false) {
				ip = IP.address;
			}
		});
	}

	// the containing rootDevice, null if this is the root device
	this.rootDevice = null;

	// build respond message
	var getHeaders = function(headers, head) {
		head = head || "HTTP/1.1 200 OK";
		var message = []
		message.push(head);
		Object.keys(headers).forEach(function(header) {
			message.push(header +": " +headers[header]);
		})
		message.push("\r\n");
		return message.join("\r\n");
	}

	// notify message
	var advertiseServer = null;
	var advertiseIV = null;
	var advertise = function(alive) {
		for (var i in STS) {
			var ST = STS[i];
			var headers = {
				HOST: "239.255.255.250:1900",
				NT: ST,
				NTS: (alive ? "ssdp:alive" : "ssdp:byebye"),
				USN: description.get("//upnp:UDN", ns).text(),
				LOCATION: "http://" +ip +":" +HTTPServer.address().port,
				"CACHE-CONTROL": "max-age=1800",
				"SERVER": os.type() +"/" +os.release() +" UPnP/1.1 " +self.software +"/" +self.version
			}
			var message = new Buffer(getHeaders(headers, "NOTIFY * HTTP/1.1"));
			advertiseServer.send(message, 0, message.length, 1900, "239.255.255.250");
		}
	}

	// respond to M-SEARCH
	var mSearchRespond = function(request) {
		var headers = getHeaders({
			"ST": description.get("//upnp:deviceType", ns).text(),
			"USN": description.get("//upnp:UDN", ns).text(),
			"LOCATION": "http://" +ip +":" +HTTPServer.address().port,
			"CACHE-CONTROL": "max-age=1800",
			"DATE": new Date().toUTCString(),
			"SERVER": os.type() +"/" +os.release() +" UPnP/1.1 " +self.software +"/" +self.version,
			"EXT": ""
		});
		var mx = parseInt(request.mx +"000");
		mx = Math.floor(Math.random() * mx) + 100;
		var message = new Buffer(headers);
		setTimeout(function() {
			if (listener === null) { return }
			listener.send(message, 0, message.length, request.port, request.address);
		}, mx);
	}

	// start UDP broadcaster and listener, and http server
	var startListening = function() {
		advertiseServer = dgram.createSocket("udp4");
		advertiseServer.bind();
		advertiseIV = setInterval(function() {
			advertise(true);
		}, 1000);

		listener = dgram.createSocket("udp4");
		listener.on("error", function(err) {
			self.emit("error", err);
		});
		listener.on("listening", function() {
			listener.addMembership("239.255.255.250");
			listener.setMulticastTTL(1);
		});
		listener.on("message", function(message, info) {
			var request = utils.parseMessage(message, info);
			var msearch = "M-SEARCH * HTTP/1.1";
			if (request.header === msearch) {
				if (request.st === "ssdp:all" || STS.indexOf(request.st) !== -1) {
					mSearchRespond(request);
				}
			}
		});
		listener.bind(1900);

		HTTPServer = http.createServer(function(request, response) {
			response.writeHead(200, {"Content-Type": "application/xml"});
			response.end(XML);
		});
		HTTPServer.on("err", function(err) {
			self.emit("error", err);
		});
		HTTPServer.listen(0);
	}
	var stopListening = function() {
		// send bybye
		for (var i = 0; i < 3; i++) {
			advertise(false);
		}
		if (listener !== null) {
			clearInterval(advertiseIV);
			listener.close();
			listener = null;
			HTTPServer.close();
			HTTPServer = null;
			setTimeout(function() {
				advertiseServer.close();
				advertiseServer = null;
			}, 500); // enough time to send byebye then close socket
		}
	}

	// create a new Device object, automatically loading and parsing device description document from descriptionXML
	this.newDevice = function() {
		fs.readFile(descriptionXML, function(err, data) {
			XML = data.toString();
			if (err) {
				self.emit("error", err);
				return;
			}
			description = libxmljs.parseXml(XML);
			STS = ["upnp:rootdevice"];
			var rootDevice = description.get("/upnp:root/upnp:device", ns);
			var deviceType = rootDevice.find("//upnp:deviceType", ns);
			for (var i in deviceType) {
				var value = deviceType[i].text();
				if (STS.indexOf(value) === -1) {
					STS.push(value);
				}
			}
			var serviceType = description.find("//upnp:serviceType", ns);
			for (var i in serviceType) {
				var value = serviceType[i].text();
				if (STS.indexOf(value) === -1) {
					STS.push(value);
				}
			}
			var UDN = description.find("//upnp:UDN", ns);
			for (var i in UDN) {
				var value = UDN[i].text();
				if (STS.indexOf(value) === -1) {
					STS.push(value);
				}
			}
		});
	}
	// construct device
	this.newDevice();

	// controls whether or not root_device is available (announcing its presence)
	var available = false;
	this.setAvailable = function(isAvailable) {
		this.available = Boolean(isAvailable);
		if (this.available === true) {
			startListening();
		} else {
			stopListening();
		}
	}
	this.getAvailable = function() {
		return Boolean(available);
	}
}
util.inherits(device, event.EventEmitter);

exports = module.exports = device;
