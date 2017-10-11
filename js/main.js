/* globals XMLHttpRequest, chrome */

var MAIN_URL = 'https://open.spotify.com/*'
var ALBUMS_URL = 'https://open.spotify.com/collection/albums'
var APP_PLAYER = 'document.getElementById("app-player").contentDocument'
var VAGALUME_API = '4b426abf3e83723a3f0ba2dedc63e6e2'

// utils
function findEl (path) {
  return document.querySelector(path)
}

function onClick (el, callback) {
  return el.addEventListener('click', callback)
}

var Chrome = {
  executeScript: function (options, callback) {
    var tab = options.tab
    var code = options.code

    chrome.tabs.executeScript(tab.id, {
      code: code
    }, callback)
  }
}

var State = {
  tabs: []
}

var Spotify = {
  createTab: function () {
    chrome.tabs.create({url: ALBUMS_URL})
  },

  openTab: function () {
    chrome.tabs.update(State.tabs[0].id, {highlighted: true})
  },

  getCurrentTab: function (callback) {
    chrome.tabs.query({url: MAIN_URL}, callback)
  },

  getAlbumArt: function (tab, callback) {
    Chrome.executeScript({
      tab: tab,
      code: 'document.querySelector(".nowPlayingBar-container .cover-art-image").style.backgroundImage'
    }, function (res) {
      var albumArt = res[0].replace('url(', '').replace(')', '')

      callback(albumArt)
    })
  },

  getTrackName: function (tab, callback) {
    Chrome.executeScript({
      tab: tab,
      code: 'document.querySelector(".track-info__name a").innerHTML'
    }, callback)
  },

  getArtistName: function (tab, callback) {
    Chrome.executeScript({
      tab: tab,
      code: 'document.querySelector(".track-info__artists a").innerText'
    }, callback)
  },

  getPlayOrPauseStatus: function (tab, callback) {
    Chrome.executeScript({
      tab: tab,
      code: 'document.querySelector(\'.nowPlayingBar-container .player-controls button[class^="control-button spoticon-pause"]\')'
    }, function (res) {
      var status = res[0] ? 'playing' : 'paused'

      callback(status)
    })
  },

  click: function (options, callback) {
    var tab = options.tab
    var query = options.query
    var code = 'document.querySelector(\'' + query + '\').click()'

    Chrome.executeScript({
      tab: tab,
      code: code
    }, callback)
  },

  pause: function (tab, callback) {
    Spotify.click({
      tab: tab,
      query: '.nowPlayingBar-container .player-controls button[class^="control-button spoticon-pause"]'
    }, callback)
  },

  play: function (tab, callback) {
    Spotify.click({
      tab: tab,
      query: '.nowPlayingBar-container .player-controls button[class^="control-button spoticon-play"]'
    }, callback)
  },

  previous: function (tab, callback) {
    Spotify.click({
      tab: tab,
      query: '.nowPlayingBar-container .player-controls button[class^="control-button spoticon-skip-back"]'
    }, callback)
  },

  next: function (tab, callback) {
    Spotify.click({
      tab: tab,
      query: '.nowPlayingBar-container .player-controls button[class^="control-button spoticon-skip-forward"]'
    }, callback)
  }
}

var App = {
  setTheme: function (theme) {
    var bodyColor = theme === 'light'
      ? 'Dark'
      : 'Light'

    document.body.setAttribute('class', theme)
    findEl('#color-body').innerHTML = bodyColor
  }
}

function changeColor () {
  if (document.body.className === 'light') {
    document.body.setAttribute('class', 'dark')
    document.getElementById('color-body').innerHTML = 'Light'
    chrome.storage.sync.set({'color': 'dark'})
  } else {
    document.body.setAttribute('class', 'light')
    document.getElementById('color-body').innerHTML = 'Dark'
    chrome.storage.sync.set({'color': 'light'})
  }
}

function fetchLyrics () {
  // get artist and trackname
  var artist = findEl('#current-track-artist').innerHTML
  var track = findEl('#current-track-name').innerHTML
  var xhr = new XMLHttpRequest()

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var response = JSON.parse(xhr.responseText)

      findEl('#container-lyrics').style.display = 'flex'
      findEl('#container-lyrics').innerHTML = (response.mus && response.mus[0] ? response.mus[0].text : 'Sorry, no lyric available for this song.')
    }
  }
  xhr.open('GET', 'https://api.vagalume.com.br/search.php?art=' + artist + '&mus=' + track + '&apikey=' + VAGALUME_API)
  xhr.send()
}

