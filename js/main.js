const MAIN_URL = 'https://open.spotify.com/*';
const ALBUMS_URL = 'https://open.spotify.com/collection/albums';
const APP_PLAYER = 'document.getElementById("app-player").contentDocument';

const BACKEND_URL = 'https://spotify-lyrics.vaslyn.epi.codes';
const BACKGROUND_COLOR_PALLETE = ["#6565b3", "#2f80ed", "#e29587", "#20002c", "#c33764", "#a7bfe8", "#44a08d", "#b06ab3", "#4568dc", "#43c6ac", "#000c40", "#3494e6", "#fdb99b", "#ff7e5f", "#3a6186", "#89253e", "#2c3e50"]

const selectors = {
  albumArt:
    '#main .Root__now-playing-bar .now-playing-bar__left .cover-art-image',
  trackName: '.track-info__name a',
  artistName: '.track-info__artists a',
  playPauseBtn:
    '#main .Root__now-playing-bar .now-playing-bar__center .player-controls__buttons button.control-button--circled',
  prevBtn:
    '#main .Root__now-playing-bar .now-playing-bar__center .player-controls__buttons button.spoticon-skip-back-16',
  nextBtn:
    '#main .Root__now-playing-bar .now-playing-bar__center .player-controls__buttons button.spoticon-skip-forward-16',
};

// utils
function findEl(path) {
  return document.querySelector(path) || {}
}

function onClick(el, callback) {
  if (el) {
    return el.addEventListener('click', callback)
  }
}

const Chrome = {
  executeScript(options, callback) {
    const { tab, code } = options;

    chrome.tabs.executeScript(
      tab.id,
      {
        code,
      },
      callback,
    );
  },
};

const State = {
  tabs: [],
};

const Spotify = {
  createTab() {
    chrome.tabs.create({ url: ALBUMS_URL });
  },

  openTab() {
    chrome.tabs.update(State.tabs[0].id, { highlighted: true });
  },

  getCurrentTab(callback) {
    chrome.tabs.query({ url: MAIN_URL }, callback);
  },

  getAlbumArt(tab, callback) {
    Chrome.executeScript(
      {
        tab,
        code: `document.querySelector('${selectors.albumArt}').style.backgroundImage`,
      },
      (res) => {
        const albumArt = res[0].replace('url(', '').replace(')', '');
        callback(albumArt);
      },
    );
  },

  getTrackName(tab, callback) {
    Chrome.executeScript(
      {
        tab,
        code: `document.querySelector('${selectors.trackName}').innerHTML`,
      },
      callback,
    );
  },

  getArtistName(tab, callback) {
    Chrome.executeScript(
      {
        tab,
        code: `document.querySelector('${selectors.artistName}').innerText`,
      },
      callback,
    );
  },

  getPlayOrPauseStatus(tab, callback) {
    Chrome.executeScript(
      {
        tab,
        code: `document.querySelector('${selectors.playPauseBtn}').className`,
      },
      (res) => {
        if (res[0].indexOf('pause') === -1) {
          callback('paused');
        } else {
          callback('playing');
        }
      },
    );
  },

  click(options, callback) {
    const { tab, query } = options;
    const code = `document.querySelector('${query}').click()`;

    Chrome.executeScript(
      {
        tab,
        code,
      },
      callback,
    );
  },

  pause(tab, callback) {
    // console.log(findEl("#container-lyrics").innerText);
    Spotify.click(
      {
        tab,
        query: selectors.playPauseBtn,
      },
      callback,
    );
  },

  play(tab, callback) {

    Spotify.click(
      {
        tab,
        query: selectors.playPauseBtn,
      },
      callback,
    );

    setTimeout(() => {
      if (findEl("#container-lyrics").innerHTML === "") {
        fetchLyrics();
      }
      
    }, 2500);
  },

  previous(tab, callback) {
    changeBackgroundColor();
    let prevSongTitle = findEl('#current-track-name').innerHTML;
    Spotify.click(
      {
        tab,
        query: selectors.prevBtn,
      },
      callback,
    );
    setTimeout(() => {
      if (findEl('#current-track-name').innerHTML !== prevSongTitle) {
        fetchLyrics();
      }
      
    }, 2500);
  },

  next(tab, callback) {
    changeBackgroundColor();
    Spotify.click(
      {
        tab,
        query: selectors.nextBtn,
      },
      callback,
    );
    setTimeout(() => {
      fetchLyrics();
    }, 1500);
  },
};

const App = {
  setTheme(theme) {
    const bodyColor = theme === 'light' ? 'Dark' : 'Light';

    document.body.setAttribute('class', theme);
    // findEl('#color-body').innerHTML = bodyColor;
  },
};

function changeColor() {
  if (document.body.className === 'light') {
    document.body.setAttribute('class', 'dark');
    // document.getElementById('color-body').innerHTML = 'Light';
    chrome.storage.sync.set({ color: 'dark' });
  } else {
    document.body.setAttribute('class', 'light');
    // document.getElementById('color-body').innerHTML = 'Dark';
    chrome.storage.sync.set({ color: 'light' });
  }
}

function updateLyricsText(text) {
  const container = findEl('#container-lyrics');
  container.style.display = 'flex';
  container.style.textAlign = 'center';
  container.innerText = text;
}

