import mysql from "mysql2/promise";

const DB_CONFIG = {
	host: "localhost",
	port: 3306,
	user: "root",
	password: "",
};

const DATABASES = ["test_db_1", "test_db_2"];
const TABLE_NAME = "all_types_test";

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (
  \`id\` INT PRIMARY KEY,
  \`col_varchar\` VARCHAR(255),
  \`col_text\` TEXT,
  \`col_int\` INT,
  \`col_decimal\` DECIMAL(10, 2),
  \`col_float\` FLOAT,
  \`col_boolean\` BOOLEAN,
  \`col_date\` DATE,
  \`col_datetime\` DATETIME,
  \`col_timestamp\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`col_json\` JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// Helper to format date for MySQL
const formatDate = (d: Date) => d.toISOString().slice(0, 10);
const formatDateTime = (d: Date) =>
	d.toISOString().slice(0, 19).replace("T", " ");

async function seed() {
	console.log("🌱 Starting MySQL seeding...");

	const conn = await mysql.createConnection(DB_CONFIG);

	try {
		for (const dbName of DATABASES) {
			console.log(`\nProcessing database: ${dbName}`);

			// 1. Create Database if strictly needed (usually exists, but good practice)
			await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
			await conn.changeUser({ database: dbName });

			// 2. Drop and Create Table
			await conn.query(`DROP TABLE IF EXISTS \`${TABLE_NAME}\``);
			await conn.query(CREATE_TABLE_SQL);
			console.log(`   Created table ${TABLE_NAME}`);

			// 3. Prepare Data
			const rows = [];

			// Row 1: Unchanged (Identical in both)
			rows.push({
				id: 1,
				col_varchar: "Identical Row",
				col_text: "This text is exactly the same.",
				col_int: 100,
				col_decimal: 99.99,
				col_float: 1.23,
				col_boolean: true,
				col_date: "2024-01-01",
				col_datetime: "2024-01-01 10:00:00",
				col_timestamp: "2024-01-01 10:00:00",
				col_json: JSON.stringify({
					settings: { theme: "dark", notifications: true },
					tags: ["admin", "user"],
					meta: { created_by: 1 },
				}),
			});

			if (dbName === "test_db_1") {
				// Row 2: Will be Modified (Source version)
				rows.push({
					id: 2,
					col_varchar: "Source Version",
					col_text: "Text in source db",
					col_int: 200,
					col_decimal: 10.5,
					col_float: 2.5,
					col_boolean: false,
					col_date: "2024-02-01", // Diff date
					col_datetime: "2024-02-01 12:00:00",
					col_timestamp: "2024-02-01 12:00:00",
					col_json: JSON.stringify({
						settings: { theme: "light", notifications: true }, // Diff: light vs dark
						tags: ["admin"], // Diff: missing user
						meta: { created_by: 1, updated_at: "2024-01-01" },
					}),
				});

				// Row 3: Deleted (Only in Source)
				rows.push({
					id: 3,
					col_varchar: "Only in Source",
					col_text: "This row does not exist in target",
					col_int: 300,
					col_decimal: 30.0,
					col_float: 3.14,
					col_boolean: true,
					col_date: "2024-03-01",
					col_datetime: "2024-03-01 09:00:00",
					col_timestamp: "2024-03-01 09:00:00",
					col_json: JSON.stringify({
						config: { valid: true, items: [1, 2, 3] },
						features: { legacy: true },
					}),
				});
			} else {
				// Row 2: Modified (Target version)
				rows.push({
					id: 2,
					col_varchar: "Target Version", // Diff
					col_text: "Text in target db", // Diff
					col_int: 200,
					col_decimal: 10.5,
					col_float: 2.5,
					col_boolean: false,
					col_date: "2024-02-15", // Diff date
					col_datetime: "2024-02-15 14:00:00", // Diff time
					col_timestamp: "2024-02-15 14:00:00", // Diff timestamp
					col_json: JSON.stringify({
						settings: { theme: "dark", notifications: false }, // Diff: dark, false
						tags: ["admin", "editor"], // Diff: editor added
						meta: { created_by: 1, updated_at: "2024-02-01" }, // Diff: date
					}),
				});

				// Row 4: Added (Only in Target)
				rows.push({
					id: 4,
					col_varchar: "Only in Target",
					col_text: "This row was added in target directly",
					col_int: 400,
					col_decimal: 45.5,
					col_float: 4.56,
					col_boolean: false,
					col_date: "2024-04-01",
					col_datetime: "2024-04-01 15:30:00",
					col_timestamp: "2024-04-01 15:30:00",
					col_json: JSON.stringify({
						config: { valid: false, items: [4, 5] },
						error: "none",
						features: { beta: true },
					}),
				});
			}

			// Insert Rows
			for (const row of rows) {
				const keys = Object.keys(row).join(", ");
				const values = Object.values(row)
					.map((v) => {
						if (typeof v === "boolean") return v ? 1 : 0;
						if (v === null) return "NULL";
						if (typeof v === "number") return v;
						return `'${String(v).replace(/'/g, "''")}'`;
					})
					.join(", ");

				await conn.query(
					`INSERT INTO \`${TABLE_NAME}\` (${keys}) VALUES (${values})`,
				);
			}
			console.log(`   Inserted ${rows.length} rows`);
		}

		console.log("\n✅ Seeding complete!");
	} catch (err) {
		console.error("\n❌ Seeding failed:", err);
	} finally {
		await conn.end();
	}
}

seed();
