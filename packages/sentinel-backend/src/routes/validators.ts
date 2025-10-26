import express from "express";
import { z } from "zod";
import { prisma } from "../app";

const router = express.Router();

// Validation schemas
const createValidatorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  beaconNodeUrl: z.string().url("Must be a valid URL"),
});

const updateValidatorSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  beaconNodeUrl: z.string().url("Must be a valid URL").optional(),
  isActive: z.boolean().optional(),
});

// @route   GET /api/validators
// @desc    Get all validators for current user
// @access  Private
router.get("/", async (req, res) => {
  try {
    const validators = await prisma.validator.findMany({
      where: { userId: req.user!.id },
      include: {
        alerts: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: { validators },
    });
  } catch (error) {
    console.error("Get validators error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching validators",
    });
  }
});

// @route   GET /api/validators/:id
// @desc    Get single validator
// @access  Private
router.get("/:id", async (req, res) => {
  try {
    const validator = await prisma.validator.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        alerts: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!validator) {
      return res.status(404).json({
        success: false,
        error: "Validator not found",
      });
    }

    res.json({
      success: true,
      data: { validator },
    });
  } catch (error) {
    console.error("Get validator error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching validator",
    });
  }
});

// @route   POST /api/validators
// @desc    Create new validator
// @access  Private
router.post("/", async (req, res) => {
  try {
    const { name, beaconNodeUrl } = createValidatorSchema.parse(req.body);

    // Check if validator with same name already exists for this user
    const existingValidator = await prisma.validator.findFirst({
      where: {
        name,
        userId: req.user!.id,
      },
    });

    if (existingValidator) {
      return res.status(400).json({
        success: false,
        error: "Validator with this name already exists",
      });
    }

    // Create validator
    const validator = await prisma.validator.create({
      data: {
        name,
        beaconNodeUrl,
        userId: req.user!.id,
      },
    });

    res.status(201).json({
      success: true,
      data: { validator },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Create validator error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while creating validator",
    });
  }
});

// @route   PUT /api/validators/:id
// @desc    Update validator
// @access  Private
router.put("/:id", async (req, res) => {
  try {
    const updateData = updateValidatorSchema.parse(req.body);

    // Check if validator exists and belongs to user
    const existingValidator = await prisma.validator.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!existingValidator) {
      return res.status(404).json({
        success: false,
        error: "Validator not found",
      });
    }

    // Update validator
    const validator = await prisma.validator.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      success: true,
      data: { validator },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Update validator error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while updating validator",
    });
  }
});

// @route   DELETE /api/validators/:id
// @desc    Delete validator
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    // Check if validator exists and belongs to user
    const existingValidator = await prisma.validator.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!existingValidator) {
      return res.status(404).json({
        success: false,
        error: "Validator not found",
      });
    }

    // Delete validator (cascades to alerts)
    await prisma.validator.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Validator deleted successfully",
    });
  } catch (error) {
    console.error("Delete validator error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while deleting validator",
    });
  }
});

// @route   GET /api/validators/:id/agent-key
// @desc    Get agent API key for validator
// @access  Private
router.get("/:id/agent-key", async (req, res) => {
  try {
    const validator = await prisma.validator.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      select: { id: true, name: true, apiKey: true },
    });

    if (!validator) {
      return res.status(404).json({
        success: false,
        error: "Validator not found",
      });
    }

    res.json({
      success: true,
      data: {
        validatorId: validator.id,
        name: validator.name,
        agentApiKey: validator.apiKey,
      },
    });
  } catch (error) {
    console.error("Get agent key error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching agent key",
    });
  }
});

// @route   POST /api/validators/:id/regenerate-key
// @desc    Regenerate agent API key
// @access  Private
router.post("/:id/regenerate-key", async (req, res) => {
  try {
    // Check if validator exists and belongs to user
    const existingValidator = await prisma.validator.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!existingValidator) {
      return res.status(404).json({
        success: false,
        error: "Validator not found",
      });
    }

    // Generate new API key
    const newApiKey = `sk_${Math.random()
      .toString(36)
      .substring(2)}_${Date.now().toString(36)}`;

    // Update validator with new key
    const validator = await prisma.validator.update({
      where: { id: req.params.id },
      data: { apiKey: newApiKey },
      select: { id: true, name: true, apiKey: true },
    });

    res.json({
      success: true,
      data: {
        validatorId: validator.id,
        name: validator.name,
        agentApiKey: validator.apiKey,
      },
      message: "API key regenerated successfully",
    });
  } catch (error) {
    console.error("Regenerate key error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while regenerating API key",
    });
  }
});

export default router;
