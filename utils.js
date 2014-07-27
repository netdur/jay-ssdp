var http = require("http");
var xml2js = require("xml2js");

var httpsync = require("httpsync");
var libxmljs = require("libxmljs");

var utils = function() {
	var self = this;

	this.getXMLbyURL = function(URL) {
		var data = this.getURL(URL);
		if (data === null) {
			return null
		} else {
			return this.getXML(data);
		}
	}

	this.getXML = function(xml, callback) {
		return libxmljs.parseXml(xml);
	}

	this.requistURL = function(URL, method, headers, body) {
		headers = headers || {};
		var req = httpsync.request({
			url: URL,
			method: method,
			headers: headers
		});
		req.write(body);
		var res = req.end();
		if (res.statusCode === 200) {
			return res.data.toString();
		} else {
			return null;
		}		
	}

	this.getURL = function(URL) {
		var res = httpsync.get({url: URL}).end();
		if (res.statusCode === 200) {
			return res.data.toString();
		} else {
			return null;
		}
	}

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

	this.buildSoapEnvelope = function(name, type, vars) {
		var soapEnvelope = '<?xml version="1.0" encoding="utf-8"?>'
			+'<soap:Envelope'
				+' soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"'
				+' xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
				+'<soap:Body>'
					+'<message:' +name +' xmlns:message="' +type +'">'
						+vars
					+'</message:' +name +'>'
				+'</soap:Body>'
			+'</soap:Envelope>';
		return soapEnvelope;
	}
}

exports = module.exports = new utils();
