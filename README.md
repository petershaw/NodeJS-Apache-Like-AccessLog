accesslog
==========
---

 A simple apache-like access log middleware for nodejs.

Description
----------
Accesslog will generate a apache like access.log file that can produce the two main formats: CLF and EXTENDED

Usage
---------

```javascript
var accesslog = require('accesslog');
[…express...]
app.use(apachelog.logger);
```

Configuration
---------
Accesslog will produce a log file called "access.log" inside the ./logs directory of your application root. 
You can overwrite this defaults by passing a configuration object into the accesslog.configure function.
```javascript
accesslog.configure({
	format: 'CLF',
	directory: 'logs',
	filename: 'access.log'});
```
 