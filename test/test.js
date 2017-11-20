var sthree = require('../index.js');
var config = require('./config');
var fs = require('fs');

var s3 = sthree(config);

var filename = "test/hipster.txt";

describe('sthree', function(){

	describe('#put()', function(){
		it('should put a stream to S3 with no problems', function(done){
			// this.timeout(0); // we're uploading a file, so chill bro
			fs.stat(filename, function(err, stat){
				var file = fs.createReadStream(filename);
				s3.put(file, '/' + filename, {'content-length': stat.size, 'content-type': 'text/plain'}, done);
			});
		});

		it('should put a buffer to S3 with no problems', function(done){
			// this.timeout(0);
			fs.readFile(filename, function(err, buff){
				s3.put(buff, '/' + filename, {'content-length': buff.length, 'content-type': 'text/plain'}, done);
			});
		});

		it('should put a string to S3 with no problems', function(done){
			// this.timeout(0);
			s3.put("Testing 1... 2... 3...", '/string-test.txt', done);
		});

		it('should put a stream to S3 with amz-x headers with no problems', function(done){
			// this.timeout(0);
			fs.readFile(filename, function(err, buff){
				s3.put(buff, '/' + filename, {'content-length': buff.length, 'content-type': 'text/plain', 'x-amz-acl': 'public-read'}, done);
			});
		});
	});

	
	describe('#get()', function(){
		it('should get a stream from S3 with no problems', function(done){
			// this.timeout(0); // we're download a file, yeah
			s3.get('/' + filename, done);
		});
		
		it('should list all files in a bucket', function(done){
			// this.timeout(0); // we're download a file, yeah
			s3.getBucket(function(err, list){
				if (Array.isArray(list) && !err){
					done();
				}
				else{
					done(err || new Error('The returned value was not an Array'));
				}
			});
		});
	});
	
	describe.skip('#delete()', function() {
		before(function(done) {
			s3.put("Testing 1... 2... 3...", '/delete-test.txt', done);
		});
		it('should delete an item from a bucket properly', function(done) {
			// this.timeout(0);
			s3.delete('/delete-test.txt', function(err, res) {
				if (err) { throw err; }
				s3.getBucket((e, files) => {
					if (err) { throw err; }
				});
			});
		});
	});
});