import 'dotenv/config'

// Database connection settings are read from server/.env (see .env.example).
export default {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: 'Amazon RDS'
  }
};
