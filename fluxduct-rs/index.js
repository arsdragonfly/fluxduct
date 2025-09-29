"use strict";

const path = require("node:path");
const { fileURLToPath } = require("node:url");
const { createRequire } = require("node:module");

const dirname = path.dirname(fileURLToPath(import.meta ? import.meta.url : __filename));
const requireAddon = createRequire(dirname + path.sep);

let addon;
try {
  addon = requireAddon("./index.node");
} catch (error) {
  throw new Error(`Failed to load fluxduct-rs native module: ${error.message}`);
}

module.exports = addon;
module.exports.default = addon;
