var fs = require("fs");
process.env.NODE_CONFIG_DIR = __dirname + "/config";
const config = require("config");
var { exec } = require("child_process");
var { execSync } = require("child_process");
const { SerialPort } = require("serialport");
const { DelimiterParser } = require("@serialport/parser-delimiter");
var http = require("http").createServer(handler);
var io = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
  path: "/uniden/",
});
const telegramBotApi = require("node-telegram-bot-api");
var osu = require('node-os-utils');
var cpu = osu.cpu

/* Caught exceptions */
process.on("uncaughtException", function (err) {
  console.log(getTime());
  console.log("ERROR:", err);
});

/* get configuration */
var port = config.get("uniden.port");
var subpage = config.get("uniden.subpage");
var archivedRecPath = config.get("uniden.archivedRecPath");
var maxLastCalls = config.get("uniden.maxLastCalls");
var pageRefreshRate = config.get("uniden.pageRefreshRate");
var unidenRefreshRate = config.get("uniden.unidenRefreshRate");
var lowPassFilter = config.get("uniden.lowPassFilter"); /* Hz */
var highPassFilter = config.get("uniden.highPassFilter"); /* Hz */
var specChTimeout = config.get("uniden.specChTimeout"); /* ms - How long keep squelch for special channels */
var normChTimeout = config.get("uniden.normChTimeout"); /* ms - How long keep squelch for special channels */
var maxRecDuration = config.get("uniden.maxRecDuration"); /* max rec duration to skip eg. random noises */
var squelchOffValue = config.get("uniden.squelchOffValue");
var squelchOnValue = config.get("uniden.squelchOnValue");
var recExt = config.get("uniden.recExt");
var denoise = config.get("uniden.denoise");
var denoiseFactor = config.get("uniden.denoiseFactor");
var recSaveDuration = config.get("uniden.recSaveDuration"); /* auto save recording longer than x seconds */
var specialChStart = config.get("uniden.specialChStart");
var prioChannelsCount = config.get("uniden.prioChannelsCount");
var channelsInBank = config.get("uniden.channelsInBank");
var prioBanks = config.get("uniden.prioBanks");
var passwordHash = config.get("uniden.passwordHash");
var telegramChannelId = config.get("telegram.telegramChannelId");
var telegramKeyWords = config.get("telegram.telegramKeyWords"); /* will be loaded from file telegramKeyWords.txt */
var telegramKeyWordsFileName = config.get("telegram.telegramKeyWordsFileName");
var telegramBot;
const telegramBotToken = config.get("telegram.telegramBotToken");

var noSquelchCounter = 0;
var recDuration = 0;
var lastCalls = [];
var recNum = 0;
var recording = 0;
var recStarted = 0;
var cpuTemp = 0;
var cpuLoad = 0;
var wifiStatus = "";
var prgSts = 0;
var unidenPendingRequests = [];
var unidenRequestsNotReady = 1;
var unidenRetryCnt = 0;
var unidenRetryCntMax = 3;
var unidenReceiveBuffer = "";
var unidenSendBuffer = "";
var disableSquelchManagingSwitch = false;

var serialPort = new SerialPort({
  path: "/dev/ttyACM0",
  baudRate: 115200,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  flowControl: false,
});

const parser = serialPort.pipe(new DelimiterParser({ delimiter: "\r" }));

// Create a bot that uses 'polling' to fetch new updates
if(telegramBotToken != "") {
  telegramBot = new telegramBotApi(telegramBotToken, { polling: false });
  console.log("Telegram bot connected.");
}

/* Uniden Buttons */
var modelInfoCMD = Buffer.from("MDL\r");
var currentStatusCMD = Buffer.from("STS\r");
var prgCMD = Buffer.from("PRG\r");
var exitPrg = Buffer.from("EPG\r");
var buttonHoldPress = Buffer.from("KEY,H,P\r");
var button1Press = Buffer.from("KEY,1,P\r");
var button2Press = Buffer.from("KEY,2,P\r");
var button3Press = Buffer.from("KEY,3,P\r");
var buttonScanPress = Buffer.from("KEY,S,P\r");
var button4Press = Buffer.from("KEY,4,P\r");
var button5Press = Buffer.from("KEY,5,P\r");
var button6Press = Buffer.from("KEY,6,P\r");
var buttonSearchPress = Buffer.from("KEY,R,P\r");
var button7Press = Buffer.from("KEY,7,P\r");
var button8Press = Buffer.from("KEY,8,P\r");
var button9Press = Buffer.from("KEY,9,P\r");
var buttonLOPress = Buffer.from("KEY,L,P\r");
var buttonProgramPress = Buffer.from("KEY,E,P\r");
var button0Press = Buffer.from("KEY,0,P\r");
var buttonClrPress = Buffer.from("KEY,.,P\r");
var buttonFuncPress = Buffer.from("KEY,F,P\r");
var buttonLeftPress = Buffer.from("KEY,<,P\r");
var buttonKnobPress = Buffer.from("KEY,^,P\r");
var buttonRightPress = Buffer.from("KEY,>,P\r");

