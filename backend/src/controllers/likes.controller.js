import { pool } from "../db/pool.js";

export async function likeUser(req, res) {
  const likerId = req.userId;
  const likedId = parseInt(req.params.userId, 10);

  if (likerId === likedId) {
    return res.status(400).json({ error: "You cannot like yourself" });
  }

  await pool.query(
    `INSERT INTO likes (liker_id, liked_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [likerId, likedId]
  );

  const { rows } = await pool.query(
    `SELECT 1 FROM likes
     WHERE liker_id=$1 AND liked_id=$2`,
    [likedId, likerId]
  );

  res.json({ match: rows.length > 0 });
}

export async function getMatches(req, res) {
  const { rows } = await pool.query(
    `SELECT u.id, u.username
     FROM likes l1
     JOIN likes l2 ON l1.liker_id = l2.liked_id
     JOIN users u ON u.id = l1.liked_id
     WHERE l1.liker_id=$1 AND l2.liker_id=$1`,
    [req.userId]
  );

  res.json(rows);
}
