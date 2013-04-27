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

Triples.prototype.getBucket = function(headers, callback){
	if (typeof headers === 'function'){
		callback = headers;
		headers = {};
	}

	this._request('GET', '/', headers, function(err, parsed){
		var list = [];
		var rKeys = Object.keys(parsed);
		for (var i = 0; i < parsed.Key.length; i++) {
			var item = {};
			for (var d = 0; d < rKeys.length; d++) {
				item[rKeys[d]] = (typeof parsed[rKeys[d]] === 'string') ? parsed[rKeys[d]] : parsed[rKeys[d]][i];
			}
			list.push(item);
		}
		callback(err, list);
	}).end();
};

Triples.prototype.head = function(name, headers, callback){
	this._request('HEAD', name, headers, callback).end();
};

Triples.prototype.get = function(name, headers, callback){
	this._request('GET', name, headers, callback).end();
};

Triples.prototype.put = function(stream, name, headers, callback){
	stream.pipe(this._request('PUT', name, headers, callback));
};

Triples.prototype.delete = function(name, headers, callback){
	this._request('DELETE', name, headers, callback).end();
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
			agent: false, // connection pooling issue
			headers: headers
		};

		var interface = ((this.secure) ? https : http);

		var s3Request = interface.request(params, function(res){
			if (res.headers['content-type'] === 'application/xml'){
				self._looseParse(res, function(err, object){
					fn(err, object);
				});
			}
			else{
				fn(null, res);
			}
		});

		s3Request.on('error', fn);
		return s3Request;
};

Triples.prototype._looseParse = function(stream, fn){
	var parse = new sax.createStream(true, {normalize: true, trim: true});
	var depth = [];
	var nodes = {};
	parse.on('opentag', function(tag){
		depth.push(tag.name);
	});
	parse.on('endtag', function(name){
		var i = depth.indexOf(name);
		if (i !== -1){
			depth.splice(i,1);
		}
	});
	parse.on('text', function(text){
		if (typeof nodes[this._parser.tag.name] === 'string'){
			nodes[this._parser.tag.name] = [nodes[this._parser.tag.name], text];
		}
		else{
			nodes[this._parser.tag.name] = text;
		}
	});
	parse.on('error', fn);
	parse.on('end', function(){
		fn(null, nodes);
	});
	stream.pipe(parse);
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

Triples.prototype.generatePolicyFromObject = function(object){
	return new Buffer(JSON.stringify(object)).toString('base64');
};

Triples.prototype.generateSignatureFromPolicyString = function(policy){
	return crypto.createHmac('sha1', this.secret).update(policy).digest('base64');
};

module.exports = function(opts){
	return new Triples(opts);
};