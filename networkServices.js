"use strict";

var util = require("util");
var events = require("events");
var NetworkService = require("./networkService.js");

function networkServices() {
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
}
util.inherits(networkServices, events.EventEmitter);

exports = module.exports = networkServices;
