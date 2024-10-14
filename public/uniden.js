var curUrl = window.location.href;

/* Remove port from the URL */
if( curUrl.includes(':') ) {
  var port = curUrl.split(':')[0];
}

/* Get subpage(if used) */
var subpage = curUrl.substring(curUrl.lastIndexOf('/') + 1);

var socket = io(curUrl, {path: "/uniden/"}); // nginx reverse proxy works on 80

var lastCalls;
var lastCallsLines;
var onLoad       = 1;
var maxLastCalls = 10;
var recExt       = '.mp3';
var delayMs      = 1; /* delay for showing data */
var delayEnabled = 0;
var channelsToWrite = '';

var squelchIndex           = 14;
var lastCallsIndexFromEnd  =  4; //23; // -3
var cpuLoadIndexFromEnd    =  3; //24;
var cpuTempIndexFromEnd    =  2; //25;
var wifiStatusIndexFromEnd =  1; //26;

document.body.onload = createLastCalls();

/* Cut last slash */
if(curUrl[curUrl.length - 1] == '/') {
  curUrl = curUrl.slice(0, -1);
}
document.body.onload = changeAudio('liveStream', curUrl + subpage + ':8000/Stream.mp3');

function readSingleFile(e) {
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var contents = e.target.result;
    updateChannelsToWrite(contents);
  };
  reader.readAsText(file);
}

function updateChannelsToWrite(contents) {
  channelsToWrite = contents;
}

document.getElementById('file-input')
  .addEventListener('change', readSingleFile, false);

function callToRecName(call, num, ext=1) {
  var name = '';

  name = call.toString().replaceAll(' ', '_').replaceAll(':', '_').replaceAll('|', '_').replaceAll('.', '_').replaceAll('(', '_').replaceAll(')', '_').replaceAll('?', '_').replaceAll('-', '_');

  if(num != 999) {
    name = name + '_' + num;
  } else {
    name = name;
  }

  if(ext==1) {
    name = name + recExt;
  }

  return name;
}

function urlExists(url)
{
    var http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    return http.status == 200;
}

function saveRecord(elName, recName) {
  sendSocketData("saveRecord", String(recName));
  elName.style.visibility = 'hidden';
}

function changeAudio(elName, source) {
  var src = source;
  if(src.search("none") > -1){
    src = 'music/music.mp3';
  }
  var audioElement = document.getElementById(elName);
  audioElement.setAttribute('src', src);
  // Load src of the audio file
  audioElement.load();
  if(elName != 'liveStream') {
    // TODO: 
    document.getElementById(elName + "prio1").setAttribute( "onclick", "addPrioChannel(\"" + source.split('/')[source.split('/').length-1] + "\"," + "1)" );
    document.getElementById(elName + "prio2").setAttribute( "onclick", "addPrioChannel(\"" + source.split('/')[source.split('/').length-1] + "\"," + "2)" );
    document.getElementById(elName + "prio3").setAttribute( "onclick", "addPrioChannel(\"" + source.split('/')[source.split('/').length-1] + "\"," + "3)" );
    document.getElementById(elName + "prio4").setAttribute( "onclick", "addPrioChannel(\"" + source.split('/')[source.split('/').length-1] + "\"," + "4)" );
    document.getElementById(elName + "prio5").setAttribute( "onclick", "addPrioChannel(\"" + source.split('/')[source.split('/').length-1] + "\"," + "5)" );
  }
};

function testPrint() {
  console.log("TEST");
}

