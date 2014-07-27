"use strict";

var url = require("url");
var event = require("events");
var util = require("util");
var http = require("http");
var utils = require("./utils.js");

var serviceInfo = require("./serviceInfo.js");

var deviceInfo = function(networkService) {
	event.EventEmitter.call(this);
	var self = this;

	// http server for events callbacks, only run once needed
	var HTTPServer = null;

	// root-device
	this.rootDevice = null;
	// xml description, json
	this.document = null;
	var ns = {upnp:"urn:schemas-upnp-org:device-1-0"};
	// device xml doc
	this.device = null;
	// the location of the device description file
	this.location = null;
	// the URL base (SoupURI)
	this.URLBase = null;

	// create a new Device object, automatically loading and parsing device description document from descriptionXML
	this.newDeviceInfo = function() {
		self.document = utils.getXMLbyURL(networkService.location);
		self.URLBase = self.document.get("//upnp:URLBase", ns);
		if (self.URLBase === undefined) {
			var segs = url.parse(networkService.location);
			self.URLBase = segs.protocol +"//" +segs.host;
		} else {
			self.URLBase = self.URLBase.text();
		}
		self.device = self.document.get("//upnp:device", ns);
		self.location = networkService.location;
	}
	// construct device info
	if (networkService !== undefined) {
		this.newDeviceInfo();
	}

	// get the location of the device description file
	this.getLocation = function() {
		return self.rootDevice ? self.rootDevice.getLocation() : networkService.location;
	}

	// get the URL base of this device
	this.getURLBase = function() {
		var url = self.URLBase;
		if (url[url.length - 1] === "/") {
			url = url.substring(0, url.length - 1);
		}
		return url;
	}

	// generic getter
	this.get = function(attr) {
		var value = self.device.get(".//upnp:" +attr, ns);
		return value ? value.text() : null;
	}

	// get the Unique Device Name of the device
	this.getUDN = function() {
		return this.get("UDN");
	}

	// get the UPnP device type
	this.getDeviceType = function() {
		return this.get("deviceType");
	}

	// get the friendly name of the device
	this.getFriendlyName = function() {
		return this.get("friendlyName");
	}

	// Get the manufacturer of the device.
	this.getManufacturer = function() {
		return this.get("manufacturer");
	}

	// get a URL pointing to the manufacturer's website
	this.getManufacturerURL = function() {
		return this.get("manufacturerURL");
	}

	// get the description of the device model
	this.getModelDescription = function() {
		return this.get("modelDescription");
	}

	// get the model name of the device
	this.getModelName = function() {
		return this.get("modelName");
	}

	// get the model number of the device
	this.getModelNumber = function() {
		return this.get("modelNumber");
	}

	// get a URL pointing to the device model's website
	this.getModelURL = function() {
		return this.get("modelURL");
	}

	// get the serial number of the device
	this.getSerialNumber = function() {
		return this.get("serialNumber");
	}

	// get a URL pointing to the device's presentation page, for web-based administration
	this.getPresentationURL = function() {
		return this.get("presentationURL");
	}

	// get the Universal Product Code of the device
	this.getUPC = function() {
		return this.get("UPC");
	}

	// get a URL pointing to the icons
	this.getIcons = function() {
		var list = []
		var icons = self.device.get(".//upnp:iconList", ns);
		if (icons !== undefined) {
			icons = icons.find(".//upnp:icon", ns);
			for (var i in icons) {
				var mimetype = icons[i].get(".//upnp:mimetype", ns);
				mimetype = (mimetype) ? mimetype.text() : null;

				var width = icons[i].get(".//upnp:width", ns);
				width = (width) ? width.text() : null;

				var height = icons[i].get(".//upnp:height", ns);
				height = (height) ? height.text() : null;

				var depth = icons[i].get(".//upnp:depth", ns);
				depth = (depth) ? depth.text() : null;

				var url = icons[i].get(".//upnp:url", ns);
				url = (url) ? url.text() : null;

				list.push({
					mimetype: mimetype,
					width: width,
					height: height,
					depth: depth,
					url: self.getURLBase() +url
				});
			}
		}
		return list;
	}

	// get a list of new deviceInfo representing the devices directly contained in info
	this.listDevices = function() {
		var devices = []
		var deviceList = self.device.get("./upnp:deviceList", ns);
		if (deviceList !== undefined) {
			var subDevices = deviceList.find("./upnp:device", ns);
			for (var i in subDevices) {
				var subDevice = subDevices[i];
				var device = self.setupDevice(subDevice);
				devices.push(device);
			}
		}
		return devices;
	}

	// setup device object
	this.setupDevice = function(subDevice) {
		var device = new deviceInfo();
		device.rootDevice = self.rootDevice || self;
		device.document = self.document;
		device.device = subDevice;
		device.location = self.getLocation();
		device.URLBase = self.getURLBase();
		return device;
	}

	// get a list of strings representing the types of the devices directly contained in info
	this.listDeviceTypes = function() {
		var types = [];
		var deviceList = self.device.find("//upnp:deviceType", ns);
		for (var i in deviceList) {
			var type = deviceList[i].text();
			if (types.indexOf(type) === -1) {
				types.push(type);
			}
		}
		return types;
	}

	// get the service with type directly contained in info as a new deviceInfo, or NULL if no such device was found
	this.getDevice = function(type) {
		var target = null;
		var deviceList = self.device.find("//upnp:deviceList", ns);
		if (deviceList.length !== 0) {
			for (var x in deviceList) {
				var subDevices = deviceList[x].find("./upnp:device", ns);
				for (var i in subDevices) {
					var deviceType = subDevices[i].get("./upnp:deviceType", ns).text();
					if (deviceType === type) {
						return self.setupDevice(subDevices[i]);
					}
				}
			}
		}
		return target;
	}

	// get a list of new ServiceInfo representing the services directly contained in info
	this.listServices = function() {
		var services = []
		var serviceList = self.device.get("./upnp:serviceList", ns);
		if (serviceList !== undefined) {
			var subServices = serviceList.find("./upnp:service", ns);
			for (var i in subServices) {
				var subService = subServices[i];
				var service = self.setupService(subService);
				services.push(service);
			}
		}
		return services;
	}

	// get a GList of strings representing the types of the services directly contained in info
	this.listServiceTypes = function() {
		var types = [];
		var deviceList = self.device.find("//upnp:serviceType", ns);
		for (var i in deviceList) {
			var type = deviceList[i].text();
			if (types.indexOf(type) === -1) {
				types.push(type);
			}
		}
		return types;
	}

	// setup service object
	this.setupService = function(subService) {
		var service = new serviceInfo();
		service.rootDevice = self.rootDevice || self;
		service.document = self.document;
		service.service = subService;
		service.location = self.getLocation();
		service.URLBase = self.getURLBase();
		service.setActions();
		return service;
	}

	// get the service with type directly contained in info as a new serviceInfo, or NULL if no such device was found
	this.getService = function(type) {
		var target = null;
		var serviceList = self.device.find("//upnp:serviceList", ns);
		if (serviceList.length !== 0) {
			for (var x in serviceList) {
				var subServices = serviceList[x].find("./upnp:service", ns);
				for (var i in subServices) {
					var serviceType = subServices[i].get("./upnp:serviceType", ns).text();
					if (serviceType === type) {
						return self.setupService(subServices[i]);
					}
				}
			}
		}
		return target;
	}

	// events
	var eventsCBStart = function() {
		HTTPServer = http.createServer(function(request, response) {
			if (req.url === "/") {
				res.send(200);
			}
		});
		HTTPServer.on("err", function(err) {
			self.emit("error", err);
		});
		HTTPServer.listen(0);
	}
	this.sub = function() {
		// sub
		/*
		SUBSCRIBE publisher Path HTTP/1.1
		Host: publisher Host:Port
		Callback: deliveryURL
		NT: upnp:event
		Timeout: Second-requested subscription duration
		*/
		// renew
		/*
		SUBSCRIBE publisher path HTTP/1.1
		Host: publisher host:publisher port
		SID: uuid: subscription UUID
		Timeout: Second- requested subscription duration
		(blank line)
		*/
	}
	this.unsub = function() {
		// clear event interval
		// cancel
		/*
		UNSUBSCRIBE publisher_path HTTP/1.1
		Host: publisher_host:port
		SID: uuid: subscription_UUID
		(blank line)
		*/
	}
	this.onNotify = function() {
		/*
		NOTIFY delivery path HTTP/1.1
		Host: delivery host:delivery port
		Content-Type: text/xml
		Content-Length: length of body in bytes
		NT: upnp:event
		NTS: upnp:propchange
		SID: uuid:subscription-UUID
		SEQ: event key
		<e:propertyset xmlns:e="urn:schemas-upnp-org:event-1-0">
		<e:property>
		<variableName>new Value</variableName>
		other variable names and values (if any) go here...
		</e:property>
		</e:propertyset>
		*/
	}
}
util.inherits(deviceInfo, event.EventEmitter);

exports = module.exports = deviceInfo;