/**
 * Fetch spotify element class (from id)
 * return: object with classnames as attributes and value=true
 */
function fetchClassNamesById (tab, id, callback) {
  chrome.tabs.executeScript(tab, {
    code: APP_PLAYER + '.getElementById("' + id + '").className'
  }, function (response) {
    var classNamesList = String(response).split(' ')
    var classNamesObject = {} // object with className:true

    classNamesList.forEach(function (className) {
      classNamesObject[className] = true
    })

    callback(classNamesObject)
  })
}

function fetchControlState (tab, control, callback) {
  fetchClassNamesById(tab, control, function (response) {
    var state = 'active'

    if (response.disabled) {
      state = 'disabled'
    }

    callback(control, state)
  })
}

function togglePlayPause () {
  for (var tab of State.tabs) {
    Spotify.getPlayOrPauseStatus(tab, function (status) {
      var toggle = {
        paused: 'playing',
        playing: 'paused',
        disabled: 'disabled'
      }

      renderPlayPauseState(toggle[status])
    })
  }
}

function renderAlbumArt (albumArtURL) {
  findEl('#background-album').style.background = 'url(' + albumArtURL + ')'
  findEl('#album-art').innerHTML = '<img src=' + albumArtURL + ' style="width:180px; height:180px">'
}

function renderTrackName (name) {
  console.log('renderTrackName', name);
  findEl('#current-track-name').innerHTML = name || '-'
}

function renderTrackArtist (artist) {
  console.log('renderTrackArtist', artist);
  findEl('#current-track-artist').innerHTML = artist || '-';
}

function renderControlState (control, state) {
  var controlClassName = 'controller__skip-back'

  if (state === 'disabled') {
    controlClassName += ' disabled'
  }

  document.getElementById(control).className = controlClassName
}

function renderPlayPauseState (state) {
  var playPauseDOM = findEl('#play-pause')
  var playPauseClassName = 'glyphicon glyphicon-play'

  switch (state) {
    case 'playing':
      playPauseClassName = 'glyphicon glyphicon-pause'
      playPauseDOM.removeAttribute('disabled', true)
      break
    case 'paused':
      playPauseDOM.removeAttribute('disabled', true)
      break
    case 'disabled':
      playPauseDOM.setAttribute('disabled', true)
  }

  playPauseDOM.getElementsByTagName('span')[0].className = playPauseClassName
}

function execute (action) {
  State.tabs.forEach(function (tab) {
    Spotify[action](tab)
  })

  // Update current trackname
  setTimeout(updateTrackInfo, 2000)
}

/**
 * Show current trackname if there's one
 */
function updateTrackInfo () {
  for (var tab of State.tabs) {
    Spotify.getAlbumArt(tab, renderAlbumArt)
    Spotify.getTrackName(tab, renderTrackName)
    Spotify.getArtistName(tab, renderTrackArtist)

    fetchControlState(tab.id, 'previous', renderControlState)
    fetchControlState(tab.id, 'next', renderControlState)

    Spotify.getPlayOrPauseStatus(tab, renderPlayPauseState)
  }
}

function fetchTheme (callback) {
  chrome.storage.sync.get('color', function (item) {
    callback(item.color || 'dark')
  })
}

function setInitialTheme () {
  fetchTheme(App.setTheme)
}

function handlePayOrPauseClick () {
  State.tabs.forEach(function (tab) {
    Spotify.getPlayOrPauseStatus(tab, function (status) {
      return status === 'playing'
        ? execute('pause')
        : execute('play')
    })
    togglePlayPause()
  })
}

function handleLogoClick () {
  return State.tabs.length
    ? Spotify.openTab(State.tabs)
    : Spotify.createTab()
}

function setInitialState (callback) {
  Spotify.getCurrentTab(function (tabs) {
    State.tabs = tabs

    callback()
  })
};

// init
document.addEventListener('DOMContentLoaded', function () {
  setInitialState(function () {
    updateTrackInfo()
    setInitialTheme()

    // events
    onClick(findEl('#open'), handleLogoClick)
    onClick(findEl('#color-body'), changeColor)
    onClick(findEl('#play-pause'), handlePayOrPauseClick)
    onClick(findEl('#previous'), function () {
      execute('previous')
    })
    onClick(findEl('#next'), function () {
      execute('next')
    })
    onClick(findEl('#show-lyrics'), fetchLyrics)
  })
})
