const CB_URL = "https://localhost:3000/"
const HREF 	 = window.location.href
const YT_BASE_URL = "https://www.youtube.com/watch?v="

const div   = document.getElementById( "info-contents" )
const title = document.querySelector( "h1.title" ).textContent
const referenceNode = div.children.item(0)

div.style.border   = "5px solid red"
div.style.position = "relative"

div.insertBefore( appendImg( HREF.split( YT_BASE_URL )[1], title ), referenceNode );

function appendImg( href, title ) {

	const img = document.createElement('img')

	img.id = 'download-icon'
	img.alt = "Download mp4"

	img.style = "position:absolute;left:30%;bottom:10%;width:5%;height:40%"
	
	img.src = CB_URL + "ICON"
	img.addEventListener( 'click', () => download( href, title )  )

	return img
}

window.download = function( href, title ) {

	div.appendChild( appendProgressBar() )

	const ws = new WebSocket( "wss://localhost:3000" )

	let buf = []

	ws.addEventListener( 'open', () => {
		console.log( "connected!" )

		ws.send( href )
	})

	ws.addEventListener( 'message', ( message ) => {

		if( typeof message.data == 'string' ) {
			
			let string = message.data
			let json   = JSON.parse( string )

			let acc = json.acc
			let msg = json.msg

			console.log( msg )

			move( acc )
		}
		else {
			
			buf.push( message.data )
		}

	})

	ws.addEventListener( 'close', () => {

		if( buf.length > 0 ) {

			let blob    = new Blob( buf, { type: 'video/mp4'} )
			let blobURL = URL.createObjectURL( blob )
			
			let element = document.createElement('a')
			element.setAttribute( 'href', blobURL )
  			element.setAttribute('download', title + ".mp4" )

  			element.style.display = 'none'
  			document.body.appendChild( element )

  			element.click()

  			document.body.removeChild( element )
		}
		else {
			alert( 'Sorry, an internal error occured while downloading the video.' )
		}

	})
}

function appendProgressBar() {

	const wrapper = document.createElement('div')
	const bar     = document.createElement('div')

	wrapper.id 	  = "bar-wrapper"
	wrapper.style = "height:10px;width:100%;background-color:grey"

	bar.id    = "progress-bar"
	bar.style = "height:10px;width:0%;background-color:green"

	wrapper.appendChild( bar )

	return wrapper
} 

function move( progress=0 ) {
  
	let wrapper = document.getElementById('bar-wrapper')
	let bar = document.getElementById('progress-bar')

	if( progress <= 100 ) {
		width = ( progress ).toString() + "%"
		bar.style.width = width
	}
	if( progress == 100) {
		div.removeChild( wrapper )
	}
}