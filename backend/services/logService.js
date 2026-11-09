const { getPool } = require("../config/database");
const logger = require("../utils/logger");

/**
 * 记录系统操作日志
 * @param {number|null} userId 用户ID
 * @param {string} operationType 操作类型
 * @param {string} operationDesc 操作描述
 * @param {string} ipAddress IP地址
 */
const recordLog = async (userId, operationType, operationDesc, ipAddress) => {
  let connection;
  try {
    connection = await getPool().getConnection();
    await connection.execute(
      "INSERT INTO operation_logs (user_id, operation_type, operation_desc, ip_address) VALUES (?, ?, ?, ?)",
      [userId || null, operationType, operationDesc, ipAddress || "unknown"]
    );
    logger.info(`📝 日志记录成功: [${operationType}] - ${operationDesc}`);
  } catch (error) {
    logger.error(`❌ 日志记录失败: ${error.message}`);
    // 日志失败不应中断业务流程，所以这里只记录错误
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  recordLog
};
