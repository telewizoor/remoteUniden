'use strict';

/**
 * For simplicity, there is no params validation check,
 * becuase this util function is only used here .
 * Also, I suppose that versionA and versionB are valid semver string .
 */
function isLargerOrEqual(versionA, versionB) {
  if (versionA === versionB)
    return true;

  var ver1 = versionA.split('.');
  var ver2 = versionB.split('.');

  var len = ver1.length;
  for (var i = 0; i < len; i++) {
    if (ver1[i] === ver2[i] || ver1[i] > ver2[i])
      return true;
  }

  return false;
}

var makeBufferByBufferFrom = function () {
  var args = Array.prototype.slice.call(arguments, 0);
  return Buffer.from.apply(null, args);
}

var makeBufferByNewBuffer = function () {
  var args = Array.prototype.slice.call(arguments, 0);
  args.unshift(null);
  return new (Function.prototype.bind.apply(Buffer, args));
}

/**
 * @type function(...bufferParams: any[]):Buffer
 */
let bufferFactory;

/*
 * Buffer.from is added in v5.10.0, as the api document shows. But some node version,
 * v4.2.6 for example, Buffer.from is function, however, there is an error when you call
 * `Buffer.from(string, encoding)`(error like `hex is not function`).
 */
if (typeof Buffer.from === 'function' && isLargerOrEqual(process.version, "v5.10.0")) {
  bufferFactory = makeBufferByBufferFrom;
} else {
  bufferFactory = makeBufferByNewBuffer;
}

module.exports = bufferFactory;
module.exports.create = bufferFactory;