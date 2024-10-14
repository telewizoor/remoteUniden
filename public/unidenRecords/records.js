var curUrl = window.location.href;

/* Remove port from the URL */
if( curUrl.includes(':') ) {
  var port = curUrl.split(':')[0];
}

/* Get subpage(if used) */
var subpage = curUrl.substring(curUrl.lastIndexOf('/') + 1);

var socket = io(curUrl, {path: "/uniden/"}); // nginx reverse proxy works on 80

var reload       = false;
var filterSwitch = true;
var maxRecords   = 30;
var getStatsSw   = false;
var recStats     = {};

document.body.onload = pageRefresh();
document.body.onload = setCurrentDate();
document.body.onload = filterByDate();

function pageRefresh() {
    reload = true;
}

function setCurrentDate() {
    document.getElementById('dateFilter').valueAsDate = new Date();
}

function getFilterDate() {
    return document.getElementById('dateFilter').value;
}

function clearPlayers() {
    const subStatusDiv = document.getElementById('records');

    /* First - remove eveything form SubStatus div */
    while(subStatusDiv.firstChild) { 
        subStatusDiv.removeChild(subStatusDiv.firstChild); 
    } 
}

function filterByDate() {
    clearPlayers();

    filterSwitch = true;
    reload = true;
    getSavedRecords(getFilterDate());
}

function showAll() {
    clearPlayers();

    filterSwitch = false;
    reload = true;
    getSavedRecords("*");
}

function getSavedRecords(filter) {
    sendSocketData("getSavedRecords", filter);
}

function removeRecord(name) {
    if (confirm('Do you want to remove ' + name + ' ?' )) {
        sendSocketData("removeRecord", name);

        document.getElementById("Label" + name).remove();
        document.getElementById(name).remove();
        document.getElementById("delete" + name).remove();
    }
}

function urlExists(url) {
    var http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    return http.status == 200;
}

function getStats() {
    getStatsSw = true;
    recStats = {};
    showAll();
    
    //getAudioDuration("http://telewizoor-malina.duckdns.org/saved_rec/CH408_DEBLIN_APP_______128_2500MHz___2024_05_16_18_23_15.mp3");
}

function getChNumFromUrl(url) {
    return url.split('CH')[1].split('_')[0];
}

function getChNameFromUrl(url) {
    return url.split('MHz')[0] + 'MHz';
}

function sortDictByValue(dict) {
    return Object.keys(dict)
      .sort((a, b) => dict[b] - dict[a])
      .reduce((acc, key) => {
        acc[key] = dict[key];
        return acc;
      }, {});
  }

function getAudioDuration(url, lastItem) {
    var mp3file = url;

    // Create an instance of AudioContext
    var audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Make an Http Request
    var request = new XMLHttpRequest();
    request.open('GET', mp3file, true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        audioContext.decodeAudioData(request.response, function(buffer) {
            // Obtain the duration in seconds of the audio file (with milliseconds as well, a float value)
            var duration = buffer.duration;
            var durInt = parseInt(duration);
            console.log(request.response)
            if(getChNameFromUrl(url) in recStats) {
                recStats[getChNameFromUrl(url)] += durInt;
            } else {
                recStats[getChNameFromUrl(url)] = durInt;
            }
        });
    };

    if(lastItem) {
        console.log("Waiting 5s to show results...");
        setTimeout(() => {
            console.log(sortDictByValue(recStats));
        }, 5000);
    }
    
    // Start Request
    request.send();
}

function addPlayer(name, source, showPlayer = false) {
    const newLabel = document.createElement("a");
    const newLine = document.createElement("br");
    const newLine2 = document.createElement("br");
    const deleteImg = document.createElement('img'); 
    const newContent = document.createTextNode(name);

    deleteImg.setAttribute("src", "delete_ico.png");
    deleteImg.setAttribute("width", 32);
    deleteImg.setAttribute("height", 32);
    deleteImg.setAttribute("class", "deleteRec");
    deleteImg.setAttribute("id", "delete" + name);
    deleteImg.style.verticalAlign = 'middle';
    deleteImg.style.visibility = 'visible';

    if(showPlayer) {
        var sound      = document.createElement('audio');
        sound.id       = name;
        sound.controls = 'controls';
        sound.src      = source; //'http://192.168.1.31:8000/Stream.mp3';

        if (source.includes('.mp3')) {
            sound.setAttribute('type', 'audio/mpeg');
        } else if (source.includes('.wav')) {
            sound.setAttribute('type', 'audio/x-wav');
        }
    } else {
        var sound      = document.createElement('div');
    }

    newLabel.setAttribute('id', "Label" + name);
    newLabel.setAttribute('class', "lastCallsAudioLabels");
    newLabel.setAttribute('href', source);
    newLabel.style.textDecoration = 'underline';
    newLabel.style.cursor = 'pointer';
    newLabel.appendChild(newContent);

    // add the newly created element and its content into the DOM
    const currentDiv = document.getElementById("records");
    currentDiv.appendChild(newLabel, sound);
    currentDiv.appendChild(newLine);
    currentDiv.appendChild(sound, deleteImg);
    currentDiv.appendChild(deleteImg, currentDiv);
    currentDiv.appendChild(newLine2);
}

function sendSocketData(cmd = '', data1 = '', data2 = '') {
    test = CryptoJS.SHA256($('#password').val()).toString(CryptoJS.enc.Hex);
    socket.emit('unidenMain', CryptoJS.SHA256($('#password').val()).toString(CryptoJS.enc.Hex), cmd, data1, data2);
}

socket.on('savedRecords', function(data) {
    if (filterSwitch) {
        var dateFilter = getFilterDate();
        dateFilter = '_' + dateFilter.replaceAll('-', '_');
        data = data.filter(function(s){
            return ~s.indexOf(dateFilter);
        });
    }

    if (reload) {
        reload = false;
        /* sort by date */
        /* CH054_ACC_Low_Z__JKR___130_8750MHz___2024_02_11_20_24_30.mp3 */
        // data.sort(function(a,b) {
        //     a = a.slice(37).slice(0,-4).split('_').join('');
        //     b = b.slice(37).slice(0,-4).split('_').join('');
        //     return a > b ? -1 : a < b ? 1 : 0;
        //     // return a.localeCompare(b);         // <-- alternative 
        // });
        var showPlayer = true;
        for (var i = 0; i < data.length; i++) {
            if(i > maxRecords) {
                showPlayer = false;
            } else {
                if(getStatsSw) {
                    audioUrl = window.location.href.slice(0, -14) + "/saved_rec/" + data[i];
                    getAudioDuration(audioUrl, i==maxRecords);
                }
            }

            addPlayer(data[i], "/saved_rec/" + data[i], showPlayer);
            document.getElementById("delete" + data[i]).setAttribute("onclick", "removeRecord(\"" + data[i] + "\")");
        }
        getStatsSw = false;
    }
});
