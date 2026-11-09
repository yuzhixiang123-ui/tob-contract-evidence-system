const jwt = require("jsonwebtoken");
const { getPool } = require("../config/database");
const logger = require("../utils/logger");

/**
 * JWT认证中间件
 * 验证请求头中的JWT token
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn(`⚠️  未提供认证令牌 - IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: "未提供认证令牌"
      });
    }

    // 检查Bearer格式
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      logger.warn(`⚠️  令牌格式错误 - IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: "令牌格式错误"
      });
    }

    const token = parts[1];

    // 验证token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error("❌ JWT_SECRET未配置");
      return res.status(500).json({
        success: false,
        message: "服务器配置错误"
      });
    }

    const decoded = jwt.verify(token, secret);

    const connection = await getPool().getConnection();
    try {
      const [users] = await connection.execute(
        "SELECT id, username, role, status FROM users WHERE id = ?",
        [decoded.id]
      );

      if (users.length === 0) {
        logger.warn(`⚠️  认证失败: 用户不存在 - ID: ${decoded.id}`);
        return res.status(401).json({
          success: false,
          message: "用户不存在，请重新登录"
        });
      }

      const user = users[0];

      if (user.status === "inactive" || user.status === "deleted") {
        logger.warn(`⚠️  认证拒绝: 账号已停用 - 用户: ${user.username}, ID: ${user.id}`);
        return res.status(403).json({
          success: false,
          message: user.status === "deleted" ? "您的账号已被删除，请联系管理员" : "您的账号已被停用，请重新登录并联系管理员"
        });
      }

      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status
      };
    } finally {
      connection.release();
    }

    logger.info(`✅ 用户认证成功: ${req.user.username}`);
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      logger.warn(`⚠️  令牌已过期 - IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: "令牌已过期"
      });
    }

    if (error.name === "JsonWebTokenError") {
      logger.warn(`⚠️  无效的令牌 - IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: "无效的令牌"
      });
    }

    logger.error(`❌ 认证失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "认证失败",
      error: error.message
    });
  }
};

/**
 * 管理员权限中间件
 * 需要在authMiddleware之后使用
 */
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    logger.warn(`⚠️  非管理员用户尝试访问: ${req.user?.username || "未知"}`);
    return res.status(403).json({
      success: false,
      message: "需要管理员权限"
    });
  }
  next();
};

/**
 * 审计权限中间件
 * 允许管理员和审计员访问
 */
const auditorMiddleware = (req, res, next) => {
  if (req.baseUrl === "/api/contracts" && req.method === "GET" && /^\/\d+$/.test(req.path)) {
    next();
    return;
  }

  if (req.user.role === "admin" || req.user.role === "auditor") {
    next();
  } else {
    logger.warn(`⚠️  权限不足: 非管理/审计角色 ${req.user.role} 尝试访问审计接口`);
    res.status(403).json({
      success: false,
      message: "权限不足，仅限管理员或审计员访问"
    });
  }
};

const auditorOnlyMiddleware = (req, res, next) => {
  if (req.user.role === "auditor") {
    next();
  } else {
    logger.warn(`⚠️  权限不足: 非审计员角色 ${req.user.role} 尝试访问审计员专属接口`);
    res.status(403).json({
      success: false,
      message: "权限不足，仅限审计员访问"
    });
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  auditorMiddleware,
  auditorOnlyMiddleware
};
