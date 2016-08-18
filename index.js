#!/usr/local/bin/node
/*
./watch.js mad-men -s2 -e1

or add to ~/.bashrc:
watch()(
	PATH_TO_THIS_FILE/watch.js $@
)

*/

var DEFAULT_WEB_APP = '/Applications/Google Chrome.app'
,series = 'mad-men'
,season = 1
,episode = 1

var http = require('http')
,Url = require('url')
,cp = require('child_process')
,fs = require('fs')
,argsMemFile = __dirname+'/.watchs'


loadArgs(function(err,argv){
	if (err) return console.error(err)
	argv.forEach(function(arg){
		var m = arg.match(/(s|e)([0-9]+)/)
		if (!m)
			return series = arg
		switch (m[1]) {
			case 's': season = m[2]; break
			case 'e': episode = m[2]; break
		}
	})
	if (process.argv[2] == 'next') ++episode
	console.log(['series: '+series,'season: '+season,'episode: '+episode].join('\n'))

	
	parseListingPage(function(err,data){
		if (err == 404) {
			++season
			episode = 1
			console.log('episode not found, trying season '+season+' episode '+episode)
			return parseListingPage(parseEpisodesPage)
		}
		parseEpisodesPage(false,data)
	})


	function parseListingPage(cb){
		console.log('searching for episode list...')
		getUrl('http://watch8now.info/stream/'+series+'-s'+season+'e'+episode+'.html',cb)
	}

	function parseEpisodesPage(err,data){
		if (err) return console.error(err)
		var m = data.toString().match(/<a href="([^"]+)".+youwatch\.org/i)
		if (!m) return console.error('unable to find episode link')
		console.log('searching for video...')
		getUrl(m[1],function(err,data){
			if (err) return console.error(err)
			var m = data.toString().match(/<iframe src="([^"]+)"/i)
			if (!m) return console.error('unable to find episode iframe')
			var cmd = 'open -a"'+DEFAULT_WEB_APP+'" "'+m[1]+'"'
			//console.log(cmd)
			cp.exec(cmd)
			saveArgs([series,'-s'+season,'-e'+episode])
		})
	}
})


function getUrl(url,cb){
	var urlp = Url.parse(url)
	var requestOpts = {
		hostname: urlp.hostname
		,path: urlp.pathname
		,port: urlp.port || 80
		,method: 'GET'
	};
	var buf = new Buffer(0)
	http.request(requestOpts,function(res){
		if (res.statusCode == 404) return done('404')
		res.on('data',function(chunk){
			buf = Buffer.concat([buf,chunk])
		})
		.on('end',function(){
			done(false,buf)
		})
		.on('error',done)
	})
	.on('error',done)
	.end()
	function done(err,data){
		cb(err,data)
		done = function(){}
	}
}

function loadArgs(cb){
	var args = process.argv.slice(2)
	if (args[0] && args[0] != 'next') return process.nextTick(function(){ cb(false,args) })
	fs.readFile(argsMemFile,function(err,data){
		if (err) {
			if (err.code != 'ENOENT') console.warn('could not open state file', err)
		} else {
			try {
				var savedArgs = JSON.parse(data)
				if (!Array.isArray(savedArgs)) throw 'saved args not an array'
				args = savedArgs
			} catch (e) {
				console.warn('unable to load saved args',e)
			}
		}
		cb(false,args)
	})
}

function saveArgs(args){
	fs.writeFile(argsMemFile, JSON.stringify(args), function(err){
		if (err) console.error(err)
	})
}



