'use strict';

// Primordials shim - frozen built-in methods used by Node.js internals
// In userland this is just a passthrough to regular built-ins

module.exports = {
  ArrayPrototypeIndexOf: (arr, v) => arr.indexOf(v),
  ArrayPrototypePush: (arr, ...v) => arr.push(...v),
  ArrayPrototypeSplice: (arr, ...a) => arr.splice(...a),
  Boolean,
  DateNow: Date.now,
  ErrorCaptureStackTrace: Error.captureStackTrace?.bind(Error) ?? (() => {}),
  Float64Array,
  MathCeil: Math.ceil,
  MathFloor: Math.floor,
  MathMin: Math.min,
  ObjectDefineProperties: Object.defineProperties,
  ObjectDefineProperty: Object.defineProperty,
  ObjectFreeze: Object.freeze,
  Promise,
  PromiseResolve: Promise.resolve.bind(Promise),
  SafeMap: Map,
  SafeSet: Set,
  StringPrototypeEndsWith: (s, v) => s.endsWith(v),
  StringPrototypeLastIndexOf: (s, v) => s.lastIndexOf(v),
  StringPrototypeReplaceAll: (s, a, b) => s.replaceAll(a, b),
  StringPrototypeSlice: (s, a, b) => s.slice(a, b),
  StringPrototypeSplit: (s, d) => s.split(d),
  StringPrototypeStartsWith: (s, v) => s.startsWith(v),
  Symbol,
  SymbolAsyncIterator: Symbol.asyncIterator,
};
