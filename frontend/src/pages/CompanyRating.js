import React, { useState, useEffect } from "react";
import { adminAPI } from "../utils/api";
import AdminNavbar from "../components/AdminNavbar";

function CompanyRating() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedRatingIds, setSelectedRatingIds] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRating, setEditingRating] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    company_name: "",
    rating_score: "",
    contract_count: "",
    total_amount: ""
  });
  const [editForm, setEditForm] = useState({
    company_name: "",
    rating_score: "",
    contract_count: "",
    total_amount: ""
  });

  const loadRatings = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminAPI.getAllRatings();
      if (result.success) {
        setRatings(result.data);
        setSelectedRatingIds([]);
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

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const ratingScore = Number(addForm.rating_score);
    const contractCount = Number(addForm.contract_count) || 0;
    const totalAmount = Number(addForm.total_amount) || 0;

    if (!addForm.company_name.trim()) {
      alert("请输入企业名称");
      setSubmitting(false);
      return;
    }

    if (!Number.isFinite(ratingScore) || ratingScore < 0 || ratingScore > 5) {
      alert("评分分数必须在 0-5 之间");
      setSubmitting(false);
      return;
    }

    try {
      const result = await adminAPI.createRating({
        company_name: addForm.company_name.trim(),
        rating_score: ratingScore,
        contract_count: contractCount,
        total_amount: totalAmount
      });

      if (!result.success) {
        alert(result.message || "创建评分失败");
        return;
      }

      alert("企业评分创建成功！");
      setShowAddModal(false);
      setAddForm({ company_name: "", rating_score: "", contract_count: "", total_amount: "" });
      loadRatings();
    } catch (err) {
      console.error("创建评分失败:", err);
      alert(err.response?.data?.message || "创建评分失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (rating) => {
    setEditingRating(rating);
    setEditForm({
      company_name: rating.company_name || "",
      rating_score: String(rating.rating_score ?? ""),
      contract_count: String(rating.contract_count ?? ""),
      total_amount: String(rating.total_amount ?? "")
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const ratingScore = Number(editForm.rating_score);
    const contractCount = Number(editForm.contract_count) || 0;
    const totalAmount = Number(editForm.total_amount) || 0;

    if (!editForm.company_name.trim()) {
      alert("请输入企业名称");
      setSubmitting(false);
      return;
    }

    if (!Number.isFinite(ratingScore) || ratingScore < 0 || ratingScore > 5) {
      alert("评分分数必须在 0-5 之间");
      setSubmitting(false);
      return;
    }

    try {
      const result = await adminAPI.updateRating(editingRating.id, {
        company_name: editForm.company_name.trim(),
        rating_score: ratingScore,
        contract_count: contractCount,
        total_amount: totalAmount
      });

      if (!result.success) {
        alert(result.message || "更新评分失败");
        return;
      }

      alert("企业评分更新成功！");
      setEditingRating(null);
      loadRatings();
    } catch (err) {
      console.error("更新评分失败:", err);
      alert(err.response?.data?.message || "更新评分失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRating = async (ratingId) => {
    if (!window.confirm("确定要删除这条企业评分吗？")) {
      return;
    }

    try {
      const result = await adminAPI.deleteRating(ratingId);
      if (!result.success) {
        alert(result.message || "删除评分失败");
        return;
      }
      alert("企业评分删除成功！");
      loadRatings();
    } catch (err) {
      console.error("删除评分失败:", err);
      alert(err.response?.data?.message || "删除评分失败");
    }
  };

  const handleToggleSelect = (ratingId) => {
    setSelectedRatingIds((prev) => {
      if (prev.includes(ratingId)) {
        return prev.filter((id) => id !== ratingId);
      }
      return [...prev, ratingId];
    });
  };

  const handleToggleSelectAll = (checked, data) => {
    if (checked) {
      setSelectedRatingIds(data.map((item) => item.id));
      return;
    }
    setSelectedRatingIds([]);
  };

  const handleBatchDelete = async () => {
    if (selectedRatingIds.length === 0) {
      alert("请先选择要删除的评分");
      return;
    }

    if (!window.confirm(`确定要批量删除 ${selectedRatingIds.length} 条评分记录吗？`)) {
      return;
    }

    try {
      const result = await adminAPI.batchDeleteRatings(selectedRatingIds);
      if (!result.success) {
        alert(result.message || "批量删除失败");
        return;
      }
      alert("批量删除成功！");
      loadRatings();
    } catch (err) {
      console.error("批量删除评分失败:", err);
      alert(err.response?.data?.message || "批量删除评分失败");
    }
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
  const averageScore = ratings.length
    ? (
        ratings.reduce((sum, item) => sum + Number(item.rating_score || 0), 0) /
        ratings.length
      ).toFixed(2)
    : "0.00";
  const excellentCount = ratings.filter((item) => Number(item.rating_score) >= 4.5).length;
  const allFilteredSelected =
    filteredRatings.length > 0 &&
    filteredRatings.every((item) => selectedRatingIds.includes(item.id));

  const handleResetFilters = () => {
    setSearchKeyword("");
    setSelectedRatingIds([]);
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
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
  const buttonBaseStyle = {
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s ease"
  };
  const primaryButtonStyle = {
    ...buttonBaseStyle,
    background: "#2563eb",
    color: "#ffffff",
    border: "1px solid #3b82f6",
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.2)"
  };
  const ghostButtonStyle = {
    ...buttonBaseStyle,
    border: "1px solid #d0d8e5",
    background: "#fff",
    color: "#334155"
  };
  const batchDeleteButtonStyle = {
    ...buttonBaseStyle,
    background: selectedRatingIds.length === 0 ? "#cbd5e1" : "#dc2626",
    color: selectedRatingIds.length === 0 ? "#64748b" : "#ffffff",
    border: "none",
    cursor: selectedRatingIds.length === 0 ? "not-allowed" : "pointer"
  };
  const filterWrapStyle = {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginBottom: "16px",
    padding: "12px",
    borderRadius: "10px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0"
  };
  const inputStyle = {
    padding: "8px 12px",
    border: "1px solid #d0d8e5",
    borderRadius: "8px",
    minWidth: "220px",
    fontSize: "13px",
    color: "#0f172a"
  };
  const ratingCardGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" };
  const cardButtonBaseStyle = {
    border: "none",
    borderRadius: "8px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer"
  };

  return (
    <>
      <AdminNavbar />
      <div style={pageStyle}>
        <div style={panelStyle}>
          <div style={heroStyle}>
            <div>
              <h1 style={{ fontSize: "24px", margin: 0, color: "#ffffff", fontWeight: "700" }}>企业评分中心</h1>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", marginTop: "4px" }}>企业合作评级、趋势判断与风险识别</p>
            </div>
            <button onClick={() => setShowAddModal(true)} style={primaryButtonStyle}>
              添加企业评分
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
              <div style={{ color: "#2563eb", fontSize: "24px", fontWeight: "700" }}>{excellentCount}</div>
            </div>
          </div>

          <div style={filterWrapStyle}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
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
              <button type="button" onClick={loadRatings} style={ghostButtonStyle}>
                刷新
              </button>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "13px" }}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={(e) => handleToggleSelectAll(e.target.checked, filteredRatings)}
                />
                全选当前结果
              </label>
              <button
                onClick={handleBatchDelete}
                disabled={selectedRatingIds.length === 0}
                style={batchDeleteButtonStyle}
              >
                批量删除（{selectedRatingIds.length}）
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {/* 评分卡片展示 */}
          {loading ? (
            <div className="page-container">
              <div className="loading">Loading...</div>
            </div>
          ) : filteredRatings.length === 0 ? (
            <div className="empty-state">
              <p>暂无匹配的企业评分数据</p>
            </div>
          ) : (
            <div style={ratingCardGridStyle}>
              {filteredRatings.map((rating, index) => (
                <div
                  key={rating.id} 
                  style={{ 
                    background: "#fff", 
                    borderRadius: "12px", 
                    padding: "18px 18px 16px",
                    border: selectedRatingIds.includes(rating.id) ? "1px solid #60a5fa" : "1px solid #e8e8e8",
                    boxShadow: selectedRatingIds.includes(rating.id) ? "0 10px 24px rgba(37, 99, 235, 0.12)" : "0 6px 16px rgba(15, 23, 42, 0.08)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "600", marginBottom: "8px", color: "#0f172a" }}>
                        {rating.company_name}
                      </div>
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
                    </div>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: index < 3 ? "#fff7e6" : "#fafafa",
                      border: index < 3 ? "2px solid #faad14" : "2px solid #e8e8e8"
                    }}>
                      <span style={{ 
                        fontSize: index < 3 ? "22px" : "18px", 
                        fontWeight: "700", 
                        color: index < 3 ? "#faad14" : "#666"
                      }}>
                        {index + 1}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginBottom: "12px", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#475569" }}>
                      <input
                        type="checkbox"
                        checked={selectedRatingIds.includes(rating.id)}
                        onChange={() => handleToggleSelect(rating.id)}
                      />
                      选择
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleEditClick(rating)}
                      style={{
                        ...cardButtonBaseStyle,
                        background: "#e0f2fe",
                        color: "#0369a1"
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteRating(rating.id)}
                      style={{
                        ...cardButtonBaseStyle,
                        background: "#fee2e2",
                        color: "#b91c1c"
                      }}
                    >
                      删除
                    </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "40px", fontWeight: "700", color: getRatingColor(rating.rating_score), lineHeight: "1" }}>
                      {rating.rating_score}
                    </div>
                    <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>综合评分</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px dashed #f0f0f0" }}>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>合同数量</span>
                      <span style={{ fontSize: "16px", fontWeight: "600", color: "#334155" }}>
                        {rating.contract_count} 份
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px dashed #f0f0f0" }}>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>合同总额</span>
                      <span style={{ fontSize: "16px", fontWeight: "600", color: "#334155" }}>
                        ¥{rating.total_amount?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>最后合作</span>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>
                        {rating.last_contract_date ? new Date(rating.last_contract_date).toLocaleDateString() : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 添加评分弹窗 */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            backdropFilter: "blur(2px)"
          }}
          onClick={() => {
            if (!submitting) {
              setShowAddModal(false);
            }
          }}
        >
          <div
            style={{
              width: "440px",
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 22px 48px rgba(15, 23, 42, 0.26)",
              padding: "22px 22px 18px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "16px", color: "#0f172a", fontSize: "20px" }}>添加企业评分</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>企业名称 *</label>
                <input
                  type="text"
                  value={addForm.company_name}
                  onChange={(e) => setAddForm({ ...addForm, company_name: e.target.value })}
                  placeholder="请输入企业名称"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>评分分数 (0-5) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={addForm.rating_score}
                  onChange={(e) => setAddForm({ ...addForm, rating_score: e.target.value })}
                  placeholder="请输入评分分数"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>合同数量</label>
                <input
                  type="number"
                  min="0"
                  value={addForm.contract_count}
                  onChange={(e) => setAddForm({ ...addForm, contract_count: e.target.value })}
                  placeholder="请输入合同数量"
                />
              </div>
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label>合同总额</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.total_amount}
                  onChange={(e) => setAddForm({ ...addForm, total_amount: e.target.value })}
                  placeholder="请输入合同总额"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "提交中..." : "添加"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingRating && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            backdropFilter: "blur(2px)"
          }}
          onClick={() => {
            if (!submitting) {
              setEditingRating(null);
            }
          }}
        >
          <div
            style={{
              width: "440px",
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 22px 48px rgba(15, 23, 42, 0.26)",
              padding: "22px 22px 18px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "16px", color: "#0f172a", fontSize: "20px" }}>编辑企业评分</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>企业名称 *</label>
                <input
                  type="text"
                  value={editForm.company_name}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  placeholder="请输入企业名称"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>评分分数 (0-5) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={editForm.rating_score}
                  onChange={(e) => setEditForm({ ...editForm, rating_score: e.target.value })}
                  placeholder="请输入评分分数"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>合同数量</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.contract_count}
                  onChange={(e) => setEditForm({ ...editForm, contract_count: e.target.value })}
                  placeholder="请输入合同数量"
                />
              </div>
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label>合同总额</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.total_amount}
                  onChange={(e) => setEditForm({ ...editForm, total_amount: e.target.value })}
                  placeholder="请输入合同总额"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "提交中..." : "保存"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRating(null)}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default CompanyRating;
