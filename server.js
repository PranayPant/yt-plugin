
const https	  = require('https')
const fs 	  = require('fs')
const path	  = require('path')
const youtube = require('ytdl-core')
const WS		  = require('ws') 

const key     = path.join(__dirname, "privateKey.key")
const cert    = path.join(__dirname, "certificate.crt")
const options = { key:  fs.readFileSync( key ), cert: fs.readFileSync( cert ) }

const YT_BASE_URL  = "https://www.youtube.com/watch?v="
const DOWNLOAD_URL = "/video_download/"
const ICON_PATH    = path.resolve('./keeptube/icons/video.jpg')
const VIDEO_PATH   = path.resolve('./test/video.mp4')

const server = https.createServer( options ).listen( 3000, () => console.log('Listening on port 3000') )

var wss = new WS.Server( { noServer: true, clientTracking: true, perMessageDeflate: false } )

server.on( 'request', ( req, res ) => {

	let params = req.url.split("/")
	
	// Return vars
	let resource
	let status = '404'

	if( params[1] === 'ICON' ) {

		resource = fs.createReadStream( ICON_PATH )
	}

	resource.pipe( res )
	resource.on( 'end', () => {
		res.end( '200' )
	})
})

server.on( 'upgrade', ( req, socket, head ) => {

	wss.handleUpgrade( req, socket, head, initWS )
})

function initWS( ws ) {

	ws.on( 'open' , () => {
		console.log('connected!')
	})

	ws.on( 'message', ( href ) => {

		//let buf = Buffer.alloc(0)

		youtube( href )
		.on( 'data', ( chunk ) => {
			//buf = Buffer.concat( [ buf, chunk ] )
			ws.send( chunk )
		})
		.on( 'progress', ( curr, accum, total ) => {
			
			let acc = Math.trunc( accum*100/total )
			let msg  = acc.toString() + "% downloaded"
			let json = { acc: acc, total: total, msg: msg }

			ws.send( JSON.stringify( json ) )
		})
		.on( 'end', () => {
			//console.log( 'Video ready to send' )
			//ws.send( buf )
			console.log('closing connection')
			ws.close( 1000, 'OK' )
		})
		.on( 'error', ( err ) => {
			ws.close( 1002, 'Protocol Error' )
		})
	})

	ws.on( 'close', ( status, reason ) => {
		if( status != 1000 ) {
			console.error( 'Error code ' + status + ": " + reason )
		}
	})
}
