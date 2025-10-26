import express from "express";
import { z } from "zod";
import { prisma } from "../app";

const router = express.Router();

const normalizeEvents = (events: any): string[] => {
  if (Array.isArray(events)) {
    return events;
  }

  if (typeof events === "string") {
    try {
      const parsed = JSON.parse(events);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  return [];
};

// Validation schemas
const createWebhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  secret: z.string().optional(),
  events: z.array(z.string()).min(1, "At least one event is required"),
});

const updateWebhookSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  url: z.string().url("Must be a valid URL").optional(),
  secret: z.string().optional(),
  events: z
    .array(z.string())
    .min(1, "At least one event is required")
    .optional(),
  isActive: z.boolean().optional(),
});

// @route   GET /api/webhooks
// @desc    Get all webhooks for current user
// @access  Private
router.get("/", async (req, res) => {
  try {
    const webhooksRaw = await prisma.webhookConfig.findMany({
      where: { userId: req.user!.id },
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
  } catch (error) {
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
    const webhook = await prisma.webhookConfig.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
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
  } catch (error) {
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
    const existingWebhook = await prisma.webhookConfig.findFirst({
      where: {
        name,
        userId: req.user!.id,
      },
    });

    if (existingWebhook) {
      return res.status(400).json({
        success: false,
        error: "Webhook with this name already exists",
      });
    }

    // Create webhook
    const webhook = await prisma.webhookConfig.create({
      data: {
        name,
        url,
        secret,
        events,
        userId: req.user!.id,
      },
    });

    res.status(201).json({
      success: true,
      data: { webhook: { ...webhook, events } },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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
    const existingWebhook = await prisma.webhookConfig.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!existingWebhook) {
      return res.status(404).json({
        success: false,
        error: "Webhook not found",
      });
    }

    // Prepare update data
    const data: any = { ...updateData };
    if (updateData.events !== undefined) {
      data.events = updateData.events;
    }

    // Update webhook
    const webhook = await prisma.webhookConfig.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      success: true,
      data: {
        webhook: { ...webhook, events: normalizeEvents(webhook.events) },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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
    const existingWebhook = await prisma.webhookConfig.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!existingWebhook) {
      return res.status(404).json({
        success: false,
        error: "Webhook not found",
      });
    }

    // Delete webhook
    await prisma.webhookConfig.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Webhook deleted successfully",
    });
  } catch (error) {
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
    const webhook = await prisma.webhookConfig.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
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
    const { WebhookService } = await import("../services/WebhookService");
    const webhookService = new WebhookService();

    try {
      await webhookService.sendWebhook(webhook as any, testPayload);

      res.json({
        success: true,
        message: "Test webhook sent successfully",
      });
    } catch (webhookError) {
      res.status(400).json({
        success: false,
        error: "Webhook test failed",
        details:
          webhookError instanceof Error
            ? webhookError.message
            : "Unknown error",
      });
    }
  } catch (error) {
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

export default router;
