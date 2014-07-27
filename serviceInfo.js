"use strict";

var http = require("http");
var xml2js = require("xml2js");
var url = require("url");
var event = require("events");
var util = require("util");
var utils = require("./utils.js");

var libxmljs = require("libxmljs");

var serviceInfo = function(networkService) {
	event.EventEmitter.call(this);
	var self = this;

	// root-device
	this.rootDevice = null;
	// xml description, json
	this.document = null;
	var ns = {upnp:"urn:schemas-upnp-org:device-1-0"};
	// service xml doc
	this.service = null;
	// the location of the device description file
	this.location = null;
	// the URL base (SoupURI)
	this.URLBase = null;

	// actions list
	this.actionList = [];
	// service state
	this.serviceState = [];

	// get the location of the device description file
	this.getLocation = function() {
		return self.location;
	}

	// get the URL base of this device
	this.getURLBase = function() {
		return self.URLBase;
	}

	// get the Unique Device Name of the device
	this.getUDN = function() {
		return self.rootDevice.getUDN();
	}

	// get the UPnP service ID, or null
	this.getServiceType = function() {
		return self.service.get("./upnp:serviceType", ns).text();
	}

	// get the UPnP service type, or null
	this.getServiceId = function() {
		return self.service.get("./upnp:serviceId", ns).text();
	}

	// get the SCPD URL for this service, or NULL if there is no SCPD.
	this.getSCPDURL = function() {
		var val = self.service.get("./upnp:SCPDURL", ns).text();
		if (val.indexOf("http") === -1) {
			return self.getURLBase() +val;
		} else {
			return val;
		}
	}

	// Get the control URL for this service, or NULL.
	this.getControlURL = function() {
		var val = self.service.get("./upnp:controlURL", ns).text();
		if (val.indexOf("http") === -1) {
			return self.getURLBase() +val;
		} else {
			return val;
		}
	}

	// Get the event subscription URL for this service, or NULL
	this.getEventSubURL = function() {
		var val = self.service.get("./upnp:eventSubURL", ns).text();
		if (val.indexOf("http") === -1) {
			return self.getURLBase() +val;
		} else {
			return val;
		}
	}

	this.getActions = function() {
		return self.actionList;
	}

	this.getAction = function(name) {
		var action = null;
		var actions = this.getActions();
		for (var i in actions) {
			var candidate = actions[i];
			if (candidate.name === name) {
				action = candidate;
				break;
			}
		}
		return action;
	}

	this.setActions = function() {
		var URL = self.getSCPDURL();
		var xml = utils.getXMLbyURL(URL);
		var xns = {upnp:"urn:schemas-upnp-org:service-1-0"};
		self.serviceState = xml.find("//upnp:stateVariable", xns);
		var actionList = xml.find("//upnp:action", xns);
		for (var i in actionList) {
			var action = actionList[i];
			var al = {
				name: action.get("./upnp:name", xns).text(),
				args: []
			}
			var args = action.find(".//upnp:argument", xns);
			for (var y in args) {
				var arg = args[y];
				al.args.push({
					name: arg.get("./upnp:name", xns).text(),
					direction: arg.get("./upnp:direction", xns).text(),
					relatedStateVariable: arg.get("./upnp:relatedStateVariable", xns).text()
				 });
			}
			self.actionList.push(al);
		}
	}

	this.sendAction = function(action, options) {
		options = options || {};

		var inspect = this.getAction(action);
		if (inspect === null) {
			return "invalid-action";
		}
		var args = inspect.args;

		var vars = [];
		for (var i in args) {
			var arg = args[i];
			if (arg.direction === "in") {
				var op = options[arg.name] !== undefined ? options[arg.name] : "";
				vars.push("<" +arg.name +">" +op +"</" +arg.name +">");
			}
		}

		var soapMessage = utils.buildSoapEnvelope(action, self.getServiceType(), vars.join(""));
		var headers = {
			"SOAPACTION": self.getServiceType() +"#" +action
		};
		var xml = utils.requistURL(self.getControlURL(), "POST", headers, soapMessage);
		var soap = utils.getXML(xml);

		var out = {};
		for (var i in args) {
			var arg = args[i];
			if (arg.direction === "out") {
				var val = soap.get("//" +arg.name)
				var op = val ? val.text() : "";
				out[arg.name] = op;
			}
		}

		if (out.Result) {
			if (out.Result.indexOf('<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0') !== -1) {
				out.ns = {ns:"urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/"};
				out.dc = {dc:"http://purl.org/dc/elements/1.1/"};
				out.upnp = {upnp:"urn:schemas-upnp-org:metadata-1-0/upnp/"};
				var res = utils.getXML(out.Result)
				out.Result = res.find("//ns:container", out.ns);
			}
		}

		return out;
	}
}
util.inherits(serviceInfo, event.EventEmitter);

exports = module.exports = serviceInfo;
