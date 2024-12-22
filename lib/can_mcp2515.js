const spi = require('spi-device');

var mcp2515_connected = 0;
var mcp2515_init = 0;
var spiSpeed = 100000;
var regSize = 1;

/* commands */
const MCP2515_CMD_WRITE                  = 0x02;
const MCP2515_CMD_READ                   = 0x03;

/* config regs */
const MCP2515_REG_CNF1                   = 0x2a;
const MCP2515_REG_CNF2                   = 0x29;
const MCP2515_REG_CNF3                   = 0x28;
const MCP2515_REG_CANCTRL                = 0x0f;

/* TX registers */
const MCP2515_REG_TXB0CTRL               = 0x30; // tx buffer 0 ctrl
const MCP2515_REG_TXB1CTRL               = 0x40; // tx buffer 1 ctrl
const MCP2515_REG_TXB2CTRL               = 0x50; // tx buffer 2 ctrl

/* RX registers */
const MCP2515_REG_RXB0CTRL               = 0x60; // rx buffer 0 ctrl
const MCP2515_REG_RXB1CTRL               = 0x70; // rx buffer 1 ctrl

/* MCP2515 config values for 125kbits */
const MCP2515_REG_CNF1_VAL    = 0x02;
const MCP2515_REG_CNF2_VAL    = 0xb5;
const MCP2515_REG_CNF3_VAL    = 0x01;
const MCP2515_REG_CANCTRL_VAL = 0x00;

// The MCP2515 is on bus 0 and it's device 0
var mcp2515;

function writeReg(regAddr, regValue) {
  // An SPI message is an array of one or more read+write transfers
  const message = [{
    sendBuffer: Buffer.from([MCP2515_CMD_WRITE, regAddr, regValue]),
    receiveBuffer: Buffer.alloc(1),
    byteLength: 2,
    speedHz: spiSpeed // Use a low bus speed to get a good reading from the TMP36
  }];

  mcp2515.transfer(message, (err, message) => {
    if (err) throw err;
    console.log(message[0].receiveBuffer[0]);
  });
}

function initMcp2515() {
  mcp2515 = spi.open(0, 0, err => {
    if (err) throw err;
    mcp2515_connected = 1;
    initMcp2515();
  });

  writeReg(MCP2515_REG_CNF1, MCP2515_REG_CNF1_VAL);
  writeReg(MCP2515_REG_CNF2, MCP2515_REG_CNF2_VAL);
  writeReg(MCP2515_REG_CNF3, MCP2515_REG_CNF3_VAL);
  writeReg(MCP2515_REG_CANCTRL, MCP2515_REG_CANCTRL_VAL);
  mcp2515_init = 1;
}

module.exports = { add };

// mcp3008.transfer(message, (err, message) => {
//   if (err) throw err;

//   // Convert raw value from sensor to celcius and log to console
//   const rawValue = ((message[0].receiveBuffer[1] & 0x03) << 8) +
//     message[0].receiveBuffer[2];
//   const voltage = rawValue * 3.3 / 1023;
//   const celcius = (voltage - 0.5) * 100;

//   console.log(celcius);
// });
