"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const app_1 = require("../app");
const router = express_1.default.Router();
const normalizeEvents = (events) => {
    if (Array.isArray(events)) {
        return events;
    }
    if (typeof events === "string") {
        try {
            const parsed = JSON.parse(events);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch (error) {
            return [];
        }
    }
    return [];
};
// Validation schemas
const createWebhookSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    url: zod_1.z.string().url("Must be a valid URL"),
    secret: zod_1.z.string().optional(),
    events: zod_1.z.array(zod_1.z.string()).min(1, "At least one event is required"),
});
const updateWebhookSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required").optional(),
    url: zod_1.z.string().url("Must be a valid URL").optional(),
    secret: zod_1.z.string().optional(),
    events: zod_1.z
        .array(zod_1.z.string())
        .min(1, "At least one event is required")
        .optional(),
    isActive: zod_1.z.boolean().optional(),
});
// @route   GET /api/webhooks
// @desc    Get all webhooks for current user
// @access  Private
router.get("/", async (req, res) => {
    try {
        const webhooksRaw = await app_1.prisma.webhookConfig.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
        });
        const webhooks = webhooksRaw.map((webhook) => ({
            ...webhook,
            events: normalizeEvents(webhook.events),
        }));
        res.json({
            success: true,
            data: { webhooks },
        });
    }
    catch (error) {
        console.error("Get webhooks error:", error);
        res.status(500).json({
            success: false,
            error: "Server error while fetching webhooks",
        });
    }
});
// @route   GET /api/webhooks/:id
// @desc    Get single webhook
// @access  Private
router.get("/:id", async (req, res) => {
    try {
        const webhook = await app_1.prisma.webhookConfig.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });
        if (!webhook) {
            return res.status(404).json({
                success: false,
                error: "Webhook not found",
            });
        }
        res.json({
            success: true,
            data: {
                webhook: { ...webhook, events: normalizeEvents(webhook.events) },
            },
        });
    }
    catch (error) {
        console.error("Get webhook error:", error);
        res.status(500).json({
            success: false,
            error: "Server error while fetching webhook",
        });
    }
});
// @route   POST /api/webhooks
// @desc    Create new webhook
// @access  Private
router.post("/", async (req, res) => {
    try {
        const { name, url, secret, events } = createWebhookSchema.parse(req.body);
        // Check if webhook with same name already exists for this user
        const existingWebhook = await app_1.prisma.webhookConfig.findFirst({
            where: {
                name,
                userId: req.user.id,
            },
        });
        if (existingWebhook) {
            return res.status(400).json({
                success: false,
                error: "Webhook with this name already exists",
            });
        }
        // Create webhook
        const webhook = await app_1.prisma.webhookConfig.create({
            data: {
                name,
                url,
                secret,
                events,
                userId: req.user.id,
            },
        });
        res.status(201).json({
            success: true,
            data: { webhook: { ...webhook, events } },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: "Validation error",
                details: error.errors,
            });
        }
        console.error("Create webhook error:", error);
        res.status(500).json({
            success: false,
            error: "Server error while creating webhook",
        });
    }
});
// @route   PUT /api/webhooks/:id
// @desc    Update webhook
// @access  Private
router.put("/:id", async (req, res) => {
    try {
        const updateData = updateWebhookSchema.parse(req.body);
        // Check if webhook exists and belongs to user
        const existingWebhook = await app_1.prisma.webhookConfig.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });
        if (!existingWebhook) {
            return res.status(404).json({
                success: false,
                error: "Webhook not found",
            });
        }
        // Prepare update data
        const data = { ...updateData };
        if (updateData.events !== undefined) {
            data.events = updateData.events;
        }
        // Update webhook
        const webhook = await app_1.prisma.webhookConfig.update({
            where: { id: req.params.id },
            data,
        });
        res.json({
            success: true,
            data: {
                webhook: { ...webhook, events: normalizeEvents(webhook.events) },
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: "Validation error",
                details: error.errors,
            });
        }
        console.error("Update webhook error:", error);
        res.status(500).json({
            success: false,
            error: "Server error while updating webhook",
        });
    }
});
// @route   DELETE /api/webhooks/:id
// @desc    Delete webhook
// @access  Private
router.delete("/:id", async (req, res) => {
    try {
        // Check if webhook exists and belongs to user
        const existingWebhook = await app_1.prisma.webhookConfig.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });
        if (!existingWebhook) {
            return res.status(404).json({
                success: false,
                error: "Webhook not found",
            });
        }
        // Delete webhook
        await app_1.prisma.webhookConfig.delete({
            where: { id: req.params.id },
        });
        res.json({
            success: true,
            message: "Webhook deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete webhook error:", error);
        res.status(500).json({
            success: false,
            error: "Server error while deleting webhook",
        });
    }
});
// @route   POST /api/webhooks/:id/test
// @desc    Test webhook
// @access  Private
router.post("/:id/test", async (req, res) => {
    try {
        // Check if webhook exists and belongs to user
        const webhook = await app_1.prisma.webhookConfig.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });
        if (!webhook) {
            return res.status(404).json({
                success: false,
                error: "Webhook not found",
            });
        }
        // Test webhook by sending a test payload
        const testPayload = {
            event: "webhook.test",
            timestamp: new Date().toISOString(),
            data: {
                webhookId: webhook.id,
                webhookName: webhook.name,
                message: "This is a test webhook notification from Sentinel",
            },
        };
        // Import and use webhook service
        const { WebhookService } = await Promise.resolve().then(() => __importStar(require("../services/WebhookService")));
        const webhookService = new WebhookService();
        try {
            await webhookService.sendWebhook(webhook, testPayload);
            res.json({
                success: true,
                message: "Test webhook sent successfully",
            });
        }
        catch (webhookError) {
            res.status(400).json({
                success: false,
                error: "Webhook test failed",
                details: webhookError instanceof Error
                    ? webhookError.message
                    : "Unknown error",
            });
        }
    }
    catch (error) {
        console.error("Test webhook error:", error);
        res.status(500).json({
            success: false,
            error: "Server error while testing webhook",
        });
    }
});
// @route   GET /api/webhooks/events
// @desc    Get available webhook events
// @access  Private
router.get("/events/list", async (req, res) => {
    const availableEvents = [
        "validator.healthy",
        "validator.unhealthy",
        "validator.consensus_reached",
        "validator.consensus_failed",
        "alert.created",
        "alert.acknowledged",
        "alert.resolved",
        "agent.connected",
        "agent.disconnected",
        "webhook.test",
    ];
    res.json({
        success: true,
        data: { events: availableEvents },
    });
});
exports.default = router;
//# sourceMappingURL=webhooks.js.map