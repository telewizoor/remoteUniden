const spi = require('spi-device');
const unidenServer = require("./../unidenServer.js");

var mcp2515_connected = 0;
var mcp2515_init = 0;
var spiSpeed = 250000;

const RECEIVE_TASK_PERIOD = 10;

/* commands */
const MCP2515_CMD_WRITE                  = 0x02;
const MCP2515_CMD_READ                   = 0x03;
const MCP2515_CMD_RESET	                 = 0xC0;

/* config regs */
const MCP2515_REG_CANINTE                = 0x2b;
const MCP2515_REG_CNF1                   = 0x2a;
const MCP2515_REG_CNF2                   = 0x29;
const MCP2515_REG_CNF3                   = 0x28;
const MCP2515_REG_CANCTRL                = 0x0f;

/* TX CTRL registers */
const MCP2515_REG_TXB0CTRL               = 0x30; // tx buffer 0 ctrl
const MCP2515_REG_TXB1CTRL               = 0x40; // tx buffer 1 ctrl
const MCP2515_REG_TXB2CTRL               = 0x50; // tx buffer 2 ctrl

/* TX buffers */
const MCP2515_REG_TXB0SIDH               = 0x31;
const MCP2515_REG_TXB0SIDL               = 0x32;
const MCP2515_REG_TXB0EID8               = 0x33;
const MCP2515_REG_TXB0EID0               = 0x34;
const MCP2515_REG_TXB0DLC                = 0x35;
const MCP2515_REG_TXB0D0                 = 0x36; // 0x36 - 0x3D

/* RX CTRL registers */
const MCP2515_REG_RXB0CTRL               = 0x60; // rx buffer 0 ctrl
const MCP2515_REG_RXB1CTRL               = 0x70; // rx buffer 1 ctrl

/* RX buffers */
const MCP2515_REG_INT_STATUS             = 0x2C;
const MCP2515_REG_INT_STATUS_RXB0_VAL    = 0x01;

const MCP2515_REG_RXB0SIDH               = 0x61;
const MCP2515_REG_RXB0SIDL               = 0x62;
const MCP2515_REG_RXB0DLC                = 0x65;
const MCP2515_REG_RXB0D0                 = 0x66; // 0x66 - 0x6D

const MCP2515_REG_RX_STATUS              = 0xB0;

const MCP2515_CMD_READ_RXBUF_RXB0SIDH    = 0x90;
const MCP2515_CMD_READ_RXBUF_RXB0D0      = 0x92;
const MCP2515_CMD_READ_RXBUF_RXB1SIDH    = 0x94;
const MCP2515_CMD_READ_RXBUF_RXB1D0      = 0x96;

/* MCP2515 config values for 125kbits */
const MCP2515_REG_CNF1_VAL           = 0x02;
const MCP2515_REG_CNF2_VAL           = 0xb8;
const MCP2515_REG_CNF3_VAL           = 0x05;
const MCP2515_REG_CANINTE_VAL        = 0x01;
const MCP2515_REG_CANCTRL_CONFIG_VAL = 0x80;
const MCP2515_REG_CANCTRL_VAL        = 0x00;
const MCP2515_REG_RXB0CTRL_VAL       = 0x60; // use only first message buffer

// The MCP2515 is on bus 0 and it's device 0
var mcp2515;

function sendByte(val) {
  const message = [{
    sendBuffer: Buffer.from([val]),
    receiveBuffer: Buffer.alloc(1),
    byteLength: 1,
    speedHz: spiSpeed,
  }];

  mcp2515.transferSync(message);
}

function writeReg(regAddr, regValue) {
  const message = [{
    sendBuffer: Buffer.from([MCP2515_CMD_WRITE, regAddr, regValue]),
    receiveBuffer: Buffer.alloc(3),
    byteLength: 3,
    speedHz: spiSpeed,
  }];

  mcp2515.transferSync(message);
}

function readReg(regAddr) {
  const message = [{
    sendBuffer: Buffer.from([MCP2515_CMD_READ, regAddr, 0xff]),
    receiveBuffer: Buffer.alloc(3),
    byteLength: 3,
    speedHz: spiSpeed,
  }];

  mcp2515.transferSync(message);
  return message[0].receiveBuffer[2];
}

function send(id, dlc, data = []) {
  if(mcp2515_init) {
    /* set ID, DLC, DATA */
    writeReg(MCP2515_REG_TXB0SIDH, id >> 3);
    writeReg(MCP2515_REG_TXB0SIDL, (id & 0x07) << 5);
    writeReg(MCP2515_REG_TXB0EID8, 0x00);
    writeReg(MCP2515_REG_TXB0EID0, 0x00);
    writeReg(MCP2515_REG_TXB0DLC, dlc);
    /* DATA */
    writeReg(MCP2515_REG_TXB0D0, data[0]);
    /* send message from buffer 0 */
    for(let i = 0; i < dlc; i++) {
      writeReg(MCP2515_REG_TXB0D0 + i, data[i]);
    }
    writeReg(MCP2515_REG_TXB0CTRL, 0x08);
  }
}

function init() {
  console.log("Initializing CAN...");
  mcp2515 = spi.openSync(0, 0);

  /* software reset */
  sendByte(MCP2515_CMD_RESET);
  writeReg(MCP2515_REG_CANCTRL, MCP2515_REG_CANCTRL_CONFIG_VAL);
  writeReg(MCP2515_REG_CNF1, MCP2515_REG_CNF1_VAL);
  writeReg(MCP2515_REG_CNF2, MCP2515_REG_CNF2_VAL);
  writeReg(MCP2515_REG_CNF3, MCP2515_REG_CNF3_VAL);
  writeReg(MCP2515_REG_RXB0CTRL, MCP2515_REG_RXB0CTRL_VAL);
  writeReg(MCP2515_REG_CANINTE, MCP2515_REG_CANINTE_VAL);
  console.log("CNF1 = " + readReg(MCP2515_REG_CNF1));
  writeReg(MCP2515_REG_CANCTRL, MCP2515_REG_CANCTRL_VAL);
  mcp2515_init = 1;
}

setInterval(function () {
  if(mcp2515_init) {
    intReg = readReg(MCP2515_REG_INT_STATUS);
    // console.log(intReg);
    if(MCP2515_REG_INT_STATUS_RXB0_VAL & intReg) {
      // console.log("Can received message!");
      /* Reset RXB0 interrupt bit */
      writeReg(MCP2515_REG_INT_STATUS, intReg - MCP2515_REG_INT_STATUS_RXB0_VAL);

      var id = readReg(MCP2515_REG_RXB0SIDH) << 3 + readReg(MCP2515_REG_RXB0SIDL);
      var dlc = readReg(MCP2515_REG_RXB0DLC);
      var data = [];
      for(let i = 0; i < dlc; i++) {
        data.push(readReg(MCP2515_REG_RXB0D0 + i));
      }
      /* call receive callback */
      unidenServer.receiveCb(id, dlc, data);
    }
  }
}, RECEIVE_TASK_PERIOD);

module.exports = { init, send };
