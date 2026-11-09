import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function AdminNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch (e) {
      setCurrentUser(null);
    }
  }, []);

  const displayName = currentUser?.username || "管理员";
  const avatarText = displayName ? displayName.charAt(0).toUpperCase() : "A";
  const isActive = (path) => location.pathname === path;
  const isAuditor = currentUser?.role === "auditor";
  const isAdmin = currentUser?.role === "admin";
  const navItems = isAuditor
    ? [
        { path: "/admin/dashboard", label: "📊 数据看板" },
        { path: "/contracts", label: "合同管理（只读）" },
        { path: "/admin/logs", label: "系统审计日志" },
        { path: "/verify", label: "校验" }
      ]
    : [
        { path: "/admin/dashboard", label: "📊 数据看板" },
        { path: "/contracts", label: "合同管理" },
        { path: "/admin/ratings", label: "评分列表" },
        { path: "/admin/company-ratings", label: "企业评分", adminOnly: true },
        { path: "/admin/users", label: "管理控制中心", adminOnly: true },
        { path: "/admin/logs", label: "系统审计日志" }
      ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={{
      background: "#ffffff",
      borderBottom: "1px solid #e2e8f0",
      padding: "0 24px",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
    }}>
      <div style={{ height: "48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ 
          fontSize: "19px",
          fontWeight: "700",
          color: "#1e293b",
          letterSpacing: "0.2px"
        }}>
          TrustSign 企业中心
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "7px 12px 7px 7px",
              borderRadius: "999px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0"
            }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                color: "#1e3a8a",
                background: "#dbeafe",
                fontSize: "13px"
              }}
            >
              {avatarText}
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b", lineHeight: 1.2 }}>{displayName}</div>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          height: "56px",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <nav style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  padding: "16px 16px",
                  textDecoration: "none",
                  color: isActive(item.path) ? "#1d4ed8" : "#475569",
                  fontSize: "14px",
                  fontWeight: isActive(item.path) ? "700" : "600",
                  borderBottom: isActive(item.path) ? "2px solid #2563eb" : "2px solid transparent",
                  transition: "all 0.2s"
                }}
              >
                {item.label}
              </Link>
            ))}
        </nav>
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 14px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            color: "#475569",
            fontWeight: "600",
            transition: "all 0.2s"
          }}
        >
          退出登录
        </button>
      </div>
    </div>
  );
}

export default AdminNavbar;
