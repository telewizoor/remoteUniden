var fs = require('fs'); 
var { exec } = require("child_process");
var { execSync } = require("child_process");
const { SerialPort } = require('serialport');
const { DelimiterParser } = require('@serialport/parser-delimiter')
var http = require('http').createServer( handler);
var io = require('socket.io')(http, {
  cors: {
    origin: '*',
  }
}); 

var maxLastCalls      = 10;
var unidenRefreshRate = 500;    /* ms */
var lowPassFilter     = '4200'; /* Hz */
var highPassFilter    = '100';  /* Hz */

var serialPort = new SerialPort({
  path: "/dev/ttyACM0",
  baudRate: 115200,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false
});

const parser = serialPort.pipe(new DelimiterParser({ delimiter: '\r' }))

/* Uniden Buttons */
var modelInfoCMD = Buffer.from('MDL\r');
var currentStatusCMD = Buffer.from('STS\r');
var buttonHoldPress = Buffer.from('KEY,H,P\r');
var button1Press = Buffer.from('KEY,1,P\r');
var button2Press = Buffer.from('KEY,2,P\r');
var button3Press = Buffer.from('KEY,3,P\r');
var buttonScanPress = Buffer.from('KEY,S,P\r');
var button4Press = Buffer.from('KEY,4,P\r');
var button5Press = Buffer.from('KEY,5,P\r');
var button6Press = Buffer.from('KEY,6,P\r');
var buttonSearchPress = Buffer.from('KEY,R,P\r');
var button7Press = Buffer.from('KEY,7,P\r');
var button8Press = Buffer.from('KEY,8,P\r');
var button9Press = Buffer.from('KEY,9,P\r');
var buttonLOPress = Buffer.from('KEY,L,P\r');
var buttonProgramPress = Buffer.from('KEY,E,P\r');
var button0Press = Buffer.from('KEY,0,P\r');
var buttonClrPress = Buffer.from('KEY,.,P\r');
var buttonFuncPress = Buffer.from('KEY,F,P\r');
var buttonLeftPress = Buffer.from('KEY,<,P\r');
var buttonKnobPress = Buffer.from('KEY,^,P\r');
var buttonRightPress = Buffer.from('KEY,>,P\r');

var buttonsDict = {
  'hold': buttonHoldPress,
  '1': button1Press,
  '2': button2Press,
  '3': button3Press,
  'scan': buttonScanPress,
  '4': button4Press,
  '5': button5Press,
  '6': button6Press,
  'srch': buttonSearchPress,
  '7': button7Press,
  '8': button8Press,
  '9': button9Press,
  'lo': buttonLOPress,
  'pgm': buttonProgramPress,
  '0': button0Press,
  'clr': buttonClrPress,
  'func': buttonFuncPress,
  '<': buttonLeftPress,
  'knob': buttonKnobPress,
  '>': buttonRightPress
};

/* Connect to port 80 - HTTP serer */
http.listen(80);

/* Caught exceptions */
process.on('uncaughtException', function(err) {
  console.log('ERROR:', err);
});

/* Try to open uniden serial port TODO */
try {
  serialPort.on("open", function () {
    console.log('serial port: open');
  });
} catch {
  console.log('serial port: ERROR');
}

/* getTime function. Format: 2024-02-05 22:11:04 */
function getTime() {
  // current date
  let date_ob = new Date();
  // adjust 0 before single digit date
  let date = ("0" + date_ob.getDate()).slice(-2);
  // current month
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
  // current year
  let year = date_ob.getFullYear();
  // current hours
  let hours = ("0" + date_ob.getHours()).slice(-2);
  // current minutes
  let minutes = ("0" + date_ob.getMinutes()).slice(-2);
  // current seconds
  let seconds = ("0" + date_ob.getSeconds()).slice(-2);

  return year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds
}

