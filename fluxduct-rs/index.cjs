/* eslint-disable */
"use strict";

let addon;
try {
  addon = require("./index.node");
} catch (error) {
  throw new Error(`Failed to load fluxduct-rs native module: ${error.message}`);
}

module.exports = addon;
module.exports.default = addon;
