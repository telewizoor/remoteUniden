var should = require('chai').should();
var bufferFactory = require('../index');

describe('Syntax', function () {
  it('Should return a Buffer', function () {
    // type of buf1 is any, eslint error
    var buf1 = bufferFactory('2b', 'hex');
    (Buffer.isBuffer(buf1)).should.equal(true);

    // type of buf2 is Buffer
    var buf2 = bufferFactory.create('2b', 'hex');
    (Buffer.isBuffer(buf2)).should.equal(true);
  })
})