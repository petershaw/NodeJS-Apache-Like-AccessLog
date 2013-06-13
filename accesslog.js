var microtime 		= require('microtime')
	, sprintf 		= require('sprintf').sprintf
	, dateformat	= require('date-format-lite')
	, fs 			= require('fs')
	, path 			= require('path')
	, fd			= undefined
	;

// public exports
var accesslog = exports;
var conf = {
	format: 'CLF',
	directory: 'logs',
	filename: 'access.log'
};

accesslog.version = '0.0.2';

/**
 * Configuration object
 */
accesslog.configure = function accesslogConfigure(opt) {
  // writes logs into this directory
  directory = (typeof opt.directory === 'string') ? opt.directory : __dirname + pathsep + 'logs';

  // write log to file with name
  filename = (typeof opt.directory === 'string') ? opt.filename : 'access.log';
  
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
    **/
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
	if(request.session.user){
		username = "-";
	} else {
		if(request.session.id){
			username = request.session.id;
		}	
	}

  if (typeof next === 'function') {
    next();
  }
  
  var endtime =  microtime.now();		// microseconds
  var rendertime = endtime - starttime;

  var now = new Date();
  var p0 =	sprintf("%s - %s [%s/%s/%s:%s:%s] %s", 
  		clientAddr, 
  		username,
  		now.format("DD"),
  		now.format("MMM"),
  		now.format("YYYY"),
  		now.format("hh"),
  		now.format("mm"),
  		now.format("ss"),
  		(rendertime /60/60)
  	);
  	
  	var p1 =	sprintf('"%s %s %s/%s"', 
  		request.method,
  		request.url,
  		request.protocol.toUpperCase(),
  		request.httpVersion
  	)
  	
  	var p2 =	sprintf("%d %s", 
  	  	200,
  		response._headers['content-length']
  	);
  	if(conf.format == 'CLF'){
		writeToLog(p0 +" "+ p1 +" "+ p2);
	} else if(conf.format == 'EXTENDED'){
		writeToLog(p0 +" "+ p1 +" "+ '"'+response.req.headers['user-agent']+'"' +" "+ p2);
	} else {
		// default fallback
		writeToLog(p0 +" "+ p1 +" "+ p2);
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