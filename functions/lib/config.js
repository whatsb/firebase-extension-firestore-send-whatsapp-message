"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    MESSAGES_COLLECTION: process.env.MESSAGES_COLLECTION || "",
    DEFAULT_FROM: process.env.DEFAULT_FROM || "",
    WHATSBOX_API_KEY: process.env.WHATSBOX_API_KEY || "",
    API_HOST: process.env.API_HOST || "https://api.whatsbox.io"
};
exports.default = config;
//# sourceMappingURL=config.js.map