require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const logger = require("./utils/logger");
const { initDatabase } = require("./config/database");
const blockchainService = require("./services/blockchainService");

// 引入路由
const authRoutes = require("./routes/auth");
const contractRoutes = require("./routes/contracts");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  logger.info(`📨 ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// 静态文件服务
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 健康检查接口
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API路由
app.use("/api/auth", authRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/admin", adminRoutes);

// 根路径
app.get("/", (req, res) => {
  res.json({
    name: "ToB Contract Evidence System API",
    version: "1.0.0",
    description: "区块链合同存证系统后端API",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me",
        updateWallet: "PUT /api/auth/wallet"
      },
      contracts: {
        upload: "POST /api/contracts/upload",
        list: "GET /api/contracts?page=1&limit=10",
        detail: "GET /api/contracts/:id",
        approve: "POST /api/contracts/approve",
        reject: "POST /api/contracts/reject",
        verify: "POST /api/contracts/verify"
      },
      health: "GET /health"
    }
  });
});

// 404处理
app.use((req, res) => {
  logger.warn(`⚠️  404 - 路由不存在: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: "路由不存在"
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(`❌ 服务器错误: ${err.message}`);
  logger.error(`   堆栈: ${err.stack}`);

  // Multer错误处理
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "文件大小超过限制（最大50MB）"
      });
    }
    return res.status(400).json({
      success: false,
      message: `文件上传错误: ${err.message}`
    });
  }

  // 自定义错误
  if (err.message && err.message.includes("不支持的文件类型")) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // 默认错误响应
  res.status(500).json({
    success: false,
    message: "服务器内部错误",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// 启动服务器
async function startServer() {
  try {
    logger.info("========================================");
    logger.info("🚀 启动合同存证系统后端服务...");
    logger.info("========================================\n");

    // 初始化数据库
    logger.info("📦 初始化数据库...");
    await initDatabase();
    logger.info("✅ 数据库初始化完成\n");

    // 初始化区块链服务
    logger.info("⛓️  初始化区块链服务...");
    await blockchainService.initialize();
    logger.info("✅ 区块链服务初始化完成\n");

    // 启动HTTP服务器
    app.listen(PORT, () => {
      logger.info("========================================");
      logger.info(`✅ 服务器启动成功!`);
      logger.info(`📍 访问地址: http://localhost:${PORT}`);
      logger.info(`📚 API文档: http://localhost:${PORT}/`);
      logger.info(`❤️  健康检查: http://localhost:${PORT}/health`);
      logger.info("========================================\n");

      logger.info("可用接口:");
      logger.info("  POST   /api/auth/register    - 用户注册");
      logger.info("  POST   /api/auth/login       - 用户登录");
      logger.info("  GET    /api/auth/me          - 获取当前用户");
      logger.info("  PUT    /api/auth/wallet      - 更新钱包地址");
      logger.info("  POST   /api/contracts/upload - 上传合同");
      logger.info("  GET    /api/contracts        - 获取合同列表(分页)");
      logger.info("  GET    /api/contracts/:id    - 获取合同详情");
      logger.info("  POST   /api/contracts/approve - 审批合同");
      logger.info("  POST   /api/contracts/reject  - 拒绝合同");
      logger.info("  POST   /api/contracts/verify  - 验证合同\n");
    });
  } catch (error) {
    logger.error("❌ 服务器启动失败:", error);
    process.exit(1);
  }
}

// 启动应用
startServer();

// 优雅关闭
process.on("SIGTERM", () => {
  logger.info("📤 收到SIGTERM信号，正在关闭服务器...");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("📤 收到SIGINT信号，正在关闭服务器...");
  process.exit(0);
});