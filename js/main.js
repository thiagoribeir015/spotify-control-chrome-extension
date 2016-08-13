var MAIN_URL = 'https://play.spotify.com/*';
var ALBUMS_URL = 'https://play.spotify.com/collection/albums';
var APP_PLAYER = 'document.getElementById("app-player").contentDocument';

document.addEventListener('DOMContentLoaded', function() {
	updateTrackInfo();

	// Add events to buttons;
  document.getElementById('open').addEventListener('click', function() {
  	getCurrentTab(function(tabs) {
  		// Create a spotify tab if one doesn't yet exists.
		  if (!tabs.length) {
		    chrome.tabs.create({url: ALBUMS_URL});
		  } else{
		    chrome.tabs.update(tabs[0].id, {highlighted: true});
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
});

function execute(elementId){
	getCurrentTab(function(tabs){
		dispatchClickToAllTabs(tabs, elementId)

		//Update current trackname;
		setTimeout(updateTrackInfo, 2000);
	});
}

function dispatchClick(tabId, elementId) {
	chrome.tabs.executeScript(tabId, {
		code: APP_PLAYER + ".getElementById('" + elementId + "').click()"
	});
}

function dispatchClickToAllTabs(tabs, elementId) {
	tabs.forEach(function (tab) {
		dispatchClick(tab.id, elementId);
	})
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

function fetchClassNamesById(tab, id, callback) {
	chrome.tabs.executeScript(tab, {
		code: APP_PLAYER + '.getElementById("' + id + '").className;'
	}, function (response) {
		var classNamesList = String(response).split(" ");
		var classNamesObject = {};

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
	getCurrentTab(function(tabs) {
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
function getCurrentTab(successFunction) {
	chrome.tabs.query({url: MAIN_URL}, successFunction);
}