function addPlayer(name, source) {
  const newLabel = document.createElement("div");
  const newLine = document.createElement("br");
  const newLine2 = document.createElement("br");
  const saveImg = document.createElement("img");
  const prioLabel = document.createElement("label");
  const prio1 = document.createElement("button");
  const prio2 = document.createElement("button");
  const prio3 = document.createElement("button");
  const prio4 = document.createElement("button");
  const prio5 = document.createElement("button");
  const newContent = document.createTextNode(name);

  saveImg.setAttribute("src", "save_ico.png");
  saveImg.setAttribute("class", "saveRec");
  saveImg.setAttribute("id", "save" + name);
  saveImg.style.visibility = 'hidden';

  prioLabel.textContent = "PRIO:";
  prioLabel.setAttribute( 'class', 'prioChannelsLabel' );

  prio1.setAttribute( 'id', name + "prio1" );
  prio1.textContent = "1";
  prio2.setAttribute( 'id', name + "prio2" );
  prio2.textContent = "2";
  prio3.setAttribute( 'id', name + "prio3" );
  prio3.textContent = "3";
  prio4.setAttribute( 'id', name + "prio4" );
  prio4.textContent = "4";
  prio5.setAttribute( 'id', name + "prio5" );
  prio5.textContent = "5";

  prio1.setAttribute( 'class', 'prioChannels' );
  prio2.setAttribute( 'class', 'prioChannels' );
  prio3.setAttribute( 'class', 'prioChannels' );
  prio4.setAttribute( 'class', 'prioChannels' );
  prio5.setAttribute( 'class', 'prioChannels' );

  var sound      = document.createElement('audio');
  sound.id       = name;
  sound.controls = 'controls';
  sound.src      = source; //'http://192.168.1.31:8000/Stream.mp3';

  if (source.includes('.mp3')) {
    sound.setAttribute('type', 'audio/mpeg');
  } else if (source.includes('.wav')) {
      sound.setAttribute('type', 'audio/x-wav');
  }

  newLabel.setAttribute('id', "Label" + name);
  newLabel.setAttribute('class', "lastCallsAudioLabels");
  newLabel.appendChild(newContent);

  // add the newly created element and its content into the DOM
  const currentDiv = document.getElementById("lastCallsRecords");
  document.body.insertBefore(prio5, currentDiv);
  document.body.insertBefore(prio4, prio5);
  document.body.insertBefore(prio3, prio4);
  document.body.insertBefore(prio2, prio3);
  document.body.insertBefore(prio1, prio2);
  document.body.insertBefore(prioLabel, prio1);
  document.body.insertBefore(saveImg, prioLabel);
  document.body.insertBefore(sound, saveImg);
  document.body.insertBefore(newLabel, sound);
  document.body.insertBefore(newLine, newLabel);
  document.body.insertBefore(newLine2, newLine);
}

function createLastCalls() {
  for (var i = 0; i < maxLastCalls; i++) {
    addPlayer('LastCall' + i," ");
  }
}

function updateLastCallsButton() {
  updateLastCalls(lastCallsLines);
}

function updateLastCalls(calls) {
  var reqTable = [];
  for (var i = 0; i < maxLastCalls; i++) {
    if(calls[i] != null && calls[i] != '') {
      var recName = '/rec/' + callToRecName(calls[i], 999);
      var divName = 'LastCall' + i;

      /* update source only on difference */
      //if (document.getElementById('Label' + divName).textContent != calls[i]) {
        $('#Label' + divName).text(calls[i]);
        /* dont update audio for last one - there is no ready recording */
        if (i == maxLastCalls-1) {
          recName = recName.replace(recExt, '_0' + recExt);
        }
        changeAudio(divName, curUrl + recName);
        /* create table for asking if recording is saved */
        reqTable.push(recName);
      //}
    } else {
      reqTable.push(0);
    }
  }
  /* ask if current last calls are already saved */
  if( reqTable.length > 0 ) {
    checkIfRecordsSaved(reqTable);
  }
}

function checkIfRecordsSaved(table) {
  sendSocketData("checkIfRecordsSaved", table);
}

function buttonPress(button_type) {
  sendSocketData("buttonPress", String(button_type));
}

function debugCheckBox(input) {
  if (!input.checked) {
    document.getElementById('debugInfo').setAttribute('style', 'display:none');
  } else {
    document.getElementById('debugInfo').setAttribute('style', 'display:grid');
  }
}

function delayCheckBoxPress(input) {
  if (!input.checked) {
    delayMs = 1;
  } else {
    delayMs = 5000;
  }
}

function readChannelMemButton() {
  sendSocketData("readChannelMem");
}

