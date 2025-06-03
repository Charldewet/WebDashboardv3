import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Label, ComposedChart, XAxis, YAxis, BarChart, Bar, Legend } from 'recharts';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const currentYearPayload = payload.find(p => p.dataKey === 'currentYear');
    const previousYearPayload = payload.find(p => p.dataKey === 'previousYear');
    const hasCurrentYearData = currentYearPayload && currentYearPayload.value !== null;
    const hasPreviousYearData = previousYearPayload && previousYearPayload.value !== null;
    if (!hasCurrentYearData && !hasPreviousYearData) return null;
    return (
      <div style={{
        background: 'rgba(35, 43, 59, 0.9)',
        border: '1px solid #374151',
        color: '#fff',
        borderRadius: '0.8rem',
        padding: '0.8rem 1.2rem',
        fontSize: '0.9rem',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}>
        {currentYearPayload && currentYearPayload.value !== null && (
          <div style={{ color: currentYearPayload.stroke }}>
            {currentYearPayload.name}: R {currentYearPayload.value.toLocaleString('en-ZA')}
          </div>
        )}
        {previousYearPayload && previousYearPayload.value !== null && (
          <div style={{
            color: previousYearPayload.stroke,
            marginTop: hasCurrentYearData ? '0.2rem' : '0'
          }}>
            {previousYearPayload.name}: R {previousYearPayload.value.toLocaleString('en-ZA')}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const BarChartTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const turnoverData = payload.find(p => p.dataKey === 'turnover');
    const basketValueData = payload.find(p => p.dataKey === 'avgBasketValue');
    return (
      <div style={{
        background: 'rgba(35, 43, 59, 0.9)',
        border: '1px solid #374151',
        color: '#fff',
        borderRadius: '0.8rem',
        padding: '0.8rem 1.2rem',
        fontSize: '0.9rem',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}>
        {turnoverData && typeof turnoverData.value === 'number' && (
          <div style={{ color: turnoverData.payload.fill || '#FF4500' }}>
            {turnoverData.name}: R {turnoverData.value.toLocaleString('en-ZA')}
          </div>
        )}
        {basketValueData && typeof basketValueData.value === 'number' && (
          <div style={{
            color: basketValueData.stroke || '#82ca9d',
            marginTop: turnoverData ? '0.2rem' : '0'
          }}>
            Avg Basket: R {basketValueData.value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const CustomTooltipSingleValue = ({ active, payload, label, valueLabel, valuePrefix }) => {
  if (active && payload && payload.length && payload[0].value !== null && payload[0].value !== undefined) {
    return (
      <div style={{
        background: 'rgba(35, 43, 59, 0.9)',
        border: '1px solid #374151',
        color: '#fff',
        borderRadius: '0.8rem',
        padding: '0.8rem 1.2rem',
        fontSize: '0.9rem',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}>
        <div style={{ color: payload[0].stroke || '#39FF14' }}>
          {valueLabel || payload[0].name}: {valuePrefix || ''}{payload[0].value.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}
        </div>
      </div>
    );
  }
  return null;
};

function YearlyView({ selectedPharmacy, selectedDate }) {
  const [mtdTurnover, setMtdTurnover] = useState(null);
  const [loadingKpi, setLoadingKpi] = useState(true);
  const [errorKpi, setErrorKpi] = useState(null);
  const [avgBasket, setAvgBasket] = useState({ value: null, size: null });
  const [loadingAvgBasket, setLoadingAvgBasket] = useState(true);
  const [errorAvgBasket, setErrorAvgBasket] = useState(null);
  const [combinedChartData, setCombinedChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [errorChart, setErrorChart] = useState(null);
  const [comparisonDetails, setComparisonDetails] = useState(null);
  const [gpStats, setGpStats] = useState({ percent: null, value: null });
  const [loadingGpStats, setLoadingGpStats] = useState(true);
  const [errorGpStats, setErrorGpStats] = useState(null);
  const [costStats, setCostStats] = useState({ cost: null, purchases: null });
  const [loadingCostStats, setLoadingCostStats] = useState(true);
  const [errorCostStats, setErrorCostStats] = useState(null);
  const [transStats, setTransStats] = useState({ transactions: null, scripts: null });
  const [loadingTransStats, setLoadingTransStats] = useState(true);
  const [errorTransStats, setErrorTransStats] = useState(null);
  const [dispPie, setDispPie] = useState({ percent: null, disp: null, total: null });
  const [loadingDispPie, setLoadingDispPie] = useState(true);
  const [errorDispPie, setErrorDispPie] = useState(null);
  const [monthlyPurchasesData, setMonthlyPurchasesData] = useState([]);
  const [loadingMonthlyPurchases, setLoadingMonthlyPurchases] = useState(true);
  const [errorMonthlyPurchases, setErrorMonthlyPurchases] = useState(null);
  const [monthlyCostOfSalesData, setMonthlyCostOfSalesData] = useState([]);
  const [loadingMonthlyCostOfSales, setLoadingMonthlyCostOfSales] = useState(true);
  const [errorMonthlyCostOfSales, setErrorMonthlyCostOfSales] = useState(null);
  const [monthlyTurnoverBarData, setMonthlyTurnoverBarData] = useState([]);
  const [loadingMonthlyTurnoverBar, setLoadingMonthlyTurnoverBar] = useState(true);
  const [errorMonthlyTurnoverBar, setErrorMonthlyTurnoverBar] = useState(null);
  const [monthlyAvgBasketValueData, setMonthlyAvgBasketValueData] = useState([]);
  const [loadingMonthlyAvgBasketValue, setLoadingMonthlyAvgBasketValue] = useState(true);
  const [errorMonthlyAvgBasketValue, setErrorMonthlyAvgBasketValue] = useState(null);
  const [monthlyCashSalesData, setMonthlyCashSalesData] = useState([]);
  const [loadingMonthlyCashSales, setLoadingMonthlyCashSales] = useState(true);
  const [errorMonthlyCashSales, setErrorMonthlyCashSales] = useState(null);
  const [monthlyAccountSalesData, setMonthlyAccountSalesData] = useState([]);
  const [loadingMonthlyAccountSales, setLoadingMonthlyAccountSales] = useState(true);
  const [errorMonthlyAccountSales, setErrorMonthlyAccountSales] = useState(null);
  const [monthlyCodSalesData, setMonthlyCodSalesData] = useState([]);
  const [loadingMonthlyCodSales, setLoadingMonthlyCodSales] = useState(true);
  const [errorMonthlyCodSales, setErrorMonthlyCodSales] = useState(null);
  const [monthlySalesPieData, setMonthlySalesPieData] = useState([]);
  const [loadingMonthlySalesPie, setLoadingMonthlySalesPie] = useState(true);
  const [errorMonthlySalesPie, setErrorMonthlySalesPie] = useState(null);
  const [monthlyTenderPieData, setMonthlyTenderPieData] = useState([]);
  const [loadingMonthlyTenderPie, setLoadingMonthlyTenderPie] = useState(true);
  const [errorMonthlyTenderPie, setErrorMonthlyTenderPie] = useState(null);
  const [monthlyScriptsDispensedData, setMonthlyScriptsDispensedData] = useState([]);
  const [loadingMonthlyScriptsDispensed, setLoadingMonthlyScriptsDispensed] = useState(true);
  const [errorMonthlyScriptsDispensed, setErrorMonthlyScriptsDispensed] = useState(null);
  const [monthlyGpPercentData, setMonthlyGpPercentData] = useState([]);
  const [loadingMonthlyGpPercent, setLoadingMonthlyGpPercent] = useState(true);
  const [errorMonthlyGpPercent, setErrorMonthlyGpPercent] = useState(null);
  const API_BASE_URL = 'http://192.168.0.104:5001';

  useEffect(() => {
    console.log('[YearlyView] useEffect triggered. Selected Pharmacy:', selectedPharmacy, 'Selected Date:', selectedDate);
    if (!selectedPharmacy || !selectedDate) {
      setComparisonDetails(null);
      setAvgBasket({ value: null, size: null });
      setLoadingAvgBasket(true);
      setErrorAvgBasket(null);
      setGpStats({ percent: null, value: null });
      setLoadingGpStats(true);
      setErrorGpStats(null);
      setCostStats({ cost: null, purchases: null });
      setLoadingCostStats(true);
      setErrorCostStats(null);
      setTransStats({ transactions: null, scripts: null });
      setLoadingTransStats(true);
      setErrorTransStats(null);
      setDispPie({ percent: null, disp: null, total: null });
      setLoadingDispPie(true);
      setErrorDispPie(null);
      return;
    }
    setLoadingKpi(true);
    setErrorKpi(null);
    setMtdTurnover(null);
    setLoadingAvgBasket(true);
    setErrorAvgBasket(null);
    setAvgBasket({ value: null, size: null });
    setLoadingGpStats(true);
    setErrorGpStats(null);
    setGpStats({ percent: null, value: null });
    setLoadingCostStats(true);
    setErrorCostStats(null);
    setCostStats({ cost: null, purchases: null });
    setLoadingTransStats(true);
    setErrorTransStats(null);
    setTransStats({ transactions: null, scripts: null });
    setLoadingDispPie(true);
    setErrorDispPie(null);
    setDispPie({ percent: null, disp: null, total: null });
    setLoadingChart(true);
    setErrorChart(null);
    setCombinedChartData([]);
    const dateObj = new Date(selectedDate);
    const currentYearNum = dateObj.getFullYear();
    const firstDayCurrentYear = `${currentYearNum}-01-01`;
    const lastDayCurrentPeriod = selectedDate;
    const previousYearNum = currentYearNum - 1;
    const firstDayPreviousYear = `${previousYearNum}-01-01`;
    const lastDayPreviousYearPeriodObj = new Date(previousYearNum, dateObj.getMonth(), dateObj.getDate());
    const lastDayPreviousYearPeriod = `${lastDayPreviousYearPeriodObj.getFullYear()}-${(lastDayPreviousYearPeriodObj.getMonth() + 1).toString().padStart(2, '0')}-${lastDayPreviousYearPeriodObj.getDate().toString().padStart(2, '0')}`;
    axios.get(`${API_BASE_URL}/api/turnover_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setMtdTurnover(res.data?.turnover ?? 0);
        setLoadingKpi(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching YTD turnover.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (KPI).';
        else errorMessage = err.message;
        setErrorKpi(errorMessage);
        setMtdTurnover(0);
        setLoadingKpi(false);
      });
    axios.get(`${API_BASE_URL}/api/avg_basket_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setAvgBasket({ value: res.data?.avg_basket_value ?? 0, size: res.data?.avg_basket_size ?? 0 });
        setLoadingAvgBasket(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching basket metrics.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (Basket).';
        else errorMessage = err.message;
        setErrorAvgBasket(errorMessage);
        setAvgBasket({ value: 0, size: 0 });
        setLoadingAvgBasket(false);
      });
    axios.get(`${API_BASE_URL}/api/gp_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setGpStats({ percent: res.data?.avg_gp_percent ?? 0, value: res.data?.cumulative_gp_value ?? 0 });
        setLoadingGpStats(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching GP stats.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (GP).';
        else errorMessage = err.message;
        setErrorGpStats(errorMessage);
        setGpStats({ percent: 0, value: 0 });
        setLoadingGpStats(false);
      });
    axios.get(`${API_BASE_URL}/api/costs_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setCostStats({ cost: res.data?.cost_of_sales ?? 0, purchases: res.data?.purchases ?? 0 });
        setLoadingCostStats(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching cost stats.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (Costs).';
        else errorMessage = err.message;
        setErrorCostStats(errorMessage);
        setCostStats({ cost: 0, purchases: 0 });
        setLoadingCostStats(false);
      });
    axios.get(`${API_BASE_URL}/api/transactions_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setTransStats({ transactions: res.data?.total_transactions ?? 0, scripts: res.data?.total_scripts ?? 0 });
        setLoadingTransStats(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching transaction stats.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (Transactions).';
        else errorMessage = err.message;
        setErrorTransStats(errorMessage);
        setTransStats({ transactions: 0, scripts: 0 });
        setLoadingTransStats(false);
      });
    axios.get(`${API_BASE_URL}/api/dispensary_vs_total_turnover/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setDispPie({ percent: res.data?.percent ?? 0, disp: res.data?.dispensary_turnover ?? 0, total: res.data?.total_turnover ?? 0 });
        setLoadingDispPie(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching dispensary pie.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (Disp Pie).';
        else errorMessage = err.message;
        setErrorDispPie(errorMessage);
        setDispPie({ percent: 0, disp: 0, total: 0 });
        setLoadingDispPie(false);
      });

    // Fetch data for overlaid chart (YTD cumulative)
    const currentYearURL = `${API_BASE_URL}/api/daily_turnover_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`;
    const previousYearURL = `${API_BASE_URL}/api/daily_turnover_for_range/${firstDayPreviousYear}/${lastDayPreviousYearPeriod}`;
    console.log('[YearlyView] Fetching current year chart data from:', currentYearURL);
    console.log('[YearlyView] Fetching previous year chart data from:', previousYearURL);

    const fetchCurrentYearChartData = axios.get(currentYearURL, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    });
    const fetchPreviousYearChartData = axios.get(previousYearURL, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    });

    console.log('[YearlyView] Calling Promise.all for chart data...');
    Promise.all([fetchCurrentYearChartData, fetchPreviousYearChartData])
      .then(([resCurrent, resPrevious]) => {
        console.log('[YearlyView] Promise.all THEN block reached. Current year response:', resCurrent, 'Previous year response:', resPrevious);
        const dailyCurrent = resCurrent.data?.daily_turnover || [];
        let cumulativeCurrent = 0;
        const processedCurrent = dailyCurrent.map(d => {
          cumulativeCurrent += d.turnover || 0;
          return { day: d.date.slice(5, 10), cumulative: Math.round(cumulativeCurrent) }; // MM-DD
        });

        const dailyPrevious = resPrevious.data?.daily_turnover || [];
        let cumulativePrevious = 0;
        const processedPrevious = dailyPrevious.map(d => {
          cumulativePrevious += d.turnover || 0;
          return { day: d.date.slice(5, 10), cumulative: Math.round(cumulativePrevious) }; // MM-DD
        });

        // Build combined array for each day from Jan 1 to selectedDate
        const start = new Date(firstDayCurrentYear);
        const end = new Date(selectedDate);
        const combined = [];
        let lastKnownCurrentCumulative = 0;
        let lastKnownPreviousCumulative = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const mmdd = d.toISOString().slice(5, 10);
          const currentEntry = processedCurrent.find(x => x.day === mmdd);
          const previousEntry = processedPrevious.find(x => x.day === mmdd);
          if (currentEntry) lastKnownCurrentCumulative = currentEntry.cumulative;
          if (previousEntry) lastKnownPreviousCumulative = previousEntry.cumulative;
          combined.push({
            day: mmdd,
            currentYear: lastKnownCurrentCumulative,
            previousYear: lastKnownPreviousCumulative,
          });
        }
        setCombinedChartData(combined);
        setLoadingChart(false);

        // Calculate comparison details (YTD)
        if (combined.length > 0) {
          const lastDataPoint = combined[combined.length - 1];
          const currentVal = lastDataPoint.currentYear !== null ? lastDataPoint.currentYear : 0;
          const previousVal = lastDataPoint.previousYear !== null ? lastDataPoint.previousYear : 0;
          let details = null;
          if (lastDataPoint.previousYear !== null) {
            const diff = currentVal - previousVal;
            const absDiff = Math.abs(diff);
            if (previousVal === 0) {
              if (currentVal > 0) {
                details = { arrow: '↑', text: `R ${currentVal.toLocaleString('en-ZA')} more than PY (was R0)`, color: '#10B981' };
              } else {
                details = { arrow: '', text: 'Same as last year (R0)', color: '#9CA3AF' };
              }
            } else {
              const percentage = Math.round((diff / previousVal) * 100);
              if (diff > 0) {
                details = { arrow: '↑', text: `R ${absDiff.toLocaleString('en-ZA')} (${percentage > 0 ? '+' : ''}${percentage}%) more than last year`, color: '#10B981' };
              } else if (diff < 0) {
                details = { arrow: '↓', text: `R ${absDiff.toLocaleString('en-ZA')} (${percentage}%) less than last year`, color: '#EF4444' };
              } else {
                details = { arrow: '', text: 'Same as last year', color: '#9CA3AF' };
              }
            }
          } else {
            details = { arrow: '', text: 'Previous year data N/A', color: '#9CA3AF' };
          }
          setComparisonDetails(details);
        } else {
          setComparisonDetails(null);
        }
      })
      .catch(err => {
        let errorMessage = 'Error fetching chart data.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (Chart).';
        else errorMessage = err.message;
        setErrorChart(errorMessage);
        setCombinedChartData([]);
        setLoadingChart(false);
        setComparisonDetails(null);
      });

    // --- AGGREGATE DAILY DATA INTO MONTHS FOR CAROUSEL CHARTS ---
    // Helper: get month label
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const lastMonth = dateObj.getMonth(); // 0-based, so May=4
    // --- Purchases & Cost of Sales (Cumulative per month) ---
    Promise.all([
      axios.get(`${API_BASE_URL}/api/daily_purchases_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } }),
      axios.get(`${API_BASE_URL}/api/daily_cost_of_sales_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } })
    ]).then(([purchasesRes, costRes]) => {
      const dailyPurchases = purchasesRes.data?.daily_purchases || [];
      const dailyCost = costRes.data?.daily_cost_of_sales || [];
      // Aggregate cumulative per month
      let purchasesByMonth = Array(12).fill(0);
      let costByMonth = Array(12).fill(0);
      dailyPurchases.forEach(d => {
        const m = new Date(d.date).getMonth();
        purchasesByMonth[m] += d.purchases || 0;
      });
      dailyCost.forEach(d => {
        const m = new Date(d.date).getMonth();
        costByMonth[m] += d.cost_of_sales || 0;
      });
      // Cumulative
      let cumPurchases = 0, cumCost = 0;
      const purchasesData = [], costData = [];
      for (let m = 0; m <= lastMonth; m++) {
        cumPurchases += purchasesByMonth[m];
        cumCost += costByMonth[m];
        purchasesData.push({ month: monthLabels[m], cumulative: Math.round(cumPurchases) });
        costData.push({ month: monthLabels[m], cumulative: Math.round(cumCost) });
      }
      setMonthlyPurchasesData(purchasesData);
      setMonthlyCostOfSalesData(costData);
      setLoadingMonthlyPurchases(false);
      setLoadingMonthlyCostOfSales(false);
    }).catch(err => {
      setErrorMonthlyPurchases('Error fetching purchases.');
      setErrorMonthlyCostOfSales('Error fetching cost of sales.');
      setMonthlyPurchasesData([]);
      setMonthlyCostOfSalesData([]);
      setLoadingMonthlyPurchases(false);
      setLoadingMonthlyCostOfSales(false);
    });
    // --- Turnover Bar (per month, not cumulative) & Avg Basket Value (average per month) ---
    Promise.all([
      axios.get(`${API_BASE_URL}/api/daily_turnover_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } }),
      axios.get(`${API_BASE_URL}/api/daily_avg_basket_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } })
    ]).then(([turnoverRes, basketRes]) => {
      const dailyTurnover = turnoverRes.data?.daily_turnover || [];
      const dailyBasket = basketRes.data?.daily_avg_basket || [];
      let turnoverByMonth = Array(12).fill(0);
      let basketSumByMonth = Array(12).fill(0);
      let basketCountByMonth = Array(12).fill(0);
      dailyTurnover.forEach(d => {
        const m = new Date(d.date).getMonth();
        turnoverByMonth[m] += d.turnover || 0;
      });
      dailyBasket.forEach(d => {
        const m = new Date(d.date).getMonth();
        if (d.avg_basket_value !== null && d.avg_basket_value !== undefined) {
          basketSumByMonth[m] += d.avg_basket_value;
          basketCountByMonth[m] += 1;
        }
      });
      const turnoverData = [], basketData = [];
      for (let m = 0; m <= lastMonth; m++) {
        turnoverData.push({ month: monthLabels[m], turnover: Math.round(turnoverByMonth[m]) });
        basketData.push({ month: monthLabels[m], avgBasketValue: basketCountByMonth[m] ? Math.round((basketSumByMonth[m] / basketCountByMonth[m]) * 100) / 100 : null });
      }
      setMonthlyTurnoverBarData(turnoverData);
      setMonthlyAvgBasketValueData(basketData);
      setLoadingMonthlyTurnoverBar(false);
      setLoadingMonthlyAvgBasketValue(false);
    }).catch(err => {
      setErrorMonthlyTurnoverBar('Error fetching turnover.');
      setErrorMonthlyAvgBasketValue('Error fetching basket value.');
      setMonthlyTurnoverBarData([]);
      setMonthlyAvgBasketValueData([]);
      setLoadingMonthlyTurnoverBar(false);
      setLoadingMonthlyAvgBasketValue(false);
    });
    // --- Cash, Account, COD Sales (cumulative per month) ---
    Promise.all([
      axios.get(`${API_BASE_URL}/api/daily_cash_sales_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } }),
      axios.get(`${API_BASE_URL}/api/daily_account_sales_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } }),
      axios.get(`${API_BASE_URL}/api/daily_cod_sales_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } })
    ]).then(([cashRes, accountRes, codRes]) => {
      const dailyCash = cashRes.data?.daily_cash_sales || [];
      const dailyAccount = accountRes.data?.daily_account_sales || [];
      const dailyCod = codRes.data?.daily_cod_sales || [];
      let cashByMonth = Array(12).fill(0), accountByMonth = Array(12).fill(0), codByMonth = Array(12).fill(0);
      dailyCash.forEach(d => { const m = new Date(d.date).getMonth(); cashByMonth[m] += d.cash_sales || 0; });
      dailyAccount.forEach(d => { const m = new Date(d.date).getMonth(); accountByMonth[m] += d.account_sales || 0; });
      dailyCod.forEach(d => { const m = new Date(d.date).getMonth(); codByMonth[m] += d.cod_sales || 0; });
      let cumCash = 0, cumAccount = 0, cumCod = 0;
      const cashData = [], accountData = [], codData = [];
      for (let m = 0; m <= lastMonth; m++) {
        cumCash += cashByMonth[m];
        cumAccount += accountByMonth[m];
        cumCod += codByMonth[m];
        cashData.push({ month: monthLabels[m], cumulative: Math.round(cumCash) });
        accountData.push({ month: monthLabels[m], cumulative: Math.round(cumAccount) });
        codData.push({ month: monthLabels[m], cumulative: Math.round(cumCod) });
      }
      setMonthlyCashSalesData(cashData);
      setMonthlyAccountSalesData(accountData);
      setMonthlyCodSalesData(codData);
      setLoadingMonthlyCashSales(false);
      setLoadingMonthlyAccountSales(false);
      setLoadingMonthlyCodSales(false);
      // Pie chart for sales breakdown (total for each type)
      const cashTotal = cumCash, accountTotal = cumAccount, codTotal = cumCod;
      const total = cashTotal + accountTotal + codTotal;
      const pieData = [
        { name: 'Cash Sales', value: cashTotal },
        { name: 'Debtor Sales', value: accountTotal },
        { name: 'COD Sales', value: codTotal }
      ];
      setMonthlySalesPieData(total > 0 ? pieData : []);
      setLoadingMonthlySalesPie(false);
      setErrorMonthlySalesPie(null);
    }).catch(err => {
      setErrorMonthlyCashSales('Error fetching cash sales.');
      setErrorMonthlyAccountSales('Error fetching account sales.');
      setErrorMonthlyCodSales('Error fetching COD sales.');
      setErrorMonthlySalesPie('Error fetching sales pie.');
      setMonthlyCashSalesData([]);
      setMonthlyAccountSalesData([]);
      setMonthlyCodSalesData([]);
      setMonthlySalesPieData([]);
      setLoadingMonthlyCashSales(false);
      setLoadingMonthlyAccountSales(false);
      setLoadingMonthlyCodSales(false);
      setLoadingMonthlySalesPie(false);
    });
    // --- Tender Pie (Cash/Card, total for each type) ---
    Promise.all([
      axios.get(`${API_BASE_URL}/api/daily_cash_tenders_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } }),
      axios.get(`${API_BASE_URL}/api/daily_credit_card_tenders_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } })
    ]).then(([cashRes, cardRes]) => {
      const dailyCash = cashRes.data?.daily_cash_tenders || [];
      const dailyCard = cardRes.data?.daily_credit_card_tenders || [];
      let cashTotal = 0, cardTotal = 0;
      dailyCash.forEach(d => { cashTotal += d.cash_tenders_today || 0; });
      dailyCard.forEach(d => { cardTotal += d.credit_card_tenders_today || 0; });
      const total = cashTotal + cardTotal;
      const pieData = [
        { name: 'Cash Tenders', value: cashTotal },
        { name: 'Credit Card Tenders', value: cardTotal }
      ];
      setMonthlyTenderPieData(total > 0 ? pieData : []);
      setLoadingMonthlyTenderPie(false);
      setErrorMonthlyTenderPie(null);
    }).catch(err => {
      setErrorMonthlyTenderPie('Error fetching tender pie.');
      setMonthlyTenderPieData([]);
      setLoadingMonthlyTenderPie(false);
    });
    // --- Scripts Dispensed (sum per month, divided by 100) ---
    axios.get(`${API_BASE_URL}/api/daily_scripts_dispensed_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } })
      .then(res => {
        const daily = res.data?.daily_scripts_dispensed || [];
        let scriptsByMonth = Array(12).fill(0);
        daily.forEach(d => {
          const m = new Date(d.date).getMonth();
          scriptsByMonth[m] += d.scripts_dispensed || 0;
        });
        const scriptsData = [];
        for (let m = 0; m <= lastMonth; m++) {
          scriptsData.push({ month: monthLabels[m], scripts_dispensed: scriptsByMonth[m] / 100 });
        }
        setMonthlyScriptsDispensedData(scriptsData);
        setLoadingMonthlyScriptsDispensed(false);
      }).catch(err => {
        setErrorMonthlyScriptsDispensed('Error fetching scripts dispensed.');
        setMonthlyScriptsDispensedData([]);
        setLoadingMonthlyScriptsDispensed(false);
      });
    // --- GP Percent (average per month) ---
    axios.get(`${API_BASE_URL}/api/daily_gp_percent_for_range/${firstDayCurrentYear}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } })
      .then(res => {
        const daily = res.data?.daily_gp_percent || [];
        let gpSumByMonth = Array(12).fill(0);
        let gpCountByMonth = Array(12).fill(0);
        daily.forEach(d => {
          const m = new Date(d.date).getMonth();
          if (d.gp_percent !== null && d.gp_percent !== undefined) {
            gpSumByMonth[m] += d.gp_percent;
            gpCountByMonth[m] += 1;
          }
        });
        const gpData = [];
        for (let m = 0; m <= lastMonth; m++) {
          gpData.push({ month: monthLabels[m], gp_percent: gpCountByMonth[m] ? Math.round((gpSumByMonth[m] / gpCountByMonth[m]) * 100) / 100 : null });
        }
        setMonthlyGpPercentData(gpData);
        setLoadingMonthlyGpPercent(false);
      }).catch(err => {
        setErrorMonthlyGpPercent('Error fetching GP%.');
        setMonthlyGpPercentData([]);
        setLoadingMonthlyGpPercent(false);
      });
  }, [selectedPharmacy, selectedDate]);

  const getYearLabel = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('default', { year: 'numeric' });
  };

  return (
    <div style={{ width: '100vw', boxSizing: 'border-box', marginTop: '0rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Overlaid Line Chart - Minimalist */}
      <div style={{ width: '100vw', height: 160, marginBottom: '1rem', padding: '0', position: 'relative' }}>
        {loadingChart ? (
          <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: '25%' }}>Loading chart...</div>
        ) : errorChart ? (
          <div style={{ color: 'red', textAlign: 'center', marginTop: '25%' }}>{errorChart}</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedChartData} margin={{ top: 10, right: 0, left: 0, bottom: 10 }}>
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#FF4500', strokeWidth: 1, opacity: 0.1 }} />
                <Line type="monotone" dataKey="currentYear" name={`${new Date(selectedDate).getFullYear()} YTD`} stroke="#FF4500" strokeWidth={3} dot={false} connectNulls={true} />
                <Line type="monotone" dataKey="previousYear" name={`${new Date(selectedDate).getFullYear() - 1} YTD`} stroke="#A9A9A9" strokeWidth={3} dot={false} connectNulls={true} />
              </LineChart>
            </ResponsiveContainer>
            {comparisonDetails && (
              <div style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                background: 'rgba(255, 69, 0, 0.85)',
                color: '#FFFFFF',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                zIndex: 10,
                border: '1px solid rgba(255, 69, 0, 0.5)',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}>
                {comparisonDetails.arrow && <span style={{ fontSize: '0.9rem', lineHeight: '1', fontWeight: 700 }}>{comparisonDetails.arrow}</span>}
                <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>{comparisonDetails.text.split(' ')[0]} {comparisonDetails.text.split(' ')[1]}</span>
                <span style={{ marginLeft: '2px', fontWeight: 600, fontSize: '0.75rem' }}>{comparisonDetails.text.substring(comparisonDetails.text.indexOf(' ', comparisonDetails.text.indexOf(' ') + 1) + 1)}</span>
              </div>
            )}
          </>
        )}
      </div>
      {/* KPI Card */}
      <div style={{
        width: 'calc(100vw - 5mm)',
        marginLeft: '2mm',
        marginRight: '2mm',
        background: '#232b3b',
        color: '#fff',
        borderRadius: '1.2rem',
        fontSize: '2.2rem',
        fontWeight: 700,
        textAlign: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        padding: '0.8rem 0.2rem',
        marginBottom: '2mm',
        position: 'relative',
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: 4, textAlign: 'left', marginLeft: '4mm', color: '#bdbdbd' }}>
          Turnover ({getYearLabel(selectedDate)} YTD)
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 600, marginTop: 4, color: '#FF4500', textAlign: 'left', marginLeft: '4mm' }}>
          {loadingKpi ? 'Loading...' : errorKpi ? <span style={{ color: 'red', fontSize: '1.1rem' }}>{errorKpi}</span> :
            `R ${mtdTurnover !== null ? Math.round(mtdTurnover).toLocaleString('en-ZA', { maximumFractionDigits: 0 }) : 'N/A'}`}
        </div>
        {/* Avg basket metrics, right-aligned, side by side */}
        <div style={{ position: 'absolute', top: 22, right: 18, display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#bdbdbd', fontWeight: 400, lineHeight: 1 }}>Avg basket</span>
            <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600, lineHeight: 2.5 }}>
              {loadingAvgBasket ? '...' : errorAvgBasket ? <span style={{ color: 'red', fontSize: '0.9rem' }}>Err</span> : `R${avgBasket.value !== null ? avgBasket.value.toLocaleString('en-ZA', { maximumFractionDigits: 2 }) : 'N/A'}`}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#bdbdbd', fontWeight: 400, lineHeight: 1 }}>Avg size</span>
            <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600, lineHeight: 2.5 }}>
              {loadingAvgBasket ? '...' : errorAvgBasket ? <span style={{ color: 'red', fontSize: '0.9rem' }}>Err</span> : `${avgBasket.size !== null ? avgBasket.size.toLocaleString('en-ZA', { maximumFractionDigits: 2 }) : 'N/A'}`}
            </span>
          </div>
        </div>
      </div>
      {/* Two blank cards below the KPI card, in a row, each 50% width, 1.5mm gap and edge spacing */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '1.5mm', alignItems: 'center', justifyContent: 'center', marginBottom: '2mm', padding: 0, boxSizing: 'border-box' }}>
        {/* Left card: YTD GP% and Cumulative GP */}
        <div style={{
          width: 'calc(50vw - 2.5mm)',
          background: '#232b3b',
          borderRadius: '1.2rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          minHeight: '60px',
          marginLeft: '1.5mm',
          marginRight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0.5rem 1.2rem',
        }}>
          <div style={{ color: '#bdbdbd', fontSize: '0.95rem', fontWeight: 500, marginBottom: 2 }}>YTD GP%</div>
          <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: 10 }}>
            {loadingGpStats ? '...' : errorGpStats ? <span style={{ color: 'red', fontSize: '1.1rem' }}>Err</span> : gpStats.percent !== null ? `${gpStats.percent.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}%` : 'N/A'}
          </div>
          <div style={{ color: '#bdbdbd', fontSize: '0.95rem', fontWeight: 500, marginBottom: 2 }}>Cumulative GP</div>
          <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>
            {loadingGpStats ? '...' : errorGpStats ? <span style={{ color: 'red', fontSize: '1.1rem' }}>Err</span> : gpStats.value !== null ? `R${gpStats.value.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}` : 'N/A'}
          </div>
        </div>
        {/* Right card: Cost of Sales and Purchases */}
        <div style={{
          width: 'calc(50vw - 2.5mm)',
          background: '#232b3b',
          borderRadius: '1.2rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          minHeight: '60px',
          marginLeft: 0,
          marginRight: '1.5mm',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0.5rem 1.2rem',
        }}>
          <div style={{ color: '#bdbdbd', fontSize: '0.95rem', fontWeight: 500, marginBottom: 2 }}>Cost of Sales</div>
          <div style={{ color: '#39FF14', fontSize: '1.25rem', fontWeight: 700, marginBottom: 10 }}>
            {loadingCostStats ? '...' : errorCostStats ? <span style={{ color: 'red', fontSize: '1.1rem' }}>Err</span> : costStats.cost !== null ? `R${costStats.cost.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}` : 'N/A'}
          </div>
          <div style={{ color: '#bdbdbd', fontSize: '0.95rem', fontWeight: 500, marginBottom: 2 }}>Purchases</div>
          <div style={{ color: '#FF4500', fontSize: '1.25rem', fontWeight: 700 }}>
            {loadingCostStats ? '...' : errorCostStats ? <span style={{ color: 'red', fontSize: '1.1rem' }}>Err</span> : costStats.purchases !== null ? `R${costStats.purchases.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}` : 'N/A'}
          </div>
        </div>
      </div>
      {/* Second row of two blank KPI cards */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '1.5mm', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', padding: 0, boxSizing: 'border-box' }}>
        {/* Left card: Transaction Qty and Script Qty */}
        <div style={{
          width: 'calc(50vw - 2.5mm)',
          background: '#232b3b',
          borderRadius: '1.2rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          minHeight: '60px',
          marginLeft: '1.5mm',
          marginRight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0.5rem 1.2rem',
        }}>
          <div style={{ color: '#bdbdbd', fontSize: '0.95rem', fontWeight: 500, marginBottom: 2 }}>Transaction Qty</div>
          <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: 10 }}>
            {loadingTransStats ? '...' : errorTransStats ? <span style={{ color: 'red', fontSize: '1.1rem' }}>Err</span> : transStats.transactions !== null ? transStats.transactions.toLocaleString('en-ZA') : 'N/A'}
          </div>
          <div style={{ color: '#bdbdbd', fontSize: '0.95rem', fontWeight: 500, marginBottom: 2 }}>Script Qty</div>
          <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>
            {loadingTransStats ? '...' : errorTransStats ? <span style={{ color: 'red', fontSize: '1.1rem' }}>Err</span> : transStats.scripts !== null ? transStats.scripts.toLocaleString('en-ZA') : 'N/A'}
          </div>
        </div>
        {/* Right card: Dispensary vs Total Turnover Pie Chart */}
        <div style={{
          width: 'calc(50vw - 2.5mm)',
          background: '#232b3b',
          borderRadius: '1.2rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          minHeight: '60px',
          marginLeft: 0,
          marginRight: '1.5mm',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0.5rem 1.2rem',
        }}>
          <div style={{ color: '#bdbdbd', fontSize: '0.95rem', fontWeight: 500, marginBottom: 2 }}>Dispensary %</div>
          {loadingDispPie ? (
            <div style={{ color: '#bdbdbd', fontSize: '1.1rem', marginTop: 18 }}>...</div>
          ) : errorDispPie ? (
            <div style={{ color: 'red', fontSize: '1.1rem', marginTop: 18 }}>Err</div>
          ) : (
            <div style={{ width: 140, height: 95, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
              <PieChart width={160} height={90} style={{ marginTop: 0 }}>
                <Pie
                  data={[
                    { name: 'Dispensary', value: dispPie.disp },
                    { name: 'Other', value: Math.max(dispPie.total - dispPie.disp, 0) },
                  ]}
                  cx={80}
                  cy={74}
                  innerRadius={48}
                  outerRadius={70}
                  startAngle={180}
                  endAngle={0}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  <Cell key="disp" fill="#FFB800" />
                  <Cell key="other" fill="#374151" />
                </Pie>
              </PieChart>
              <div style={{
                position: 'absolute',
                left: 8,
                right: 0,
                top: 38,
                textAlign: 'center',
                fontSize: '2.1rem',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-1px',
                pointerEvents: 'none',
              }}>
                {dispPie.percent !== null ? Math.round(dispPie.percent) : ''}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Custom CSS for Slick Dots */}
      <style>{`
        .slick-dots li button:before {
          color: white !important;
          opacity: 0.2 !important;
          font-size: 12px !important;
        }
        .slick-dots li.slick-active button:before {
          color: white !important;
          opacity: 1 !important;
          font-size: 15px !important;
        }
      `}</style>
      {/* Carousel Section: Add below the last row of KPI cards */}
      <div style={{ width: '100vw', margin: '0 auto 1.5rem auto', padding: 0, maxWidth: '100vw' }}>
        {/* Label for Carousel */}
        <div style={{
          color: '#bdbdbd',
          fontSize: '0.9rem',
          fontWeight: 500,
          textAlign: 'center',
          marginBottom: '0.5rem'
        }}>
          {'← Swipe for more charts →'}
        </div>
        <Slider
          dots={true}
          infinite={true}
          speed={500}
          slidesToShow={1}
          slidesToScroll={1}
          arrows={false}
          autoplay={false}
          style={{ width: '96vw', margin: '0 auto', borderRadius: '1.2rem', background: '#232b3b', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', padding: '0.4rem 0.4rem' }}
        >
          {/* Slide 1: Cost of Sales vs Purchases (Cumulative) */}
          <div style={{ background: '#232b3b', borderRadius: '1rem' }}>
            <div style={{ color: '#fff', fontSize: '1.1rem', textAlign: 'center', fontWeight: 600, marginBottom: 12, marginTop: 12, padding: '0rem 5rem' }}>Cost of Sales vs Purchases ({selectedDate && (new Date(selectedDate)).getFullYear()})</div>
            <div style={{ width: '100%', height: 200, marginBottom: 0, marginLeft: '-1rem' }}>
              {(loadingMonthlyPurchases || loadingMonthlyCostOfSales) ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>Loading chart...</div>
              ) : errorMonthlyPurchases ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorMonthlyPurchases}</div>
              ) : errorMonthlyCostOfSales ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorMonthlyCostOfSales}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyPurchasesData.map((p, i) => ({
                    ...p,
                    cost_of_sales: monthlyCostOfSalesData[i]?.cumulative || null
                  }))} margin={{ top: 10, right: 0, left: 0, bottom: 10 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#bdbdbd' }} axisLine={{ stroke: '#374151' }} tickLine={{ stroke: '#374151' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#bdbdbdbd' }}
                      axisLine={{ stroke: '#374151' }}
                      tickLine={{ stroke: '#374151' }}
                      tickFormatter={value => {
                        if (value >= 1000000) return `R${(value/1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
                        if (value >= 1000) return `R${(value/1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
                        return `R${value}`;
                      }}
                      width={60}
                    />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{ background: 'rgba(35, 43, 59, 0.9)', border: '1px solid #374151', color: '#fff', borderRadius: '0.8rem', padding: '0.8rem 1.2rem', fontSize: '0.9rem', fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
                            <div style={{ color: '#FFB800', fontWeight: 700, fontSize: '1.15rem' }}>
                              Purchases: R {payload[0].payload.cumulative.toLocaleString('en-ZA')}
                            </div>
                            {payload[0].payload.cost_of_sales !== null && (
                              <div style={{ color: '#39FF14', fontWeight: 700, fontSize: '1.05rem', marginTop: 2 }}>
                                Cost of Sales: R {payload[0].payload.cost_of_sales.toLocaleString('en-ZA')}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }} cursor={{ stroke: '#FF4500', strokeWidth: 1, opacity: 0.1 }} />
                    <Line type="monotone" dataKey="cumulative" name="Purchases" stroke="#FFB800" strokeWidth={3} dot={false} connectNulls={true} />
                    <Line type="monotone" dataKey="cost_of_sales" name="Cost of Sales" stroke="#39FF14" strokeWidth={3} dot={false} connectNulls={true} />
                    <Legend verticalAlign="bottom" height={36} iconType="plainline" wrapperStyle={{ fontSize: '0.7rem', color: '#bdbdbd', paddingTop: '0px'}}/>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          {/* Slide 2: Turnover Bar (per month) & Avg Basket Value (average per month) */}
          <div style={{ background: '#232b3b', borderRadius: '1rem', padding: '0.4rem 0.4rem', boxSizing: 'border-box', height: '100%' }}>
            <div style={{ color: '#fff', fontSize: '1.1rem', textAlign: 'center', fontWeight: 600, marginBottom: 12, marginTop: 12, padding: '0rem 1rem' }}>Monthly Turnover & Basket Value ({selectedDate && (new Date(selectedDate)).getFullYear()})</div>
            <div style={{ width: '100%', height: 200, marginBottom: 0, marginLeft: '0.8rem' }}>
              {(loadingMonthlyTurnoverBar || loadingMonthlyAvgBasketValue) ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>Loading chart...</div>
              ) : errorMonthlyTurnoverBar ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorMonthlyTurnoverBar}</div>
              ) : errorMonthlyAvgBasketValue ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorMonthlyAvgBasketValue}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={monthlyTurnoverBarData.map((item, index) => ({
                      ...item,
                      avgBasketValue: monthlyAvgBasketValueData[index]?.avgBasketValue ?? null,
                    }))}
                    margin={{ top: 10, right: 5, left: -22, bottom: -15 }}
                  >
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#bdbdbd' }} axisLine={{ stroke: '#374151' }} tickLine={{ stroke: '#374151' }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: '#bdbdbd' }}
                      axisLine={{ stroke: '#374151' }}
                      tickLine={{ stroke: '#374151' }}
                      tickFormatter={value => {
                        if (value >= 1000000) return `R${(value/1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
                        if (value >= 1000) return `R${(value/1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
                        return `R${value}`;
                      }}
                      width={60}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#bdbdbd' }}
                      axisLine={{ stroke: '#374151' }}
                      tickLine={{ stroke: '#374151' }}
                      tickFormatter={value => `R${value.toFixed(0)}`}
                      width={50}
                      margin={{ right: 10 }}
                    />
                    <Tooltip
                      content={<BarChartTooltip />}
                      cursor={{ fill: 'rgba(255, 69, 0, 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="plainline" wrapperStyle={{ fontSize: '0.7rem', color: '#bdbdbd', paddingTop: '0px'}}/>
                    <Bar yAxisId="left" dataKey="turnover" name="Monthly Turnover" fill="#FF4500" barSize={22} radius={[3, 3, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="avgBasketValue" name="Avg Basket Value" stroke="#39FF14" strokeWidth={2.5} dot={false} connectNulls={true} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          {/* Slide 3: Sales Breakdown by Type (Pie) */}
          <div style={{ background: '#232b3b', borderRadius: '1rem', padding: '20px', boxSizing: 'border-box', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, marginTop: 12 }}>
                Sales Breakdown by Type ({selectedDate && (new Date(selectedDate)).getFullYear()})
              </div>
              {loadingMonthlySalesPie ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>Loading chart...</div>
              ) : errorMonthlySalesPie ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorMonthlySalesPie}</div>
              ) : monthlySalesPieData.length === 0 ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>No data available for this year.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={monthlySalesPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      stroke="none"
                    >
                      <Cell key="cash" fill="#FF4500" />
                      <Cell key="debtor" fill="#39FF14" />
                      <Cell key="cod" fill="#A259FF" />
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem', color: '#bdbdbd' }}/>
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{
                            background: 'rgba(35, 43, 59, 0.9)',
                            border: '1px solid #374151',
                            color: '#fff',
                            borderRadius: '0.8rem',
                            padding: '0.8rem 1.2rem',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          }}>
                            <div style={{ color: payload[0].payload.fill || '#FF4500' }}>
                              {payload[0].name}: R {payload[0].value.toLocaleString('en-ZA')}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          {/* Slide 4: Tender Breakdown (Pie) */}
          <div style={{ background: '#232b3b', borderRadius: '1rem', padding: '20px', boxSizing: 'border-box', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, marginTop: 12 }}>
                Tender Breakdown ({selectedDate && (new Date(selectedDate)).getFullYear()})
              </div>
              {loadingMonthlyTenderPie ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>Loading chart...</div>
              ) : errorMonthlyTenderPie ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorMonthlyTenderPie}</div>
              ) : monthlyTenderPieData.length === 0 ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>No data available for this year.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={monthlyTenderPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      stroke="none"
                    >
                      <Cell key="cash" fill="#FFB800" />
                      <Cell key="card" fill="#A259FF" />
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem', color: '#bdbdbd' }}/>
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{
                            background: 'rgba(35, 43, 59, 0.9)',
                            border: '1px solid #374151',
                            color: '#fff',
                            borderRadius: '0.8rem',
                            padding: '0.8rem 1.2rem',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          }}>
                            <div style={{ color: payload[0].payload.fill || '#FF4500' }}>
                              {payload[0].name}: R {payload[0].value.toLocaleString('en-ZA')}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          {/* Slide 5: Scripts Dispensed per Month (Line) */}
          <div style={{ background: '#232b3b', borderRadius: '1rem', padding: '20px', boxSizing: 'border-box', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, marginTop: 12 }}>
                Scripts Dispensed per Month ({selectedDate && (new Date(selectedDate)).getFullYear()})
              </div>
              {loadingMonthlyScriptsDispensed ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>Loading chart...</div>
              ) : errorMonthlyScriptsDispensed ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorMonthlyScriptsDispensed}</div>
              ) : monthlyScriptsDispensedData.length === 0 ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>No data available for this year.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyScriptsDispensedData} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#bdbdbd' }} axisLine={{ stroke: '#374151' }} tickLine={{ stroke: '#374151' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#bdbdbd' }} axisLine={{ stroke: '#374151' }} tickLine={{ stroke: '#374151' }} width={60}
                      tickFormatter={value => value.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}
                    />
                    <Tooltip content={<CustomTooltipSingleValue valueLabel="Scripts Dispensed" valuePrefix="" />} cursor={{ stroke: '#39FF14', strokeWidth: 1, opacity: 0.1 }} />
                    <Line type="monotone" dataKey="scripts_dispensed" name="Scripts Dispensed" stroke="#39FF14" strokeWidth={3} dot={false} connectNulls={true} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          {/* Slide 6: Monthly GP % (Bar) */}
          <div style={{ background: '#232b3b', borderRadius: '1rem', padding: '20px', boxSizing: 'border-box', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, marginTop: 12 }}>
                Monthly GP % ({selectedDate && (new Date(selectedDate)).getFullYear()})
              </div>
              {loadingMonthlyGpPercent ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>Loading chart...</div>
              ) : errorMonthlyGpPercent ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorMonthlyGpPercent}</div>
              ) : monthlyGpPercentData.length === 0 ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>No data available for this year.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyGpPercentData} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#bdbdbd' }} axisLine={{ stroke: '#374151' }} tickLine={{ stroke: '#374151' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#bdbdbd' }} axisLine={{ stroke: '#374151' }} tickLine={{ stroke: '#374151' }} width={60}
                      tickFormatter={value => value !== null ? value.toLocaleString('en-ZA', { maximumFractionDigits: 2 }) + '%' : ''}
                    />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const gp = payload.find(p => p.dataKey === 'gp_percent');
                        return (
                          <div style={{
                            background: 'rgba(35, 43, 59, 0.9)',
                            border: '1px solid #374151',
                            color: '#fff',
                            borderRadius: '0.8rem',
                            padding: '0.8rem 1.2rem',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          }}>
                            {gp && (
                              <div style={{ color: '#39FF14' }}>
                                GP%: {gp.value !== null && gp.value !== undefined ? gp.value.toLocaleString('en-ZA', { maximumFractionDigits: 2 }) + '%' : 'N/A'}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }} cursor={{ fill: 'rgba(57,255,20,0.12)' }} />
                    <Bar dataKey="gp_percent" name="GP" fill="#FFB800" barSize={25} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </Slider>
      </div>
    </div>
  );
}

export default YearlyView; 
