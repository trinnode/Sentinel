import express from "express";
import { z } from "zod";
import { prisma } from "../app";

const router = express.Router();

// Validation schemas
const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  validatorId: z.string().min(1, "Validator ID is required"),
});

const updateAgentSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  isActive: z.boolean().optional(),
  validatorId: z.string().min(1, "Validator ID is required").optional(),
});

// @route   GET /api/agents
// @desc    Get all agents for current user
// @access  Private
router.get("/", async (req, res) => {
  try {
    const validators = await prisma.validator.findMany({
      where: { userId: req.user!.id },
      select: { id: true },
    });

    const validatorIds = validators.map((v) => v.id);

    if (validatorIds.length === 0) {
      return res.json({
        success: true,
        data: { agents: [] },
      });
    }

    const agents = await prisma.agent.findMany({
      where: {
        validatorId: { in: validatorIds },
      },
      include: {
        validator: {
          select: {
            id: true,
            name: true,
            beaconNodeUrl: true,
          },
        },
        reports: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: { agents },
    });
  } catch (error) {
    console.error("Get agents error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching agents",
    });
  }
});

// @route   GET /api/agents/:id
// @desc    Get single agent
// @access  Private
router.get("/:id", async (req, res) => {
  try {
    // First verify the agent belongs to current user
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      include: {
        validator: {
          select: {
            id: true,
            name: true,
            userId: true,
            beaconNodeUrl: true,
          },
        },
        reports: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!agent || !agent.validator || agent.validator.userId !== req.user!.id) {
      return res.status(agent ? 403 : 404).json({
        success: false,
        error: agent ? "Access denied" : "Agent not found",
      });
    }

    const { userId, ...validator } = agent.validator;

    res.json({
      success: true,
      data: { agent: { ...agent, validator } },
    });
  } catch (error) {
    console.error("Get agent error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching agent",
    });
  }
});

// @route   POST /api/agents
// @desc    Create new agent
// @access  Private
router.post("/", async (req, res) => {
  try {
    const { name, validatorId } = createAgentSchema.parse(req.body);

    // Verify validator belongs to user
    const validator = await prisma.validator.findFirst({
      where: {
        id: validatorId,
        userId: req.user!.id,
      },
    });

    if (!validator) {
      return res.status(404).json({
        success: false,
        error: "Validator not found",
      });
    }

    // Generate unique API key for agent
    const apiKey = `agent_${Math.random()
      .toString(36)
      .substring(2)}_${Date.now().toString(36)}`;

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        apiKey,
        name: name || `Agent for ${validator.name}`,
        validatorId: validator.id,
      },
      include: {
        validator: {
          select: {
            id: true,
            name: true,
            beaconNodeUrl: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { agent },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Create agent error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while creating agent",
    });
  }
});

// @route   PUT /api/agents/:id
// @desc    Update agent
// @access  Private
router.put("/:id", async (req, res) => {
  try {
    const updateData = updateAgentSchema.parse(req.body);

    // First verify the agent belongs to current user
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      include: {
        validator: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!agent || !agent.validator || agent.validator.userId !== req.user!.id) {
      return res.status(agent ? 403 : 404).json({
        success: false,
        error: agent ? "Access denied" : "Agent not found",
      });
    }

    if (updateData.validatorId) {
      const targetValidator = await prisma.validator.findFirst({
        where: {
          id: updateData.validatorId,
          userId: req.user!.id,
        },
      });

      if (!targetValidator) {
        return res.status(404).json({
          success: false,
          error: "Target validator not found",
        });
      }
    }

    // Update agent
    const updatedAgent = await prisma.agent.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        validator: {
          select: {
            id: true,
            name: true,
            beaconNodeUrl: true,
            userId: true,
          },
        },
      },
    });

    const { userId, ...validator } = updatedAgent.validator!;

    res.json({
      success: true,
      data: { agent: { ...updatedAgent, validator } },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Update agent error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while updating agent",
    });
  }
});

// @route   DELETE /api/agents/:id
// @desc    Delete agent
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    // First verify the agent belongs to current user
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      include: {
        validator: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!agent || !agent.validator || agent.validator.userId !== req.user!.id) {
      return res.status(agent ? 403 : 404).json({
        success: false,
        error: agent ? "Access denied" : "Agent not found",
      });
    }

    // Delete agent (cascades to reports)
    await prisma.agent.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Agent deleted successfully",
    });
  } catch (error) {
    console.error("Delete agent error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while deleting agent",
    });
  }
});

// @route   GET /api/agents/:id/reports
// @desc    Get agent reports
// @access  Private
router.get("/:id/reports", async (req, res) => {
  try {
    // First verify the agent belongs to current user
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      include: {
        validator: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!agent || !agent.validator || agent.validator.userId !== req.user!.id) {
      return res.status(agent ? 403 : 404).json({
        success: false,
        error: agent ? "Access denied" : "Agent not found",
      });
    }

    const reports = await prisma.agentReport.findMany({
      where: { agentId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({
      success: true,
      data: { reports },
    });
  } catch (error) {
    console.error("Get agent reports error:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching agent reports",
    });
  }
});

export default router;