async function fetchLyrics() {
  // get artist and trackname
  const artist = findEl('#current-track-artist').innerHTML;
  const track = findEl('#current-track-name').innerHTML;

  

  updateLyricsText('Loading...');

  // to protect accesstoken there is a custom backend
  // see https://gitlab.com/lodi-g/spotify-control-chrome-extension-backend
  const res = await fetch(BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({ artist, track }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) {
    updateLyricsText('Song not found on genius.com');
  } else if (!res.ok) {
    updateLyricsText(
      'Unknown error, feel free to open an issue on GitHub: https://github.com/thiagoribeir015/spotify-control-chrome-extension/',
    );
  } else {
    const lyrics = await res.text();

    updateLyricsText(lyrics.trim());
  }
}

/**
 * Fetch spotify element class (from id)
 * return: object with classnames as attributes and value=true
 */
function fetchClassNamesById(tab, id, callback) {
  chrome.tabs.executeScript(
    tab,
    {
      code: `${APP_PLAYER}.getElementById("${id}").className`,
    },
    (response) => {
      const classNamesList = String(response).split(' ');
      const classNamesObject = {}; // object with className:true

      classNamesList.forEach((className) => {
        classNamesObject[className] = true;
      });

      callback(classNamesObject);
    },
  );
}

function fetchControlState(tab, control, callback) {
  fetchClassNamesById(tab, control, (response) => {
    let state = 'active';

    if (response.disabled) {
      state = 'disabled';
    }

    callback(control, state);
  });
}

function togglePlayPause() {
  for (const tab of State.tabs) {
    Spotify.getPlayOrPauseStatus(tab, (status) => {
      const toggle = {
        paused: 'playing',
        playing: 'paused',
        disabled: 'disabled',
      };

      renderPlayPauseState(toggle[status]);
    });
  }
}

function renderAlbumArt(albumArtURL) {
  // findEl('#background-album').style.background = `url(${albumArtURL})`;
  findEl('#album-art').innerHTML = `<img src=${albumArtURL} style="width:50px; height:50px">`;
}

function renderTrackName(name) {
  findEl('#current-track-name').innerHTML = name || '-';
}

function renderTrackArtist(artist) {
  findEl('#current-track-artist').innerHTML = artist || '-';
}

function renderControlState(control, state) {
  let controlClassName = 'controller__skip-back';

  if (state === 'disabled') {
    controlClassName += ' disabled';
  }

  document.getElementById(control).className = controlClassName;
}

function renderPlayPauseState(state) {
  const playPauseDOM = findEl('#play-pause');
  let playPauseClassName = 'glyphicon glyphicon-play';

  switch (state) {
    case 'playing':
      playPauseClassName = 'glyphicon glyphicon-pause';
      playPauseDOM.removeAttribute('disabled', true);
      break;
    case 'paused':
      playPauseDOM.removeAttribute('disabled', true);
      break;
    case 'disabled':
      playPauseDOM.setAttribute('disabled', true);
      break;
    default:
      break;
  }

  playPauseDOM.getElementsByTagName('span')[0].className = playPauseClassName;
}

/**
 * Show current trackname if there's one
 */
function updateTrackInfo() {
  for (const tab of State.tabs) {
    Spotify.getAlbumArt(tab, renderAlbumArt);
    Spotify.getTrackName(tab, renderTrackName);
    Spotify.getArtistName(tab, renderTrackArtist);

    fetchControlState(tab.id, 'previous', renderControlState);
    fetchControlState(tab.id, 'next', renderControlState);

    Spotify.getPlayOrPauseStatus(tab, renderPlayPauseState);
  }
}

function execute(action) {
  State.tabs.forEach((tab) => {
    Spotify[action](tab);
  });

  // Update current trackname
  setTimeout(updateTrackInfo, 1000);
}

function fetchTheme(callback) {
  chrome.storage.sync.get('color', (item) => {
    callback(item.color || 'dark');
  });
}

function setInitialTheme() {
  fetchTheme(App.setTheme);
}

// this method is called on background.js to toggle between play/pause;
function handlePlayOrPauseClick() {
  State.tabs.forEach((tab) => {
    Spotify.getPlayOrPauseStatus(tab, status => (status === 'playing' ? execute('pause') : execute('play')));
    togglePlayPause();
  });
}

function handleLogoClick() {
  return State.tabs.length ? Spotify.openTab(State.tabs) : Spotify.createTab();
}

function changeBackgroundColor() {
  var randColor = BACKGROUND_COLOR_PALLETE[Math.floor(Math.random() * BACKGROUND_COLOR_PALLETE.length)];
  document.body.style.background = randColor;
  
}

function setInitialState(callback) {
  Spotify.getCurrentTab((tabs) => {
    State.tabs = tabs;

    callback();
  });
}

// init
document.addEventListener('DOMContentLoaded', () => {
  setInitialState(() => {
    updateTrackInfo();
    setInitialTheme();

    // events
    onClick(findEl('#open'), handleLogoClick);
    // onClick(findEl('#color-body'), changeColor);
    onClick(findEl('#play-pause'), handlePlayOrPauseClick);
    onClick(findEl('#previous'), () => {
      execute('previous');
    });
    onClick(findEl('#next'), () => {
      execute('next');
    });
    // onClick(findEl('#show-lyrics'), fetchLyrics);
  });
});
