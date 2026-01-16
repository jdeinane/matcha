import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import path from "path";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import browsingRoutes from "./routes/browsing.js";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
	console.error("❌ FATAL: JWT_SECRET missing in production.");
	process.exit(1);
}

export function createApp() {
	const app = express();
	const origin = process.env.CORS_ORIGIN || "http://localhost:5173";
	const limiter = rateLimit({
		windowMs: 15 * 60 * 1000,
		max: 100,
		message: "Too many requests from this IP, please try again later."
	});

	app.use(morgan("dev"));

	app.use(helmet());

	app.use("/api", limiter);

	app.use(express.json({ limit: "10mb" }));

	app.use(cookieParser());

	app.use(cors({
		origin,
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
	}));

	app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

	app.use("/api/auth", authRoutes);

	app.use("/api/browsing", browsingRoutes);

	app.get("/api/health", (req, res) => {
		res.json({ status: "ok", message: "Backend is running!" });
	});

	app.use((err, req, res, next) => {
		console.error("Unhandled error:", err);
		res.status(500).json({ error: "Internal Server Error" });
	});

	return app;
}
