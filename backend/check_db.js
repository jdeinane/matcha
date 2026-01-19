import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.cwd().endsWith('backend') ? 'matcha.db' : 'backend/matcha.db';

console.log('\x1b[36m%s\x1b[0m', '\n🔍 --- CHECKING DATABASE ---');
console.log(`Database Path : ${path.resolve(dbPath)}\n`);

try {
	const db = new Database(dbPath, { readonly: true });

	// 1. PREUVE DU SEED (COUNT)
	console.log('\x1b[33m%s\x1b[0m', '📊 1. CHECKING VOLUME (Seed)');
	const count = db.prepare("SELECT count(*) as total FROM users").get();

    console.log(`   Total number of users: \x1b[1m${count.total}\x1b[0m`);

	if (count.total >= 500) {
        console.log('   ✅ OK: The seed of 500 users is present.');
    } else {
        console.log('   ❌ WARNING: Fewer than 500 users. Missing seed?');
    }
    console.log('');

    // 2. PREUVE DE L'INSCRIPTION MANUELLE (DERNIERS AJOUTS)
    console.log('\x1b[33m%s\x1b[0m', '📝 2. 10 LAST REGISTERED');
    console.log('   (IDs > 500 is coherent with the manuals registrations)');

    const recentUsers = db.prepare(`
        SELECT id, username, email, is_verified, created_at 
        FROM users 
        ORDER BY id DESC 
        LIMIT 10
    `).all();

    // Affichage propre en tableau
    console.table(recentUsers);

} catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "❌ Error: Unable to read the database.");
    console.error("   Check you are in the 'backend' folder or that 'matcha.db' exists.");
    console.error("   Detail: " + error.message);
}
