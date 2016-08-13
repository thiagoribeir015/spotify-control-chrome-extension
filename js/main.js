var MAIN_URL = 'https://play.spotify.com/*';
var ALBUMS_URL = 'https://play.spotify.com/collection/albums';
var APP_PLAYER = 'document.getElementById("app-player").contentDocument';
//TODO: SEARCH_URL = https://play.spotify.com/search/nirvana

document.addEventListener('DOMContentLoaded', function() {

	updateTrackInfo();

	// Add events to buttons;
  	document.getElementById('open').addEventListener('click', function() {

  		getCurrentTab(function(tabs){
  			// Create a spotify tab if one doesn't yet exists.
		    if (tabs.length === 0) {
		      	chrome.tabs.create({url: ALBUMS_URL});
		    }
		    else{
		    	chrome.tabs.update(tabs[0].id, {highlighted: true});
		    }
  		});
  	}, false);

  	document.getElementById('play-pause').addEventListener('click', function() {
  		execute('play-pause');
  	}, false);

  	document.getElementById('previous').addEventListener('click', function() {
  		execute('previous');
  	}, false);

  	document.getElementById('next').addEventListener('click', function() {
  		execute('next');
  	}, false);

}, false);

function execute(action){

	getCurrentTab(function(tabs){

	    // Create a spotify tab if there's any.
	    if (tabs.length === 0) {
	      	chrome.tabs.create({url: ALBUMS_URL});
	    }
	    else {

		    // Apply action on all spotify tabs.
		    // get iframe 'app-player' and then find the right action button;
		    for (var tab of tabs) {
		      chrome.tabs.executeScript(tab.id, {
		      	code: "document.getElementById('app-player').contentDocument.getElementById('" + action + "').click()"
		      });
		    }

		    //Update current trackname;
		    setTimeout(function(){
		    	updateTrackInfo();
		    },2000);

		    // Unload background page as soon as we're done.
		    //window.close();
	    }
	});
}

function getAppPlayerItem() {

}

/**
 * Show current trackname if there's one;
 */
function updateTrackInfo(){
	// var appPlayer = document.getElementById('app-player').contentDocument;
	// var trackName = appPlayer.getElementById('track-name').getElementsByTagName("a")[0].innerHTML;
	// var trackArtist = appPlayer.getElementById('track-artist').getElementsByTagName("a")[0].innerHTML;

	getCurrentTab(function(tabs){

		if (tabs.length === 0) {
	      	//chrome.tabs.create({url: ALBUMS_URL});
	      	document.querySelector('#album-art').innerHTML = "";
	    }
	    else {
		    //show album cover;
		    for (var tab of tabs) {
		      	chrome.tabs.executeScript(tab.id, {
		      		code: APP_PLAYER + '.getElementById("cover-art").querySelector(".sp-image-img").style.backgroundImage;'
		      	},
		      	function(resp){
			      	//resp[0] contains the result of code executed on target tab.id, where will be returned the background-image attribute;
			      	var src = resp[0].replace('url(','').replace(')','');
			      	document.querySelector('#album-art').innerHTML = '<img src='+src+' style="width:200px; height:200px;">';
			    	});

						chrome.tabs.executeScript(tab.id, {
		      		code: APP_PLAYER + '.getElementById("track-name").getElementsByTagName("a")[0].innerHTML;'
		      	},
		      	function(resp){
							//alert(String(resp))
							if (resp) {//alert('""' + String(resp) + '"')
								document.querySelector('#current-track-name').innerHTML = resp;
							}
			    	});

						chrome.tabs.executeScript(tab.id, {
		      		code: APP_PLAYER + '.getElementById("track-artist").getElementsByTagName("a")[0].innerHTML;'
		      	},
		      	function(resp){
							if (resp) {
								document.querySelector('#current-track-artist').innerHTML = resp;
							}
			    	});

						chrome.tabs.executeScript(tab.id, {
		      		code: 'document.getElementById("app-player").contentDocument.getElementById("play-pause").className;'
		      	},
		      	function(resp){
							if (resp) {
								var playClassNames = String(resp).split(" ");
								var newPlayContent = '<span class="glyphicon glyphicon glyphicon-play"></span>';

								playClassNames.forEach(function (className) {
									switch (className) {
										case "playing":
											newPlayContent = '<span class="glyphicon glyphicon glyphicon-pause"></span>';
											break;
										case "disabled":
											newPlayContent = '<span class="glyphicon glyphicon glyphicon-remove"></span>';
									}
								});

								document.querySelector('#play-pause').innerHTML = newPlayContent;
							}
			    	});
		    }
		}
	});
}

/**
 * Look for tabs with url like MAIN_URL;
 */
function getCurrentTab(successFunction){

	chrome.tabs.query({url: MAIN_URL}, successFunction);
}
// document.getElementById("app-player").contentDocument.getElementById("play-pause").className
