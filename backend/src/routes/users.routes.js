import { Router } from "express";
import { getUsers } from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getUsers);

export default router;
