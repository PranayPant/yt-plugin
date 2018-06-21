
const CB_URL 		= "https://localhost:3000/"
const LOCATION    = window.location.href
const YT_BASE_URL = "https://www.youtube.com/watch"
const LIST_AFFIX  = "list="
const VIDEO_AFFIX = "v="

const IMG_DIV_SELECTOR 		 = "#info-contents"
const IMG_STYLE 			 	 = "position:absolute;left:30%;bottom:10%;width:5%;height:40%"
const LIST_IMG_STYLE 	  	 = "width:10%;height:90%;margin-right:7%;margin-left:3%"
const LIST_IMG_DIV_SELECTOR = "#top-level-buttons"
const LIST_CONTENT_SELECTOR = "div#contents.ytd-playlist-video-list-renderer a.ytd-playlist-video-renderer"

const imgDivSelector = getImgDivSelector()
const imgDiv   		= document.querySelector( imgDivSelector )
const title 			= document.querySelector( "h1.title" ).textContent
const img   			= appendImg( LOCATION.split( YT_BASE_URL )[1], title )
const referenceNode  = imgDiv.children.item(0)

imgDiv.style.border   = "5px solid red"
imgDiv.style.position = "relative"

imgDiv.insertBefore( img, referenceNode )

function isPlaylistPage() {

	return LOCATION.includes(LIST_AFFIX) && !LOCATION.includes(VIDEO_AFFIX)
}

function getImgDivSelector() {

	return ( isPlaylistPage() ) ? LIST_IMG_DIV_SELECTOR : IMG_DIV_SELECTOR
}

function getImgStyle() {

	return ( isPlaylistPage() ) ? LIST_IMG_STYLE : IMG_STYLE
}

function appendImg( href, title ) {

	const img = document.createElement('img')

	img.id = 'download-icon'
	img.alt = "Download mp4"

	img.style = getImgStyle()
	
	img.src = CB_URL + "ICON"
	img.addEventListener( 'click', () => download( href, title )  )

	return img
}

function isPlaylist( href ) {

	return href.includes( LIST_AFFIX )
}

function getListHREFs( href ) {

	let nodes = document.querySelectorAll( LIST_CONTENT_SELECTOR )
	let hrefs = Array.from(nodes).map( link => link.href )

	return hrefs
}

window.download = function( href, title ) {

	imgDiv.appendChild( appendProgressBar() )

	const ws = new WebSocket( "wss://localhost:3000" )

	let buf = []
	let hrefs = []

	ws.addEventListener( 'open', () => {
		console.log( "connected!" )

		if( !isPlaylist( href ) ) {

			hrefs.push( href )
		}
		else {

			hrefs = getListHREFs( href )
		}

		ws.send( links[0] )
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

	ws.addEventListener( 'close', ( closeEvent ) => {

		let code   = closeEvent.code
		let reason = closeEvent.reason

		if( buf.length > 0 && code == 1000 ) {

			links.shift()
			console.log( `${links.length} links left` )
			if( links.length > 0 ) {
  				console.log( `sending ${links[0]} `)
  				ws.send( links[0] )
  			}

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
		imgDiv.removeChild( wrapper )
	}
}