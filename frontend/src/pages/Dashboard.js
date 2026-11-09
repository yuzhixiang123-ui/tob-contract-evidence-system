import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { adminAPI } from "../utils/api";
import AdminNavbar from "../components/AdminNavbar";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    loadStats();
  }, []);

  const isAuditor = currentUser?.role === "auditor";

  const formatAmount = (value) => {
    const amount = Number(value || 0);
    return `¥ ${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const result = await adminAPI.getDashboardStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error("加载统计数据失败:", err);
      setError("加载统计数据失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 1. 合同状态分布 - 饼图配置
  const getStatusPieOption = () => {
    if (!stats) return {};
    const data = stats.statusDistribution.map(item => ({
      name: item.status === 'approved' ? '已通过' : item.status === 'pending' ? '待审批' : '已拒绝',
      value: item.count
    }));

    return {
      title: { text: '合同状态分布', left: 'center', textStyle: { color: '#1e293b' } },
      tooltip: { trigger: 'item' },
      legend: { bottom: '5%', left: 'center', textStyle: { color: "#64748b" } },
      series: [
        {
          name: '合同数量',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: "#ffffff", borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold', color: '#1e293b' } },
          labelLine: { show: false },
          data: data,
          color: ['#10b981', '#f59e0b', '#f43f5e']
        }
      ]
    };
  };

  // 2. 合同月度趋势 - 折线图配置
  const getTrendLineOption = () => {
    if (!stats) return {};
    return {
      title: { text: '近6个月合同存证趋势', left: 'center', textStyle: { color: '#1e293b' } },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: stats.monthlyTrend.map(item => item.month),
        axisLabel: { color: "#64748b" }
      },
      yAxis: { type: 'value', axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } } },
      series: [
        {
          name: '总合同数',
          data: stats.monthlyTrend.map(item => item.count),
          type: 'line',
          smooth: true,
          areaStyle: { opacity: 0.3 },
          color: '#38bdf8'
        },
        {
          name: '已审批数',
          data: stats.monthlyTrend.map(item => item.approved_count),
          type: 'line',
          smooth: true,
          color: '#10b981'
        }
      ]
    };
  };

  const getAmountTrendOption = () => {
    if (!stats) return {};
    return {
      title: { text: '近6个月合同金额趋势', left: 'center', textStyle: { color: '#1e293b' } },
      tooltip: { trigger: 'axis' },
      legend: { top: '8%', textStyle: { color: "#64748b" } },
      xAxis: {
        type: 'category',
        data: stats.monthlyAmountTrend.map(item => item.month),
        axisLabel: { color: "#64748b" }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: "#64748b",
          formatter: (value) => `${(Number(value) / 10000).toFixed(1)}w`
        },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } }
      },
      series: [
        {
          name: '合同总金额',
          data: stats.monthlyAmountTrend.map(item => item.amount),
          type: 'bar',
          itemStyle: { color: '#22c55e', borderRadius: [6, 6, 0, 0] }
        },
        {
          name: '已审批金额',
          data: stats.monthlyAmountTrend.map(item => item.approved_amount),
          type: 'line',
          smooth: true,
          color: '#38bdf8'
        }
      ]
    };
  };

  const getExpiryOverviewOption = () => {
    if (!stats) return {};
    const overview = stats.expiryOverview || {};
    return {
      title: { text: '到期提醒分布', left: 'center', textStyle: { color: '#1e293b' } },
      tooltip: { trigger: 'item' },
      legend: { bottom: '4%', left: 'center', textStyle: { color: "#64748b" } },
      series: [
        {
          type: 'pie',
          radius: ['36%', '68%'],
          itemStyle: { borderRadius: 8, borderColor: "#ffffff", borderWidth: 2 },
          label: { color: '#334155', formatter: '{b}\n{c}' },
          data: [
            { name: '未设置到期', value: overview.no_expiry_count || 0 },
            { name: '已过期', value: overview.expired_count || 0 },
            { name: '7天内到期', value: overview.expiring_soon_count || 0 },
            { name: '正常', value: overview.normal_count || 0 }
          ],
          color: ['#94a3b8', '#f43f5e', '#f59e0b', '#10b981']
        }
      ]
    };
  };

  const getPartnerRankOption = () => {
    if (!stats) return {};
    const rows = [...(stats.partnerAmountRank || [])].reverse();
    return {
      title: { text: '合作方金额排行', left: 'center', textStyle: { color: '#1e293b' } },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const item = params?.[0];
          if (!item) return '';
          const source = rows[item.dataIndex];
          return `${source.partner_name}<br/>合同数：${source.contract_count}<br/>总金额：${formatAmount(source.total_amount)}`;
        }
      },
      grid: { left: '22%', right: '8%', top: '18%', bottom: '8%' },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: "#64748b",
          formatter: (value) => `${(Number(value) / 10000).toFixed(1)}w`
        },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } }
      },
      yAxis: {
        type: 'category',
        data: rows.map(item => item.partner_name),
        axisLabel: { color: '#475569' }
      },
      series: [
        {
          data: rows.map(item => Number(item.total_amount || 0)),
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
              { offset: 0, color: '#2563eb' },
              { offset: 1, color: '#38bdf8' }
            ]),
            borderRadius: [0, 8, 8, 0]
          }
        }
      ]
    };
  };

  const getLogBarOption = () => {
    if (!stats) return {};
    const typeMap = {
      'LOGIN': '登录',
      'UPLOAD_CONTRACT': '上传',
      'APPROVE_CONTRACT': '审批',
      'VERIFY_CONTRACT': '校验'
    };
    
    // 如果不是审计员，过滤掉校验类型的日志统计
    const filteredData = isAuditor 
      ? stats.logTypeDistribution 
      : stats.logTypeDistribution.filter(item => item.operation_type !== 'VERIFY_CONTRACT');

    return {
      title: { text: '核心业务操作分布', left: 'center', textStyle: { color: '#1e293b' } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'category',
        data: filteredData.map(item => typeMap[item.operation_type] || item.operation_type),
        axisLabel: { color: "#64748b" }
      },
      yAxis: { type: 'value', axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } } },
      series: [
        {
          data: filteredData.map(item => item.count),
          type: 'bar',
          showBackground: true,
          backgroundStyle: { color: 'rgba(180, 180, 180, 0.1)' },
          itemStyle: { color: '#6366f1', borderRadius: [5, 5, 0, 0] }
        }
      ]
    };
  };

  // 企业级样式配置
  const pageBackgroundStyle = {
    minHeight: "100vh",
    width: "100%",
    background: "#f8fafc",
    position: "relative",
    overflowX: "hidden"
  };

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)"
  };

  const summaryCards = stats ? [
    {
      title: "总存证合同数",
      value: stats.summary.total_contracts,
      desc: "系统累计创建合同总量",
      color: "#38bdf8"
    },
    {
      title: "区块链已确认",
      value: stats.summary.on_chain_count,
      desc: "已在以太坊网络完成存证",
      color: "#10b981"
    },
    {
      title: "合同总金额",
      value: formatAmount(stats.summary.total_amount),
      desc: "累计合同金额汇总",
      color: "#f59e0b"
    },
    {
      title: "平均合同金额",
      value: formatAmount(stats.summary.avg_amount),
      desc: "按有金额合同计算平均值",
      color: "#c084fc"
    },
    {
      title: "归档合同数",
      value: stats.summary.archived_count,
      desc: "已进入归档状态的合同",
      color: "#818cf8"
    },
    {
      title: "7天内到期",
      value: stats.summary.expiring_soon_count,
      desc: "需要尽快处理的合同提醒",
      color: "#fb923c"
    },
    {
      title: "已过期合同",
      value: stats.summary.expired_count,
      desc: "已超过约定到期时间",
      color: "#f43f5e"
    },
    ...(isAuditor ? [{
      title: "存证校验成功",
      value: stats.summary.verify_success_count,
      desc: "通过链上指纹比对验证成功",
      color: "#facc15"
    }] : [])
  ] : [];

  return (
    <div style={pageBackgroundStyle}>
      <AdminNavbar />
      <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "28px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: "24px", padding: "24px 28px", borderRadius: "14px", background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "28px", color: "#ffffff", marginBottom: "6px", fontWeight: "700" }}>数据监控仪表盘</h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>全量存证数据实时可视化监控</p>
          </div>
          <button onClick={loadStats} style={{ padding: "10px 20px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "10px", color: "#ffffff", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
            🔄 刷新看板
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: "#64748b", marginTop: '100px' }}>正在加载实时统计数据...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: '#f43f5e', marginTop: '100px' }}>{error}</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "24px" }}>
              {summaryCards.map((item) => (
                <div key={item.title} style={cardStyle}>
                  <div style={{ color: "#64748b", fontSize: "14px", marginBottom: "10px" }}>{item.title}</div>
                  <div style={{ fontSize: "32px", fontWeight: "800", color: item.color, lineHeight: 1.25 }}>{item.value}</div>
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
              <div style={cardStyle}>
                <ReactECharts option={getStatusPieOption()} style={{ height: '350px' }} />
              </div>
              <div style={cardStyle}>
                <ReactECharts option={getLogBarOption()} style={{ height: '350px' }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "24px", marginBottom: "24px" }}>
              <div style={cardStyle}>
                <ReactECharts option={getTrendLineOption()} style={{ height: '400px' }} />
              </div>
              <div style={cardStyle}>
                <ReactECharts option={getExpiryOverviewOption()} style={{ height: '400px' }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div style={cardStyle}>
                <ReactECharts option={getAmountTrendOption()} style={{ height: '400px' }} />
              </div>
              <div style={cardStyle}>
                <ReactECharts option={getPartnerRankOption()} style={{ height: '400px' }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
