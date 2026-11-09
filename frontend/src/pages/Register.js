import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../utils/api";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    phone: "",
    department: "",
    role: "user"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 验证
    if (!formData.username || !formData.password || !formData.confirmPassword) {
      setError("请填写所有必填项");
      return;
    }

    if (formData.username.length < 3) {
      setError("用户名长度至少3个字符");
      return;
    }

    if (formData.password.length < 6) {
      setError("密码长度至少6个字符");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await authAPI.register(
        formData.username,
        formData.password,
        formData.email,
        formData.phone,
        formData.department,
        formData.role
      );

      if (result.success) {
        alert("注册成功！请登录");
        navigate("/login");
      } else {
        setError(result.message || "注册失败");
      }
    } catch (err) {
      console.error("注册错误:", err);
      setError(err.response?.data?.message || "注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🔐 合同存证系统</h1>
        <h2 className="auth-subtitle">注册</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label htmlFor="username">用户名 *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="请输入用户名（至少3个字符）"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">邮箱（可选）</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="请输入邮箱"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">手机号码（可选）</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="请输入手机号码"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="department">所属部门</label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="请输入所属部门"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">系统角色</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="user">普通成员</option>
                <option value="admin">系统管理员</option>
                <option value="auditor">审计员</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="password">密码 *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="请输入密码（至少6个字符）"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">确认密码 *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="请再次输入密码"
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "注册中..." : "注册"}
          </button>
        </form>

        <p className="auth-footer">
          已有账号？ <Link to="/login">立即登录</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;