var curUrl = window.location.href.slice(0, -14);
var socket = io(curUrl + ':80'); //load socket.io-client and connect to the host that serves the page

document.body.onload = getSavedRecords();

function getSavedRecords() {
    socket.emit("getSavedRecords");
}

function removeRecord(name) {
    if (confirm('Do you want to remove ' + name + ' ?' )) {
        socket.emit("removeRecord", name);

        document.getElementById("Label" + name).remove();
        document.getElementById(name).remove();
        document.getElementById("delete" + name).remove();
    }
}

function urlExists(url)
{
    var http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    return http.status == 200;
}

function addPlayer(name, source) {
    const newLabel = document.createElement("div");
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

    var sound      = document.createElement('audio');
    sound.id       = name;
    sound.controls = 'controls';
    sound.src      = source; //'http://192.168.1.31:8000/Stream.mp3';

    sound.setAttribute('type', 'audio/mpeg');

    newLabel.setAttribute('id', "Label" + name);
    newLabel.setAttribute('class', "lastCallsAudioLabels");
    newLabel.appendChild(newContent);

    // add the newly created element and its content into the DOM
    const currentDiv = document.getElementById("lastCallsRecords");
    document.body.insertBefore(deleteImg, currentDiv);
    document.body.insertBefore(sound, deleteImg);
    document.body.insertBefore(newLabel, sound);
}

socket.on('savedRecords', function(data) {
    for (var i = 0; i < data.length; i++) {
        addPlayer(data[i], "/saved_rec/" + data[i]);
        document.getElementById("delete" + data[i]).setAttribute("onclick", "removeRecord(\"" + data[i] + "\")");
    }
});
