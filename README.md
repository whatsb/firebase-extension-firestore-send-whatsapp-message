# Trigger WhatsApp Message from Firestore

This Firebase Extension sends WhatsApp messages automatically using the WhatsBox API whenever a new document is created in a specified Cloud Firestore collection. It supports sending template, text, and media messages, enabling you to seamlessly integrate automated WhatsApp messaging from your Firebase application without a need to integrate with complex WhatsApp Business API.

The extension uses WhatsBox.io's API to route the messages to WhatsApp.

## Prerequisites

Before installing and using this extension, ensure you have completed the following steps:

1. Sign-up WhatsBox: Create an account on the [WhatsBox platform](https://app.whatsbox.io).
1. Add a WhatsApp Number: [Connect a WhatsApp number on WhatsBox](https://app.whatsbox.io/channels). You can use your own number or select a Meta-provided test number.
1. Create WhatsApp Templates: Create and get your message templates approved on [Meta WhatsApp Manager](https://business.facebook.com/wa/manage/template-library).
1. Sync Templates: [Sync your approved templates on WhatsBox](https://app.whatsbox.io/templates/wa-sync) before the extension can use them to send messages via the WhatsApp Business API.

## Installation

You can install this extension using one of two methods:

### Method 1: Automated Script (Recommended)

We provide an automated script that securely handles the installation process, ensuring existing configurations are respected.

You can run the installation script by running this command

```bash
npx @whatbox/install-firestore-send-whatsapp-message --project-id <your-firebase-project-id>
```

> [!NOTE]
> Installer repository is available at https://github.com/whatsb/install-firebase-extension-firestore-send-whatsapp-message

### Method 2: Manual Installation

You can also manually clone this repository and install the extension via the Firebase CLI.

1. Clone this repository to your local machine.
1. Run the Firebase CLI command `firebase ext:install firestore-send-whatsapp-message --project=<your-project-id>` to install the extension from the local source.

> [!CAUTION]
> During the interactive installation process, if the CLI asks whether you want to uninstall other extensions, you must reply with "N". Using the automated script (Method 1) is safer as it automatically handles this step to prevent accidental data loss.

### Configuration Parameters

During the installation process, you will be prompted to configure the following parameters:

- WhatsBox API Key (WHATSBOX_API_KEY): Your unique API key for authenticating with WhatsBox. You can generate and retrieve this key from your [WhatsBox dashboard](https://app.whatsbox.io/settings/api-keys).
- WhatsApp message documents collection (FIRESTORE_COLLECTION): The path to the Cloud Firestore collection where you will create documents to trigger the messages. The default value is `whatsapp_messages`.
- Default from (DEFAULT_FROM): The WhatsApp number connected on WhatsBox from which messages will be sent by default (e.g., `16317471111`). If a `from` field is explicitly provided in your Firestore document, it will override this default setting.

## Installed Components

Installing this extension will deploy the following resources to your Firebase project:

- sendWhatsAppMessages (Cloud Function): A Node.js Cloud Function (v2) that listens for new document creations in your configured Firestore collection. It processes the document data, sends the corresponding payload to the WhatsBox API, and updates the Firestore document with the API response status.

## Usage

To trigger a WhatsApp message, add a new document to your configured Firestore collection (e.g., `whatsapp_messages`). The document structure should match the payload expected by the WhatsBox API endpoints.

### Expected Inputs (Firestore Document Schema)

#### Required Fields

Field|Data Type|Details
---|---|---
**`to`**|string|The recipient's WhatsApp phone number (starting with the country dial code).
**`type`**|string|Type of the message - `template`, `text`, `image`, `video`, or `document`. Other message types are not supported at the moment.
**`template`**|map|Required when `type` is `template`. It should be a map/object with fields `{ name: "your_template_name", coomponents: "template parameters if any." }`.
**`text`**|map|Required when `type` is `template`. It should be a map/object with fields `{ body: "your message text" }`.
**`image`**|map|Required when `type` is `image`. It should be a map/object with fields `{ link: "publicly accessible media url":, caption: "optional caption" }`.
**`video`**|map|Required when `type` is `video`. It should be a map/objecct with fields `{ link: "publicly accessible media url":, caption: "optional caption" }`.
**`document`**|map|Required when `type` is `document`. It should be a map/objecct with fields `{ link: "publicly accessible media url":, caption: "optional caption", filename: "optional file name (e.g., sample.pdf)" }`.

#### Optional Fields

Field|Data Type|Details
---|---|---
**`from`**|string|The WhatsApp number connected on WhatsBox from which messages will be sent. This field becomes required when "Default from" is not provided during installation.
**`name`**|string|The recipient's name.

#### Examples

Below are examples of how to format your Firestore documents for different types of messages.

### 1. Template Messages

Sending template messages allows you to initiate conversations. Here are some examples:

> [!NOTE]
> 1. The expected `components` parameters (if any) follows the exact format supported by the WhatsApp Cloud API.
> 2. `template_name` should be the name of the template created on WhatsApp Manager and synced to WhatsBox.
> 3. If you provide a `from` field with your WhatsApp number, it will override the default value provided during the installation.

#### Simple Template (No Parameters)

```JSON
{
  "to": "1234567890",
  "type": "template",
  "template": {
    "name": "welcome_message"
  }
}
```

#### Template with Header Text & Body Parameters

```JSON
{
  "to": "1234567890",
  "type": "template",
  "template": {
    "name": "order_update",
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "text",
            "text": "Order #98765"
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "John Doe"
          },
          {
            "type": "text",
            "text": "Out for delivery"
          }
        ]
      }
    ]
  }
}
```

#### Template with Header Image

```JSON
{
  "to": "1234567890",
  "type": "template",
  "template": {
    "name": "promotional_offer",
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "image",
            "image": {
              "link": "https://example.com/summer-sale.png"
            }
          }
        ]
      }
    ]
  }
}
```

#### Template with Header Document, Body Parameters, and URL Button

```JSON
{
  "to": "1234567890",
  "type": "template",
  "template": {
    "name": "monthly_invoice",
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "document",
            "document": {
              "link": "https://example.com/invoices/INV-001.pdf",
              "filename": "INV-001.pdf"
            }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "Jane"
          },
          {
            "type": "text",
            "text": "$125.00"
          }
        ]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": "0",
        "parameters": [
          {
            "type": "text",
            "text": "INV-001"
          }
        ]
      }
    ]
  }
}
```

#### Text Message

> [!CAUTION]
> Text and media messages without template get delivered only within 24-hour session window from receiving an incoming message from your target recipient.

```JSON
{
  "to": "1234567890",
  "type": "text",
  "text": {
    "body": "Hello! How can we help you today?"
  }
}
```

#### Media Message (Image)

```JSON
{
  "to": "1234567890",
  "type": "image",
  "image": {
    "link": "https://example.com/my-image.png",
    "caption": "My sample message"
  }
}
```

#### Media Message (Video)

```JSON
{
  "to": "1234567890",
  "type": "image",
  "image": {
    "link": "https://example.com/my-video.mp4",
    "caption": "My sample message"
  }
}
```

#### Media Message (Document)

```JSON
{
  "to": "1234567890",
  "type": "document",
  "image": {
    "link": "https://example.com/my-file.pdf",
    "filename": "Statement.pdf",
    "caption": "My sample message"
  }
}
```

## Limitations

### Status Tracking

  - This extension updates the Firestore document with the immediate status returned by the WhatsBox API upon submission.
  - It does not capture or record the actual delivery or read status from the WhatsApp network.
  - To view the final delivery status of a message, you must check your WhatsApp Manager or WhatsBox inbox.
  - Support for updating status from WhatsApp may be released in the future.
