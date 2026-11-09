const { getPool } = require("../config/database");
const logService = require("../services/logService");
const logger = require("../utils/logger");

const writeOperationLog = async (connection, userId, operationType, operationDesc, ipAddress) => {
  await logService.recordLog(userId, operationType, operationDesc, ipAddress);
};

/**
 * 用户管理控制器（管理员专属）
 */

/**
 * 获取操作日志
 * GET /api/admin/logs
 */
exports.getLogs = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 50;
    const { userId, operationType, keyword, startDate, endDate } = req.query;
    const whereConditions = [];
    const queryParams = [];

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    if (userId && userId !== "") {
      whereConditions.push("l.user_id = ?");
      queryParams.push(parseInt(userId));
    }

    if (operationType && operationType !== "") {
      whereConditions.push("l.operation_type = ?");
      queryParams.push(operationType);
    }

    if (keyword && keyword !== "") {
      whereConditions.push("(l.operation_desc LIKE ? OR u.username LIKE ?)");
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (startDate && startDate !== "") {
      whereConditions.push("l.created_at >= ?");
      queryParams.push(`${startDate} 00:00:00`);
    }

    if (endDate && endDate !== "") {
      whereConditions.push("l.created_at <= ?");
      queryParams.push(`${endDate} 23:59:59`);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";
    const offset = (page - 1) * limit;

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) as total
       FROM operation_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${whereClause}`,
      queryParams
    );

    const [logs] = await connection.execute(
      `SELECT 
        l.id, 
        l.operation_type, 
        l.operation_desc, 
        l.ip_address, 
        l.created_at,
        u.username as user_name
       FROM operation_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      queryParams
    );

    logger.info(`✅ 获取操作日志成功，总数: ${logs.length}`);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total: countRows[0].total,
        totalPages: Math.ceil(countRows[0].total / limit)
      }
    });
  } catch (error) {
    logger.error(`❌ 获取操作日志失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "获取操作日志失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 获取仪表盘统计数据
 * GET /api/admin/dashboard-stats
 */
exports.getDashboardStats = async (req, res) => {
  const connection = await getPool().getConnection();
  try {
    // 1. 合同状态分布 (用于饼图)
    const [statusDist] = await connection.execute(
      `SELECT status, COUNT(*) as count FROM contracts GROUP BY status`
    );

    // 2. 最近 6 个月的合同趋势 (用于折线图)
    const [monthlyTrend] = await connection.execute(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month, 
        COUNT(*) as count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count
       FROM contracts 
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY month 
       ORDER BY month ASC`
    );

    // 2.1 合同金额趋势
    const [monthlyAmountTrend] = await connection.execute(
      `SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        ROUND(COALESCE(SUM(contract_amount), 0), 2) AS amount,
        ROUND(COALESCE(SUM(CASE WHEN status = 'approved' THEN contract_amount ELSE 0 END), 0), 2) AS approved_amount
       FROM contracts
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY month
       ORDER BY month ASC`
    );

    // 2.2 合作方金额统计
    const [partnerAmountRank] = await connection.execute(
      `SELECT
        COALESCE(NULLIF(TRIM(signer_other), ''), '未命名合作方') AS partner_name,
        COUNT(*) AS contract_count,
        ROUND(COALESCE(SUM(contract_amount), 0), 2) AS total_amount
       FROM contracts
       GROUP BY COALESCE(NULLIF(TRIM(signer_other), ''), '未命名合作方')
       ORDER BY total_amount DESC, contract_count DESC
       LIMIT 8`
    );

    // 2.3 到期提醒分布
    const [expiryOverviewRows] = await connection.execute(
      `SELECT
        SUM(CASE WHEN expire_at IS NULL THEN 1 ELSE 0 END) AS no_expiry_count,
        SUM(CASE WHEN expire_at IS NOT NULL AND DATEDIFF(expire_at, CURDATE()) < 0 THEN 1 ELSE 0 END) AS expired_count,
        SUM(CASE WHEN expire_at IS NOT NULL AND DATEDIFF(expire_at, CURDATE()) BETWEEN 0 AND 7 THEN 1 ELSE 0 END) AS expiring_soon_count,
        SUM(CASE WHEN expire_at IS NOT NULL AND DATEDIFF(expire_at, CURDATE()) > 7 THEN 1 ELSE 0 END) AS normal_count
       FROM contracts`
    );

    // 3. 审计日志类型分布 (用于柱状图)
    const [logTypeDist] = await connection.execute(
      `SELECT operation_type, COUNT(*) as count 
       FROM operation_logs 
       WHERE operation_type IN ('LOGIN', 'UPLOAD_CONTRACT', 'APPROVE_CONTRACT', 'VERIFY_CONTRACT')
       GROUP BY operation_type`
    );

    // 4. 核心指标卡片数据
    const [totalStats] = await connection.execute(
      `SELECT 
        COUNT(*) as total_contracts,
        SUM(CASE WHEN contract_id IS NOT NULL THEN 1 ELSE 0 END) as on_chain_count,
        ROUND(COALESCE(SUM(contract_amount), 0), 2) as total_amount,
        ROUND(COALESCE(AVG(NULLIF(contract_amount, 0)), 0), 2) as avg_amount,
        SUM(CASE WHEN archive_status = 'archived' THEN 1 ELSE 0 END) as archived_count,
        SUM(CASE WHEN expire_at IS NOT NULL AND DATEDIFF(expire_at, CURDATE()) BETWEEN 0 AND 7 THEN 1 ELSE 0 END) as expiring_soon_count,
        SUM(CASE WHEN expire_at IS NOT NULL AND DATEDIFF(expire_at, CURDATE()) < 0 THEN 1 ELSE 0 END) as expired_count,
        (SELECT COUNT(*) FROM operation_logs WHERE operation_type = 'VERIFY_CONTRACT' AND operation_desc LIKE '%结果: 成功%') as verify_success_count
       FROM contracts`
    );

    res.json({
      success: true,
      data: {
        statusDistribution: statusDist,
        monthlyTrend: monthlyTrend,
        monthlyAmountTrend: monthlyAmountTrend,
        partnerAmountRank: partnerAmountRank,
        expiryOverview: expiryOverviewRows[0],
        logTypeDistribution: logTypeDist,
        summary: totalStats[0]
      }
    });
  } catch (error) {
    logger.error(`❌ 获取仪表盘统计失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "获取仪表盘统计失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};
exports.getAllUsers = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const [users] = await connection.execute(
      `SELECT id, username, email, phone, department, status, wallet_address, role, created_at, updated_at FROM users WHERE status != 'deleted' ORDER BY created_at DESC`
    );

    logger.info(`✅ 获取用户列表成功，总数: ${users.length}`);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error(`❌ 获取用户列表失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "获取用户列表失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 更新用户信息
 * PUT /api/admin/users/:id
 */
exports.updateUser = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const userId = parseInt(req.params.id);
    const { username, email, phone, department, status, role } = req.body;

    // 验证输入
    if (!username) {
      return res.status(400).json({
        success: false,
        message: "用户名不能为空"
      });
    }

    if (role && !['user', 'admin', 'auditor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "无效的角色"
      });
    }

    if (status && !['active', 'inactive', 'deleted'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "无效的状态"
      });
    }

    const [targetUsers] = await connection.execute(
      "SELECT id, username, status, role FROM users WHERE id = ?",
      [userId]
    );

    if (targetUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "用户不存在"
      });
    }

    if (userId === req.user.id && status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "不能停用自己的账户"
      });
    }

    const [existingUsers] = await connection.execute(
      "SELECT id FROM users WHERE username = ? AND id != ?",
      [username, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "用户名已被其他用户使用"
      });
    }

    const [result] = await connection.execute(
      `UPDATE users SET 
        username = ?, 
        email = ?, 
        phone = ?,
        department = ?,
        status = COALESCE(?, status),
        role = COALESCE(?, role)
       WHERE id = ?`,
      [username, email || null, phone || null, department || null, status || null, role || null, userId]
    );

    await writeOperationLog(
      connection,
      req.user.id,
      "ADMIN_UPDATE_USER",
      `管理员更新用户 ID: ${userId}, 用户名: ${targetUsers[0].username} -> ${username}, 状态: ${targetUsers[0].status} -> ${status || targetUsers[0].status}, 角色: ${targetUsers[0].role} -> ${role || targetUsers[0].role}`,
      req.ip
    );

    logger.info(`✅ 用户更新成功: ID ${userId}`);

    res.json({
      success: true,
      message: "用户更新成功"
    });
  } catch (error) {
    logger.error(`❌ 更新用户失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "更新用户失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 删除用户
 * DELETE /api/admin/users/:id
 */
exports.deleteUser = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const userId = parseInt(req.params.id);

    const [targetUsers] = await connection.execute(
      "SELECT id, username FROM users WHERE id = ?",
      [userId]
    );

    if (targetUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "用户不存在"
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "不能删除自己的账户"
      });
    }

    // 使用软删除，避免外键约束冲突
    const [result] = await connection.execute(
      "UPDATE users SET status = 'deleted' WHERE id = ?",
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "用户不存在"
      });
    }

    await writeOperationLog(
      connection,
      req.user.id,
      "ADMIN_DELETE_USER",
      `管理员删除用户 ID: ${userId}, 用户名: ${targetUsers[0].username}`,
      req.ip
    );

    logger.info(`✅ 用户删除成功: ID ${userId}`);

    res.json({
      success: true,
      message: "用户删除成功"
    });
  } catch (error) {
    logger.error(`❌ 删除用户失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "删除用户失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 切换用户状态
 * PUT /api/admin/users/:id/toggle-status
 */
exports.toggleUserStatus = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const userId = parseInt(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "不能停用自己的账户"
      });
    }

    const [users] = await connection.execute(
      "SELECT username, status FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "用户不存在"
      });
    }

    const newStatus = users[0].status === 'active' ? 'inactive' : 'active';

    await connection.execute(
      "UPDATE users SET status = ? WHERE id = ?",
      [newStatus, userId]
    );

    await writeOperationLog(
      connection,
      req.user.id,
      "ADMIN_TOGGLE_USER_STATUS",
      `管理员切换用户状态 ID: ${userId}, 用户名: ${users[0].username}, 新状态: ${newStatus}`,
      req.ip
    );

    logger.info(`✅ 用户状态切换成功: ID ${userId}, 新状态: ${newStatus}`);

    res.json({
      success: true,
      message: "用户状态更新成功",
      data: { status: newStatus }
    });
  } catch (error) {
    logger.error(`❌ 切换用户状态失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "切换用户状态失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 获取所有评分
 * GET /api/admin/ratings
 */
exports.getAllRatings = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const [ratings] = await connection.execute(
      `SELECT * FROM ratings ORDER BY rating_score DESC`
    );

    logger.info(`✅ 获取评分列表成功，总数: ${ratings.length}`);

    res.json({
      success: true,
      data: ratings
    });
  } catch (error) {
    logger.error(`❌ 获取评分列表失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "获取评分列表失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 创建评分
 * POST /api/admin/ratings
 */
exports.createRating = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const { company_name, rating_score, contract_count, total_amount } = req.body;

    if (!company_name || !rating_score) {
      return res.status(400).json({
        success: false,
        message: "企业名称和评分为必填项"
      });
    }

    let rating_level;
    if (rating_score >= 4.5) {
      rating_level = '优秀';
    } else if (rating_score >= 3.5) {
      rating_level = '良好';
    } else if (rating_score >= 2.5) {
      rating_level = '合格';
    } else {
      rating_level = '较差';
    }

    const [result] = await connection.execute(
      `INSERT INTO ratings (company_name, rating_score, rating_level, contract_count, total_amount, last_contract_date) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [company_name, rating_score, rating_level, contract_count || 0, total_amount || 0]
    );

    logger.info(`✅ 评分创建成功: ${company_name}`);

    res.status(201).json({
      success: true,
      message: "评分创建成功",
      data: { id: result.insertId }
    });
  } catch (error) {
    logger.error(`❌ 创建评分失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "创建评分失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

exports.updateRating = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const ratingId = parseInt(req.params.id);
    const { company_name, rating_score, contract_count, total_amount } = req.body;

    if (!company_name || rating_score === undefined || rating_score === null) {
      return res.status(400).json({
        success: false,
        message: "企业名称和评分为必填项"
      });
    }

    const score = Number(rating_score);
    if (!Number.isFinite(score) || score < 0 || score > 5) {
      return res.status(400).json({
        success: false,
        message: "评分分数必须在0-5之间"
      });
    }

    let rating_level;
    if (score >= 4.5) {
      rating_level = "优秀";
    } else if (score >= 3.5) {
      rating_level = "良好";
    } else if (score >= 2.5) {
      rating_level = "合格";
    } else {
      rating_level = "较差";
    }

    const [result] = await connection.execute(
      `UPDATE ratings SET
        company_name = ?,
        rating_score = ?,
        rating_level = ?,
        contract_count = ?,
        total_amount = ?
       WHERE id = ?`,
      [
        company_name,
        score,
        rating_level,
        Number(contract_count) || 0,
        Number(total_amount) || 0,
        ratingId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "评分记录不存在"
      });
    }

    logger.info(`✅ 评分更新成功: ID ${ratingId}`);
    res.json({
      success: true,
      message: "评分更新成功"
    });
  } catch (error) {
    logger.error(`❌ 更新评分失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "更新评分失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

exports.deleteRating = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const ratingId = parseInt(req.params.id);

    const [result] = await connection.execute(
      "DELETE FROM ratings WHERE id = ?",
      [ratingId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "评分记录不存在"
      });
    }

    logger.info(`✅ 评分删除成功: ID ${ratingId}`);
    res.json({
      success: true,
      message: "评分删除成功"
    });
  } catch (error) {
    logger.error(`❌ 删除评分失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "删除评分失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

exports.batchDeleteRatings = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "请提供要删除的评分ID列表"
      });
    }

    const validIds = ids
      .map((id) => parseInt(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "评分ID无效"
      });
    }

    const placeholders = validIds.map(() => "?").join(",");
    const [result] = await connection.execute(
      `DELETE FROM ratings WHERE id IN (${placeholders})`,
      validIds
    );

    logger.info(`✅ 批量删除评分成功，删除数量: ${result.affectedRows}`);
    res.json({
      success: true,
      message: "批量删除评分成功",
      data: { deletedCount: result.affectedRows }
    });
  } catch (error) {
    logger.error(`❌ 批量删除评分失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "批量删除评分失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};
