import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";

export function createApp() {
	const app = express();

	app.use(helmet());
	app.use(express.json({ limit: "1mb" }));
	app.use(cookieParser());

	const origin = process.env.CORS_ORIGIN || "http://localhost:5173";
	app.use(cors({ origin, credentials: true }));

	app.use(
		session({
			name: "matcha.sid",
			secret: process.env.SESSION_SECRET || "dev-secret",
			resave: false,
			saveUninitialized: false,
			cookie: {
				httpOnly: true,
				sameSite: "lax",
				secure: false,
				maxAge: 1000 * 60 * 60 * 24 * 7,
			},
		})
	);

	app.get("/api/health", (_req, res) => res.json({ ok: true }));

	return app;
}