var buttonsDict = {
  hold: buttonHoldPress,
  1: button1Press,
  2: button2Press,
  3: button3Press,
  scan: buttonScanPress,
  4: button4Press,
  5: button5Press,
  6: button6Press,
  srch: buttonSearchPress,
  7: button7Press,
  8: button8Press,
  9: button9Press,
  lo: buttonLOPress,
  pgm: buttonProgramPress,
  0: button0Press,
  clr: buttonClrPress,
  func: buttonFuncPress,
  "<": buttonLeftPress,
  knob: buttonKnobPress,
  ">": buttonRightPress,
};

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

  return year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
}

/* Connect to port 80 - HTTP serer */
console.log("listening on " + port + " port");
http.listen(port, "0.0.0.0");

/* Try to open uniden serial port TODO */
try {
  serialPort.on("open", function () {
    console.log("serial port: open");
  });
} catch {
  console.log("serial port: ERROR");
}

/* Return http object/file to client */
function returnHttpObject(req, res, fileName, contentType) {
  fs.readFile(__dirname + fileName, function (err, data) {
    if (err) {
      res.writeHead(404, { "Content-Type": contentType }); //display 404 on error
      return res.end("404 Not Found");
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.write(data);

    return res.end();
  });
}

/* Handle client request for http object/file */
function handler(req, res) {
  //create server
  // console.log(req.url);
  // console.log(req.url.split('?')[0].replace(subpage, ''))
  /* Ignore everything after '?' sign */
  switch (req.url.split('?')[0].replace(subpage, '')) {
    case "/style.css":
      returnHttpObject(req, res, "/public/style.css", "text/css");
      break;
    case "/uniden.js":
      returnHttpObject(req, res, "/public/uniden.js", "text/javascript");
      break;
    case "/favicon.ico":
      returnHttpObject(req, res, "/public/favicon.ico", "image/x-icon");
      break;
    case "/save_ico.png":
      returnHttpObject(req, res, "/public/save_ico.png", "image/png");
      break;
    case "/delete_ico.png":
      returnHttpObject(req, res, "/public/delete_ico.png", "image/png");
      break;
    case "/":
      returnHttpObject(req, res, "/public/index.html", "text/html");
      break;
    case "/unidenRecords":
      returnHttpObject(req, res, "/public/unidenRecords/index.html", "text/html");
      break;
    case "/unidenRecords/records.js":
      returnHttpObject(req, res, "/public/unidenRecords/records.js", "text/javascript");
      break;
    default:
      /* mostly records */
      var type = "text/html";
      if (req.url.includes(".mp3")) {
        type = "audio/mpeg";
      }
      if (req.url.includes(".wav")) {
        type = "audio/x-wav";
      }
      if (req.url.includes(".js") || req.url.includes(".txt")) {
        type = "";
      }
      if (type != "") {
        returnHttpObject(req, res, req.url.replace(subpage, ''), type);
      }
      break;
  }
}

function checkPassword(hash) {
  var ret = 0;
  // console.log('Received password hash: ' + hash);
  if (hash != passwordHash) {
    console.log(getTime() + ": Wrong password!!!");
    ret = 0;
  } else {
    ret = 1;
  }

  return ret;
}

io.sockets.on("connection", function (socket) {
  // WebSocket Connection
  //console.log('socket connected');

  socket.on("unidenMain", function (password, cmd, data1, data2) {
    if (checkPassword(password)) {
      switch (cmd) {
        case "buttonPress":
          /* Read buttons from html page */
          var button = data1;
          if (button in buttonsDict) {
            try {
              serialPort.write(buttonsDict[button], function (err, results) {
                if (err) {
                  console.log("buttonPress Error: " + err);
                }
                if (results) {
                  console.log("buttonPress: " + results);
                }
              });
            } catch {
              console.log("serial port: ERROR");
            }
          }
          break;
        case "saveRecord":
          /* save recording */
          var recName = data1;
          saveRecord(recName);
          break;
        case "removeRecord":
          /* remove recording */
          var recName = data1;
          removeRecord(recName);
          break;
        case "getSavedRecords":
          /* send recordings list */
          var filter = data1;
          io.emit("savedRecords", getSavedRecords(filter));
          break;
        case "checkIfRecordsSaved":
          /* check if records are on disk */
          var table = data1;
          io.emit("recordsSaved", checkIfRecordsSaved(table));
          break;
        case "readChannelMem":
          /* read channel info from memory */
          unidenReadChannelMemory(1);
          break;
        case "writeChannelMem":
          /* write channels into memory */
          var chList = data1;
          unidenWriteChannelMemory(chList);
          break;
        case "unidenSendCmd":
          /* send cmd received from page */
          var cmd = data1;
          var prg = data2;
          unidenSendCmdFromWeb(cmd, prg);
          break;
        case "unidenReadPrioChannels":
          unidenReadPrioChannels();
          break;
        case "unidenAddChToPrio":
          unidenAddChToPrio(data1, data2);
          break;
        case "disableSquelchManaging":
          disableSquelchManaging(data1);
          break;
      }
    }
  });
});

function execShell(cmd) {
  console.log("Executing: " + cmd);
  try {
    execSync(cmd, { stdio: "ignore" });
  } catch (error) {
    console.log(error.message);
  }
}

function isFunction(functionToCheck) {
  return functionToCheck && {}.toString.call(functionToCheck) === "[object Function]";
}

function saveRecord(name) {
  var cmd = "sudo cp " + __dirname + name + " " + __dirname + "/saved_rec" + name.slice(4);
  execShell(cmd);
}

function removeRecord(name) {
  var cmd = "sudo rm " + __dirname + "/saved_rec/" + name;
  execShell(cmd);
}

function getSavedRecords(filter) {
  var recs = fs.readdirSync(__dirname + "/saved_rec/");
  if(archivedRecPath != "") {
    var oldRecs = fs.readdirSync(__dirname + archivedRecPath);
  }
  if (filter != "*") {
    var dateFilter = "_" + filter.toString().replaceAll("-", "_");
    recs = recs.filter(function (s) {
      return ~s.indexOf(dateFilter);
    });
    if(archivedRecPath != "") {
      oldRecs = oldRecs.filter(function (s) {
        return ~s.indexOf(dateFilter);
      });
    }
  }
  /* sort by date */
  /* CH054_ACC_Low_Z__JKR___130_8750MHz___2024_02_11_20_24_30.mp3 */
  recs.sort(function (a, b) {
    a = a.slice(37).slice(0, -4).split("_").join("");
    b = b.slice(37).slice(0, -4).split("_").join("");
    return a > b ? -1 : a < b ? 1 : 0;
  });
  if(archivedRecPath != "") {
    oldRecs.sort(function (a, b) {
      a = a.slice(37).slice(0, -4).split("_").join("");
      b = b.slice(37).slice(0, -4).split("_").join("");
      return a > b ? -1 : a < b ? 1 : 0;
    });
  }
  // console.log(recs);
  // console.log(oldRecs);
  // oldRecs.replace('/saved_rec/', subpage + '/saved_rec/');
  if(archivedRecPath != "") {
    return recs.concat(oldRecs);
  } else {
    return recs;
  }
}

function checkIfRecordsSaved(table) {
  response = [];
  try {
    for (item in table) {
      response.push(table[item].toString());
      if (fs.existsSync(__dirname + table[item].toString().replaceAll("/rec/", "/saved_rec/"))) {
        response.push(1);
      } else {
        response.push(0);
      }
    }
  } catch (err) {
    console.log("checkIfRecordsSaved error: " + err);
  }

  return response;
}

function numToUint8Array(num) {
  let arr = new Uint8Array(2);

  arr[0] = 0x2c;
  arr[1] = num;

  return arr;
}

function arrayBufferToString(buffer) {
  let str = "";
  const array = new Uint8Array(buffer);
  for (let i = 0; i < array.length; i++) {
    str += String.fromCharCode(array[i]);
  }
  return str;
}

function buf2hex(buffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function callToRecName(call, num, ext = 1) {
  var name = "";

  name = call
    .toString()
    .replaceAll(" ", "_")
    .replaceAll(":", "_")
    .replaceAll("|", "_")
    .replaceAll(".", "_")
    .replaceAll("(", "_")
    .replaceAll(")", "_")
    .replaceAll("?", "_")
    .replaceAll("-", "_");

  if (num != 999) {
    name = name + "_" + num;
  } else {
    name = name;
  }

  if (ext == 1) {
    name = name + recExt;
  }

  return name;
}

function unidenSetSquelch(val) {
  try {
    if(!disableSquelchManagingSwitch) {
      serialPort.write("SQL," + val + "\r", function (err, results) {
        if (err) {
          console.log("SQL Error: " + err);
        }
        if (results) {
          //console.log('SQL: ' + results);
        }
      });
    }
  } catch {
    console.log("serial port: ERROR");
  }
}

function unidenReadChannelMemory(val) {
  try {
    unidenPendingRequests = [];
    /* enter program mode */
    unidenAddRequest(prgCMD);
    for (i = 1; i <= 500; i++) {
      unidenAddRequest("CIN," + i + "\r");
    }
    /* exit program mode */
    unidenAddRequest(exitPrg);
    /* Return to scan mode */
    unidenAddRequest(buttonsDict["scan"]);
    /* callback to send the response */
    unidenAddRequest(unidenSendReceiveBuffer);
    unidenReceiveBuffer = "";
    /* mark requests as ready to send */
    unidenRequestsNotReady = 0;
    /* Send first reqeust */
    unidenSendPendingRequests();
  } catch (err) {
    console.log("unidenReadChannelMemory: " + err);
  }
}

function unidenWriteChannelMemory(chList) {
  console.log("Writing channels: " + chList);
  unidenPendingRequests = [];
  /* enter program mode */
  unidenAddRequest(prgCMD);
  /* add channel cmd one by one */
  chListLines = chList.split("\n");
  for (channel in chListLines) {
    unidenAddRequest(chListLines[channel] + "\r");
  }
  /* exit program mode */
  unidenAddRequest(exitPrg);
  /* Return to scan mode */
  unidenAddRequest(buttonsDict["scan"]);
  /* mark requests as ready to send */
  unidenRequestsNotReady = 0;
  /* Send first reqeust */
  unidenSendPendingRequests();
}

function unidenSendCmdFromWeb(cmd, prg) {
  console.log("Sending cmd from web: " + cmd);
  unidenPendingRequests = [];
  if (prg) {
    /* enter program mode */
    unidenAddRequest(prgCMD);
  }

  unidenAddRequest(cmd + "\r");
  /* exit program mode */
  if (prg) {
    unidenAddRequest(exitPrg);
  }
  /* Return to scan mode */
  unidenAddRequest(buttonsDict["scan"]);
  /* callback to send the response */
  unidenAddRequest(unidenSendReceiveBuffer);
  unidenReceiveBuffer = "";
  /* mark requests as ready to send */
  unidenRequestsNotReady = 0;
  /* Send first reqeust */
  unidenSendPendingRequests();
}

function unidenReadPrioChannels() {
  try {
    unidenPendingRequests = [];
    /* enter program mode */
    unidenAddRequest(prgCMD);
    var prioChannelsStart = prioBanks[0] * channelsInBank + 1 - channelsInBank;
    for (i = prioChannelsStart; i < prioChannelsStart + prioChannelsCount; i++) {
      unidenAddRequest("CIN," + i + "\r");
    }
    /* exit program mode */
    unidenAddRequest(exitPrg);
    /* Return to scan mode */
    unidenAddRequest(buttonsDict["scan"]);
    /* callback to send the response */
    unidenAddRequest(unidenSendReceiveBuffer);
    unidenReceiveBuffer = "";
    /* mark requests as ready to send */
    unidenRequestsNotReady = 0;
    /* Send first reqeust */
    unidenSendPendingRequests();
  } catch (err) {
    console.log("unidenReadPrioChannels: " + err);
  }
}

function unidenAddChToPrio(chNum, prioNum) {
  try {
    unidenPendingRequests = [];
    /* enter program mode */
    unidenAddRequest(prgCMD);
    unidenAddRequest("CIN," + chNum + "\r");
    /* exit program mode */
    // unidenAddRequest(exitPrg);
    /* Return to scan mode */
    unidenAddRequest(buttonsDict["scan"]);
    /* callback to send the response */
    unidenAddRequest(unidenAddToPrio);
    unidenReceiveBuffer = prioNum + ",";
    /* mark requests as ready to send */
    unidenRequestsNotReady = 0;
    /* Send first reqeust */
    unidenSendPendingRequests();
  } catch (err) {
    console.log("unidenReadPrioChannels: " + err);
  }
}

function disableSquelchManaging(manSquelch) {
  disableSquelchManagingSwitch = manSquelch;
}

function unidenSendReceiveBuffer() {
  io.emit("receiveBuffer", unidenReceiveBuffer);
}

function unidenAddToPrio() {
  var prioNum = unidenReceiveBuffer.split(",")[0];
  var chInfo = unidenReceiveBuffer.replace(prioNum + ",", "");
  console.log("Writing to priority channel(" + prioNum + "): " + chInfo);
  unidenPendingRequests = [];
  /* enter program mode */
  // unidenAddRequest(prgCMD);
  /* add channel to all prio banks */
  for (bank in prioBanks) {
    var prioChNum = prioBanks[bank] * channelsInBank + 1 - channelsInBank + (prioNum - 1);
    var cmd = "CIN," + prioChNum + chInfo.slice(7, chInfo.length - 1); // remove 'CIN,XXX' and new line at the end
    // console.log( cmd );
    if (bank == 0) {
      // dirty hack to not lost first cmd... TODO
      unidenAddRequest(cmd + "\r");
    }
    unidenAddRequest(cmd + "\r");
  }
  /* exit program mode */
  unidenAddRequest(exitPrg);
  /* Return to scan mode */
  unidenAddRequest(buttonsDict["scan"]);
  /* mark requests as ready to send */
  unidenRequestsNotReady = 0;
  /* Send first reqeust */
  unidenSendPendingRequests();
}

function unidenReadCurrentStatus() {
  /* Read current status from Uniden */
  try {
    serialPort.write(currentStatusCMD, function (err, results) {
      if (err) {
        console.log("err " + err);
      }
      if (results) {
        console.log("results " + results);
      }
    });
  } catch {
    console.log("serial port: ERROR");
  }
}

function unidenParseCurrentStatus(data) {
  // parser.removeAllListeners('data');
  //console.log(data)

  /* Very dirty hack for not getting comma as that values :D That cause problem with parsing later on page side */
  if (cpuLoad == 0x2c) {
    cpuLoad++;
  }
  if (cpuTemp == 0x2c) {
    cpuTemp++;
  }
  var cpuLoadArr = numToUint8Array(cpuLoad);
  var cpuTempArr = numToUint8Array(cpuTemp);

  handleLastCalls(data);

  var comma = new Uint8Array(1);
  comma[0] = 0x2c;

  var htmlNewLine = new Uint8Array(1);
  htmlNewLine[0] = 0x0a;

  var enc = new TextEncoder(); // always utf-8

  /* ArrayBuffer for last calls */
  var lastCallsArr = new Uint8Array();

  for (var i = 0; i < maxLastCalls; i++) {
    lastCallsArr = _appendBuffer(lastCallsArr, enc.encode(lastCalls[i]));
    lastCallsArr = _appendBuffer(lastCallsArr, htmlNewLine);
  }

  var wifiStatusArr = Buffer.from(wifiStatus);

  var unidenData = new Uint8Array([
    ...data,
    ...comma,
    ...lastCallsArr,
    ...cpuLoadArr,
    ...cpuTempArr,
    ...comma,
    ...wifiStatusArr,
  ]);

  //console.log(unidenData)
  /* send parsed data to http */
  // io.emit("unidenText", unidenData);
  unidenSendBuffer = unidenData;
}

function unidenGetResponseHeader(data) {
  var header = "";
  try {
    header = data.toString().split(",")[0];
  } catch {
    header = "N/A";
  }
  return header;
}

function unidenSendPendingRequests() {
  /* Send pending requests */
  if (unidenPendingRequests.length > 0) {
    if (!unidenRequestsNotReady) {
      if (typeof unidenPendingRequests[0] === "function") {
        console.log("calling callback: " + unidenPendingRequests[0]);
        unidenPendingRequests[0]();
        unidenPendingRequests.shift();
      } else {
        unidenSendCmd(unidenPendingRequests[0]);
      }
    }
  }
}

function unidenSendCmd(cmd) {
  console.log("sending cmd to Uniden: " + cmd);
  serialPort.write(cmd, function (err, results) {
    if (err) {
      console.log("err " + err);
    }
    if (results) {
      console.log("results " + results);
    }
  });
}

function unidenAddRequest(cmd) {
  console.log("adding cmd: " + cmd);
  unidenRequestsNotReady = 1;
  unidenRetryCnt = 0;
  unidenPendingRequests.push(cmd);
}

/* TODO: ??? */
function unidenRequestsReady() {
  unidenRequestsNotReady = 0;
}

function isChannelSpecial(chNum) {
  var isSpecial = false;
  // var specialChannels;

  // try {
  //   specialChannels = fs.readFileSync(__dirname + '/special_channels.txt', 'utf8');
  // } catch(err) {
  //   console.log(err);
  //   console.log('blad odczytu special channels');
  // }

  // if (specialChannels.includes(chNum)) {
  //   isSpecial = true;
  // }

  // TODO: every channel above specialChStart is special
  if (parseInt(chNum, 10) > specialChStart) {
    isSpecial = true;
  }

  return isSpecial;
}

function mergeRecords(name, num) {
  var files = "";
  var anyRecords = 0;
  var chNum = name.slice(2).substring(0, 3);

  for (let i = 0; i < num; i++) {
    var fileName = __dirname + "/rec/" + callToRecName(name, i);
    if (fs.existsSync(fileName)) {
      files += fileName + " ";
      anyRecords = 1;
    } else {
      console.log("file " + fileName + " not found!");
    }
  }

  /* If there are any records to merge */
  if (anyRecords) {
    /* create script for merging records into one, denoising and renaming */
    var mergeCmd = "sox " + files + __dirname + "/rec/" + callToRecName(name, 999); // + ' norm ';

    outName = __dirname + "/rec/" + callToRecName(name, 999, 0);
    var filterCmd =
      "sudo sox " +
      outName +
      recExt +
      " " +
      outName +
      "_filtered" +
      recExt +
      " lowpass " +
      lowPassFilter +
      " highpass " +
      highPassFilter +
      " ";
    /* if denoising is active */
    if (denoise) {
      filterCmd += "noisered " + __dirname + "/noise.prof " + denoiseFactor + " ";
    }

    var replaceCmd = "sudo mv " + outName + "_filtered" + recExt + " " + outName + recExt + " ";

    var autoSaveCmd = "";
    // console.log(recDuration + 'ms chNum: ' + chNum);
    if (recDuration >= recSaveDuration && (isChannelSpecial(chNum) || name.includes("SSTV") || name.includes("ISS") || name.includes("LPR"))) {
      autoSaveCmd = "sudo cp " + outName + recExt + " " + __dirname + "/saved_rec/" + callToRecName(name, 999);
    }

    var scriptName = __dirname + "/rec/merge.sh";
    var createScript =
      "sudo bash -c " +
      "'" +
      'echo -e "' +
      mergeCmd +
      "\n" +
      filterCmd +
      "\n" +
      replaceCmd +
      "\n" +
      autoSaveCmd +
      "\n" +
      '" >> ' +
      scriptName +
      "'";

    /* remove old script first */
    try {
      cmd = "sudo rm " + scriptName;
      //console.log(cmd);
      try {
        execSync(cmd, { stdio: "ignore" });
      } catch (error) {
        console.log(error.message);
      }
    } catch {
      console.log("merge script doesnt exists");
    }

    /* create script */
    // console.log(createScript);
    try {
      execSync(createScript, { stdio: "ignore" });
    } catch (error) {
      console.log(error.message);
    }

    /* make script executable */
    cmd = "sudo chmod +x " + scriptName;
    //console.log(cmd);
    try {
      execSync(cmd, { stdio: "ignore" });
    } catch (error) {
      console.log(error.message);
    }

    /* run script */
    cmd = "sudo " + scriptName + " &";
    //console.log(cmd);
    try {
      execSync(cmd, { stdio: "ignore" });
    } catch (error) {
      console.log(error.message);
    }
  }

  // Send Telegram notification
  if (telegramBotToken != "") {
    sendTelegramMessage(name + ": " + recDuration / 1000 + "s");
  }
}

function handleLastCalls(receivedData) {
  try {
    var receivedDataHex = buf2hex(receivedData);
    var commaParserHex = receivedDataHex.split("2c");
    var commaParser = arrayBufferToString(receivedData).split(",");
    var upperLine = commaParser[4];
    var channelNum = commaParser[6].split(" ")[0];
    var frequency = "";

    if (upperLine.includes("SEARCH")) {
      frequency = commaParser[6];
    } else {
      /* get frequency from string like 'CH101 112.8000' */
      frequency = commaParser[6].split(" ")[2];
    }

    /* Remove non ascii chcaracters at the end */
    var ascii = /^[ -~]+$/;

    if (!ascii.test(frequency)) {
      // string has non-ascii characters
      frequency = frequency.slice(0, -1);
    }

    var squelch = 0;
    var sigPower = "0/5";

    /* sila: a6 a7 a8 a9 a ?? */
    if (commaParserHex[2].includes("a6")) {
      sigPower = "1/5";
    } else if (commaParserHex[2].includes("a7")) {
      sigPower = "2/5";
    } else if (commaParserHex[2].includes("a8a9")) {
      sigPower = "3/5";
    } else if (commaParserHex[2].includes("aaab")) {
      sigPower = "4/5";
    } else if (commaParserHex[2].includes("acad")) {
      sigPower = "5/5";
    }

    /* Reset timer when signal appeared again */
    /* != 0/5 for special channels */
    if (sigPower != "0/5" && isChannelSpecial(channelNum.slice(2))) {
      noSquelchCounter = 0;
    }

    /* > 1/5 for normal channels */
    if (sigPower != "0/5" && sigPower != "1/5" && !isChannelSpecial(channelNum.slice(2))) {
      noSquelchCounter = 0;
    }

    /* squelch */
    squelch = parseInt(commaParser[14]);

    var lastCall = "empty";

    if (squelch == 1) {
      /* measure recording time */
      recDuration += unidenRefreshRate;

      //console.log(squelch + ' ' + channelNum);
      if (channelNum.includes("CH") && !recording) {
        lastCall = channelNum + " " + upperLine + " " + frequency + "MHz";
      }

      /* Check if channel is special and counter is below threshold */
      if (isChannelSpecial(channelNum.slice(2))) {
        if (noSquelchCounter < specChTimeout) {
          /* still recording, bump up special channel counter */
          noSquelchCounter += unidenRefreshRate;
        } else {
          //console.log('return squelch to 2');
          unidenSetSquelch(squelchOnValue);
        }
      } else {
        /* normal channel */
        if (noSquelchCounter < normChTimeout) {
          /* still recording, bump up special channel counter */
          noSquelchCounter += unidenRefreshRate;
        } else {
          //console.log('return squelch to 2');
          unidenSetSquelch(squelchOnValue);
        }
      }

      /* Check if recording is not too long(eg. some random noise) */
      if (recDuration > maxRecDuration && maxRecDuration > 0) {
        /* Skip that channel */
        console.log('Skipping channel - too long recording! ' + channelNum);
        unidenSendCmd(buttonsDict[">"]);
      }
    } else {
      recording = 0;
      /* stop every recording */
      //var cmd = "sudo pkill svar";
      var cmd = "sudo pkill rec";
      //console.count("Killing recorder!");
      if( recStarted ) {
        try {
          execSync(cmd, { stdio: "ignore" });
          recStarted = 0;
        } catch (error) {
          //console.log(error.message);
        }
      }
    }

    var lastCallWithDate = "";

    try {
      if (lastCall != "empty") {
        /* if current call is not currently lust call on the list */
        if (!lastCalls[lastCalls.length - 1].toString().split("|")[0].includes(lastCall)) {
          if (lastCalls.length >= maxLastCalls) {
            var cmd = "sudo rm " + __dirname + "/rec/" + callToRecName(lastCalls[0], 999).slice(0, -4) + "* &";
            try {
              execSync(cmd, { stdio: "ignore" });
            } catch (error) {
              console.log(error.message);
            }
            //shell.exec(cmd);
            lastCalls.shift();
          }
          /* merge last call when adding new one */
          mergeRecords(lastCalls[lastCalls.length - 1], recNum);
          lastCallWithDate = lastCall + " | " + getTime().toString();
          lastCalls.push(lastCallWithDate);
          recNum = 0;
          recDuration = 0;
        }

        /* start recording */
        if (!recording) {
          /* Turn off squelch for specChTimeout/normChTimeout time */
          noSquelchCounter = 0;
          unidenSetSquelch(squelchOffValue);
          recording = 1;
          /* Send update to webpage */
          sendUnidenSendBuffer();

          if (recExt == ".mp3") {
            var cmd =
              "sudo rec " +
              __dirname +
              "/rec/" +
              callToRecName(lastCalls[lastCalls.length - 1], recNum, 0) +
              recExt +
              " &";
          } else if (recExt == ".wav") {
            //var cmd = 'sudo svar ' + __dirname + '/rec/' + callToRecName(lastCalls[lastCalls.length-1], recNum, 0) + ' -l 1 -f 99999 &';
            var cmd =
              "sudo rec " +
              __dirname +
              "/rec/" +
              callToRecName(lastCalls[lastCalls.length - 1], recNum, 0) +
              recExt +
              " &";
          }
          recNum++;
          //console.log(cmd);
          try {
            execSync(cmd, { stdio: "ignore" });
            recStarted = 1;
          } catch (error) {
            console.log(error.message);
          }
        }
      }
    } catch {
      console.log("last calls empty");
      recNum = 0;
      lastCallWithDate = lastCall + " | " + getTime().toString();
      lastCalls.push(lastCallWithDate);
    }
  } catch {
    console.log("Err1");
  }

  //console.log(lastCalls);
}

function readTelegramKeyWords() {
  var array;
  try {
    array = fs.readFileSync(__dirname + "/" + telegramKeyWordsFileName, "utf8");
  } catch (err) {
    console.log(err);
    console.log("blad odczytu: " + telegramKeyWordsFileName);
  }

  return array.toString().split("\n");
}

function sendTelegramMessage(data) {
  msg = "";

  try {
    telegramKeyWords = readTelegramKeyWords();
    var chName = data.slice(data.indexOf("CH") + 6, data.indexOf("CH") + 22).toString();
    var isAlreadyOnLastCalls = lastCalls.filter((call) => call.includes(chName)).length > 1;

    /* Send telegram message only if chName contain keywords from .txt file and if that channel is new(no present on last calls) */
    if (telegramKeyWords.some((word) => data.toLowerCase().includes(word.toLowerCase())) && !isAlreadyOnLastCalls) {
      msg = data;
    }
    if (msg != "") {
      telegramBot.sendMessage(telegramChannelId, msg);
      console.log("Sending message to telegram channel:\n" + msg);
    }
  } catch (error) {
    console.log(error);
  }
}

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
  cpu.usage()
  .then(cpuPercentage => {
    cpuLoad = parseInt(cpuPercentage);
  })
}

function getWifiStatus() {
  exec("iwconfig wlan0 &", (error, stdout, stderr) => {
    if (error) {
      console.log(`getWifiStatus error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`getWifiStatus stderr: ${stderr}`);
      return;
    }
    SSID = stdout.split('ESSID:"')[1].split('"')[0];
    Quality = stdout.split("Link Quality=")[1].split(" ")[0];
    wifiStatus = SSID + " | Quality: " + Quality;
  });
}

function sendUnidenSendBuffer() {
  io.emit("unidenText", unidenSendBuffer);
}

var _appendBuffer = function (buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp;
};

/* 5 second task */
setInterval(function () {
  /* get CPU load and temp every 5 seconds */
  getCpuLoad();
  getCpuTemp();
  getWifiStatus();
}, 5000);

setInterval(function () {
  /* read current status from Uniden every unidenRefreshRate miliseconds */
  if (unidenPendingRequests.length == 0) {
    unidenReadCurrentStatus();
  }
}, unidenRefreshRate);

setInterval(function () {
  sendUnidenSendBuffer();
}, pageRefreshRate);

/* Read data from Uniden serialport */
parser.on("data", (data) => {
  var receivedData = data;
  var responseHeader = unidenGetResponseHeader(receivedData);

  /* update remote mode status if not actual */
  if (receivedData.includes("Remote Mode") && !prgSts) {
    prgSts = 1;
    console.log("remote mode");
  }

  /* if received data contains last requests header and the response is ok, clear pending request */
  if (!unidenRequestsNotReady && unidenPendingRequests.length > 0) {
    if (unidenPendingRequests[0].includes(responseHeader)) {
      if (!receivedData.includes("ERR") && !receivedData.includes("NG")) {
        // console.log("Shifting cmd: " + unidenPendingRequests[0]);
        unidenPendingRequests.shift();
      } else {
        unidenRetryCnt++;
        if (unidenRetryCnt > unidenRetryCntMax) {
          console.log("[ERORR] Shifting cmd: " + unidenPendingRequests[0].toString());
          unidenPendingRequests.shift();
          unidenRetryCnt = 0;
        }
      }
      console.log("received " + receivedData + " - sending next req");
      unidenSendPendingRequests();
    }
    // console.log(unidenPendingRequests)
  }

  switch (responseHeader) {
    case "STS":
      unidenParseCurrentStatus(data);
      //unidenSendCmd('EPG\r');
      break;
    case "PRG":
      /* PRG OK */
      console.log("PRG: " + receivedData);
      if (receivedData.includes("OK")) {
        prgSts = 1;
      } else {
        prgSts = 0;
      }
      break;
    case "EPG":
      /* EPG OK */
      if (receivedData.includes("OK")) {
        prgSts = 0;
        //unidenSendCmd(buttonsDict['hold']);
      }
      break;
    case "N/A":
      console.log("invalid message N/A");
      break;
    default:
      // console.log("not handled header: " + receivedData.toString());
      unidenReceiveBuffer += receivedData.toString() + "\n";
      break;
  }
});
