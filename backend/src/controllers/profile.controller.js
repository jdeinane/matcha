import { pool } from "../db/pool.js";

export async function getProfile(req, res) {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE id=$1",
    [req.userId]
  );

  res.json(rows[0]);
}

export async function updateProfile(req, res) {
  const { gender, sexual_preference, biography, age } = req.body;

  await pool.query(
    `UPDATE users
     SET gender=$1, sexual_preference=$2, biography=$3, age=$4, completed=true
     WHERE id=$5`,
    [gender, sexual_preference, biography, age, req.userId]
  );

  res.json({ message: "Profile updated" });
}
