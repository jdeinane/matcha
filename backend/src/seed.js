import { db } from "./db.js";
import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";

const USERS_COUNT = 500;

const runSeed = async () => {
	console.log("Starting seed ...");

	/* 1. Cleaning existing database */
	console.log("Cleaning tables...");
	db.exec("DELETE FROM notifications");
	db.exec("DELETE FROM messages");
	db.exec("DELETE FROM reports");
	db.exec("DELETE FROM blocks");
	db.exec("DELETE FROM visits");
	db.exec("DELETE FROM likes");
	db.exec("DELETE FROM user_tags");
	db.exec("DELETE FROM tags");
	db.exec("DELETE FROM images");
	db.exec("DELETE FROM users");
	db.exec("DELETE FROM sqlite_sequence");

	/* 2. Tags creation */
	const predefinedTags = [
		"vegan",
		"geek",
		"sport",
		"travel",
		"photography",
		"music",
		"movies",
		"tech",
		"art",
		"cooking",
		"fashion",
		"video games"
	];
	const tagIds = [];

	const insertTag = db.prepare("INSERT INTO tags (name) VALUES (?)");
	for (const tag of predefinedTags) {
		const info = insertTag.run(tag);
		tagIds.push(info.lastInsertRowid);
	}

	/* 3. Queries preparation */
	const insertUser = db.prepare(`
		INSERT INTO users (
			email, username, first_name, last_name, password_hash,
			is_verified, gender, sexual_preference, biography,
			fame_rating, latitude, longitude, city, birthdate, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

	const insertImage = db.prepare("INSERT INTO images (user_id, file_path, is_profile_pic) VALUES (?, ?, ?)");
	const insertUserTag = db.prepare("INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)");

	const passwordHash = await bcrypt.hash("Password123!", 10);

	console.log(`Generating ${USERS_COUNT} users...`);

		for (let i = 0; i < USERS_COUNT; i++) {
			const birthdate = faker.date.birthdate({ min: 18, max: 60, mode: 'age' }).toISOString().split('T')[0];
			const genderOptions = ['male', 'female', 'other'];
			const sex = faker.helpers.arrayElement(genderOptions);
			const binarySex = sex === 'other' ? faker.helpers.arrayElement(['male', 'female']) : sex;
			const firstName = faker.person.firstName(binarySex);
			const lastName = faker.person.lastName();
			const username = faker.internet.username({ firstName, lastName }) + Math.floor(Math.random() * 1000);
			const email = faker.internet.email({ firstName, lastName });
			const location = faker.location.nearbyGPSCoordinate({ origin: [48.8566, 2.3522], radius: 10, isMetric: true }); // Paris area
			const userResult = insertUser.run(
				email,
				username,
				firstName,
				lastName,
				passwordHash,
				1,	// is_verified
				sex,
				faker.helpers.arrayElement(['heterosexual', 'gay', 'bisexual']),
				faker.person.bio(),
				faker.number.int({ min: 0, max: 200 }), // fame_rating
				location[0], // lat
				location[1], //lon
				"Paris",
				birthdate,
				faker.date.past().toISOString()
			);
			const userId = userResult.lastInsertRowid;

			const genderPath = binarySex === 'female' ? 'women' : 'men';
			const getPhotoURL = () => {
				const photoId = faker.number.int({ min: 0, max: 99 });
				return `https://randomuser.me/api/portraits/${genderPath}/${photoId}.jpg`;
			}
			insertImage.run(userId, getPhotoURL(), 1);
			const extraPhotos = faker.number.int({ min: 0, max: 4 });
			for (let j = 0; j < extraPhotos; j++) {
				insertImage.run(userId, getPhotoURL(), 0);	
			}

			const shuffledTags = faker.helpers.shuffle(tagIds);
			const selectedTags = shuffledTags.slice(0, faker.number.int({ min: 1, max: 3 }));
			for (const tagId of selectedTags) {
				insertUserTag.run(userId, tagId);
			}
		}

		console.log("✅ Seed finished successfully! ✅");
};

runSeed().catch((err) => {
	console.error("❌ Error while creating seed:", err, "❌");
});
