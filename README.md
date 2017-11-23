# sthree

## Installation
`npm install sthree`

## Usage
Usage is pretty straightforward.

```javascript
var fs = require('fs');
var s3 = require('sthree')({
	bucket: "bucketname",
	// baseUrl: 'digitaloceanspaces.com',
	// region: 'nyc3',
	key: "PUBLICKEY",
	secret: "SUPERSECRETKEY"
});

s3.put(fs.createReadStream('./my_secret_identity.png'), '/my_secret_identity.png', function(error, response){
	if (error) return console.log(error, response);
	console.log("Hope no one sees this!");
});

s3.get('/my_secret_identity.png', function(error, response){
	if (error) return console.log(error, response);
	var saveStream = fs.createWriteStream('./bruce_wayne.png');
	response.pipe(saveStream);
	console.log("Well, it wouldn't stay a secret forever.");
});

s3.put(fs.createReadStream('./me_saving_gotham.mp4'), '/me_saving_gotham.mp4', function(error, response){
	if (error) return console.log(error, response);
	console.log("Crahing the Batmobile was totally worth it.");
});

// you can pass in custom headers as a second argument, and the callback third
s3.get('/me_saving_gotham.mp4', { Range: "bytes=500-999" }, function(error, response){
	if (error) return console.log(error, response);
	var saveStream = fs.createWriteStream('./me_saving_gotham.mp4');
	response.pipe(saveStream);
	console.log("Alfred is a terrible cameraman.");
});

s3.head('/me_saving_gotham.mp4', function(error, response){
	if (error) return console.log(error, response);
	console.log(response.headers);
});

```
<hr>

# Methods

## put(stream || buffer || string<sup>†</sup>, path, [headers, callback])
### Sends a PUT request to the specified path
<sup>†</sup><sub>string: for convenient arbitrary string storage, uploads a mock file with the given data and a content-type of "text/plain"</sub>

## get(path, [headers, callback])
### Sends a GET request to the specified Object

## getBucket([headers, callback])
### Returns the contents of the current bucket

## head(path, [headers, callback])
### Sends a HEAD request to the specified Object

## generatePolicyFromObject(object)
### A helper-function for direct-to-S3 uploads that generates the Base64 encoded version of the policy passed to it

## generateSignatureFromPolicyString(policy)
### A helper-function for direct-to-S3 uploads that works together with the afforementioned function by generating the SHA1-HMAC Base64 encoded signature requred by the S3 API for direct post requests (<a href="http://aws.amazon.com/articles/1434">refer here</a> for more information on the purpose of these functions)
