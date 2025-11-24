import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const addon = require("./index.node");

export default addon;
export const { hello, init } = addon;
