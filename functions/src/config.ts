import { Config } from "./types";

const config: Config = {
    MESSAGES_COLLECTION: process.env.MESSAGES_COLLECTION || "",
    DEFAULT_FROM: process.env.DEFAULT_FROM || "",
    WHATSBOX_API_KEY: process.env.WHATSBOX_API_KEY || "",
    API_HOST: process.env.API_HOST || "https://api.whatsbox.io"
}

export default config;