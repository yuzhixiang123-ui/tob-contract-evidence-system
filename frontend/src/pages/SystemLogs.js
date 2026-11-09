import React, { useState, useEffect } from "react";
import { adminAPI } from "../utils/api";
import AdminNavbar from "../components/AdminNavbar";

function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [logFilters, setLogFilters] = useState({
    page: 1,
    limit: 20,
    userId: "",
    operationType: "",
    keyword: "",
    filterDate: ""
  });

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN");
  };

  const loadLogs = async (overrides = {}) => {
    setLogsLoading(true);
    try {
      // 默认查询最近24小时
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const defaultStartDate = yesterday.toISOString().split('T')[0];

      const nextFilters = {
        startDate: defaultStartDate, // 默认最近一天
        ...logFilters,
        ...overrides
      };
      setLogFilters(nextFilters);

      const params = Object.fromEntries(
        Object.entries(nextFilters).filter(([, value]) => value !== "" && value !== null && value !== undefined)
      );

      // 如果有 filterDate (UI 上的单个日期选择)，则覆盖 startDate 和 endDate
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
    loadLogs();
  }, []);

  const handleLogsSearch = (e) => {
    e.preventDefault();
    loadLogs({ page: 1 });
  };

  const handleLogsReset = () => {
    loadLogs({
      page: 1,
      limit: 20,
      userId: "",
      operationType: "",
      keyword: "",
      filterDate: ""
    });
  };

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
    padding: "24px"
  };

  const inputStyle = {
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    background: "#f8fafc",
    color: "#1e293b",
    fontSize: "14px"
  };

  const pagerButtonStyle = (disabled) => ({
    padding: "8px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: disabled ? "#f1f5f9" : "#2563eb",
    color: disabled ? "#94a3b8" : "#ffffff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: "600",
    transition: "all 0.2s"
  });

  return (
    <div style={pageBackgroundStyle}>
      <div style={gridBackgroundStyle} />
      <AdminNavbar />
      
      <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "28px 24px", position: "relative", zIndex: 1 }}>
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
            <h1 style={{ fontSize: "28px", color: "#ffffff", marginBottom: "6px", fontWeight: "700" }}>全量系统审计日志</h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>透明化记录系统内所有核心业务操作，确保审计合规与追溯</p>
          </div>
          <button onClick={() => loadLogs({ page: 1 })} style={{ padding: "10px 20px", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "10px", background: "rgba(255,255,255,0.2)", color: "#ffffff", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>
            🔄 刷新日志
          </button>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "#1e293b", fontSize: "20px" }}>操作流水查询</h2>
            <form onSubmit={handleLogsSearch} style={{ display: "flex", gap: "12px" }}>
              <input
                type="text"
                value={logFilters.keyword}
                onChange={(e) => setLogFilters({ ...logFilters, keyword: e.target.value })}
                placeholder="关键字搜索 (详情/操作人)"
                style={inputStyle}
              />
              <select
                  value={logFilters.operationType}
                  onChange={(e) => setLogFilters({ ...logFilters, operationType: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">所有业务类型</option>
                  <option value="LOGIN">系统登录</option>
                  <option value="LOGIN_FAILED">登录失败</option>
                  <option value="REGISTER">用户注册</option>
                  <option value="UPLOAD_CONTRACT">合同上传</option>
                  <option value="APPROVE_CONTRACT">审批通过</option>
                  <option value="REJECT_CONTRACT">审批拒绝</option>
                  <option value="VERIFY_CONTRACT">合同指纹比对</option>
                  <option value="ADMIN_UPDATE_USER">更新用户信息</option>
                  <option value="ADMIN_DELETE_USER">删除用户</option>
                  <option value="ADMIN_TOGGLE_USER_STATUS">账号状态变更</option>
                </select>
              <button type="submit" className="btn-primary" style={{ padding: "8px 24px", borderRadius: "10px", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" }}>筛选</button>
              <button type="button" onClick={handleLogsReset} className="btn-secondary" style={{ padding: "8px 16px", borderRadius: "10px" }}>重置</button>
            </form>
          </div>

          <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid rgba(148,163,184,0.15)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(241, 245, 249, 0.8)" }}>
                  <th style={{ padding: "16px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>操作时间</th>
                  <th style={{ padding: "16px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>操作主体</th>
                  <th style={{ padding: "16px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>操作类型</th>
                  <th style={{ padding: "16px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>详细流水说明</th>
                  <th style={{ padding: "16px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>IP 访问地址</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr><td colSpan="5" style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
                    <div className="loading-spinner">数据同步中...</div>
                  </td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>暂无符合条件的审计记录</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid rgba(148,163,184,0.1)", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(148, 163, 184, 0.05)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "16px", color: "#64748b", fontSize: "13px" }}>{formatDate(log.created_at)}</td>
                      <td style={{ padding: "16px", color: "#1e293b", fontWeight: "600" }}>{log.user_name || "SYSTEM"}</td>
                      <td style={{ padding: "16px" }}>
                        <span style={{ 
                          padding: "6px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "800", letterSpacing: "0.5px",
                          background: log.operation_type.includes('FAIL') || log.operation_type.includes('REJECT') ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: log.operation_type.includes('FAIL') || log.operation_type.includes('REJECT') ? "#f43f5e" : "#10b981",
                          border: `1px solid ${log.operation_type.includes('FAIL') || log.operation_type.includes('REJECT') ? "rgba(244, 63, 94, 0.2)" : "rgba(16, 185, 129, 0.2)"}`
                        }}>
                          {log.operation_type}
                        </span>
                      </td>
                      <td style={{ padding: "16px", color: "#475569", fontSize: "14px" }}>{log.operation_desc}</td>
                      <td style={{ padding: "16px", color: "#64748b", fontFamily: "monospace", fontSize: "12px" }}>{log.ip_address}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#64748b", fontSize: "14px" }}>
              显示第 <span style={{ color: "#1e293b" }}>{(logsPagination.page - 1) * logsPagination.limit + 1}</span> 至 <span style={{ color: "#1e293b" }}>{Math.min(logsPagination.page * logsPagination.limit, logsPagination.total)}</span> 条，共 <span style={{ color: "#1e293b" }}>{logsPagination.total}</span> 条审计记录
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                disabled={logsLoading || logsPagination.page <= 1}
                onClick={() => loadLogs({ page: logsPagination.page - 1 })}
                style={pagerButtonStyle(logsLoading || logsPagination.page <= 1)}
              >
                上一页
              </button>
              <div style={{ display: "flex", gap: "4px" }}>
                {[...Array(logsPagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => loadLogs({ page: i + 1 })}
                    style={{
                      ...pagerButtonStyle(false),
                      background: logsPagination.page === i + 1 ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "rgba(30, 41, 59, 0.8)",
                      border: logsPagination.page === i + 1 ? "none" : "1px solid rgba(148, 163, 184, 0.2)",
                      minWidth: "36px"
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={logsLoading || logsPagination.page >= logsPagination.totalPages}
                onClick={() => loadLogs({ page: logsPagination.page + 1 })}
                style={pagerButtonStyle(logsLoading || logsPagination.page >= logsPagination.totalPages)}
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemLogs;
