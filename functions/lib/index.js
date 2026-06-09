"use strict";
/**
 * WhatsApp Message Sender Extension
 * This extension listens for new documents in the "whatsapp_messages" collection in Firestore.
 * When a new document is created, it sends a WhatsApp message using the whatsbox API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.submit = void 0;
const firebase_functions_1 = require("firebase-functions");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-functions/v2/firestore");
const config_1 = require("./config");
const types_1 = require("./types");
let initialized = false;
async function initialize() {
    (0, app_1.initializeApp)();
    initialized = true;
}
exports.submit = (0, firestore_1.onDocumentCreated)(`${config_1.default.MESSAGES_COLLECTION}/{messageId}`, async (event) => {
    console.log("Received new document creation event for WhatsApp message submission.");
    if (!initialized) {
        await initialize();
    }
    const snapshot = event.data;
    const docRef = snapshot.ref;
    try {
        const whatsboxApiKey = config_1.default.WHATSBOX_API_KEY;
        const instanceId = process.env.EXT_INSTANCE_ID;
        const apiHost = config_1.default.API_HOST || "https://api.whatsbox.io";
        console.log(whatsboxApiKey);
        // Validate critical environment variables
        if (!whatsboxApiKey) {
            firebase_functions_1.logger.error("Missing environment variable", { missingKey: "WHATSBOX_API_KEY", message: "WHATSBOX_API_KEY environment variable is not set." });
            await docRef.update({
                delivery: { status: types_1.STATUS.ERROR, error: { message: "WHATSBOX_API_KEY environment variable is not set." } }
            });
            return;
        }
        const snapshotData = snapshot.data();
        const to = snapshotData?.to;
        const from = snapshotData?.from || config_1.default.DEFAULT_FROM;
        console.log(from);
        // Validate required document data
        if (!to) {
            firebase_functions_1.logger.error("Missing required document field", { field: "to", message: "'to' field is required in the document" });
            await docRef.update({ delivery: { status: types_1.STATUS.ERROR, error: { message: "'to' field is required in the document" } } });
            return;
        }
        if (!from) {
            firebase_functions_1.logger.error("Missing required document field", { field: "from", message: "'from' field is required in the document when default 'from' is not provided during the installation." });
            await docRef.update({ delivery: { status: types_1.STATUS.ERROR, error: { message: "'from' field is required in the document when default 'from' is not provided during the installation." } } });
            return;
        }
        // Construct the payload based on business logic
        const [apiNode, messagePayload] = constructPayload(snapshotData);
        if (apiNode === null) {
            firebase_functions_1.logger.error("Unsupported message format", { documentId: event.params.messageId });
            await docRef.update({
                delivery: {
                    status: types_1.STATUS.ERROR,
                    error: { message: "Unsupported message format. Please ensure the document contains the correct fields for a text, media, or template message." }
                }
            });
            return;
        }
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
        let responseData;
        const responseText = await response.text();
        try {
            responseData = responseText ? JSON.parse(responseText) : {};
        }
        catch (e) {
            responseData = { message: responseText || "Empty or invalid response from API server" };
        }
        // Handle API Failures
        if (!response.ok) {
            firebase_functions_1.logger.error("API request failed", { instanceId: instanceId || 'unknown', status: response.status, body: responseData });
            await docRef.update({ delivery: { status: types_1.STATUS.ERROR, error: responseData } });
            return;
        }
        // Successfully Sent
        await docRef.update({
            delivery: {
                info: responseData,
                error: null,
                sent_at: new Date(),
                status: types_1.STATUS.SUBMITTED
            }
        });
    }
    catch (error) {
        // Top-level catch block protects the function lifecycle from unhandled rejections
        firebase_functions_1.logger.error("Unhandled runtime error occurred processing WhatsApp delivery", { error });
        try {
            await docRef.update({
                delivery: {
                    status: types_1.STATUS.ERROR,
                    error: { message: error?.message || "Internal extension runtime exception." }
                }
            });
        }
        catch (dbError) {
            firebase_functions_1.logger.error("Critically failed to update Firestore document with runtime error status", { dbError });
        }
    }
});
/**
 * Evaluates the structural strategy of the payload matching business fields
 */
const constructPayload = (snapshotData) => {
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
                    link: snapshotData[snapshotData.type].link,
                    caption: snapshotData[snapshotData.type].caption,
                }];
        case "document":
            return ["media", {
                    type: snapshotData.type,
                    link: snapshotData.document.link,
                    filename: snapshotData.document.filename
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
//# sourceMappingURL=index.js.map