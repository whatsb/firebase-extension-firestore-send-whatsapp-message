
type Config = {
    MESSAGES_COLLECTION: string;
    DEFAULT_FROM: string;
    WHATSBOX_API_KEY?: string;
    API_HOST?: string;
}

enum STATUS {
    PENDING = "pending",
    SUBMITTED = "submitted",
    ERROR = "error"
}

interface WhatsAppDocData {
    to?: string;
    from?: string;
    name?: string;
    user_id?: string;
    type?: string;
    text?: {
        body: string;
        preview_url?: boolean;
    },
    image?: {
        link: string;
        caption?: string;
    },
    video?: {
        link: string;
        caption?: string;
    },
    audio?: {
        link: string;
        caption?: string;
    },
    document?: {
        link: string;
        filename?: string;
    },  
    template?: {
        name: string;
        language: {code: string};       
        components?: any[];
    }
}

export { STATUS, type WhatsAppDocData, type Config };