function writeChannelMemButton() {
  var chList = channelsToWrite;
  if( chList != '' && chList.includes('CIN') ) {
    sendSocketData("writeChannelMem", chList);
  }
}

function sendCmd() {
  var cmd = "CIN,1,BALICE ATIS,01261250,AM,0,2,1,0";
  var prg = 1;
  sendSocketData("unidenSendCmd", cmd, prg);
}

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function arrayBufferToString(buffer) {
  let str = '';
  const array = new Uint8Array(buffer);
  for (let i = 0; i < array.length; i++) {
    str += String.fromCharCode(array[i]);
  }
  return str;
}

function buf2hex(buffer) { // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
}

function sendSocketData(cmd = '', data1 = '', data2 = '') {
  test = CryptoJS.SHA256($('#password').val()).toString(CryptoJS.enc.Hex);
  socket.emit('unidenMain', CryptoJS.SHA256($('#password').val()).toString(CryptoJS.enc.Hex), cmd, data1, data2);
}

function readPrioChannels() {
  sendSocketData( "unidenReadPrioChannels" );
}

function addPrioChannel( channelInfo, prioChNum ) {
  var chNum = channelInfo.split( 'CH' )[1].slice( 0, 3 );
  if (confirm('Do you want to add this channel ' + channelInfo.split('___202')[0] + ' to priority channel no.' + prioChNum + '?' )) {
    sendSocketData( "unidenAddChToPrio", chNum, prioChNum );
  }
}

socket.on('receiveBuffer', function(data) {
  $('#debugTxt').text("");
  $('#debugTxt').text(data);
});

socket.on('recordsSaved', function(data) {
  for(var i = 0; i < maxLastCalls; i++) {
    var recName = data[i*2];
    var divName = 'LastCall' + i;
    if( data[i*2+1] == 0 && recName != "0" ) {
      document.getElementById('save' + divName).setAttribute("onclick", "saveRecord(save" + divName + ", \"" + recName.toString() + "\")");
      document.getElementById('save' + divName).style.visibility = 'visible';
    } else {
      document.getElementById('save' + divName).style.visibility = 'hidden';
    }
  }
});

