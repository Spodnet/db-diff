import mysql from "mysql2/promise";

const DB_CONFIG = {
	host: "localhost",
	port: 3306,
	user: "root",
	password: "",
};

const DATABASES = ["test_db_1", "test_db_2"];

async function seed() {
	console.log("🌱 Seeding MySQL for FK cascade testing...\n");

	const conn = await mysql.createConnection(DB_CONFIG);

	try {
		for (const dbName of DATABASES) {
			console.log(`Processing database: ${dbName}`);

			await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
			await conn.changeUser({ database: dbName });

			// Drop existing tables (posts first due to FK)
			await conn.query("DROP TABLE IF EXISTS `posts`");
			await conn.query("DROP TABLE IF EXISTS `users`");

			// Create users table with auto_increment
			await conn.query(`
				CREATE TABLE users (
					id INT AUTO_INCREMENT PRIMARY KEY,
					name VARCHAR(255) NOT NULL,
					email VARCHAR(255) NOT NULL,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP
				) ENGINE=InnoDB
			`);
			console.log("   Created table: users");

			// Create posts table with FK to users
			await conn.query(`
				CREATE TABLE posts (
					id INT AUTO_INCREMENT PRIMARY KEY,
					user_id INT NOT NULL,
					title VARCHAR(255) NOT NULL,
					body TEXT,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
				) ENGINE=InnoDB
			`);
			console.log("   Created table: posts");

			// Seed data - slightly different between databases
			if (dbName === "test_db_1") {
				// Source DB - has users that will be "insert as new"
				await conn.query(`
					INSERT INTO users (id, name, email) VALUES
					(1, 'Alice', 'alice@example.com'),
					(2, 'Bob (Source)', 'bob.source@example.com'),
					(3, 'Charlie', 'charlie@example.com')
				`);

				await conn.query(`
					INSERT INTO posts (id, user_id, title, body) VALUES
					(1, 1, 'Alice Post 1', 'Content from Alice'),
					(2, 2, 'Bob Post 1', 'Bobs content in source'),
					(3, 2, 'Bob Post 2', 'More from Bob'),
					(4, 3, 'Charlie Post 1', 'Charlie writes')
				`);
				console.log("   Inserted 3 users, 4 posts (source data)");
			} else {
				// Target DB - Bob has different data, no Charlie
				await conn.query(`
					INSERT INTO users (id, name, email) VALUES
					(1, 'Alice', 'alice@example.com'),
					(2, 'Bob (Target)', 'bob.target@example.com')
				`);

				await conn.query(`
					INSERT INTO posts (id, user_id, title, body) VALUES
					(1, 1, 'Alice Post 1', 'Content from Alice'),
					(2, 2, 'Bob Post Target', 'Different Bob post in target')
				`);
				console.log("   Inserted 2 users, 2 posts (target data)");
			}
		}

		console.log("\n✅ FK cascade test data seeded!");
		console.log("\nTest scenarios:");
		console.log(
			"  - User ID 2 differs between source and target (can test 'Insert as New')",
		);
		console.log("  - User ID 3 only in source (deleted in target)");
		console.log("  - Posts table has user_id FK for cascade testing");
	} catch (err) {
		console.error("\n❌ Seeding failed:", err);
	} finally {
		await conn.end();
	}
}

seed();
