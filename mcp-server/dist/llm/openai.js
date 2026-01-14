"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openai = void 0;
exports.getOpenAI = getOpenAI;
const openai_1 = __importDefault(require("openai"));
let openaiInstance = null;
function getOpenAI() {
    if (!openaiInstance) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY is missing");
        }
        openaiInstance = new openai_1.default({ apiKey });
    }
    return openaiInstance;
}
// For backwards compatibility, export a proxy that only initializes when accessed
exports.openai = {
    get chat() {
        return getOpenAI().chat;
    },
};
