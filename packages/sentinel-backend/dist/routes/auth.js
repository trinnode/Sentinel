"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const app_1 = require("../app");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Validation schemas
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    name: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post("/register", async (req, res) => {
    try {
        const { email, password, name } = registerSchema.parse(req.body);
        // Check if user exists
        const existingUser = await app_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: "User already exists",
            });
        }
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // Create user
        const user = await app_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });
        // Create JWT token
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET
        // { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string }
        );
        res.status(201).json({
            success: true,
            data: {
                user,
                token,
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
        console.error("Register error:", error);
        res.status(500).json({
            success: false,
            error: "Server error during registration",
        });
    }
});
// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        // Check if user exists
        const user = await app_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials",
            });
        }
        // Check password
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials",
            });
        }
        // Create JWT token
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET
        // { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string }
        );
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
                token,
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
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            error: "Server error during login",
        });
    }
});
// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", auth_1.authMiddleware, async (req, res) => {
    try {
        const user = await app_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }
        res.json({
            success: true,
            data: { user },
        });
    }
    catch (error) {
        console.error("Get me error:", error);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map