/* Return http object/file to client */
function returnHttpObject(req, res, fileName, contentType) {
  fs.readFile(__dirname + fileName, function(err, data) {
    if (err) {
      res.writeHead(404, {'Content-Type': contentType}); //display 404 on error
      return res.end("404 Not Found");
    }
    res.writeHead(200, {'Content-Type': contentType});
    res.write(data); 

    return res.end();
  });
}

/* Handle client request for http object/file */
function handler (req, res) { //create server
  //console.log(req.url);
  switch (req.url) {
    case "/style.css" :
      returnHttpObject(req, res, '/public/style.css', 'text/css');
    break;
    case "/uniden.js" :
      returnHttpObject(req, res, '/public/uniden.js', 'text/javascript');
    break;
    case "/favicon.ico" :
      returnHttpObject(req, res, '/public/favicon.ico', 'image/x-icon');
    break;
    case "/save_ico.png" :
      returnHttpObject(req, res, '/public/save_ico.png', 'image/png');
    break;
    case "/delete_ico.png" :
      returnHttpObject(req, res, '/public/delete_ico.png', 'image/png');
    break;
    case "/" :
      returnHttpObject(req, res, '/public/index.html', 'text/html');
    break;
    case "/unidenRecords" :
      returnHttpObject(req, res, '/public/unidenRecords/index.html', 'text/html');
    break;
    case "/unidenRecords/records.js" :
      returnHttpObject(req, res, '/public/unidenRecords/records.js', 'text/javascript');
    break;
    default:
      /* mostly records */
      var type = 'text/html';
      if (req.url.includes(".mp3")) {
        type = 'audio/mpeg';
      }
      returnHttpObject(req, res, req.url, type);
    break;
  };
}

io.sockets.on('connection', function (socket) {// WebSocket Connection
  //console.log('socket connected');

  socket.on('buttonPress', function(button) { //get light switch status from client
    /* Read buttons from html page */
    if (button in buttonsDict) {
      try {
        serialPort.write(buttonsDict[button], function(err, results) {
          if (err) {
            console.log('buttonPress Error: ' + err);
          }
          if (results) {
            console.log('buttonPress: ' + results);
          }
        });
      } catch {
        console.log('serial port: ERROR');
      }
    }
  });

  socket.on('saveRecord', function(recName) { 
    /* save recording */
    saveRecord(recName);
  });

  socket.on('removeRecord', function(recName) { 
    /* remove recording */
    removeRecord(recName);
  });

  socket.on('getSavedRecords', function(recName) { 
    /* send recordings list */
    io.emit('savedRecords', getSavedRecords());
  });
});

function execShell(cmd) {
  console.log("Executing: " + cmd);
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch (error) {
    console.log(error.message);
  }
}

function saveRecord(name) {
  var cmd = "sudo cp " + __dirname + name + " " + __dirname + "/saved_rec" + name.slice(4);
  execShell(cmd);
}

function removeRecord(name) {
  var cmd = "sudo rm " + __dirname + '/saved_rec/' + name;
  execShell(cmd);
}

function getSavedRecords() {
  var recs = fs.readdirSync(__dirname + '/saved_rec/');
  return recs;
}

