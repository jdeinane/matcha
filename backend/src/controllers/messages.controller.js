import { pool } from "../db/pool.js";

export async function getMessages(req, res) {
  const otherId = parseInt(req.params.userId, 10);

  const { rows } = await pool.query(
    `SELECT * FROM messages
     WHERE (sender_id=$1 AND receiver_id=$2)
        OR (sender_id=$2 AND receiver_id=$1)
     ORDER BY created_at`,
    [req.userId, otherId]
  );

  res.json(rows);
}

export async function sendMessage(req, res) {
  const otherId = parseInt(req.params.userId, 10);
  const { content } = req.body;

  await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, content)
     VALUES ($1, $2, $3)`,
    [req.userId, otherId, content]
  );

  res.json({ message: "Sent" });
}
