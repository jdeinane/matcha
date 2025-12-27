import { pool } from "../db/pool.js";

export async function getUsers(req, res) {
  const { rows } = await pool.query(
    `SELECT id, username, age, biography
     FROM users
     WHERE id != $1`,
    [req.userId]
  );

  res.json(rows);
}
