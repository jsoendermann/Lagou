// Promises are state machines that are PENDING initially before they transition to either
// FULFILLED or REJECTED after which their state must not change again.
const PENDING = Symbol('pending');
const FULFILLED = Symbol('fulfilled');
const REJECTED = Symbol('rejected');


export default class LagouPromise {

  // The constructor takes a function which in turn takes up to two functions as parameters,
  // one two fulfill the promise with a value, the other to reject it with a reason.
  // Suppose you have a function makeRequest(url, callback), you can convert it to a promise
  // like so (note that the resolver is usually passed directly to the Promise constructor
  // instead of being saved in a variable):
  // const resolver = (fulfill, reject) => {
  //   makeRequest('http://...', (error, result) => {
  //     if (error) {
  //       reject(error);
  //     } else {
  //       fulfill(result);
  //     }
  //   });
  // };
  // const promise = new Promise(resolver);
  constructor(untrustedResolver) {
    this.state = PENDING;
    this.value = null;
    this.handlers = [];

    this.fulfill = this.fulfill.bind(this);
    this.reject = this.reject.bind(this);
    this.handle = this.handle.bind(this);

    // This adds safety checks explained in the comments below but is otherwise equivalent to
    // untrustedResolver(this.fulfill, this.reject);
    LagouPromise.doResolve(untrustedResolver, this.fulfill, this.reject);
  }

  fulfill(result) {
    try {
      // Promises can not be fulfilled with another promise so if the resolver calls this method with
      // a promise (which we identify by checking if it has an attribute named 'then' that's a function'),
      // we fulfill this promise with the result of the nested promise.
      let then = null;
      const t = typeof result;
      if (result && (t === 'object' || t === 'function')) {
        const resultThen = result.then;
        if (typeof thenAttr === 'function') {
          then = resultThen;
        }
      }

      if (then) {
        LagouPromise.doResolve(then.bind(result), this.fulfill, this.reject);
      } else {
        this.state = FULFILLED;
        this.value = result;

        // Call all registered handlers with the value we've received
        this.handlers.forEach(this.handle);

        // These handlers shouldn't be called again and neither should new ones be added because at this point,
        // the promise has been fulfilled and calling its .then method will cause onFulfilled and onRejected
        // be called immediately in the next iteration of the event loop.
        this.handlers = null;
      }
    } catch (e) {
      // If anything goes wrong while we're in this method, we reject the promise
      this.reject(e);
    }
  }

  // This is a simpler version of .fulfill
  reject(error) {
    this.state = REJECTED;
    this.value = error;
    this.handlers.forEach(this.handle);
    this.handlers = null;
  }

  // This is a helper function called by .done and (indirectly) by .then. A handler here is an object
  // with optional onFulfilled and onRejected function attributes that either get called immediately
  // if the promise has already been fulfilled or rejected or the handler gets added to this.handlers.
  handle(handler) {
    if (this.state === PENDING) {
      this.handlers.push(handler);
    } else {
      if (this.state === FULFILLED && typeof handler.onFulfilled === 'function') {
        handler.onFulfilled(this.value);
      }
      if (this.state === REJECTED && typeof handler.onRejected === 'function') {
        handler.onRejected(this.value);
      }
    }
  }

  // This is a simple version of .then that does not return another promise. Following the spec,
  // this function waits for the next iteration of the event loop to do anything.
  done(onFulfilled, onRejected) {
    setTimeout(() => {
      this.handle({
        onFulfilled,
        onRejected,
      });
    }, 0);
  }

  // .then is used to register functions (onFulfilled, onRejected) to be executed once the promise gets resolved.
  // What makes this function slightly complex is that it returns a new promise which gets resolved with the return
  // value of onFulfilled or onRejected.
  then(onFulfilled, onRejected) {
    return new LagouPromise((resolve, reject) => (
      this.done((result) => {
        if (typeof onFulfilled === 'function') {
          try {
            // result is the result of the original promise on which .then was called. We pass this result to
            // the onFulfilled parameter. The result of this function is then used to resolve the new promise.
            return resolve(onFulfilled(result));
          } catch (ex) {
            return reject(ex);
          }
        } else {
          return resolve(result);
        }
      }, (error) => {
        if (typeof onRejected === 'function') {
          try {
            return resolve(onRejected(error));
          } catch (ex) {
            return reject(ex);
          }
        } else {
          return reject(error);
        }
      })
    ));
  }

  // This is a small helper function that takes an untrusted resolver and makes sure fulfillment
  // or rejection only happens exactly once.
  static doResolve(untrustedResolver, onFulfilled, onRejected) {
    let done = false;
    try {
      untrustedResolver((result) => {
        if (done) return;
        done = true;
        onFulfilled(result);
      }, (reason) => {
        if (done) return;
        done = true;
        onRejected(reason);
      });
    } catch (ex) {
      if (done) return;
      done = true;
      onRejected(ex);
    }
  }
}
