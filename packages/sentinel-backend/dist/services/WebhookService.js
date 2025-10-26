"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const app_1 = require("../app");
class WebhookService {
    constructor() {
        this.requestTimeout = 10000; // 10 seconds
    }
    // Send webhook to configured URL
    async sendWebhook(webhook, payload) {
        try {
            console.log(`Sending webhook ${webhook.name} to ${webhook.url}`);
            const payloadString = JSON.stringify(payload);
            const signature = this.generateSignature(payloadString, webhook.secret ?? undefined);
            const postData = payloadString;
            const url = new URL(webhook.url);
            const isHttps = url.protocol === "https:";
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(postData),
                    "User-Agent": "Sentinel-Webhook/1.0",
                    ...(signature && { "X-Sentinel-Signature": signature }),
                    ...(webhook.secret && { "X-Sentinel-Secret": webhook.secret }),
                },
                timeout: this.requestTimeout,
                ...(isHttps && {
                    rejectUnauthorized: false, // Allow self-signed certificates for development
                }),
            };
            return new Promise((resolve, reject) => {
                const req = (isHttps ? https_1.default : http_1.default).request(options, (res) => {
                    let data = "";
                    res.on("data", (chunk) => {
                        data += chunk;
                    });
                    res.on("end", () => {
                        if (res.statusCode &&
                            res.statusCode >= 200 &&
                            res.statusCode < 300) {
                            console.log(`Webhook ${webhook.name} delivered successfully (${res.statusCode})`);
                            resolve(true);
                        }
                        else {
                            console.error(`Webhook ${webhook.name} failed with status ${res.statusCode}: ${data}`);
                            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
                    });
                });
                req.on("error", (error) => {
                    console.error(`Webhook ${webhook.name} request error:`, error.message);
                    reject(error);
                });
                req.on("timeout", () => {
                    console.error(`Webhook ${webhook.name} timed out`);
                    req.destroy();
                    reject(new Error("Request timeout"));
                });
                req.write(postData);
                req.end();
            });
        }
        catch (error) {
            console.error(`Error sending webhook ${webhook.name}:`, error);
            throw error;
        }
    }
    // Generate HMAC signature for webhook verification
    generateSignature(payload, secret) {
        if (!secret)
            return null;
        try {
            // In a production environment, you'd use crypto.createHmac
            // For now, we'll use a simple hash
            const crypto = require("crypto");
            return crypto.createHmac("sha256", secret).update(payload).digest("hex");
        }
        catch (error) {
            console.error("Error generating webhook signature:", error);
            return null;
        }
    }
    // Validate incoming webhook signature
    validateSignature(payload, signature, secret) {
        if (!secret || !signature)
            return false;
        try {
            const crypto = require("crypto");
            const expectedSignature = crypto
                .createHmac("sha256", secret)
                .update(payload)
                .digest("hex");
            return signature === expectedSignature;
        }
        catch (error) {
            console.error("Error validating webhook signature:", error);
            return false;
        }
    }
    // Send test webhook
    async sendTestWebhook(webhookId, userId) {
        try {
            const webhook = await app_1.prisma.webhookConfig.findFirst({
                where: {
                    id: webhookId,
                    userId,
                },
            });
            if (!webhook) {
                throw new Error("Webhook not found");
            }
            const normalizedWebhook = {
                id: webhook.id,
                name: webhook.name,
                url: webhook.url,
                secret: webhook.secret,
                events: Array.isArray(webhook.events)
                    ? webhook.events
                    : [],
                isActive: webhook.isActive,
                userId: webhook.userId,
                createdAt: webhook.createdAt,
                updatedAt: webhook.updatedAt,
            };
            const testPayload = {
                event: "webhook.test",
                timestamp: new Date().toISOString(),
                data: {
                    webhookId: webhook.id,
                    webhookName: webhook.name,
                    message: "This is a test webhook notification from Sentinel",
                    test: true,
                },
            };
            return await this.sendWebhook(normalizedWebhook, testPayload);
        }
        catch (error) {
            console.error("Error sending test webhook:", error);
            throw error;
        }
    }
    // Process webhook delivery result
    async processDeliveryResult(webhookId, success, error, responseCode) {
        try {
            // In a production system, you might want to store delivery logs
            // For now, we'll just log it
            if (success) {
                console.log(`Webhook ${webhookId} delivered successfully (${responseCode})`);
            }
            else {
                console.error(`Webhook ${webhookId} delivery failed: ${error}`);
            }
            // You could implement retry logic here for failed deliveries
            // or store delivery history in the database
        }
        catch (error) {
            console.error("Error processing webhook delivery result:", error);
        }
    }
    // Get webhook statistics
    async getWebhookStats(webhookId) {
        try {
            // In a production system, you'd query delivery logs
            // For now, return basic info
            const webhook = await app_1.prisma.webhookConfig.findUnique({
                where: { id: webhookId },
            });
            if (!webhook) {
                throw new Error("Webhook not found");
            }
            return {
                webhookId: webhook.id,
                name: webhook.name,
                url: webhook.url,
                isActive: webhook.isActive,
                events: Array.isArray(webhook.events)
                    ? webhook.events
                    : [],
                createdAt: webhook.createdAt,
                // deliveryStats would come from a delivery logs table in production
            };
        }
        catch (error) {
            console.error("Error getting webhook stats:", error);
            throw error;
        }
    }
    // Retry failed webhook delivery
    async retryWebhookDelivery(deliveryId) {
        try {
            // In a production system, you'd have a delivery logs table
            // For now, this is a placeholder
            console.log(`Retrying webhook delivery ${deliveryId}`);
            return true;
        }
        catch (error) {
            console.error("Error retrying webhook delivery:", error);
            throw error;
        }
    }
    // Bulk send webhooks for multiple configurations
    async sendBulkWebhooks(userId, event, payload) {
        try {
            const webhooks = await app_1.prisma.webhookConfig.findMany({
                where: {
                    userId,
                    isActive: true,
                    events: {
                        path: ["$"],
                        array_contains: [event],
                    },
                },
            });
            console.log(`Sending ${event} to ${webhooks.length} webhooks for user ${userId}`);
            const promises = webhooks.map(async (webhook) => {
                try {
                    const events = Array.isArray(webhook.events)
                        ? webhook.events
                        : [];
                    if (events.includes(event)) {
                        const normalizedWebhook = {
                            id: webhook.id,
                            name: webhook.name,
                            url: webhook.url,
                            secret: webhook.secret,
                            events,
                            isActive: webhook.isActive,
                            userId: webhook.userId,
                            createdAt: webhook.createdAt,
                            updatedAt: webhook.updatedAt,
                        };
                        await this.sendWebhook(normalizedWebhook, payload);
                    }
                }
                catch (error) {
                    console.error(`Error sending webhook ${webhook.id}:`, error);
                }
            });
            await Promise.allSettled(promises);
        }
        catch (error) {
            console.error("Error in bulk webhook sending:", error);
            throw error;
        }
    }
}
exports.WebhookService = WebhookService;
//# sourceMappingURL=WebhookService.js.map