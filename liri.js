require("dotenv").config();
var Spotify = require('node-spotify-api');
var keys = require("./keys.js");
var axios = require("axios");
var moment = require("moment");
var fs = require("fs");
var path = require("path");


var hasSpotifyId = keys.spotify.id && keys.spotify.id.length;
var hasSpotifySecret = keys.spotify.secret && keys.spotify.secret.length;
var hasOMDBApiKey = keys.omdb.apiKey && keys.omdb.apiKey.length;
if (!hasSpotifyId || !hasSpotifySecret || !hasOMDBApiKey) {
  console.log("Unable to run, missing secrets. Configure in '.env':\n");
  if (!hasSpotifyId) console.log('SPOTIFY_ID = <your spotify id>');
  if (!hasSpotifySecret) console.log('SPOTIFY_SECRET = <your spotify secret>');
  if (!hasOMDBApiKey) console.log('OMDB_API_KEY = <your omdb api key>');

  return;
}

var spotify = new Spotify(keys.spotify);

const COMMANDS = {
  "concert-this": handleConcertThis,
  "spotify-this-song": handleSpotifyThisSong,
  "movie-this": handleMovieThis,
  "do-what-it-says": handleDoWhatItSays,
};

function handleCommand(command, commandArg) {
  if (command in COMMANDS) {
    COMMANDS[command](commandArg)
  } else {
    console.log(`Invalid command '${command}'. Provide one of [${Object.keys(COMMANDS).join(', ')}]`);
    return;
  }
}

function handleConcertThis(search) {
  if (!search || search.length === 0) {
    console.log('Unable to find events, please provide a search term');
    return;
  }
  
  const url = `https://rest.bandsintown.com/artists/${encodeURIComponent(search)}/events?app_id=codingbootcamp`;

  function printEvent(event) {
    console.log('');
    console.log(`Venue name:     ${event.venue.name}`);
    console.log(`Venue location: ${event.venue.city}`);
    console.log(`Event date:     ${moment(event.datetime).format('MM/DD/YYYY hh:mm A')}`);
  }

  console.log(`Events for '${search}':`);
  axios.get(url).then((response) => {
    if (response.status == 200) {
      const events = response.data;
      events.forEach(event => {
        printEvent(event);
      })
    }
  }).catch((err) => {
    if (err) {
      console.log(`Unable to lookup concert '${search}'`, err);
      return;
    }
  });
}

function handleSpotifyThisSong(search) {
  function printTrackItem(trackItem) {
    console.log('');
    console.log(`Artist:     ${trackItem.artists[0].name}`);
    console.log(`Album:      ${trackItem.album.name}`);
    console.log(`Song:       ${trackItem.name}`);
    console.log(`Preview:    ${trackItem.external_urls.spotify}`);
  }

  if (!search || search.length === 0) {
    search = 'The Sign Ace of Base';
  }

  console.log(`Songs for '${search}':`);
  spotify.search({
    type: 'track',
    query: search,
  }, (err, data) => {
    if (err) {
      console.log(`Unable to lookup song '${search}'`, err);
      return;
    }

    data.tracks.items.forEach(trackItem => { 
      printTrackItem(trackItem) 
    });
  });
}

function handleMovieThis(search) {
  if (!search || search.length === 0) {
    search = 'Mr. Nobody';
  }

  function printMovie(movie) {
    console.log(`Title :                 ${movie.Title}`);
    console.log(`Year:                   ${movie.Year}`);
    console.log(`IMDB Rating:            ${movie.imdbRating}`);
    for (const rating of movie.Ratings) {
      if (rating.Source === "Rotten Tomatoes") {
        console.log(`Rotten Tomatoes Rating: ${rating.Value}`);
        break;
      }
    }
    console.log(`Country:                ${movie.Country}`);
    console.log(`Language:               ${movie.Language}`);
    console.log(`Actors:                 ${movie.Actors}`);
    console.log(`Plot:                   ${movie.Plot}`);
  }

  console.log(`Movies for '${search}':`);
  const url = `http://www.omdbapi.com/?t=${encodeURIComponent(search)}&apikey=${keys.omdb.apiKey}`;
  axios.get(url).then(res => {
    if (res.status == 200) {
      printMovie(res.data);
    }
  }).catch((err) => {
    if (err) {
      console.log(`Unable to lookup movie '${search}'`, err);
      return;
    }
  });
}

function handleDoWhatItSays() {
    console.log("Doing what it says:");
    
    const data = fs.readFileSync(path.join(__dirname, 'random.txt'));
    
    // remove empty lines
    const lines = data.toString().split(/\r?\n/).filter(line => line && line.length );
    const randomInt = Math.floor(Math.random() * lines.length);
    const chosenLine = lines[randomInt];
    const commandSearchTerm = chosenLine.split(",");
    handleCommand(commandSearchTerm[0], commandSearchTerm[1].replace('"', ''));
}

function main(argv) {
  if (argv.length === 0) {
    console.log(`Provide a command, one of [${Object.keys(COMMANDS).join(', ')}]`);
    return;
  }

  const command = argv[0];
  const commandArg = argv.slice(1).join(" ");;

  handleCommand(command, commandArg);
};

main(process.argv.slice(2));