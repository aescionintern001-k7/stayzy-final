import pool from "./pool.js";

export const checkDatabaseConnection = async () => {
  try {
    const result = await pool.query("SELECT 1 AS connected");

    return {
      connected: result.rows[0].connected === 1,
      message: "Database connection successful",
    };
  } catch (error) {
    return {
      connected: false,
      message: "Database connection failed",
      error: error.message,
    };
  }
};

export const getDatabaseInfo = async () => {
  const result = await pool.query(`
    SELECT
      current_database() AS database,
      current_user AS username,
      NOW() AS connected_at
  `);

  return result.rows[0];
};
