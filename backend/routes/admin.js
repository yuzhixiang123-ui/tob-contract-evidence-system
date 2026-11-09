const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authMiddleware, auditorMiddleware } = require("../middleware/authMiddleware");

/**
 * 管理员权限中间件
 */
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "需要管理员权限"
    });
  }
  next();
};

// 仪表盘、日志对审计员开放
router.get("/dashboard-stats", authMiddleware, auditorMiddleware, adminController.getDashboardStats);
router.get("/logs", authMiddleware, auditorMiddleware, adminController.getLogs);

// 以下路由仅限管理员
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * 管理员专有路由
 */

// GET /api/admin/users - 获取所有用户
router.get("/users", adminController.getAllUsers);

// PUT /api/admin/users/:id - 更新用户
router.put("/users/:id", adminController.updateUser);

// DELETE /api/admin/users/:id - 删除用户
router.delete("/users/:id", adminController.deleteUser);

// PUT /api/admin/users/:id/toggle-status - 切换用户状态
router.put("/users/:id/toggle-status", adminController.toggleUserStatus);

// GET /api/admin/ratings - 获取评分列表
router.get("/ratings", adminController.getAllRatings);

// 评分管理专有路由
router.post("/ratings", adminController.createRating);
router.put("/ratings/:id", adminController.updateRating);
router.delete("/ratings/:id", adminController.deleteRating);
router.post("/ratings/batch-delete", adminController.batchDeleteRatings);

module.exports = router;
