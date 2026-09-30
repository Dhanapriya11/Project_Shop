import { useEffect, useState } from 'react';
import { supabase, Sale, Expense, Saving, Purchase, Product } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  Download,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Receipt,
  PiggyBank,
  Package
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from 'date-fns';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

interface ReportData {
  sales: (Sale & { products?: Product })[];
  expenses: Expense[];
  savings: Saving[];
  purchases: (Purchase & { products?: Product })[];
  totalSales: number;
  totalExpenses: number;
  totalSavings: number;
  totalPurchases: number;
  profit: number;
}

export function ReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user, period, customStartDate, customEndDate]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'daily':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'weekly':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        return {
          start: new Date(customStartDate),
          end: new Date(customEndDate + 'T23:59:59')
        };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const fetchReportData = async () => {
    if (!user) return;
    setLoading(true);

    const { start, end } = getDateRange();

    try {
      // Fetch sales
      const { data: sales } = await supabase
        .from('sales')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .gte('sales_date', start.toISOString())
        .lte('sales_date', end.toISOString())
        .order('sales_date', { ascending: false });

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('expense_date', start.toISOString())
        .lte('expense_date', end.toISOString())
        .order('expense_date', { ascending: false });

      // Fetch savings
      const { data: savings } = await supabase
        .from('savings')
        .select('*')
        .eq('user_id', user.id)
        .gte('saving_date', start.toISOString())
        .lte('saving_date', end.toISOString())
        .order('saving_date', { ascending: false });

      // Fetch purchases
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .gte('purchase_date', start.toISOString())
        .lte('purchase_date', end.toISOString())
        .order('purchase_date', { ascending: false });

      const totalSales = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const totalSavings = savings?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
      const totalPurchases = purchases?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;
      const totalProfit = sales?.reduce((sum, s) => sum + (s.profit_amount || 0), 0) || 0;

      setReportData({
        sales: sales || [],
        expenses: expenses || [],
        savings: savings || [],
        purchases: purchases || [],
        totalSales,
        totalExpenses,
        totalSavings,
        totalPurchases,
        profit: totalProfit - totalExpenses
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const workbook = XLSX.utils.book_new();

    // Sales sheet
    const salesData = reportData.sales.map(s => ({
      'தேதி': format(new Date(s.sales_date), 'dd/MM/yyyy'),
      'பொருள்': s.products?.product_name_tamil || s.products?.product_name,
      'அளவு': s.quantity_sold,
      'அலகு': s.products?.unit || '',
      'தொகை': s.total_amount,
      'லாபம்': s.profit_amount
    }));
    const salesSheet = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(workbook, salesSheet, 'விற்பனை');

    // Expenses sheet
    const expensesData = reportData.expenses.map(e => ({
      'தேதி': format(new Date(e.expense_date), 'dd/MM/yyyy'),
      'வகை': e.expense_category,
      'தொகை': e.amount,
      'குறிப்புகள்': e.notes || ''
    }));
    const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(workbook, expensesSheet, 'செலவுகள்');

    // Savings sheet
    const savingsData = reportData.savings.map(s => ({
      'தேதி': format(new Date(s.saving_date), 'dd/MM/yyyy'),
      'தொகை': s.amount,
      'குறிப்புகள்': s.notes || ''
    }));
    const savingsSheet = XLSX.utils.json_to_sheet(savingsData);
    XLSX.utils.book_append_sheet(workbook, savingsSheet, 'சேமிப்பு');

    // Purchases sheet
    const purchasesData = reportData.purchases.map(p => ({
      'தேதி': format(new Date(p.purchase_date), 'dd/MM/yyyy'),
      'பொருள்': p.products?.product_name_tamil || p.products?.product_name,
      'அளவு': p.quantity,
      'அலகு': p.products?.unit || '',
      'தொகை': p.total_amount
    }));
    const purchasesSheet = XLSX.utils.json_to_sheet(purchasesData);
    XLSX.utils.book_append_sheet(workbook, purchasesSheet, 'கொள்முதல்');

    // Summary sheet
    const summaryData = [
      { 'விவரம்': 'மொத்த விற்பனை', 'தொகை': reportData.totalSales },
      { 'விவரம்': 'மொத்த செலவு', 'தொகை': reportData.totalExpenses },
      { 'விவரம்': 'மொத்த சேமிப்பு', 'தொகை': reportData.totalSavings },
      { 'விவரம்': 'மொத்த கொள்முதல்', 'தொகை': reportData.totalPurchases },
      { 'விவரம்': 'லாபம்/நஷ்டம்', 'தொகை': reportData.profit }
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'சுருக்கம்');

    const fileName = `கடை_அறிக்கை_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.text('Tamil Shop Assistant - Report', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, 38, { align: 'center' });

    let yPos = 50;

    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 14, yPos);
    yPos += 10;

    const summaryData = [
      ['Total Sales', `Rs. ${reportData.totalSales.toLocaleString()}`],
      ['Total Expenses', `Rs. ${reportData.totalExpenses.toLocaleString()}`],
      ['Total Savings', `Rs. ${reportData.totalSavings.toLocaleString()}`],
      ['Total Purchases', `Rs. ${reportData.totalPurchases.toLocaleString()}`],
      ['Profit / Loss', `Rs. ${reportData.profit.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Amount']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // Sales
    if (reportData.sales.length > 0) {
      doc.setFontSize(14);
      doc.text('Sales', 14, yPos);
      yPos += 5;

      const salesData = reportData.sales.map(s => [
        format(new Date(s.sales_date), 'dd/MM/yyyy'),
        s.products?.product_name_tamil || s.products?.product_name || '',
        `${s.quantity_sold} ${s.products?.unit || ''}`,
        `Rs. ${s.total_amount.toLocaleString()}`,
        `Rs. ${(s.profit_amount || 0).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Product', 'Qty', 'Amount', 'Profit']],
        body: salesData,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Expenses
    if (reportData.expenses.length > 0 && yPos < 250) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text('Expenses', 14, yPos);
      yPos += 5;

      const expensesData = reportData.expenses.map(e => [
        format(new Date(e.expense_date), 'dd/MM/yyyy'),
        e.expense_category,
        `Rs. ${e.amount.toLocaleString()}`,
        e.notes || ''
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Category', 'Amount', 'Notes']],
        body: expensesData,
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] }
      });
    }

    doc.save(`shop_report_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
  };

  const periodLabels: Record<ReportPeriod, string> = {
    daily: 'இன்று',
    weekly: 'இந்த வாரம்',
    monthly: 'இந்த மாதம்',
    custom: 'தனிப்பயன்'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">அறிக்கைகள்</h1>
          <p className="text-lg text-gray-600 mt-1">விற்பனை மற்றும் செலவு அறிக்கைகள்</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="btn-secondary flex items-center gap-2"
            disabled={!reportData}
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="btn-primary flex items-center gap-2"
            disabled={!reportData}
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          {(Object.keys(periodLabels) as ReportPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                period === p
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="label">தொடக்க தேதி</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">முடிவு தேதி</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
        </div>
      ) : reportData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="card-dashboard border-green-500">
              <ShoppingCart className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-sm text-gray-600">விற்பனை</p>
              <p className="text-xl font-bold">₹{reportData.totalSales.toLocaleString('ta-IN')}</p>
            </div>
            <div className="card-dashboard border-red-500">
              <Receipt className="w-6 h-6 text-red-600 mb-2" />
              <p className="text-sm text-gray-600">செலவு</p>
              <p className="text-xl font-bold text-red-600">₹{reportData.totalExpenses.toLocaleString('ta-IN')}</p>
            </div>
            <div className="card-dashboard border-accent-500">
              <PiggyBank className="w-6 h-6 text-accent-600 mb-2" />
              <p className="text-sm text-gray-600">சேமிப்பு</p>
              <p className="text-xl font-bold text-accent-600">₹{reportData.totalSavings.toLocaleString('ta-IN')}</p>
            </div>
            <div className="card-dashboard border-blue-500">
              <Package className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-sm text-gray-600">கொள்முதல்</p>
              <p className="text-xl font-bold">₹{reportData.totalPurchases.toLocaleString('ta-IN')}</p>
            </div>
            <div className={`card-dashboard ${reportData.profit >= 0 ? 'border-green-500' : 'border-red-500'}`}>
              {reportData.profit >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600 mb-2" />
              )}
              <p className="text-sm text-gray-600">லாபம்</p>
              <p className={`text-xl font-bold ${reportData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{reportData.profit.toLocaleString('ta-IN')}
              </p>
            </div>
          </div>

          {/* Sales Table */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">விற்பனை விவரங்கள் ({reportData.sales.length})</h3>
            {reportData.sales.length > 0 ? (
              <div className="table-container">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-3">தேதி</th>
                      <th className="px-4 py-3">பொருள்</th>
                      <th className="px-4 py-3">அளவு</th>
                      <th className="px-4 py-3">தொகை</th>
                      <th className="px-4 py-3">லாபம்</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="table-cell">{format(new Date(sale.sales_date), 'dd/MM/yyyy')}</td>
                        <td className="table-cell">{sale.products?.product_name_tamil}</td>
                        <td className="table-cell">{sale.quantity_sold} {sale.products?.unit}</td>
                        <td className="table-cell">₹{sale.total_amount.toLocaleString('ta-IN')}</td>
                        <td className="table-cell text-green-600">+₹{(sale.profit_amount || 0).toLocaleString('ta-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">விற்பனை இல்லை</p>
            )}
          </div>

          {/* Expenses Table */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">செலவு விவரங்கள் ({reportData.expenses.length})</h3>
            {reportData.expenses.length > 0 ? (
              <div className="table-container">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-3">தேதி</th>
                      <th className="px-4 py-3">வகை</th>
                      <th className="px-4 py-3">தொகை</th>
                      <th className="px-4 py-3">குறிப்புகள்</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="table-cell">{format(new Date(expense.expense_date), 'dd/MM/yyyy')}</td>
                        <td className="table-cell">{expense.expense_category}</td>
                        <td className="table-cell text-red-600">₹{expense.amount.toLocaleString('ta-IN')}</td>
                        <td className="table-cell">{expense.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">செலவு இல்லை</p>
            )}
          </div>

          {/* Purchases Table */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">கொள்முதல் விவரங்கள் ({reportData.purchases.length})</h3>
            {reportData.purchases.length > 0 ? (
              <div className="table-container">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-3">தேதி</th>
                      <th className="px-4 py-3">பொருள்</th>
                      <th className="px-4 py-3">அளவு</th>
                      <th className="px-4 py-3">தொகை</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.purchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-gray-50">
                        <td className="table-cell">{format(new Date(purchase.purchase_date), 'dd/MM/yyyy')}</td>
                        <td className="table-cell">{purchase.products?.product_name_tamil}</td>
                        <td className="table-cell">{purchase.quantity} {purchase.products?.unit}</td>
                        <td className="table-cell">₹{purchase.total_amount.toLocaleString('ta-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">கொள்முதல் இல்லை</p>
            )}
          </div>

          {/* Savings Table */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">சேமிப்பு விவரங்கள் ({reportData.savings.length})</h3>
            {reportData.savings.length > 0 ? (
              <div className="table-container">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-3">தேதி</th>
                      <th className="px-4 py-3">தொகை</th>
                      <th className="px-4 py-3">குறிப்புகள்</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.savings.map((saving) => (
                      <tr key={saving.id} className="hover:bg-gray-50">
                        <td className="table-cell">{format(new Date(saving.saving_date), 'dd/MM/yyyy')}</td>
                        <td className="table-cell text-accent-600 font-semibold">₹{saving.amount.toLocaleString('ta-IN')}</td>
                        <td className="table-cell">{saving.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">சேமிப்பு இல்லை</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
