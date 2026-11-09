import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import ContractList from "./pages/ContractList";
import UploadContract from "./pages/UploadContract";
import ContractDetail from "./pages/ContractDetail";
import VerifyContract from "./pages/VerifyContract";
import UserManagement from "./pages/UserManagement";
import RatingList from "./pages/RatingList";
import CompanyRating from "./pages/CompanyRating";
import SystemLogs from "./pages/SystemLogs";
import Dashboard from "./pages/Dashboard";
import "./index.css";

/**
 * 获取当前用户角色
 */
function getUserRole() {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.role;
    }
  } catch (e) {
    console.error("获取用户角色失败:", e);
  }
  return null;
}

/**
 * 受保护的路由组件
 * 检查用户是否已登录
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * 角色路由组件
 * 检查用户是否具备目标角色权限
 */
function RoleRoute({ children, allowedRoles, redirectTo = "/contracts" }) {
  const token = localStorage.getItem("token");
  const role = getUserRole();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

/**
 * 公共路由组件
 * 如果已登录则跳转到合同列表
 */
function PublicRoute({ children }) {
  const token = localStorage.getItem("token");

  if (token) {
    return <Navigate to="/contracts" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          {/* 公共路由 */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            }
          />

          {/* 受保护的路由 */}
          <Route
            path="/contracts"
            element={
              <ProtectedRoute>
                <ContractList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <RoleRoute allowedRoles={["admin", "user"]}>
                <UploadContract />
              </RoleRoute>
            }
          />
          <Route
            path="/contracts/:id"
            element={
              <ProtectedRoute>
                <ContractDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/verify"
            element={
              <RoleRoute allowedRoles={["auditor"]} redirectTo="/contracts">
                <VerifyContract />
              </RoleRoute>
            }
          />

          {/* 管理员路由 */}
          <Route
            path="/admin/dashboard"
            element={
              <RoleRoute allowedRoles={["admin", "auditor"]}>
                <Dashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RoleRoute allowedRoles={["admin"]} redirectTo="/admin/dashboard">
                <UserManagement />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/ratings"
            element={
              <RoleRoute allowedRoles={["admin"]} redirectTo="/admin/dashboard">
                <RatingList />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/company-ratings"
            element={
              <RoleRoute allowedRoles={["admin"]} redirectTo="/admin/dashboard">
                <CompanyRating />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <RoleRoute allowedRoles={["admin", "auditor"]}>
                <SystemLogs />
              </RoleRoute>
            }
          />

          {/* 默认重定向 */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
