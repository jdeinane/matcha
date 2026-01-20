import Database from "better-sqlite3";

const dbPath = process.env.DB_PATH || "./matcha.db";
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = `
	-- 1. USERS
	CREATE TABLE IF NOT EXISTS users (

		-- BASIC DATA
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT NOT NULL UNIQUE,
		username TEXT NOT NULL UNIQUE,
		first_name TEXT NOT NULL,
		last_name TEXT NOT NULL,
		password_hash TEXT NOT NULL,

		-- VALIDATION AND SECURITY
		is_verified INTEGER NOT NULL DEFAULT 0,
		verify_token TEXT,
		verify_token_expires_at TEXT,
		reset_token TEXT,
		reset_token_expires_at TEXT,

		-- EXTENDED PROFILE
		birthdate TEXT,
		gender TEXT CHECK(gender IN ('male', 'female', 'other')),
		sexual_preference TEXT DEFAULT 'bisexual' CHECK(sexual_preference IN ('heterosexual', 'gay', 'bisexual')),
		biography TEXT,
		fame_rating REAL DEFAULT 0,
	
		-- LOCATION
		latitude REAL CHECK(latitude >= -90 AND latitude <= 90),
		longitude REAL CHECK(longitude >= -180 AND longitude <= 180),
		city TEXT,
		manual_location INTEGER DEFAULT 0,

		last_seen TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	-- 2. PHOTOS
	CREATE TABLE IF NOT EXISTS images (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		file_path TEXT NOT NULL,
		is_profile_pic INTEGER DEFAULT 0,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE	
	);

	-- 3. TAGS
	CREATE TABLE IF NOT EXISTS tags (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE
	);

	CREATE TABLE IF NOT EXISTS user_tags (
		user_id INTEGER NOT NULL,
		tag_id INTEGER NOT NULL,
		PRIMARY KEY (user_id, tag_id),
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
	);

	-- 4. INTERACTIONS
	CREATE TABLE IF NOT EXISTS likes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		liker_id INTEGER NOT NULL,
		liked_id INTEGER NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY (liker_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (liked_id) REFERENCES users(id) ON DELETE CASCADE,
		UNIQUE(liker_id, liked_id)
	);

	-- 5. VISITS
	CREATE TABLE IF NOT EXISTS visits (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		visitor_id INTEGER NOT NULL,
		visited_id INTEGER NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY (visitor_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (visited_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- 6. BLOCKS
	CREATE TABLE IF NOT EXISTS blocks (
		blocker_id INTEGER NOT NULL,
		blocked_id INTEGER NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		PRIMARY KEY (blocker_id, blocked_id),
		FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- 7. REPORTS
	CREATE TABLE IF NOT EXISTS reports (
		reported_id INTEGER NOT NULL,
		reporter_id INTEGER NOT NULL,
		reason TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		PRIMARY KEY (reporter_id, reported_id),
		FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- 8. CHATS
	CREATE TABLE IF NOT EXISTS messages (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		sender_id INTEGER NOT NULL,
		receiver_id INTEGER NOT NULL,
		content TEXT NOT NULL,
		is_read INTEGER DEFAULT 0,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- 9. NOTIFICATIONS
	CREATE TABLE IF NOT EXISTS notifications (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		recipient_id INTEGER NOT NULL,
		sender_id INTEGER,
		type TEXT NOT NULL,
		is_read INTEGER DEFAULT 0,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
	);
`;

db.exec(schema);
console.log("Database schema initialized.");
