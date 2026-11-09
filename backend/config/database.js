const mysql = require("mysql2/promise");
const logger = require("../utils/logger");

// 数据库配置 - 从环境变量读取
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "123456",
  database: process.env.DB_NAME || "contract_evidence",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4"
};

// 创建连接池
let pool;

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbConfig.database, tableName, columnName]
  );
  return rows[0].count > 0;
}

async function addColumnIfMissing(connection, tableName, columnName, definition) {
  if (await columnExists(connection, tableName, columnName)) {
    return;
  }

  await connection.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  logger.info(`✅ 数据表 ${tableName} 已新增字段 ${columnName}`);
}

async function safeExecuteDDL(connection, sql, successMessage) {
  try {
    await connection.execute(sql);
    if (successMessage) {
      logger.info(successMessage);
    }
  } catch (error) {
    if (["ER_DUP_FIELDNAME", "ER_DUP_KEYNAME", "ER_CANT_DROP_FIELD_OR_KEY"].includes(error.code)) {
      return;
    }
    throw error;
  }
}

async function initDatabase() {
  try {
    // 首先创建数据库连接（不指定数据库）
    const tempPool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      charset: dbConfig.charset
    });

    // 创建数据库（如果不存在）
    await tempPool.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    logger.info(`✅ 数据库 ${dbConfig.database} 已创建或已存在`);

    // 关闭临时连接
    await tempPool.end();

    // 创建正式的连接池
    pool = mysql.createPool(dbConfig);
    logger.info("✅ 数据库连接池已创建");

    // 初始化数据表
    await initTables();

    return pool;
  } catch (error) {
    logger.error("❌ 数据库初始化失败:", error);
    throw error;
  }
}

async function initTables() {
  const connection = await pool.getConnection();

  try {
    // 创建用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        department VARCHAR(100),
        status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
        wallet_address VARCHAR(100),
        role ENUM('user', 'admin', 'auditor') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_wallet (wallet_address),
        INDEX idx_phone (phone),
        INDEX idx_department (department),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info("✅ 用户表已创建");

    await connection.execute(`
      ALTER TABLE users
      MODIFY COLUMN status ENUM('active', 'inactive', 'deleted') DEFAULT 'active'
    `);

    await connection.execute(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('user', 'admin', 'auditor') DEFAULT 'user'
    `);

    logger.info("✅ 用户表结构已同步到最新角色/状态枚举");

    // 创建合同表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contracts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_name VARCHAR(255) NOT NULL,
        signer_my VARCHAR(100),
        signer_other VARCHAR(100),
        contract_amount DECIMAL(20, 2),
        contract_description TEXT,
        file_hash VARCHAR(100) NOT NULL,
        ipfs_cid VARCHAR(100),
        tx_hash VARCHAR(100),
        contract_id INT,
        uploader_id INT NOT NULL,
        approver_id INT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        file_path VARCHAR(500),
        file_size BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (uploader_id) REFERENCES users(id),
        FOREIGN KEY (approver_id) REFERENCES users(id),
        INDEX idx_uploader (uploader_id),
        INDEX idx_status (status),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info("✅ 合同表已创建");

    await addColumnIfMissing(connection, "contracts", "contract_type", "VARCHAR(100) NULL AFTER contract_name");
    await addColumnIfMissing(connection, "contracts", "expire_at", "DATETIME NULL AFTER contract_description");
    await addColumnIfMissing(connection, "contracts", "archive_status", "ENUM('active', 'archived') DEFAULT 'active' AFTER status");
    await addColumnIfMissing(connection, "contracts", "archived_at", "DATETIME NULL AFTER archive_status");
    await addColumnIfMissing(connection, "contracts", "archived_by", "INT NULL AFTER archived_at");
    await addColumnIfMissing(connection, "contracts", "template_id", "INT NULL AFTER archived_by");
    await addColumnIfMissing(connection, "contracts", "version_group_id", "INT NULL AFTER template_id");
    await addColumnIfMissing(connection, "contracts", "version_no", "INT NOT NULL DEFAULT 1 AFTER version_group_id");
    await addColumnIfMissing(connection, "contracts", "previous_version_id", "INT NULL AFTER version_no");
    await addColumnIfMissing(connection, "contracts", "is_latest_version", "TINYINT(1) NOT NULL DEFAULT 1 AFTER previous_version_id");

    await safeExecuteDDL(
      connection,
      "ALTER TABLE contracts ADD INDEX idx_archive_status (archive_status)",
      "✅ 合同表索引 idx_archive_status 已创建"
    );
    await safeExecuteDDL(
      connection,
      "ALTER TABLE contracts ADD INDEX idx_expire_at (expire_at)",
      "✅ 合同表索引 idx_expire_at 已创建"
    );
    await safeExecuteDDL(
      connection,
      "ALTER TABLE contracts ADD INDEX idx_version_group (version_group_id, version_no)",
      "✅ 合同表索引 idx_version_group 已创建"
    );

    await connection.execute(`
      UPDATE contracts
      SET archive_status = 'active'
      WHERE archive_status IS NULL
    `);
    await connection.execute(`
      UPDATE contracts
      SET version_no = 1
      WHERE version_no IS NULL OR version_no <= 0
    `);
    await connection.execute(`
      UPDATE contracts
      SET is_latest_version = 1
      WHERE is_latest_version IS NULL
    `);
    await connection.execute(`
      UPDATE contracts
      SET version_group_id = id
      WHERE version_group_id IS NULL
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contract_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_name VARCHAR(150) NOT NULL,
        contract_name VARCHAR(255),
        contract_type VARCHAR(100),
        signer_my VARCHAR(100),
        signer_other VARCHAR(100),
        contract_amount DECIMAL(20, 2),
        contract_description TEXT,
        expire_days INT DEFAULT NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        INDEX idx_template_creator (created_by),
        INDEX idx_template_name (template_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info("✅ 合同模板表已创建");

    // 创建操作日志表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS operation_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        operation_type VARCHAR(50) NOT NULL,
        operation_desc TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_user (user_id),
        INDEX idx_operation (operation_type),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info("✅ 操作日志表已创建");

    logger.info("✅ 所有数据表初始化完成");
  } catch (error) {
    logger.error("❌ 创建数据表失败:", error);
    throw error;
  } finally {
    connection.release();
  }
}

function getPool() {
  if (!pool) {
    throw new Error("数据库池未初始化，请先调用 initDatabase()");
  }
  return pool;
}

module.exports = {
  initDatabase,
  getPool
};
