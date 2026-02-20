import mysql from 'mysql2';
import dotenv from "dotenv";
dotenv.config()

const pool = mysql.createPool({
    host: process.env.DATABASE_HOST,
    port:process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database:process.env.DATABASE_NAME,
    timezone: "Z"
}).promise();



async function RunQuery(query, params) {
    const [result] = await pool.query(query, params)
    return result
}

export default RunQuery;