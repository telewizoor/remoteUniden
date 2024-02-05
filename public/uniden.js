var curUrl = window.location.href.slice(0, -1);
var socket = io(curUrl + ':80'); //load socket.io-client and connect to the host that serves the page
//var socket = io('http://telewizoor-malina.duckdns.org:8080'); //load socket.io-client and connect to the host that serves the page
//var socket = io('http://192.168.1.31:8080'); //load socket.io-client and connect to the host that serves the page
//window.alert(curUrl + '80');

var lastCalls;
var lastCallsLines;
var onLoad = 1;
var maxLastCalls = 10;

document.body.onload = createLastCalls();

function callToRecName(call, num, ext=1) {
  var name = '';

  name = call.toString().replaceAll(' ', '_').replaceAll(':', '_').replaceAll('|', '_').replaceAll('.', '_').replaceAll('(', '_').replaceAll(')', '_').replaceAll('?', '_').replaceAll('-', '_');

  if(num != 999) {
    name = name + '_' + num;
  } else {
    name = name;
  }

  if(ext==1) {
    name = name + ".mp3";
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
  socket.emit("saveRecord", String(recName));
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
};

function addPlayer(name, source) {
  const newLabel = document.createElement("div");
  const newLine = document.createElement("br");
  const newLine2 = document.createElement("br");
  const saveImg = document.createElement('img'); 
  const newContent = document.createTextNode(name);

  saveImg.setAttribute("src", "save_ico.png");
  saveImg.setAttribute("width", 48);
  saveImg.setAttribute("height", 48);
  saveImg.setAttribute("class", "saveRec");
  saveImg.setAttribute("id", "save" + name);
  saveImg.style.visibility = 'hidden';

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
  document.body.insertBefore(saveImg, currentDiv);
  document.body.insertBefore(sound, saveImg);
  document.body.insertBefore(newLabel, sound);
  document.body.insertBefore(newLine, newLabel);
  document.body.insertBefore(newLine2, newLine);
}

function createLastCalls() {
  for (let i = 0; i < maxLastCalls; i++) {
    addPlayer('LastCall' + i," ");
  }
}

function updateLastCallsButton() {
  updateLastCalls(lastCallsLines);
}

function updateLastCalls(calls) {
  for (let i = 0; i < maxLastCalls; i++) {
    if(calls[i] != null && calls[i] != '') {
      let recName = '/rec/' + callToRecName(calls[i], 999);
      let divName = 'LastCall' + i;

      /* update source only on difference */
      if (document.getElementById('Label' + divName).textContent != calls[i]) {
        $('#Label' + divName).text(calls[i]);
        /* dont update audio for last one - there is no ready recording */
        if (i < maxLastCalls-1) {
          changeAudio(divName, curUrl + recName);
          /* save button */
          if(recName.includes(".mp3") && urlExists(recName) && !urlExists("saved_rec" + recName.slice(4))) {
            document.getElementById('save' + divName).setAttribute("onclick", "saveRecord(save" + divName + ", \"" + recName.toString() + "\")");
            document.getElementById('save' + divName).style.visibility = 'visible';
          } else {
            document.getElementById('save' + divName).style.visibility = 'hidden';
          }
        }
      }
    }
  }
}

changeAudio('liveStream', curUrl + ':8000/Stream.mp3');
//window.alert(curUrl.replace("https", "http") + ':8000/Stream.mp3');

/* delay for showing data */
var delayMs = 1;
var delayEnabled = 0;

function buttonPress(button_type) {
  socket.emit("buttonPress", String(button_type));
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

socket.on('unidenText', function(data) {
  var receivedData = data;
  var receivedDataHex = buf2hex(receivedData);
  var commaParserHex = receivedDataHex.split('2c');
  var commaParser = arrayBufferToString(data).split(',');
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

  frequency = frequency.slice(0, -1);

  // strange string with status of HOLD, squelch, voltage etc(first line)
  var upperSmallLine = commaParser[2].split(' ')
  var squelch = 0;
  var hold = '';
  var lo = '';
  var sigPower = '0/5';
  var sigMod = '';

  /* hold */
  if (commaParserHex[2].includes("8d8e8f90")) {
    hold = '[HOLD]';
  }

  /* TL/O */
  if (commaParserHex[2].includes("93949697")) {
    lo = '[TL/O]';
  }
  
  /* sila: a6 a7 a8 a9 a ?? */
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

  /* squelch */
  if (sigPower != '0/5') {
    squelch = 1;
  }

  var func = '';
  if (commaParserHex[2].slice(0, 2) == '8b') {
    func = "[F]";
  }

  squelch = parseInt(commaParser[14]);

  lastCalls = commaParser[commaParserHex.length-4];
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
  for (var i = 0; i < bnkNum; i++) {
    /* dirty hack to get zero at the end */
    if (i == 9) {
      if (commaParserHex[12].includes('30')) { 
        bottomLine += '0';
      } else {
        bottomLine += ' ';
      }
    } else {
      if (commaParserHex[12].includes((31 + i).toString())) { 
        bottomLine += (i + 1).toString();
      } else {
        bottomLine += ' ';
      }
    }
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
    $('#cpuLoad').text("CPU load: " + parseInt(commaParserHex[commaParserHex.length-2], 16) + '%');       // 23
    $('#cpuTemp').text("CPU temp: " + parseInt(commaParserHex[commaParserHex.length-1], 16) + '\u00B0C'); // 24

  }, delayMs.toString());
});