
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
const LOG_PATH		 = path.resolve('./test/log.txt')

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

	ws.on( 'message', ( data ) => {

		//let buffer = []

		if( typeof data == 'string' )
		{
			let json  = JSON.parse( data )
			let href  = json.message
			let index = json.index
			let list  = json.list

			console.log( `received message ${data}` )

			youtube( href )
			.on( 'data', ( chunk ) => {

				let bufIndex = ( list == 'true' ) ? index : 0
				let indexBuf = Buffer.alloc( 1, bufIndex )
				let buf = Buffer.concat( [ chunk, indexBuf ] )	

				//buffer.push( chunk )

				ws.send( buf )
			})
			.on( 'progress', ( curr, accum, total ) => {
				
				let acc = Math.trunc( accum*100/total )
				let msg  = acc.toString() + "% downloaded"
				let json = { acc: acc, total: total, msg: msg, index: index, list: list }

				ws.send( JSON.stringify( json ) )
			})
			.on( 'end', () => {
				console.log( `finished sending video at index ${index}`)

				//fs.writeFileSync( VIDEO_PATH, buffer )
				let bufIndex = ( list == 'true' ) ? index : 0;
				let json = { acc: 0, total: 0, msg: 'resume', index: bufIndex, list: list }
				
				ws.send( JSON.stringify( json ) )
			})
			.on( 'error', ( err ) => {
				ws.close( 1002, 'Protocol Error' )
			})
		}
		else {
			console.log( 'testing data')
			fs.writeFileSync( VIDEO_PATH, data )
		}

	})

	ws.on( 'close', ( status, reason ) => {
		if( status != 1000 ) {
			console.error( 'Error code ' + status + ": " + reason )
		}
	})
}
