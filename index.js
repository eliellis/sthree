var http = require('http');
var https = require('http');
var crypto = require('crypto');
var fs = require('fs');
var sax = require('sax');

function Triples(opts){
	this.bucket = opts.bucket;
	this.key = opts.key;
	this.secret = opts.secret;
	this.secure = opts.secure || false;
	this.region = opts.region || 'us-standard';
	return this;
}

Triples.prototype.direct = function(stream, name, headers, callback){

};

Triples.prototype.put = function(stream, name, headers, callback){
	stream.pipe(this._request('PUT', name, headers, callback));
};

Triples.prototype.get = function(name, headers, callback){
	this._request('GET', name, headers, callback).end();
};

Triples.prototype._request = function(method, path, headers, fn){
		var self = this;

		// assume last argument is the callback
		if (typeof headers === 'function'){
			fn = headers;
			headers = {};
		}

		var now = new Date();
		headers.Date = now.toUTCString();
		headers.Authorization = 'AWS ' + this.key + ':' +
		this._makeAuthorizationHeader(
			method.toUpperCase(),
			this._header(headers, 'content-md5'),
			this._header(headers, 'content-type'),
			now,
			this.bucket,
			path,
			this._getAwsHeaders(headers)
		);

		var params = {
			method: method.toUpperCase(),
			host: this.bucket + '.' + this._regionHost(),
			path: path,
			agent: false,
			headers: headers
		};

		var interface = ((this.secure) ? https : http);

		var s3Request = interface.request(params, function(res){
			if (res.headers['content-type'] === 'application/xml'){
				self._parse(res, function(err, data){
					fn(err, data);
				});
			}
			else{
				fn(null, res);
			}
		});

		s3Request.on('error', fn);
		return s3Request;
};

Triples.prototype._regionHost = function(){
	return (this.region === 'us-standard') ? 's3.amazonaws.com' : 's3-' + this.region + '.amazonaws.com';
};

Triples.prototype._header = function(obj, name){
	var oKs = Object.keys(obj);
	for (var i = 0; i < oKs.length; i++) {
		if (oKs[i].toLowerCase() === name){
			return obj[oKs[i]];
		}
	}
	return null;
};

Triples.prototype._parse = function(stream, callback){
	var xml = sax.createStream(true, {lowercase: true, position: false});
	var map = {};
	xml.on('text', function(txt){
		map[this._parser.tag.name] = txt;
	});
	xml.on('error', function(err){
		callback(err);
	});
	xml.on('end', function(){
		callback(null, map);
	});
	stream.pipe(xml);
};

Triples.prototype._getAwsHeaders = function(headers){
	var hNames = Object.keys(headers);
	hNames = hNames.filter(function(item){
		if (item.substr(0,5).search('amz-x') === -1){
			return false;
		}
		else{
			return true;
		}
	});
	var withVals = {};
	for (var i = 0; i < hNames.length; i++) {
		withVals[hNames[i]] = headers[hNames[i]];
	}
	return withVals;
};

Triples.prototype._canonicalizeAmazonHeaders = function(headers){
	var amzK = Object.keys(headers);
	var has = [];
	for (var i = 0; i < amzK.length; i++) {
		var key = amzK[i];
		var value = headers[amzK[i]];
		key = key.toLowerCase();
		has.push(key + ':' + value);
	}
	return has.sort();
};

Triples.prototype._makeAuthorizationHeader = function(method, md5, contentType, date, bucket, resource, amzHeaders){
	var stringToSign = [method, md5, contentType, date.toUTCString(), '/' + bucket + resource].join('\n') +
						((amzHeaders === undefined) ? '\n' + this._canonicalizeAmazonHeaders(amzHeaders).join('\n') : '');
	return crypto.createHmac('sha1', this.secret).update(stringToSign).digest('base64');
};

module.exports = function(opts){
	return new Triples(opts);
};