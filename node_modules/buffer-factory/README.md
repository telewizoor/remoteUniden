[![Build Status](https://api.travis-ci.org/imnemo/buffer-factory.svg?branch=master)](https://travis-ci.org/imnemo/buffer-factory)
[![Coverage Status](https://coveralls.io/repos/github/imnemo/buffer-factory/badge.svg?branch=master)](https://coveralls.io/github/imnemo/buffer-factory?branch=master)
<a href="https://www.npmjs.com/package/buffer-factory" alt="NPM total downloads"><img src="https://img.shields.io/npm/dt/buffer-factory.svg"></a>
<a href="https://www.npmjs.com/package/buffer-factory" alt="NPM latest version"><img src="https://img.shields.io/npm/v/buffer-factory.svg"></a>
<a href="https://npms.io/search?q=buffer-factory" alt="NPM latest version"><img src="https://badges.npms.io/buffer-factory.svg"></a>
<a href="https://npm.runkit.com/buffer-factory"><img src="https://badge.runkitcdn.com/buffer-factory.svg" alt="Try buffer-factory on RunKit"/></a>
[![DeepScan grade](https://deepscan.io/api/teams/273/projects/1293/branches/3476/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=273&pid=1293&bid=3476)
<a href="https://github.com/imnemo/buffer-factory" alt="Github stars"><img src="https://img.shields.io/github/stars/imnemo/buffer-factory.svg?style=social&label=Star"></a>
<a href="https://github.com/imnemo/buffer-factory" alt="Github forks"><img src="https://img.shields.io/github/forks/imnemo/buffer-factory.svg?style=social&label=Fork"></a>
<a href="https://github.com/imnemo/buffer-factory" alt="Github contributors"><img src="https://img.shields.io/github/contributors/imnemo/buffer-factory.svg"></a>

# Buffer Factory - ([中文版README](./README-zh.md))

`buffer-factory` makes it no pain to create a Buffer object by encapsulate Buffer.from an new Buffer().

This module has been well unit tested and documented.

# Usage

## install

`npm i buffer-factory`

## use

```javascript
const bufferFactory = require('buffer-factory')
bufferFactory('2b', 'hex')
```

## Implementation

`Buffer.from` is preffered to be used when it's accessible.

`Buffer.from` is added from v5.10.0, as the api document shows. But some node version, v4.2.6 for example, `Buffer.from` is a function, however, there is an error when you call `Buffer.from(string, encoding)`(error like `hex is not function`). So I also take the node version into account.  

For low versions of Node.js, this module use `new Buffer(...)`.  

You're free to pass in the same params as `Buffer.from(...)` and `new Buffer(...)`, I will handle the rest for you.  

You're also free to check `index.js` for the implementation code :).