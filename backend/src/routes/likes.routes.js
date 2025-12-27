import { Router } from "express";
import { likeUser, getMatches } from "../controllers/likes.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/:userId", requireAuth, likeUser);
router.get("/matches", requireAuth, getMatches);

export default router;
