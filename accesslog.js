var microtime 		= require('microtime')
	, sprintf 		= require('sprintf').sprintf
	, dateformat	= require('date-format-lite')
	, fs 			= require('fs')
	, path 			= require('path')
	, fd			= undefined
	, cluster 		= require('cluster');
	;

// public exports
var accesslog = exports;
var conf = {
	format: 'CLF',
	directory: 'logs',
	filename: 'access.log'
};

accesslog.version = '0.0.4';

/**
 * Configuration object
 */
accesslog.configure = function accesslogConfigure(opt) {
  // writes logs into this directory
  conf.directory = (typeof opt.directory === 'string') ? opt.directory : __dirname + pathsep + 'logs';

  // write log to file with name
  conf.filename = (typeof opt.directory === 'string') ? opt.filename : 'access.log';
  
  // log format
	/**
	NCSA Common Log Format (CLF)
    "%h %l %u %t \"%r\" %>s %b"

	NCSA Common Log Format with Virtual Host
    "%v %h %l %u %t \"%r\" %>s %b"

	NCSA extended/combined log format
    "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-agent}i\""

	NCSA extended/combined log format with Virtual Host
    "%v %h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-agent}i\""
    
    Add a '+' to the logformat to also add the clusters worker id to the entry
    */
  conf.format = (typeof opt.directory === 'string') ? opt.format : 'CLF';
};

/**
 * Log-Middleware 
 * Will log in the format that is set in conf.format. Default formatg is CLF.
 * 
 * @scope public
 */
accesslog.logger = function log(request, response, next) {
	var starttime =  microtime.now();
	// from behind a proxy
	var clientAddr = request.headers['X-Forwarded-For'];
	if( clientAddr == undefined ){
		// direct connection
		clientAddr = request.connection.remoteAddress;
	}
	// get username (if available)
	var username = "-";
	if(request.session && request.session.user){
		username = request.session.user;
	} else {
		if(request.session && request.session.id){
			username = request.session.id;
		}	
	}

  if (typeof next === 'function') {
    next();
  }
  
  var endtime =  microtime.now();		// microseconds
  var rendertime = endtime - starttime;

  var now = new Date();
  var p0 =	sprintf("%s - %s [%s/%s/%s:%s:%s:%s] %s",
  		clientAddr, 
  		username,
  		now.format("DD"),
  		now.format("MMM"),
  		now.format("YYYY"),
  		now.format("hh"),
  		now.format("mm"),
  		now.format("ss"),
  		rendertime
  	);
  	request.protocol = request.protocol || 'unknown';
  	var p1 =	sprintf('"%s %s %s/%s"', 
  		request.method,
  		request.url,
  		request.protocol.toUpperCase(),
  		request.httpVersion
  	)
  	
  	var head = response._headers || response.headers;
  	var bytesRead = 0;
  	if(response.req && response.req.client && response.req.client.bytesRead){
  		bytesRead = response.req.client.bytesRead;
  	}
  	var p2 =	sprintf("%d %s", 
  	  	response.statusCode,
  		head['content-length'] || bytesRead
  	);
  	var p3 = '';
  	if(conf.format.match('\\+')){
  		var clusterid = cluster.worker && cluster.worker.id || 'not-a-cluster';
  		p3 = ' (worker: '+ clusterid + ')';
  	}
  	if(conf.format.match('CLF') > 0){
  		writeToLog(p0 +" "+ p1 +" "+ p2 + p3);
	} else if(conf.format.match('EXTENDED')){
		writeToLog(p0 +" "+ p1 +" "+ '"'+response.req.headers['user-agent']+'"' +" "+ p2 + p3);
	} else {
		// default fallback
		writeToLog(p0 +" "+ p1 +" "+ p2 + p3);
	}
};

/** 
 * Function to write to the logfile, configured in conf.directory and conf.filename.
 * Will open a filehandle if not opend allready.
 *
 * @scope private
 */
writeToLog = function( str ){
	if(fd == undefined){
		fd = fs.openSync(path.join(conf.directory, conf.filename), 'a');
	}
	fs.write( fd, str+"\n" );
}
