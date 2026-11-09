import React, { useState, useEffect } from "react";
import { adminAPI, authAPI } from "../utils/api";
import AdminNavbar from "../components/AdminNavbar";
import { useNavigate } from "react-router-dom";

function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  
  // 用户筛选状态
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  
  // 编辑状态
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    phone: "",
    department: "",
    status: "active",
    role: "user"
  });

  // --- 操作日志相关状态 ---
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [logFilters, setLogFilters] = useState({
    page: 1,
    limit: 10,
    userId: "",
    operationType: "",
    keyword: "",
    filterDate: ""
  });

  const getCurrentUser = async () => {
    try {
      const result = await authAPI.getCurrentUser();
      if (result.success) {
        setCurrentUser(result.data);
      }
    } catch (e) {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    }
  };

  const getDepartments = () => {
    const deptSet = new Set();
    users.forEach(user => {
      if (user.department) {
        deptSet.add(user.department);
      }
    });
    return Array.from(deptSet);
  };

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminAPI.getAllUsers();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (err) {
      console.error("获取用户列表失败:", err);
      setError(err.response?.data?.message || "获取用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (overrides = {}) => {
    setLogsLoading(true);
    try {
      const nextFilters = {
        ...logFilters,
        ...overrides
      };
      setLogFilters(nextFilters);

      const params = Object.fromEntries(
        Object.entries(nextFilters).filter(([, value]) => value !== "" && value !== null && value !== undefined)
      );

      if (params.filterDate) {
        params.startDate = params.filterDate;
        params.endDate = params.filterDate;
      }
      delete params.filterDate;

      const result = await adminAPI.getLogs(params);
      if (result.success) {
        setLogs(result.data);
        if (result.pagination) {
          setLogsPagination(result.pagination);
        }
      }
    } catch (err) {
      console.error("获取操作日志失败:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser();
    loadUsers();
    loadLogs();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const filteredUsers = users.filter(user => {
    let match = true;
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      match = match && (
        user.username.toLowerCase().includes(keyword) ||
        (user.email && user.email.toLowerCase().includes(keyword))
      );
    }
    if (searchPhone) {
      match = match && (user.phone && user.phone.includes(searchPhone));
    }
    if (statusFilter) {
      match = match && user.status === statusFilter;
    }
    if (selectedDepartment) {
      match = match && user.department === selectedDepartment;
    }
    return match;
  });

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN");
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      email: user.email || "",
      phone: user.phone || "",
      department: user.department || "",
      status: user.status || "active",
      role: user.role
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateUser(editingUser.id, editForm);
      alert("用户更新成功！");
      setEditingUser(null);
      loadUsers();
      loadLogs({ page: 1 }); // 刷新日志
    } catch (err) {
      console.error("更新用户失败:", err);
      alert(err.response?.data?.message || "更新用户失败");
    }
  };

  const handleDeleteClick = async (userId) => {
    if (!window.confirm("确定要删除这个用户吗？")) {
      return;
    }
    try {
      await adminAPI.deleteUser(userId);
      alert("用户删除成功！");
      loadUsers();
      loadLogs({ page: 1 });
    } catch (err) {
      console.error("删除用户失败:", err);
      alert(err.response?.data?.message || "删除用户失败");
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const result = await adminAPI.toggleUserStatus(userId);
      if (result.success) {
        if (currentUser && currentUser.id === userId && result.data.status === 'inactive') {
          alert("您的账号已被停用。");
          handleLogout();
        } else {
          loadUsers();
          loadLogs({ page: 1 });
        }
      }
    } catch (err) {
      console.error("切换用户状态失败:", err);
      alert(err.response?.data?.message || "切换用户状态失败");
    }
  };

  const handleLogsSearch = (e) => {
    e.preventDefault();
    loadLogs({ page: 1 });
  };

  const handleLogsReset = () => {
    loadLogs({
      page: 1,
      limit: 10,
      userId: "",
      operationType: "",
      keyword: "",
      filterDate: ""
    });
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#10b981' : '#64748b';
  };

  const getStatusPosition = (status) => {
    return status === 'active' ? 'right: 2px' : 'left: 2px';
  };

  const getUserCountByDepartment = (dept) => {
    return users.filter(u => u.department === dept).length;
  };

  const departments = getDepartments();
  const activeCount = users.filter((user) => user.status === "active").length;
  const inactiveCount = users.filter((user) => user.status !== "active").length;

  // --- 企业级样式配置 (Dark Enterprise Theme) ---
  const pageBackgroundStyle = {
    minHeight: "100vh",
    width: "100%",
    background: "#f8fafc",
    position: "relative",
    overflowX: "hidden"
  };

  const gridBackgroundStyle = {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px)
    `,
    backgroundSize: "48px 48px",
    opacity: 0.5,
    pointerEvents: "none"
  };

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
    padding: "20px"
  };

  const inputStyle = {
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    background: "#f8fafc",
    color: "#1e293b",
    fontSize: "14px"
  };

  return (
    <div style={pageBackgroundStyle}>
      <div style={gridBackgroundStyle} />
      <AdminNavbar />
      
      <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "28px 24px", position: "relative", zIndex: 1 }}>
        {/* 顶部标题栏 */}
        <div
          style={{
            marginBottom: "24px",
            padding: "24px 28px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h1 style={{ fontSize: "28px", color: "#ffffff", marginBottom: "6px", fontWeight: "700" }}>管理控制中心</h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>统一管理企业成员权限与系统访问控制策略</p>
          </div>
          <button onClick={loadUsers} style={{ padding: "10px 20px", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "10px", background: "rgba(255,255,255,0.2)", color: "#ffffff", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>
            🔄 刷新数据流
          </button>
        </div>

        {/* 统计指标 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "企业用户总数", value: users.length, color: "#38bdf8" },
            { label: "当前活跃成员", value: activeCount, color: "#10b981" },
            { label: "已停用/锁定", value: inactiveCount, color: "#f43f5e" }
          ].map((stat) => (
            <div key={stat.label} style={cardStyle}>
              <div style={{ color: "#64748b", fontSize: "14px", marginBottom: "10px" }}>{stat.label}</div>
              <div style={{ fontSize: "32px", fontWeight: "800", color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* 用户管理模块 - 现在占满整个宽度 */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "#1e293b", fontSize: "20px" }}>成员权限矩阵</h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索用户名或邮箱"
                style={inputStyle}
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
                <option value="">全部账号状态</option>
                <option value="active">正常启用</option>
                <option value="inactive">已被停用</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid rgba(148,163,184,0.15)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(241, 245, 249, 0.8)" }}>
                  <th style={{ padding: "14px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>用户名</th>
                  <th style={{ padding: "14px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>所属部门</th>
                  <th style={{ padding: "14px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>系统角色</th>
                  <th style={{ padding: "14px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>账号状态</th>
                  <th style={{ padding: "14px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>注册时间</th>
                  <th style={{ padding: "14px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>管理操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: "1px solid rgba(148,163,184,0.1)" }}>
                    <td style={{ padding: "14px", color: "#1e293b", fontWeight: "600" }}>{user.username}</td>
                    <td style={{ padding: "14px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", fontSize: "12px" }}>
                        {user.department || "未设定部门"}
                      </span>
                    </td>
                    <td style={{ padding: "14px", color: user.role === "admin" ? "#f59e0b" : user.role === "auditor" ? "#38bdf8" : "#cbd5e1" }}>
                      {user.role === "admin" ? "🛡️ 系统管理员" : user.role === "auditor" ? "🔍 审计员" : "👤 普通成员"}
                    </td>
                    <td style={{ padding: "14px" }}>
                      <div onClick={() => handleToggleStatus(user.id)} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <div style={{ width: "40px", height: "20px", borderRadius: "10px", background: getStatusColor(user.status), position: "relative" }}>
                          <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#fff", position: "absolute", top: "2px", [getStatusPosition(user.status)]: "2px" }} />
                        </div>
                        <span style={{ fontSize: "13px", color: getStatusColor(user.status) }}>{user.status === "active" ? "正常" : "锁定"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px", color: "#64748b", fontSize: "13px" }}>{formatDate(user.created_at)}</td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <button onClick={() => handleEditClick(user)} style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>编辑</button>
                        <button onClick={() => handleDeleteClick(user.id)} style={{ background: "none", border: "none", color: "#f43f5e", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 编辑弹窗 */}
      {editingUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ ...cardStyle, width: "100%", maxWidth: "500px", padding: "30px" }}>
            <h3 style={{ color: "#1e293b", fontSize: "22px", marginBottom: "20px" }}>编辑成员信息</h3>
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ color: "#64748b", fontSize: "14px" }}>用户名</label>
                <input type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} style={inputStyle} required />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ color: "#64748b", fontSize: "14px" }}>邮箱</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ color: "#64748b", fontSize: "14px" }}>手机号</label>
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ color: "#64748b", fontSize: "14px" }}>部门</label>
                <input type="text" value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ color: "#64748b", fontSize: "14px" }}>状态</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} style={inputStyle}>
                    <option value="active">启用</option>
                    <option value="inactive">锁定</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ color: "#64748b", fontSize: "14px" }}>角色</label>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} style={inputStyle}>
                    <option value="user">普通成员</option>
                    <option value="admin">系统管理员</option>
                    <option value="auditor">审计员</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: "12px", borderRadius: "10px" }}>保存更改</button>
                <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary" style={{ flex: 1, padding: "12px", borderRadius: "10px" }}>取消</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
