"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// https://github.com/tc39/proposal-promise-with-resolvers/blob/3a78801e073e99217dbeb2c43ba7212f3bdc8b83/polyfills.js#L1C1-L9C2
if (Promise.withResolvers === undefined) {
    Promise.withResolvers = () => {
        const out = {};
        out.promise = new Promise((resolve_, reject_) => {
            out.resolve = resolve_;
            out.reject = reject_;
        });
        return out;
    };
}
