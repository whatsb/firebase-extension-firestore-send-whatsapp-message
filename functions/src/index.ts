/**
 * WhatsApp Message Sender Extension
 * This extension listens for new documents in the "whatsapp_messages" collection in Firestore.
 * When a new document is created, it sends a WhatsApp message using the whatsbox API.
 */

import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { FirestoreEvent, onDocumentCreated, } from "firebase-functions/v2/firestore";
import config from "./config";
import { STATUS, WhatsAppDocData } from "./types";

let initialized = false;

async function initialize() {
    initializeApp();
    initialized = true;
}

export const submit = onDocumentCreated(`${config.MESSAGES_COLLECTION}/{messageId}`,
    async (event: FirestoreEvent<FirebaseFirestore.DocumentSnapshot | undefined>) => {
        console.log("Received new document creation event for WhatsApp message submission.");
        if (!initialized) {
            await initialize();
        }
  
        const snapshot = event.data as FirebaseFirestore.DocumentSnapshot;
        const docRef = snapshot.ref;

        try {
            const whatsboxApiKey = config.WHATSBOX_API_KEY;
            const instanceId = process.env.EXT_INSTANCE_ID;
            const apiHost = config.API_HOST || "https://api.whatsbox.io";

            if (!whatsboxApiKey) {
                logger.error("Missing environment variable", { missingKey: "WHATSBOX_API_KEY", message: "WHATSBOX_API_KEY environment variable is not set." });
                await docRef.update({
                    delivery: { status: STATUS.ERROR, error: { message: "WHATSBOX_API_KEY environment variable is not set." } }
                });
                return;
            }

            const snapshotData = snapshot.data() as WhatsAppDocData | undefined;
            const to = snapshotData?.to;
            const from = snapshotData?.from || config.DEFAULT_FROM;

            if (!to) {
                logger.error("Missing required document field", { field: "to", message: "'to' field is required in the document" });
                await docRef.update({ delivery: { status: STATUS.ERROR, error: { message: "'to' field is required in the document" } } });
                return;
            }

            if (!from) {
                logger.error("Missing required document field", { field: "from", message: "'from' field is required in the document when default 'from' is not provided during the installation." });
                await docRef.update({ delivery: { status: STATUS.ERROR, error: { message: "'from' field is required in the document when default 'from' is not provided during the installation." } } });
                return;
            }

            const [apiNode, messagePayload] = constructPayload(snapshotData);
            if (apiNode === null) {
                logger.error("Unsupported message format", { documentId: event.params.messageId });
                await docRef.update({
                    delivery: {
                        status: STATUS.ERROR,
                        error: { message: "Unsupported message format. Please ensure the document contains the correct fields for a text, media, or template message." }
                    }
                });
                return;
            }

            console.log("Constructed message payload, sending API request to WhatsBox.", { apiNode, messagePayload });
            const payload = {
                medium: "FIREBASE_EXTENSION",
                channel_id: from,
                to,
                name: snapshotData?.name,
                user_id: snapshotData?.user_id,
                ...messagePayload
            };
            
            // Execute API Request
            const response = await fetch(`${apiHost}/messages/${apiNode}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": whatsboxApiKey },
                body: JSON.stringify(payload),
            });

            // Safely parse response body (handles HTML/Text error rollbacks)
            let responseData: any;
            const responseText = await response.text();
            try {
                responseData = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                responseData = { message: responseText || "Empty or invalid response from API server" };
            }

            // Handle API Failures
            if (!response.ok) {
                logger.error("API request failed", { instanceId: instanceId || 'unknown', status: response.status, body: responseData });
                await docRef.update({ delivery: { status: STATUS.ERROR, error: responseData } });
                return;
            }

            // Successfully Sent
            await docRef.update({
                delivery: {
                    info: responseData,
                    error: null,
                    sent_at: new Date(),
                    status: STATUS.SUBMITTED
                }
            });

        } catch (error: any) {
            // Top-level catch block protects the function lifecycle from unhandled rejections
            logger.error("Unhandled runtime error occurred processing WhatsApp delivery", { error });
            try {
                await docRef.update({
                    delivery: {
                        status: STATUS.ERROR,
                        error: { message: error?.message || "Internal extension runtime exception." }
                    }
                });
            } catch (dbError) {
                logger.error("Critically failed to update Firestore document with runtime error status", { dbError });
            }
        }
    }
);

/**
 * Evaluates the structural strategy of the payload matching business fields
 */
const constructPayload = (snapshotData: WhatsAppDocData | undefined): [string | null, Record<string, any>] => {
    if (!snapshotData) {
        return [null, {}];
    }

    switch (snapshotData.type) {
        case "text":
            if (snapshotData.text?.body) {
                return ["text", {
                    body: snapshotData.text.body,
                    preview_url: snapshotData.text.preview_url
                }];
            }
            break;

        case "image":
        case "video":
        case "audio":
            return ["media", {
                type: snapshotData.type,
                link: snapshotData[snapshotData.type]!.link,
                caption: snapshotData[snapshotData.type]!.caption,
            }];

        case "document":
            return ["media", {
                type: snapshotData.type,
                link: snapshotData.document!.link,
                filename: snapshotData.document!.filename
            }];
            
        case "template":
            if (snapshotData.template?.name) {
                return ["template", {
                    template_name: snapshotData.template.name,
                    components: snapshotData.template.components || []
                }];
            }
            break;
        
    }

    return [null, {}];
};