function numToUint8Array(num) {
  let arr = new Uint8Array(2);

  arr[0] = 0x2c;
  arr[1] = num;

  return arr;
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

function mergeRecords(name, num) {
  var files = '';
  var anyRecords = 0;

  for (let i = 0; i < num; i++) {
    var fileName = __dirname + '/rec/' + callToRecName(name, i);
    if (fs.existsSync(fileName)) {
        files += fileName + ' ';
        anyRecords = 1;
    } else {
      console.log('file ' + fileName + ' not found!');
    }
  }

  if (anyRecords) {
    /* create script for merginf records into one, denoising and renaming */
    var mergeCmd = 'sox ' + files + __dirname + '/rec/' + callToRecName(name, 999) + ' ';
    outName = __dirname + '/rec/' + callToRecName(name, 999, 0);
    var filterCmd = 'sudo sox ' + outName + '.mp3 ' + outName + '_filtered.mp3 lowpass ' + lowPassFilter + ' highpass ' + highPassFilter + ' ';
    var replaceCmd = 'sudo mv ' + outName + '_filtered.mp3 ' + outName + '.mp3 ';

    var scriptName = __dirname + '/rec/merge.sh';
    var createScript = 'sudo bash -c ' + "'" + 'echo -e \"' + mergeCmd + '\n' + filterCmd + '\n' + replaceCmd + '\n' + '\" >> ' + scriptName + "'";
    
    /* remove old script first */
    try {
      cmd = 'sudo rm ' + scriptName;
      //console.log(cmd);
      try {
        execSync(cmd, { stdio: 'ignore' });
      } catch (error) {
        console.log(error.message);
      }
    } catch {
      console.log('merge script doesnt exists');
    }

    //console.log(createScript);
    try {
      execSync(createScript, { stdio: 'ignore' });
    } catch (error) {
      console.log(error.message);
    }

    cmd = 'sudo chmod +x ' + scriptName;
    //console.log(cmd);
    try {
      execSync(cmd, { stdio: 'ignore' });
    } catch (error) {
      console.log(error.message);
    }

    cmd = 'sudo ' + scriptName + ' &';
    console.log(cmd);
    try {
      execSync(cmd, { stdio: 'ignore' });
    } catch (error) {
      console.log(error.message);
    }
  }
}

var lastCalls = [];
var recNum = 0;
var recording = 0;

function handleLastCalls(receivedData) {
  try {
    var receivedDataHex = buf2hex(receivedData);
    var commaParserHex = receivedDataHex.split('2c');
    var commaParser = arrayBufferToString(receivedData).split(',');
    var upperLine = commaParser[4];
    var channelNum = commaParser[6].split(' ')[0];
    var frequency = '';

    if (upperLine.includes('SEARCH')) {
      frequency = commaParser[6];
    }
    else
    {
      /* get frequency from string like 'CH101 112.8000' */
      frequency = commaParser[6].split(' ')[2];
    }

    /* Remove non ascii chcaracters at the end */
    var ascii = /^[ -~]+$/;

    if ( !ascii.test( frequency ) ) {
      // string has non-ascii characters
      frequency = frequency.slice(0, -1);
    }

    var squelch = 0;
    var sigPower = '0/5';

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

    squelch = parseInt(commaParser[14]);

    var lastCall = "empty";

    if (squelch == 1) {
      //console.log(squelch + ' ' + channelNum);
      if (channelNum.includes("CH") && !recording) {
        lastCall = channelNum + ' ' + upperLine + ' ' + frequency + 'MHz';
      }
    } else {
      recording = 0;
      /* stop every recording */
      var cmd = "sudo pkill svar";
      //console.count("Killing recorder!");
      try {
        execSync(cmd, { stdio: 'ignore' });
      } catch (error) {
        //console.log(error.message);
      }
    }

    var lastCallWithDate = '';

    try {
      if (lastCall != "empty") {
        /* if current call is not currently lust call on the list */
        if (!lastCalls[lastCalls.length-1].toString().split('|')[0].includes(lastCall)) {
          if(lastCalls.length >= maxLastCalls) {
            var cmd = "sudo rm " + __dirname + "/rec/" + callToRecName(lastCalls[0], 999).slice(0, -4) + '* &'
            try {
              execSync(cmd, { stdio: 'ignore' });
            } catch (error) {
              console.log(error.message);
            }
            //shell.exec(cmd);
            lastCalls.shift();
          }
          /* merge last call when adding new one */
          mergeRecords(lastCalls[lastCalls.length-1], recNum);
          lastCallWithDate = lastCall + ' | ' + getTime().toString();
          lastCalls.push(lastCallWithDate);
          recNum = 0;
        }
        /* start recording */
        if (!recording) {
          recording = 1;
          //var cmd = 'rec ' + __dirname + '/rec/' + callToRecName(lastCalls[lastCalls.length-1], recNum) + ' silence -l 1 0.3 3% 1 1.0 0.5% trim 0 180 > /dev/null 2>&1 &'; // > /dev/null 2>&1 &
          var cmd = 'sudo svar ' + __dirname + '/rec/' + callToRecName(lastCalls[lastCalls.length-1], recNum, 0) + ' -o MP3 -f 99999 &';
          recNum++;
          //console.log(cmd);
          try {
            execSync(cmd, { stdio: 'ignore' });
          } catch (error) {
            console.log(error.message);
          }
        }
      }
    } catch {
      console.log("last calls empty");
      recNum = 0;
      lastCallWithDate = lastCall + ' | ' + getTime().toString();
      lastCalls.push(lastCallWithDate);
    }

  } catch {
    console.log("Err1");
  }

  //console.log(lastCalls);
}

var cpuTemp = 0;
var cpuLoad = 0;

function getCpuTemp() {
  var temp;
  exec("cat /sys/class/thermal/thermal_zone0/temp &", (error, stdout, stderr) => {
    if (error) {
        console.log(`CpuTemp error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`CpuTemp stderr: ${stderr}`);
        return;
    }
    temp = parseInt(stdout / 1000);
    cpuTemp = temp;
  });
  //console.log(`CPU temp: ${cpuTemp}`);
}

function getCpuLoad() {
  var load;
  exec("top -b -n 1 | grep \"%Cpu\" &", (error, stdout, stderr) => {
    if (error) {
        console.log(`CpuLoad error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`CpuLoad stderr: ${stderr}`);
        return;
    }
    load = 100 - parseInt(stdout.split(', ')[3].split(' ')[0]);
    cpuLoad = load;
  });
  //console.log(`CPU load: ${cpuLoad}`);
}

var _appendBuffer = function(buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp;
};

var cnt5s = 0;
getCpuLoad();
getCpuTemp();

setInterval(function() {
  //console.log("1s timer...")

  /* Read current status from Uniden */
  try {
    serialPort.write(currentStatusCMD, function(err, results) {
      if (err) {
        console.log('err ' + err);
      }
      if (results) {
        console.log('results ' + results);
      }
    });
  } catch {
    console.log('serial port: ERROR');
  }


  /* get CPU load and temp every 5 seconds */
  cnt5s++;
  if (cnt5s > (5000 / unidenRefreshRate)) {
    cnt5s = 0;
    getCpuLoad();
    getCpuTemp();
  }

  /* Read last line and send it to socket io */
  parser.on('data', data => {
    parser.removeAllListeners('data');
    //console.log(data)

    var cpuLoadArr = numToUint8Array(cpuLoad);
    var cpuTempArr = numToUint8Array(cpuTemp);

    handleLastCalls(data);

    var comma = new Uint8Array(1);
    comma[0] = 0x2c;

    var htmlNewLine = new Uint8Array(1);
    htmlNewLine[0] = 0x0a;

    var enc = new TextEncoder(); // always utf-8

    /* ArrayBuffer for last calls */
    var lastCallsArr = new Uint8Array;

    for (var i = 0; i < maxLastCalls; i++) {
      lastCallsArr = _appendBuffer(lastCallsArr, enc.encode(lastCalls[i]));
      lastCallsArr = _appendBuffer(lastCallsArr, htmlNewLine);
    }

    //console.log(lastCallsArr);

    var unidenData = new Uint8Array([
      ...data,
      ...comma,
      ...lastCallsArr,
      ...comma,
      ...cpuLoadArr,
      ...cpuTempArr
    ]);

    //console.log(unidenData)
    io.emit('unidenText', unidenData);
  });
}, unidenRefreshRate);
