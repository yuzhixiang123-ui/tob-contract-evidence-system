const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getPool } = require("../config/database");
const logService = require("../services/logService");
const logger = require("../utils/logger");

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * 用户认证控制器
 * 处理用户注册和登录
 */

/**
 * 用户注册
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const { username, password, email, phone, department, wallet_address, role } = req.body;

    // 输入验证
    if (!username || !password) {
      logger.warn("⚠️  注册失败: 用户名或密码为空");
      return res.status(400).json({
        success: false,
        message: "用户名和密码不能为空"
      });
    }

    if (username.length < 3 || username.length > 50) {
      logger.warn("⚠️  注册失败: 用户名长度不符合要求");
      return res.status(400).json({
        success: false,
        message: "用户名长度必须在3-50个字符之间"
      });
    }

    if (password.length < 6) {
      logger.warn("⚠️  注册失败: 密码长度不足");
      return res.status(400).json({
        success: false,
        message: "密码长度至少6个字符"
      });
    }

    // 验证角色
    const validRoles = ['user', 'admin', 'auditor'];
    const userRole = validRoles.includes(role) ? role : 'user';

    logger.info(`📝 用户注册: ${username}, 角色: ${userRole}`);

    if (wallet_address && !ETH_ADDRESS_REGEX.test(wallet_address)) {
      return res.status(400).json({
        success: false,
        message: "无效的以太坊地址格式"
      });
    }

    // 检查用户名是否已存在
    const [existingUsers] = await connection.execute(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (existingUsers.length > 0) {
      logger.warn(`⚠️  注册失败: 用户名 ${username} 已存在`);
      return res.status(409).json({
        success: false,
        message: "用户名已存在"
      });
    }

    if (wallet_address) {
      const [walletUsers] = await connection.execute(
        "SELECT id FROM users WHERE LOWER(wallet_address) = LOWER(?)",
        [wallet_address]
      );

      if (walletUsers.length > 0) {
        logger.warn(`⚠️  注册失败: 钱包地址已被绑定 - ${wallet_address}`);
        return res.status(409).json({
          success: false,
          message: "该钱包地址已被其他用户绑定"
        });
      }
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 插入新用户
    const [result] = await connection.execute(
      "INSERT INTO users (username, password, email, phone, department, wallet_address, role) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [username, hashedPassword, email || null, phone || null, department || null, wallet_address || null, userRole]
    );

    logger.info(`✅ 用户注册成功: ${username}, ID: ${result.insertId}`);

    // 记录操作日志
    await logService.recordLog(
      result.insertId,
      "REGISTER",
      `用户 ${username} 注册`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: "注册成功",
      data: {
        userId: result.insertId,
        username: username
      }
    });
  } catch (error) {
    logger.error(`❌ 注册失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "注册失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 用户登录
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const { username, password } = req.body;

    // 输入验证
    if (!username || !password) {
      logger.warn("⚠️  登录失败: 用户名或密码为空");
      return res.status(400).json({
        success: false,
        message: "用户名和密码不能为空"
      });
    }

    logger.info(`🔐 用户登录: ${username}`);

    // 查找用户
    const [users] = await connection.execute(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      logger.warn(`⚠️  登录失败: 用户 ${username} 不存在`);
      return res.status(401).json({
        success: false,
        message: "用户名或密码错误"
      });
    }

    const user = users[0];

    // 检查用户是否被停用
    if (user.status === 'inactive' || user.status === 'deleted') {
      logger.warn(`⚠️  登录失败: 用户 ${username} 账号已被停用`);
      // 记录登录失败日志
      await logService.recordLog(
        user.id,
        "LOGIN_FAILED",
        `${user.status === 'deleted' ? '账号删除拦截' : '账号停用拦截'}: ${username}`,
        req.ip
      );
      return res.status(403).json({
        success: false,
        message: user.status === 'deleted' ? "账号已被删除，请联系管理员" : "账号已被停用，请联系管理员"
      });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logger.warn(`⚠️  登录失败: 密码错误 - 用户: ${username}`);
      return res.status(401).json({
        success: false,
        message: "用户名或密码错误"
      });
    }

    // 生成JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    logger.info(`✅ 用户登录成功: ${username}, 角色: ${user.role}`);

    // 记录操作日志
    await logService.recordLog(
      user.id,
      "LOGIN",
      `用户 ${username} 登录`,
      req.ip
    );

    res.json({
      success: true,
      message: "登录成功",
      data: {
        token: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          wallet_address: user.wallet_address,
          role: user.role,
          status: user.status
        }
      }
    });
  } catch (error) {
    logger.error(`❌ 登录失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "登录失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
exports.getCurrentUser = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const userId = req.user.id;

    const [users] = await connection.execute(
      "SELECT id, username, email, wallet_address, role, status, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      logger.warn(`⚠️  获取用户信息失败: 用户ID ${userId} 不存在`);
      return res.status(404).json({
        success: false,
        message: "用户不存在"
      });
    }

    logger.info(`✅ 获取用户信息成功: ${users[0].username}`);
    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    logger.error(`❌ 获取用户信息失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "获取用户信息失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 更新钱包地址
 * PUT /api/auth/wallet
 */
exports.updateWalletAddress = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const userId = req.user.id;
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: "钱包地址不能为空"
      });
    }

    // 简单的以太坊地址验证
    if (!ETH_ADDRESS_REGEX.test(wallet_address)) {
      return res.status(400).json({
        success: false,
        message: "无效的以太坊地址格式"
      });
    }

    const [walletUsers] = await connection.execute(
      "SELECT id FROM users WHERE LOWER(wallet_address) = LOWER(?) AND id != ?",
      [wallet_address, userId]
    );

    if (walletUsers.length > 0) {
      logger.warn(`⚠️  钱包地址绑定冲突: 用户 ${userId}, 地址 ${wallet_address}`);
      return res.status(409).json({
        success: false,
        message: "该钱包地址已被其他用户绑定"
      });
    }

    await connection.execute(
      "UPDATE users SET wallet_address = ? WHERE id = ?",
      [wallet_address, userId]
    );

    logger.info(`✅ 钱包地址更新成功: ${wallet_address}`);

    res.json({
      success: true,
      message: "钱包地址更新成功"
    });
  } catch (error) {
    logger.error(`❌ 更新钱包地址失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "更新钱包地址失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};
