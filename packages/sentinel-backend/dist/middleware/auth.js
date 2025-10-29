"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = require("../app");
const authMiddleware = async (req, res, next) => {
    try {
        let token;
        // Check for token in header
        if (req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }
        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Access denied. No token provided.",
            });
        }
        try {
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // Check if user still exists
            const user = await app_1.prisma.user.findUnique({
                where: { id: decoded.id },
            });
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: "Token is valid but user no longer exists.",
                });
            }
            // Add user to request object
            req.user = decoded;
            next();
        }
        catch (error) {
            return res.status(401).json({
                success: false,
                error: "Token is not valid.",
            });
        }
    }
    catch (error) {
        console.error("Auth middleware error:", error);
        res.status(500).json({
            success: false,
            error: "Server error in authentication",
        });
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.js.map