import React, { useState, useEffect } from "react";
import { adminAPI } from "../utils/api";
import AdminNavbar from "../components/AdminNavbar";

function RatingList() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const loadRatings = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminAPI.getAllRatings();
      if (result.success) {
        setRatings(result.data);
      }
    } catch (err) {
      console.error("获取评分列表失败:", err);
      setError(err.response?.data?.message || "获取评分列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRatings();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getRatingColor = (score) => {
    if (score >= 4.5) return "#52c41a";
    if (score >= 3.5) return "#1890ff";
    if (score >= 2.5) return "#faad14";
    return "#ff4d4f";
  };

  const getRatingBgColor = (score) => {
    if (score >= 4.5) return "#f6ffed";
    if (score >= 3.5) return "#e6f7ff";
    if (score >= 2.5) return "#fffbe6";
    return "#fff2f0";
  };

  const filteredRatings = ratings.filter((rating) =>
    rating.company_name?.toLowerCase().includes(searchKeyword.trim().toLowerCase())
  );

  const topLevelCount = ratings.filter((item) => Number(item.rating_score) >= 4.5).length;
  const averageScore = ratings.length
    ? (
        ratings.reduce((sum, item) => sum + Number(item.rating_score || 0), 0) /
        ratings.length
      ).toFixed(2)
    : "0.00";

  const handleResetFilters = () => {
    setSearchKeyword("");
  };

  const pageStyle = { padding: "24px", background: "#f8fafc", minHeight: "calc(100vh - 60px)" };
  const panelStyle = { background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px 22px" };
  const heroStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
    marginBottom: "16px"
  };
  const metricGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
    marginBottom: "16px"
  };
  const metricCardStyle = {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "12px 14px"
  };
  const metricLabelStyle = { color: "#64748b", fontSize: "13px", marginBottom: "8px" };
  const filterBarStyle = { marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" };
  const inputStyle = {
    width: "260px",
    padding: "8px 12px",
    border: "1px solid #d0d8e5",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#0f172a"
  };
  const buttonBaseStyle = {
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s ease"
  };
  const heroButtonStyle = {
    ...buttonBaseStyle,
    border: "1px solid rgba(255,255,255,0.3)",
    background: "rgba(255,255,255,0.2)",
    color: "#ffffff"
  };
  const ghostButtonStyle = {
    ...buttonBaseStyle,
    border: "1px solid #d0d8e5",
    background: "#fff",
    color: "#334155"
  };
  const tableContainerStyle = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px" };
  const tableHeadCellStyle = {
    padding: "12px 16px",
    textAlign: "left",
    borderBottom: "1px solid #e8eef7",
    fontWeight: "600",
    color: "#334155",
    fontSize: "13px",
    whiteSpace: "nowrap"
  };
  const tableCellStyle = { padding: "12px 16px", fontSize: "13px", color: "#334155" };

  return (
    <>
      <AdminNavbar />
      <div style={pageStyle}>
        <div style={panelStyle}>
          <div style={heroStyle}>
            <div>
              <h1 style={{ fontSize: "24px", margin: 0, color: "#ffffff", fontWeight: "700" }}>评分列表中心</h1>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", marginTop: "4px" }}>企业评分趋势与排名总览</p>
            </div>
            <button onClick={loadRatings} style={heroButtonStyle}>
              刷新数据
            </button>
          </div>

          <div style={metricGridStyle}>
            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>企业总数</div>
              <div style={{ color: "#0f172a", fontSize: "24px", fontWeight: "700" }}>{ratings.length}</div>
            </div>
            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>平均评分</div>
              <div style={{ color: "#16a34a", fontSize: "24px", fontWeight: "700" }}>{averageScore}</div>
            </div>
            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>优秀企业</div>
              <div style={{ color: "#2563eb", fontSize: "24px", fontWeight: "700" }}>{topLevelCount}</div>
            </div>
          </div>

          <div style={filterBarStyle}>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索企业名称"
              style={inputStyle}
            />
            <button type="button" onClick={handleResetFilters} style={ghostButtonStyle}>
              重置
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="page-container">
              <div className="loading">Loading...</div>
            </div>
          ) : filteredRatings.length === 0 ? (
            <div className="empty-state">
              <p>暂无匹配评分数据</p>
            </div>
          ) : (
            <div style={tableContainerStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={tableHeadCellStyle}>排名</th>
                    <th style={tableHeadCellStyle}>企业名称</th>
                    <th style={tableHeadCellStyle}>评分等级</th>
                    <th style={tableHeadCellStyle}>评分分数</th>
                    <th style={tableHeadCellStyle}>合同数量</th>
                    <th style={tableHeadCellStyle}>合同总额</th>
                    <th style={tableHeadCellStyle}>最后合同日期</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRatings.map((rating, index) => (
                    <tr key={rating.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={tableCellStyle}>
                        <span style={{ 
                          display: "inline-flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background: index < 3 ? "#ff4d4f" : "#f0f0f0",
                          color: index < 3 ? "#fff" : "#666",
                          fontSize: index < 3 ? "14px" : "12px",
                          fontWeight: index < 3 ? "600" : "400"
                        }}>
                          {index + 1}
                        </span>
                      </td>
                      <td style={{ ...tableCellStyle, fontWeight: "500", color: "#0f172a" }}>{rating.company_name}</td>
                      <td style={tableCellStyle}>
                        <span style={{ 
                          display: "inline-block", 
                          padding: "4px 12px", 
                          borderRadius: "12px", 
                          background: getRatingBgColor(rating.rating_score),
                          color: getRatingColor(rating.rating_score),
                          fontSize: "12px",
                          fontWeight: "500"
                        }}>
                          {rating.rating_level}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ 
                          fontSize: "20px", 
                          fontWeight: "600", 
                          color: getRatingColor(rating.rating_score)
                        }}>
                          {rating.rating_score}
                        </span>
                      </td>
                      <td style={{ ...tableCellStyle, color: "#475569" }}>{rating.contract_count}</td>
                      <td style={{ ...tableCellStyle, color: "#475569" }}>
                        ¥{rating.total_amount?.toLocaleString() || 0}
                      </td>
                      <td style={{ ...tableCellStyle, color: "#64748b" }}>
                        {formatDate(rating.last_contract_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default RatingList;
