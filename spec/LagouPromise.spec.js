/* global describe, it, expect */
/* eslint prefer-arrow-callback:0, func-names:0 */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */

const LagouPromise = require('../lib/LagouPromise').default;

describe('Promises', function () {
  it('should resolve', function () {
    new LagouPromise(function (resolve) {
      resolve(42);
    }).then(function (value) {
      expect(value).toEqual(42);
    });
  });

  it('should chain', function () {
    new LagouPromise(function (resolve) {
      resolve(42);
    }).then(function (value) {
      return value + 1;
    }).then(function (value) {
      expect(value).toEqual(43);
    });
  });

  it('should recover', function () {
    new LagouPromise(function (_resolve) {
      throw new Error();
    }).then(null, function (_error) {
      return 42;
    }).then(function (value) {
      expect(value).toEqual(42);
    });
  });

  it('should handle promises being resolved with other promises', function () {
    const innerPromise = new LagouPromise(resolve => resolve(42));
    const outerPromise = new LagouPromise(resolve => resolve(innerPromise));
    outerPromise.then(value => expect(value).toEqual(42));
  });
});
