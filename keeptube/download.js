
const CB_URL 		= "https://localhost:3000/"
const YT_BASE_URL = "https://www.youtube.com/"
const LIST_AFFIX  = "playlist?"
const VIDEO_AFFIX = "watch?v="
const LOCATION    = window.location.href

const IMG_DIV_SELECTOR 		  = "div#info-contents>.ytd-watch>.ytd-video-primary-info-renderer>div#info>div#menu-container>div#menu>.ytd-video-primary-info-renderer"
const IMG_BAR_SELECTOR 		  = "div#info-contents.ytd-watch"
const TITLE_SELECTOR 		  = "h1.title"
const IMG_STYLE 			 	  = "position:relative;width:5%;height:40%;margin-right:10%;margin-left:10%"
const BAR_STYLE 				  = "height:10px;width:100%;background-color:grey;margin-top:5%"

const LIST_IMG_DIV_SELECTOR  = "div#contents>.ytd-playlist-video-list-renderer"
const LIST_MENU_IMG_SELECTOR = "div#menu.ytd-playlist-sidebar-primary-info-renderer"
const LIST_BAR_DIV_SELECTOR  = "div#content.ytd-playlist-video-renderer"
const LIST_IMG_STYLE 	  	  = "position:relative;width:10%;bottom:3%;height:60%;"
const LIST_BAR_STYLE			  = "height:10px;width:90%;background-color:grey;margin-top:10%"
const LIST_HREF_SELECTOR 	  = "div#contents.ytd-playlist-video-list-renderer a.ytd-playlist-video-renderer"

function getBufsLengths( arr=bufs ) {

	return arr.map( ( buf, index ) => buf.length )
}

function isPlaylistPage() {

	return LOCATION.includes(LIST_AFFIX)
}

function getImgDivSelector() {

	return ( isPlaylistPage() ) ? LIST_MENU_IMG_SELECTOR+", "+LIST_IMG_DIV_SELECTOR : IMG_DIV_SELECTOR
}

function getBarDivSelector() {

	return ( isPlaylistPage() ) ? LIST_BAR_DIV_SELECTOR : IMG_BAR_SELECTOR
}

function getBarDivs() {

	return document.querySelectorAll( getBarDivSelector() )
}

function getImgDivs() {

	return document.querySelectorAll( getImgDivSelector() )
}

function getImgStyle() {

	return ( isPlaylistPage() ) ? LIST_IMG_STYLE : IMG_STYLE
}

function getBarStyle() {

	return ( isPlaylistPage() ) ? LIST_BAR_STYLE : BAR_STYLE
}


function isPlaylist( href ) {

	return href.includes( LIST_AFFIX )
}

function normalizeHREF( href ) {

	return href.split( "&" )[0]
}

function getListHREFs( href ) {

	let nodes = document.querySelectorAll( LIST_HREF_SELECTOR )
	let hrefs = Array.from(nodes).map( link => normalizeHREF( link.href ) )

	return hrefs
}

function getPageHREF() {

	return normalizeHREF( LOCATION )
}

function isMultiVidDwnld( parentNode ) {

	return ( parentNode.id == "menu" ) ? true : false
}

function downloadContent( title, index ) {

	let blob    = new Blob( bufs[index], { type: 'video/mp4'} )
	let blobURL = URL.createObjectURL( blob )

	let element = document.createElement('a')
	element.setAttribute( 'href', blobURL )
	element.setAttribute('download', title + ".mp4" )

	element.style.display = 'none'
	document.body.appendChild( element )

	element.click()

	document.body.removeChild( element )

	//bufs[index] = []
}

function incrementProgressBar( progress=0, nodeIndex, isList ) {
	
	let wrapper
	let bar

	if( !isList ) {
		wrapper = document.querySelector("#bar-wrapper")
	}
	else {
		wrapper = barDivs[nodeIndex].parentElement.querySelector("#bar-wrapper")
	}

	bar = wrapper.querySelector("#progress-bar")

	if( progress <= 100 ) {
		width = ( progress ).toString() + "%"
		bar.style.width = width
	}
	if( progress == 100) {
		wrapper.parentElement.removeChild( wrapper )
	}
}

function createProgressBar() {

	const wrapper = document.createElement('div')
	const bar     = document.createElement('div')

	wrapper.id 	  = "bar-wrapper"
	wrapper.style = getBarStyle()

	bar.id    = "progress-bar"
	bar.style = "height:10px;width:0%;background-color:green"

	wrapper.appendChild( bar )

	return wrapper
}

