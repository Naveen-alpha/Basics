import React, { useState, useEffect, useRef } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AA336A', '#3366FF'];

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

function App() {
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState('add'); 

  // Add Expense Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Home');
  const [type, setType] = useState('expense');
  const [date, setDate] = useState(new Date().toISOString().substr(0, 10));
  const [paymentMode, setPaymentMode] = useState('GPay');

  // Filters State
  const [filterTimeframe, setFilterTimeframe] = useState('month'); 
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterPaymentMode, setFilterPaymentMode] = useState('All');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().substr(0, 10));

  // Dashboard Controls
  const [dashboardGroupBy, setDashboardGroupBy] = useState('category'); 
  const [dashboardTimeFilter, setDashboardTimeFilter] = useState('month'); 

  // File input ref for import
  const fileInputRef = useRef();

  // Load expenses on mount
  useEffect(() => {
    const stored = localStorage.getItem('expenses');
    if (stored) setExpenses(JSON.parse(stored));
  }, []);

  // Save expenses on change
  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  // Add expense
  const addExpense = () => {
    if (!description.trim() || !amount || isNaN(amount)) return;
    const newExp = {
      id: Date.now(),
      description: description.trim(),
      amount: parseFloat(amount),
      category,
      type,
      date,
      paymentMode,
    };
    setExpenses([newExp, ...expenses]);
    // Reset form fields
    setDescription('');
    setAmount('');
    setCategory('Home');
    setType('expense');
    setDate(new Date().toISOString().substr(0, 10));
    setPaymentMode('GPay');
    setActiveTab('list');
  };

  // Delete expense
  const deleteExpense = (id) => setExpenses(expenses.filter(e => e.id !== id));

  // Filter helpers
  const filterByTimeframe = (item) => {
    const itemDate = new Date(item.date);
    const selectedDate = new Date(filterDate);
    if (filterTimeframe === 'day') return item.date === filterDate;
    if (filterTimeframe === 'week') {
      const startOfWeek = getWeekStart(selectedDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      return itemDate >= startOfWeek && itemDate <= endOfWeek;
    }
    if (filterTimeframe === 'month') {
      return itemDate.getMonth() === selectedDate.getMonth() && itemDate.getFullYear() === selectedDate.getFullYear();
    }
    return true;
  };

  const filteredExpenses = expenses.filter(e => {
    if (!filterByTimeframe(e)) return false;
    if (filterCategory !== 'All' && e.category !== filterCategory) return false;
    if (filterType !== 'All' && e.type !== filterType) return false;
    if (filterPaymentMode !== 'All' && e.paymentMode !== filterPaymentMode) return false;
    return true;
  });

  const totalIncome = filteredExpenses.filter(e => e.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = filteredExpenses.filter(e => e.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpenses;

  // Reset filters
  const resetFilters = () => {
    setFilterTimeframe('month');
    setFilterCategory('All');
    setFilterType('All');
    setFilterPaymentMode('All');
    setFilterDate(new Date().toISOString().substr(0, 10));
  };

  // Export data function
  const exportData = () => {
    const dataStr = JSON.stringify(expenses, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().substr(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import data function
  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          // Merge new data, avoid duplicates by id
          const existingIds = new Set(expenses.map(e => e.id));
          const merged = [...expenses];
          imported.forEach(item => {
            if (!existingIds.has(item.id)) merged.push(item);
          });
          setExpenses(merged);
          alert('Import successful!');
        } else {
          alert('File format is incorrect.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    event.target.value = null; // Reset file input for possible re-import
  };

  // Dashboard chart data:
  const dataForPie = () => {
    const grouping = {};
    expenses.forEach(({ [dashboardGroupBy]: groupValue, amount }) => {
      grouping[groupValue] = (grouping[groupValue] || 0) + amount;
    });
    return Object.entries(grouping).map(([name, value]) => ({ name, value }));
  };

  const groupByTime = (itemDate) => {
    const d = new Date(itemDate);
    if (dashboardTimeFilter === 'day') return d.toISOString().split('T')[0];
    if (dashboardTimeFilter === 'month') return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    if (dashboardTimeFilter === 'year') return `${d.getFullYear()}`;
    return d.toISOString().split('T')[0];
  };

  const barChartDataMap = {};
  expenses.forEach(({ date, amount, type }) => {
    const timeKey = groupByTime(date);
    if (!barChartDataMap[timeKey]) barChartDataMap[timeKey] = { time: timeKey, income: 0, expense: 0 };
    barChartDataMap[timeKey][type] += amount;
  });
  const barChartData = Object.values(barChartDataMap).sort((a,b) => a.time.localeCompare(b.time));

  // Renders...

  const renderAddTab = () => (
    <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <input type="text" placeholder="Description" style={{ flex: 2, padding: 8 }} value={description} onChange={e => setDescription(e.target.value)} />
      <input type="number" placeholder="Amount" style={{ flex: 1, padding: 8 }} value={amount} onChange={e => setAmount(e.target.value)} />
      <select value={category} onChange={e => setCategory(e.target.value)} style={{ flex: 1, padding: 8 }}>
        <option>Home</option><option>Bills</option><option>Food</option><option>Transport</option><option>Entertainment</option><option>Other</option>
      </select>
      <select value={type} onChange={e => setType(e.target.value)} style={{ flex: 1, padding:8 }}>
        <option value="income">Income</option><option value="expense">Expense</option>
      </select>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1, padding: 8 }} />
      <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={{ flex: 1, padding: 8 }}>
        <option>GPay</option><option>Cred</option><option>Netbanking</option>
      </select>
      <button onClick={addExpense} style={{ padding: '10px 20px', flex: '0 0 auto' }}>Add</button>
    </div>
  );

  const renderListTab = () => (
    <>
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ flex: 1 }}>
          Filter Timeframe:
          <select value={filterTimeframe} onChange={e => setFilterTimeframe(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
          </select>
        </label>
        <label style={{ flex: 1 }}>
          Category:
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ marginLeft: 8 }}>
            <option>All</option><option>Home</option><option>Bills</option><option>Food</option><option>Transport</option><option>Entertainment</option><option>Other</option>
          </select>
        </label>
        <label style={{ flex: 1 }}>
          Type:
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ marginLeft: 8 }}>
            <option>All</option><option value="income">Income</option><option value="expense">Expense</option>
          </select>
        </label>
        <label style={{ flex: 1 }}>
          Payment Mode:
          <select value={filterPaymentMode} onChange={e => setFilterPaymentMode(e.target.value)} style={{ marginLeft: 8 }}>
            <option>All</option><option>GPay</option><option>Cred</option><option>Netbanking</option>
          </select>
        </label>
        <label style={{ flex:1 }}>
          Date:
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ marginLeft: 8, padding: 4 }} />
        </label>
        <button onClick={resetFilters} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Reset Filters
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <strong>Monthly Balance: </strong>
        <span style={{ color: balance >= 0 ? 'green' : 'red' }}>
          ${balance.toFixed(2)} (Income: ${totalIncome.toFixed(2)} - Expense: ${totalExpenses.toFixed(2)})
        </span>
      </div>

      <ul style={{ padding: 0, listStyle: 'none' }}>
        {filteredExpenses.length === 0 ? (
          <li>No records match the selected filters.</li>
        ) : (
          filteredExpenses.map(({ id, description, amount, category, type, date, paymentMode }) => (
            <li key={id} style={{ marginBottom: 10, border: '1px solid #ccc', borderRadius: 4, padding: 10, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{description}</strong> ({category})<br />
                <small>Date: {date} | Type: {type} | Payment: {paymentMode}</small>
              </div>
              <div style={{ color: type === "income" ? "green" : "red", fontWeight: "bold" }}>
                ${amount.toFixed(2)}
                <button onClick={() => deleteExpense(id)} style={{ marginLeft: 10, cursor: "pointer" }}>Delete</button>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* Export / Import buttons */}
      <div style={{ marginTop: 20 }}>
        <button onClick={exportData} style={{ marginRight: 12, padding: '10px 18px' }}>
          Export Data
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={importData}
        />
        <button onClick={() => fileInputRef.current.click()} style={{ padding: '10px 18px' }}>
          Import Data
        </button>
      </div>
    </>
  );

  const renderDashboardTab = () => {
    const pieData = dataForPie();
    return (
      <>
        <div style={{ marginBottom: 15 }}>
          <label>
            Group Pie Chart By:{' '}
            <select value={dashboardGroupBy} onChange={e => setDashboardGroupBy(e.target.value)} style={{ marginRight: 30 }}>
              <option value="category">Category</option>
              <option value="paymentMode">Payment Mode</option>
              <option value="type">Income/Expense</option>
            </select>
            Group Bar Chart By Time:{' '}
            <select value={dashboardTimeFilter} onChange={e => setDashboardTimeFilter(e.target.value)}>
              <option value="day">Day</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </label>
        </div>

        <div style={{ width: '100%', height: 300, marginBottom: 40 }}>
          <h3>Breakdown by {dashboardGroupBy}</h3>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ width: '100%', height: 300 }}>
          <h3>Income vs Outgoing by {dashboardTimeFilter}</h3>
          <ResponsiveContainer>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" fill="#00C49F" />
              <Bar dataKey="expense" fill="#FF4C4C" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>
    );
  };

  return (
    <div style={{ maxWidth: 750, margin: '2rem auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Spend Analyzer</h1>

      {/* Tabs */}
      <div style={{ marginBottom: 20, display: 'flex', borderBottom: '2px solid #ccc' }}>
        <button
          onClick={() => setActiveTab('add')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'add' ? '4px solid blue' : 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'add' ? 'bold' : 'normal',
          }}
        >
          Add Spend
        </button>
        <button
          onClick={() => setActiveTab('list')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'list' ? '4px solid blue' : 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'list' ? 'bold' : 'normal',
          }}
        >
          List Spends
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'dashboard' ? '4px solid blue' : 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal',
          }}
        >
          Dashboard
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'add' && renderAddTab()}
      {activeTab === 'list' && renderListTab()}
      {activeTab === 'dashboard' && renderDashboardTab()}
    </div>
  );
}

export default App;