import Database from "better-sqlite3";
import mysql from "mysql2/promise";

const ROWS_TO_INSERT = 10000;
const SQLITE_DBS = ["/tmp/test.sqlite", "/tmp/test2.sqlite"];
const MYSQL_CONFIG = {
    host: "localhost",
    user: "root",
    password: "",
};
const MYSQL_DBS = ["test_db_1", "test_db_2"];

function generateRow(id: number) {
    return {
        id,
        col1: `data_string_${id}_${Math.random().toString(36).substring(7)}`,
        col2: Math.floor(Math.random() * 10000),
        col3: `more_data_${id}`,
        col4: Math.random() > 0.5 ? "active" : "inactive",
        col5: new Date().toISOString(),
        col6: Math.floor(Math.random() * 100),
        col7: `category_${Math.floor(Math.random() * 5)}`,
        col8: Math.random() * 1000,
        col9: `description for item ${id} with some random text ${Math.random()}`,
    };
}

async function seedSqlite() {
    console.log("Seeding SQLite databases...");
    for (const dbPath of SQLITE_DBS) {
        console.log(`Processing SQLite: ${dbPath}`);
        try {
            const db = new Database(dbPath);

            db.exec(`DROP TABLE IF EXISTS perf_test_data`);
            db.exec(`
                CREATE TABLE perf_test_data (
                    id INTEGER PRIMARY KEY,
                    col1 TEXT,
                    col2 INTEGER,
                    col3 TEXT,
                    col4 TEXT,
                    col5 TEXT,
                    col6 INTEGER,
                    col7 TEXT,
                    col8 REAL,
                    col9 TEXT
                )
            `);

            const insert = db.prepare(`
                INSERT INTO perf_test_data (id, col1, col2, col3, col4, col5, col6, col7, col8, col9)
                VALUES (@id, @col1, @col2, @col3, @col4, @col5, @col6, @col7, @col8, @col9)
            `);

            const insertMany = db.transaction((rows) => {
                for (const row of rows) insert.run(row);
            });

            const rows = [];
            for (let i = 1; i <= ROWS_TO_INSERT; i++) {
                rows.push(generateRow(i));
            }

            insertMany(rows);
            console.log(`Inserted ${ROWS_TO_INSERT} rows into ${dbPath}`);
            db.close();
        } catch (error) {
            console.error(`Error seeding SQLite ${dbPath}:`, error);
        }
    }
}

async function seedMysql() {
    console.log("Seeding MySQL databases...");
    try {
        const connection = await mysql.createConnection(MYSQL_CONFIG);

        for (const dbName of MYSQL_DBS) {
            console.log(`Processing MySQL: ${dbName}`);
            await connection.query(`USE ${dbName}`);

            await connection.query(`DROP TABLE IF EXISTS perf_test_data`);
            await connection.query(`
                CREATE TABLE perf_test_data (
                    id INT PRIMARY KEY,
                    col1 VARCHAR(255),
                    col2 INT,
                    col3 VARCHAR(255),
                    col4 VARCHAR(50),
                    col5 VARCHAR(100),
                    col6 INT,
                    col7 VARCHAR(50),
                    col8 FLOAT,
                    col9 TEXT
                )
            `);

            const rows = [];
            const values = [];
            for (let i = 1; i <= ROWS_TO_INSERT; i++) {
                const row = generateRow(i);
                values.push(row);
                rows.push(`(
                    ${row.id}, 
                    '${row.col1}', 
                    ${row.col2}, 
                    '${row.col3}', 
                    '${row.col4}', 
                    '${row.col5}', 
                    ${row.col6}, 
                    '${row.col7}', 
                    ${row.col8}, 
                    '${row.col9}'
                )`);
            }

            // Batch insert in chunks to avoid query size limits
            const chunkSize = 100;
            for (let i = 0; i < rows.length; i += chunkSize) {
                const chunk = rows.slice(i, i + chunkSize);
                await connection.query(`
                    INSERT INTO perf_test_data (id, col1, col2, col3, col4, col5, col6, col7, col8, col9)
                    VALUES ${chunk.join(",")}
                `);
            }

            console.log(`Inserted ${ROWS_TO_INSERT} rows into ${dbName}`);
        }
        await connection.end();
    } catch (error) {
        console.error("Error seeding MySQL:", error);
    }
}

async function main() {
    await seedSqlite();
    await seedMysql();
    console.log("Seeding complete!");
}

main().catch(console.error);
