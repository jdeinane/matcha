import { Router } from "express";
import { getMessages, sendMessage } from "../controllers/messages.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/:userId", requireAuth, getMessages);
router.post("/:userId", requireAuth, sendMessage);

export default router;
