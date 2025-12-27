import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import likesRoutes from "./routes/likes.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import healthRoutes from "./routes/health.js";

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api", healthRoutes);

export default app;