socket.on('unidenText', function(data) {
  var receivedData = data;
  var receivedDataHex = buf2hex(receivedData);
  var commaParserHex = receivedDataHex.split('2c');
  var commaParser = arrayBufferToString(data).split(',');
  var upperSmallLine = commaParser[2].split(' ') /* strange string with status of HOLD, squelch, voltage etc(first line) */
  var upperLine = commaParser[4];
  var midLine = commaParser[6];
  var bottomLine = commaParser[12];
  var channelNum = commaParser[6].split(' ')[0];
  var frequency = '';

  if (upperLine.includes('SEARCH') || upperLine.includes('Quick Search')) {
    frequency = commaParser[6];
  } else {
    frequency = commaParser[6].split(' ')[2];
  }

  try {
    frequency = frequency.slice(0, -1);
  }
  catch {
    frequencu = '';
  }

  var squelch  = 0;
  var hold     = '';
  var lo       = '';
  var sigPower = '0/5';
  var sigMod   = '';

  /* Hold */
  if (commaParserHex[2].includes("8d8e8f90")) {
    hold = '[HOLD]';
  }

  /* TL/O */
  if (commaParserHex[2].includes("93949697")) {
    lo = '[TL/O]';
  }
  
  /* signal strength: a6 a7 a8 a9 a ?? */
  if (commaParserHex[2].includes("a6")) {
    sigPower = '1/5';
  } else if (commaParserHex[2].includes("a7")) {
    sigPower = '2/5';
  } else if (commaParserHex[2].includes("a8a9")) {
    sigPower = '3/5';
  } else if (commaParserHex[2].includes("aaab")) {
    sigPower = '4/5';
  } else if (commaParserHex[2].includes("acad")) {
    sigPower = '5/5';
  }

  var func = '';
  /* [F] is coded as 0x8b */
  if (commaParserHex[2].slice(0, 2) == '8b') {
    func = "[F]";
  }

  /* get squelch from received data(uniden uart/usb) */
  squelch = parseInt(commaParser[squelchIndex]);

  lastCalls = commaParser[commaParser.length - lastCallsIndexFromEnd];
  lastCallsLines = lastCalls.split('\n');
  if (onLoad) {
    updateLastCalls(lastCallsLines);
    onLoad = 0;
  }

  if (document.getElementById("lastCalls").textContent != lastCalls) {
    if(lastCalls != "") {
      $('#lastCalls').text(lastCalls); // 24
    }
  }

  let utf8Encode = new TextEncoder();
  arr = utf8Encode.encode(commaParser[2]);

  var temp = ' ';
  for (i in arr) {
    temp += arr[i].toString(16) + ' ';
  }

  /* signal modulation */
  if (commaParserHex[8].includes("9b9c9a")) { 
    sigMod = 'FM';
  } else if (commaParserHex[8].includes("98999a")) { 
    sigMod = 'AM';
  }

  /* bottom line parser */
  /* cdcecf = BNK */
  if (commaParserHex[12].includes("cdcecf")) { 
    bottomLine = "BNK:";
  } else if (commaParserHex[12].includes("c5c6c7")) { 
    bottomLine = "SRCH:";
  }

  /* banks */
  var bnkNum = 10; /* 10 banks: 1-(1)0 */
  lineToParse = commaParserHex[12].replace("cdcecf", "").replace("c5c6c7", ""); /* Replace for: BNK: and SRCH: */
  for(var i = 0; i < lineToParse.length/2; i++) {
    bottomLine += String.fromCharCode(parseInt(lineToParse.slice(i*2, i*2+2), 16).toString());
  }

  /* volume */
  if (commaParser[10].includes("VOLUME LEVEL") || commaParser[10].includes("SQUELCH LEVEL")) {
    bottomLine = '';
    var tmp = '';
    for (var i = 0; i < commaParserHex[12].length; i++) {
      tmp = commaParserHex[12].slice(i*2, i*2+2);
      if (tmp == "80") { 
        bottomLine += ">";
      } else if (tmp == "b2") {
        bottomLine += '=';
      }
    }
  }
  
  commaParser[12] = bottomLine;

  var debugText = commaParser[1] + '\n\n';
  for (var i = 0; i < 8; i++) {
    debugText += commaParser[i*2 + 2] + '\n';
    debugText += commaParser[i*2 + 3] + '\n';
    debugText += commaParserHex[i*2 + 2] + '\n';
  }

  //debugText += temp;

  $('#debugInfo').text(debugText);

  setTimeout(() => {
    /* change background when receiving */
    var upperTextJS = document.getElementById("grid-container-status");

    if (squelch) {
      upperTextJS.style.backgroundColor = "#ffaa00";
    } 
    else 
    {
      upperTextJS.style.backgroundColor = "#ffffff";
    }

    $('#unidenText').text(arrayBufferToString(receivedData));
    $('#unidenText').text(buf2hex(receivedData));

    /* parsed strings */
    $('#upperText').text(func + ' ' + hold + ' ' + upperLine + ' ' + lo);
    $('#upMidLine').text(commaParser[6].replace(/[^0-9a-z .]/gi, '') + 'MHz ');
    $('#midLine').text(commaParser[10].replace(/[^0-9a-z ]/gi, '') + ' ');
    $('#bottomLine').text(bottomLine);
    $('#sigPower').text(sigPower);
    $('#sigMod').text(sigMod);

    /* cpu params */
    $('#cpuLoad').text("CPU load: " + parseInt(commaParserHex[commaParserHex.length - cpuLoadIndexFromEnd], 16) + '%');
    $('#cpuTemp').text("CPU temp: " + parseInt(commaParserHex[commaParserHex.length - cpuTempIndexFromEnd], 16) + '\u00B0C');
    $('#wifiStatus').text("Wifi status: " + commaParser[commaParser.length - wifiStatusIndexFromEnd]);

  }, delayMs.toString());
});