function createImg( parentNode, index ) {

	let img = document.createElement('img')

	img.id = 'download-icon'
	img.alt = "Download mp4"
	img.style = getImgStyle()
	img.src = CB_URL + "ICON"
	img.addEventListener( 'click', ( event ) => { 
		event.stopPropagation()
		handleDownload( parentNode, index ) 
	})

	return img
}

function appendProgressBar( elem ) {

	elem.insertAdjacentElement( "afterend", createProgressBar() )
}

function appendImgs( href, title ) {

	imgDivs.forEach( (node, index) => {
		
		if( !isPlaylistPage() ) {
			node.insertAdjacentElement( "afterbegin", createImg( node, index ) )
		}
		else {
			node.appendChild( createImg( node, index ) )
		}
	})
}

// The 'index' parameter includes the Menu img for playlist
window.handleDownload = function( parentNode, index ) {

	const ws = new WebSocket( "wss://localhost:3000" )

	let hrefs  = []
	let titles = []

	ws.addEventListener( 'open', () => {
		console.log( "connected!" )
		
		if( isMultiVidDwnld( parentNode ) ) {
			
			// append progress bar to each div and init bufs
			bufs = []
			barDivs.forEach( (d, i) => {
				appendProgressBar( d )
				bufs.push( [] )
			})
			hrefs = getListHREFs()

			ws.send( JSON.stringify( { message: hrefs[0], index: index, list: "true" } ) )
		}
		else if( isPlaylistPage() ) {
	
			hrefs.push( getListHREFs()[index-1] )
			appendProgressBar( barDivs[index-1] )
			ws.send( JSON.stringify( { message: hrefs[0], index: index-1, list: "false" } ) )
		}
		else {
			
			hrefs.push( getPageHREF() )
			appendProgressBar( barDivs[0] )
			ws.send( JSON.stringify( { message: hrefs[0], index: 0, list: "false" } ) )
		}
	})

	ws.addEventListener( 'message', ( message ) => {

		if( typeof message.data == 'string' ) {
			let string = message.data
			let json   = JSON.parse( string )
			let acc   = json.acc
			let msg 	 = json.msg
			let index = parseInt(json.index)
			let list  = json.list

			if( msg.includes("resume") ) {
				console.log(`done with index ${index} and list ${list}`)
				
				if( bufs.length > 0 ) {
					debugger
					downloadContent( "title", index )

					if( index+1 < hrefs.length ) {
						console.log( `sending index ${index+1} and list ${list}`)
		  				ws.send( JSON.stringify( { message: hrefs[index+1], index: index+1, list: list } ) )
		  			}
		  			else {
		  				console.log('closing connection')
		  				ws.close( 1000, 'OK' )
		  			}
				}
				else {
					alert( 'Sorry, an internal error occured while downloading the video' )
				}
			}
			else {
				incrementProgressBar( acc, index, list )				
			}
		}
		else {

			let dataBlob  = message.data.slice( 0, message.data.size-1 )
			let indexBlob = message.data.slice( message.data.size-1, message.data.size )

			let indexReader = new FileReader()

			indexReader.addEventListener( 'load', ( event ) => {
				let arrBuf =  event.target.result
				let indexView = new DataView( arrBuf )
				let index = indexView.getUint8()
				console.log(`index is ${index}`)
				bufs[index].push( dataBlob )
			})

			indexReader.readAsArrayBuffer( indexBlob )
		}
	})

	ws.addEventListener( 'close', ( closeEvent ) => {

		let code   = closeEvent.code
		let reason = closeEvent.reason

		console.log( "Error code " + code + ": " + reason )
	})
}

let imgDivs = []
let barDivs = []
let bufs    = [ [] ]

// Get div info
barDivs = getBarDivs()
imgDivs = getImgDivs()

appendImgs()

function reload() {

	imgDivs = []
	barDivs = []
	bufs    = [ [] ]

	// Get div info
	barDivs = getBarDivs()
	imgDivs = getImgDivs()

	appendImgs()
}

// Poll to chekc for page change every 1 ms
setInterval( () => {
	console.log('set timeout')
	if( LOCATION != window.location.href ) {
		LOCATION = window.location.href
		console.log('reloading to ' + LOCATION )
		reload()
	}
}, 1)
