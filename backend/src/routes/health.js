import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW()");
    res.json({ ok: true, dbTime: r.rows[0].now });
  } catch {
    res.status(500).json({ ok: false });
  }
});

export default router;
