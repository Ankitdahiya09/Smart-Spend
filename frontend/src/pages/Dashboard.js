import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import {
  Camera, TrendingUp, IndianRupee, Receipt, LogOut,
  Upload, Moon, Sun, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, BarChart2, PieChartIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORY_COLORS = {
  Food: '#10B981',
  Shopping: '#F97316',
  Transportation: '#3B82F6',
  Entertainment: '#8B5CF6',
  Healthcare: '#EC4899',
  Utilities: '#F59E0B',
  Other: '#6B7280',
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// ── Rupee formatter ──────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

// ── Custom Tooltip ───────────────────────────────────────────────
const RupeeTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      {label && <p className="font-semibold mb-1 text-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-medium">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────
function groupByMonthAndCategory(expenses) {
  // Returns: { 'Jan 2025': { Food: 3000, Shopping: 1200, ... }, ... }
  const result = {};
  expenses.forEach((exp) => {
    const d = new Date(exp.date);
    if (isNaN(d)) return;
    const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    if (!result[key]) result[key] = {};
    result[key][exp.category] = (result[key][exp.category] || 0) + exp.amount;
  });
  return result;
}

function getMonthlyTotals(expenses) {
  const result = {};
  expenses.forEach((exp) => {
    const d = new Date(exp.date);
    if (isNaN(d)) return;
    const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    result[key] = (result[key] || 0) + exp.amount;
  });
  // Sort chronologically
  return Object.entries(result)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => {
      const parse = (s) => {
        const [m, y] = s.split(' ');
        return new Date(`${m} 1, ${y}`);
      };
      return parse(a.month) - parse(b.month);
    });
}

function buildComparisonData(expenses, categories) {
  // For each category, show spending per month → used for grouped bar chart
  const byMonthCat = groupByMonthAndCategory(expenses);
  const months = Object.keys(byMonthCat).sort((a, b) => {
    const parse = (s) => { const [m, y] = s.split(' '); return new Date(`${m} 1, ${y}`); };
    return parse(a) - parse(b);
  });
  return months.map((month) => {
    const row = { month };
    categories.forEach((cat) => {
      row[cat] = byMonthCat[month][cat] || 0;
    });
    return row;
  });
}

// ── Main Component ───────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | monthly | compare
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
  const [compareMode, setCompareMode] = useState('bar'); // bar | line

  // ── fetch all expenses ────────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllExpenses(res.data || []);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchExpenses();
  }, [user, navigate, fetchExpenses]);

  // ── derived data ──────────────────────────────────────────────
  const totalSpent = allExpenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = allExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const categoryPie = Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  const allCategories = Object.keys(byCategory);

  const monthlyTotals = getMonthlyTotals(allExpenses);
  const byMonthCat = groupByMonthAndCategory(allExpenses);
  const sortedMonths = Object.keys(byMonthCat).sort((a, b) => {
    const parse = (s) => { const [m, y] = s.split(' '); return new Date(`${m} 1, ${y}`); };
    return parse(b) - parse(a); // newest first for the monthly selector
  });

  const selectedMonth = sortedMonths[selectedMonthIdx];
  const selectedMonthData = selectedMonth
    ? Object.entries(byMonthCat[selectedMonth] || {}).map(([name, value]) => ({ name, value }))
    : [];
  const selectedMonthTotal = selectedMonthData.reduce((s, i) => s + i.value, 0);

  // month-over-month delta
  const prevMonth = sortedMonths[selectedMonthIdx + 1];
  const prevMonthTotal = prevMonth
    ? Object.values(byMonthCat[prevMonth] || {}).reduce((s, v) => s + v, 0)
    : null;
  const delta = prevMonthTotal !== null ? selectedMonthTotal - prevMonthTotal : null;

  const comparisonData = buildComparisonData(allExpenses, allCategories);
  const recentExpenses = [...allExpenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  // ── upload handler ────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        await axios.post(
          `${API}/receipts/upload`,
          { image_base64: base64 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Receipt processed successfully!');
        fetchExpenses();
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to process receipt');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = () => { logout(); navigate('/'); };

  // ── loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background" data-testid="dashboard">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xl font-heading font-bold">SmartSpend</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                Hello, {user?.name}
              </span>
              <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="theme-toggle">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Upload Banner ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-7 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-heading font-bold mb-1">Scan a Receipt</h2>
                <p className="text-emerald-100 text-sm">Upload a photo — AI extracts everything for you</p>
              </div>
              <div>
                <input
                  type="file" accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden" id="receipt-upload"
                  disabled={uploading}
                  data-testid="receipt-upload-input"
                />
                <label htmlFor="receipt-upload">
                  <Button
                    asChild size="lg"
                    className="bg-white text-emerald-600 hover:bg-emerald-50 rounded-full cursor-pointer"
                    disabled={uploading}
                    data-testid="upload-receipt-btn"
                  >
                    <span>
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2" />
                          Processing…
                        </>
                      ) : (
                        <><Camera className="mr-2 h-5 w-5" />Upload Receipt</>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              label: 'Total Spent', value: fmt(totalSpent),
              icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10',
              testid: 'total-expenses-card'
            },
            {
              label: 'Categories Used', value: allCategories.length,
              icon: PieChartIcon, color: 'text-orange-500', bg: 'bg-orange-500/10',
              testid: 'categories-card'
            },
            {
              label: 'Receipts Scanned', value: allExpenses.length,
              icon: Receipt, color: 'text-violet-500', bg: 'bg-violet-500/10',
              testid: 'receipts-card'
            },
          ].map(({ label, value, icon: Icon, color, bg, testid }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (i + 1) }}
              className="bg-card border border-border rounded-xl p-6 shadow-sm"
              data-testid={testid}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{label}</p>
                  <p className="text-3xl font-heading font-bold">{value}</p>
                </div>
                <div className={`w-12 h-12 ${bg} rounded-full flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-2 border-b border-border pb-0">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'monthly', label: 'Monthly Breakdown' },
            { key: 'compare', label: 'Month Comparison' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                activeTab === key
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`tab-${key}`}
            >
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ══════════════════════════════════════════════
              TAB: OVERVIEW
          ══════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm" data-testid="category-chart">
                  <h3 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                    Spending by Category
                  </h3>
                  {categoryPie.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={categoryPie} cx="50%" cy="50%"
                          outerRadius={90} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {categoryPie.map((entry) => (
                            <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6B7280'} />
                          ))}
                        </Pie>
                        <Tooltip content={<RupeeTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="No data yet — upload your first receipt!" />
                  )}
                </div>

                {/* Monthly totals bar */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm" data-testid="monthly-totals-chart">
                  <h3 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-muted-foreground" />
                    Monthly Totals
                  </h3>
                  {monthlyTotals.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={monthlyTotals}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                        <Tooltip content={<RupeeTooltip />} />
                        <Bar dataKey="total" name="Total" fill="#10B981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="No monthly data yet" />
                  )}
                </div>
              </div>

              {/* Recent Expenses */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm" data-testid="recent-expenses">
                <h3 className="text-lg font-heading font-semibold mb-4">Recent Expenses</h3>
                {recentExpenses.length > 0 ? (
                  <div className="space-y-3">
                    {recentExpenses.map((exp, idx) => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                        data-testid={`expense-row-${idx}`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: CATEGORY_COLORS[exp.category] || '#6B7280' }}
                          >
                            {exp.category.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{exp.store_name}</p>
                            <p className="text-xs text-muted-foreground">{exp.category} · {exp.date}</p>
                          </div>
                        </div>
                        <p className="text-base font-semibold font-heading">{fmt(exp.amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<Upload className="h-10 w-10 opacity-40 mx-auto mb-3" />} text="No expenses yet. Upload a receipt to get started!" />
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════
              TAB: MONTHLY BREAKDOWN
          ══════════════════════════════════════════════ */}
          {activeTab === 'monthly' && (
            <motion.div
              key="monthly"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {sortedMonths.length === 0 ? (
                <EmptyState text="No monthly data yet — upload receipts first!" />
              ) : (
                <>
                  {/* Month Selector */}
                  <div className="flex items-center justify-between bg-card border border-border rounded-xl px-6 py-4">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => setSelectedMonthIdx((p) => Math.min(p + 1, sortedMonths.length - 1))}
                      disabled={selectedMonthIdx >= sortedMonths.length - 1}
                      data-testid="prev-month-btn"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="text-center">
                      <p className="text-2xl font-heading font-bold">{selectedMonth}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Monthly Breakdown</p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => setSelectedMonthIdx((p) => Math.max(p - 1, 0))}
                      disabled={selectedMonthIdx <= 0}
                      data-testid="next-month-btn"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Month KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="bg-card border border-border rounded-xl p-6">
                      <p className="text-sm text-muted-foreground mb-1">Total Spent in {selectedMonth}</p>
                      <p className="text-4xl font-heading font-bold text-primary">{fmt(selectedMonthTotal)}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6">
                      <p className="text-sm text-muted-foreground mb-1">vs Previous Month</p>
                      {delta !== null ? (
                        <div className="flex items-center gap-2">
                          {delta >= 0
                            ? <ArrowUpRight className="h-6 w-6 text-red-500" />
                            : <ArrowDownRight className="h-6 w-6 text-emerald-500" />}
                          <p className={`text-4xl font-heading font-bold ${delta >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {delta >= 0 ? '+' : ''}{fmt(delta)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-2xl font-heading text-muted-foreground">No prior month</p>
                      )}
                    </div>
                  </div>

                  {/* Category cards for selected month */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedMonthData
                      .sort((a, b) => b.value - a.value)
                      .map((item) => {
                        const pct = selectedMonthTotal > 0
                          ? ((item.value / selectedMonthTotal) * 100).toFixed(1)
                          : 0;
                        return (
                          <motion.div
                            key={item.name}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-card border border-border rounded-xl p-5 shadow-sm"
                            data-testid={`monthly-category-${item.name}`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ background: CATEGORY_COLORS[item.name] || '#6B7280' }}
                                />
                                <span className="font-medium text-sm">{item.name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                            </div>
                            <p className="text-2xl font-heading font-bold">{fmt(item.value)}</p>
                            {/* progress bar */}
                            <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  background: CATEGORY_COLORS[item.name] || '#6B7280'
                                }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>

                  {/* Horizontal bar chart */}
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-heading font-semibold mb-4">Category Distribution — {selectedMonth}</h3>
                    <ResponsiveContainer width="100%" height={Math.max(200, selectedMonthData.length * 48)}>
                      <BarChart
                        layout="vertical"
                        data={[...selectedMonthData].sort((a, b) => b.value - a.value)}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                        <Tooltip content={<RupeeTooltip />} />
                        <Bar dataKey="value" name="Amount" radius={[0, 6, 6, 0]}>
                          {selectedMonthData.map((entry) => (
                            <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6B7280'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════
              TAB: MONTH COMPARISON
          ══════════════════════════════════════════════ */}
          {activeTab === 'compare' && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {comparisonData.length === 0 ? (
                <EmptyState text="Not enough data for comparison — upload receipts from multiple months!" />
              ) : (
                <>
                  {/* Chart type toggle */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-heading font-semibold">Category Spending — Month over Month</h3>
                    <div className="flex gap-2">
                      {[
                        { key: 'bar', icon: <BarChart2 className="h-4 w-4" />, label: 'Bar' },
                        { key: 'line', icon: <TrendingUp className="h-4 w-4" />, label: 'Line' },
                      ].map(({ key, icon, label }) => (
                        <Button
                          key={key} size="sm"
                          variant={compareMode === key ? 'default' : 'outline'}
                          onClick={() => setCompareMode(key)}
                          className="gap-1.5 rounded-full"
                          data-testid={`compare-mode-${key}`}
                        >
                          {icon}{label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Grouped bar / line per category */}
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <ResponsiveContainer width="100%" height={320}>
                      {compareMode === 'bar' ? (
                        <BarChart data={comparisonData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                          <Tooltip content={<RupeeTooltip />} />
                          <Legend />
                          {allCategories.map((cat) => (
                            <Bar key={cat} dataKey={cat} fill={CATEGORY_COLORS[cat] || '#6B7280'} radius={[4, 4, 0, 0]} />
                          ))}
                        </BarChart>
                      ) : (
                        <LineChart data={comparisonData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                          <Tooltip content={<RupeeTooltip />} />
                          <Legend />
                          {allCategories.map((cat) => (
                            <Line
                              key={cat} type="monotone"
                              dataKey={cat} stroke={CATEGORY_COLORS[cat] || '#6B7280'}
                              strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}
                            />
                          ))}
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  {/* Comparison table */}
                  <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-border">
                      <h3 className="text-lg font-heading font-semibold">Detailed Comparison Table</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/40">
                            <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Category</th>
                            {comparisonData.map((row) => (
                              <th key={row.month} className="text-right px-5 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                                {row.month}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {allCategories.map((cat, idx) => (
                            <tr key={cat} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                              <td className="px-5 py-3 font-medium flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ background: CATEGORY_COLORS[cat] || '#6B7280' }}
                                />
                                {cat}
                              </td>
                              {comparisonData.map((row) => {
                                const prev = comparisonData[comparisonData.indexOf(row) - 1];
                                const prevVal = prev ? (prev[cat] || 0) : null;
                                const curVal = row[cat] || 0;
                                const up = prevVal !== null && curVal > prevVal;
                                const down = prevVal !== null && curVal < prevVal;
                                return (
                                  <td key={row.month} className="px-5 py-3 text-right font-heading font-semibold whitespace-nowrap">
                                    <span className={up ? 'text-red-500' : down ? 'text-emerald-500' : ''}>
                                      {curVal > 0 ? fmt(curVal) : '—'}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          {/* Total row */}
                          <tr className="bg-primary/5 border-t border-border font-bold">
                            <td className="px-5 py-3">Total</td>
                            {comparisonData.map((row) => {
                              const total = allCategories.reduce((s, c) => s + (row[c] || 0), 0);
                              return (
                                <td key={row.month} className="px-5 py-3 text-right font-heading text-primary whitespace-nowrap">
                                  {fmt(total)}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};

// ── Small helper ─────────────────────────────────────────────────
const EmptyState = ({ text, icon }) => (
  <div className="py-16 text-center text-muted-foreground">
    {icon || <Upload className="h-10 w-10 opacity-40 mx-auto mb-3" />}
    <p className="text-sm">{text}</p>
  </div>
);

export default Dashboard;
