var MAIN_URL = 'https://play.spotify.com/*';
var ALBUMS_URL = 'https://play.spotify.com/collection/albums';
var APP_PLAYER = 'document.getElementById("app-player").contentDocument';
var VAGALUME_API = '4b426abf3e83723a3f0ba2dedc63e6e2';

document.addEventListener('DOMContentLoaded', function() {
	updateTrackInfo();

	// Add events to buttons;
  document.getElementById('open').addEventListener('click', function() {
  	getSpotifyCurrentTab(function(tabs) {
		  if (!tabs.length) {
		    createSpotifyTab();
		  } 
		  else {
			showSpotifyTab(tabs);
		  }
  	});
  });

  document.getElementById('play-pause').addEventListener('click', function() {
  	execute('play-pause');
  });

  document.getElementById('previous').addEventListener('click', function() {
  	execute('previous');
  });

  document.getElementById('next').addEventListener('click', function() {
  	execute('next');
  });

  document.getElementById("show-lyrics").addEventListener('click', function(){
  	fetchLyrics();
  });

});

function createSpotifyTab() {
	chrome.tabs.create({url: ALBUMS_URL});
}

function showSpotifyTab(tabs) {
	chrome.tabs.update(tabs[0].id, {highlighted: true});
}

function execute(elementId){
	getSpotifyCurrentTab(function(tabs){
		tabs.forEach(function (tab) {
			dispatchClick(tab.id, elementId);
		});

		//Update current trackname;
		setTimeout(updateTrackInfo, 2000);
	});
}

function dispatchClick(tabId, elementId) {
	chrome.tabs.executeScript(tabId, {
		code: APP_PLAYER + ".getElementById('" + elementId + "').click()"
	}, function () {
		if (elementId === "play-pause") {
			togglePlayPause();
		}
	});
}

function fetchAlbumArt(tab, callback) {
	chrome.tabs.executeScript(tab, {
		code: APP_PLAYER + '.getElementById("cover-art").querySelector(".sp-image-img").style.backgroundImage;'
	},
	function(response) {
		var albumArt = response[0].replace('url(','').replace(')','');

		callback(albumArt);
	});
}

function fetchTrackName(tab, callback) {
	chrome.tabs.executeScript(tab, {
		code: APP_PLAYER + '.getElementById("track-name").getElementsByTagName("a")[0].innerHTML;'
	}, callback);
}

function fetchTrackArtist(tab, callback) {
	chrome.tabs.executeScript(tab, {
		code: APP_PLAYER + '.getElementById("track-artist").getElementsByTagName("a")[0].innerHTML;'
	}, callback);
}

function fetchLyrics(){
	//get artist and trackname;
	var artist = document.getElementById("current-track-artist").innerHTML,
		track = document.getElementById("current-track-name").innerHTML,
		xhr = new XMLHttpRequest;

	xhr.onreadystatechange = function() {
	    if (xhr.readyState == 4 && xhr.status == 200) {
	        
	        var response = JSON.parse(xhr.responseText);
	        //console.log(response);
	        //if(response.mus[0]){
	        //show container-lyrics and fill with response content;
        	document.getElementById("container-lyrics").style.display = "flex";
        	document.getElementById("container-lyrics").innerHTML = (response.mus && response.mus[0] ? response.mus[0].text : "Sorry, no lyric available for this song.");
	        //}
	    }
	}
	xhr.open('GET', 'https://api.vagalume.com.br/search.php?art='+artist+'&mus='+track+'&apikey='+VAGALUME_API);
	xhr.send();
}

/**
 * Fetch spotify element class (from id);
 * return: object with classnames as attributes and value=true; 
 */
function fetchClassNamesById(tab, id, callback) {
	chrome.tabs.executeScript(tab, {
		code: APP_PLAYER + '.getElementById("' + id + '").className;'
	}, function (response) {
		var classNamesList = String(response).split(" ");
		var classNamesObject = {}; //object with className:true

		classNamesList.forEach(function (className) {
			classNamesObject[className] = true;
		});

		callback(classNamesObject);
	});
}

function fetchControlState(tab, control, callback) {
	fetchClassNamesById(tab, control, function (response) {
		var state = "active";

		if (response.disabled) {
			state = "disabled";
		}

		callback(control, state);
	});
}

function fetchPlayPauseState(tab, callback) {
	fetchClassNamesById(tab, "play-pause", function (classNames) {
		var state = "paused";

		if (classNames.playing) {
			state = "playing";
		} else if (classNames.disabled) {
			state = "disabled"
		}

		callback(state);
	});
}

function togglePlayPause() {
	getSpotifyCurrentTab(function(tabs) {
		for (var tab of tabs) {
			fetchPlayPauseState(tab.id, function (state) {
				
				var toggle = {
					paused: "playing",
					playing: "paused",
					disabled: "disabled"
				};

				renderPlayPauseState(toggle[state]);
			});
		}
	});
}

function renderAlbumArt(albumArtURL) {
	document.querySelector('#album-art').innerHTML = '<img src=' + albumArtURL + ' style="width:200px; height:200px;">';
}

function renderTrackName(name) {
	document.querySelector('#current-track-name').innerHTML = name;
}

function renderTrackArtist(artist) {
	document.querySelector('#current-track-artist').innerHTML = artist;
}

function renderControlState(control, state) {
	var controlClassName = "controller__skip-back";

	if (state === "disabled") {
		controlClassName += " disabled";
	}

	document.getElementById(control).className  = controlClassName;
}

function renderPlayPauseState(state) {
	var playPauseDOM = document.getElementById("play-pause");
	var playPauseClassName = 'glyphicon glyphicon-play';

	switch (state) {
		case "playing":
			playPauseClassName = 'glyphicon glyphicon-pause';
			playPauseDOM.removeAttribute("disabled", true );
			break;
		case "paused":
			playPauseDOM.removeAttribute("disabled", true );
			break;
		case "disabled":
			playPauseDOM.setAttribute("disabled", true );
	}

	playPauseDOM.getElementsByTagName("span")[0].className = playPauseClassName;
}

/**
 * Show current trackname if there's one;
 */
function updateTrackInfo() {
	getSpotifyCurrentTab(function(tabs) {
		for (var tab of tabs) {
			fetchAlbumArt(tab.id, renderAlbumArt);

			fetchTrackName(tab.id, renderTrackName);
			fetchTrackArtist(tab.id, renderTrackArtist);

			fetchControlState(tab.id, "previous", renderControlState);
			fetchControlState(tab.id, "next", renderControlState);

			fetchPlayPauseState(tab.id, renderPlayPauseState);
		}
	});
}

/**
 * Look for tabs with url like MAIN_URL;
 */
function getSpotifyCurrentTab(successFunction) {
	chrome.tabs.query({url: MAIN_URL}, successFunction);
}
