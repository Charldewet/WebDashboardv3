import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Label, XAxis, YAxis, Legend, BarChart, Bar, ComposedChart } from 'recharts';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
// Import any needed chart components, etc.

// Updated Custom Tooltip for overlaid chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const currentYearPayload = payload.find(p => p.dataKey === 'currentYear');
    const previousYearPayload = payload.find(p => p.dataKey === 'previousYear');

    // Determine if there is any valid data to show to prevent empty tooltip box
    const hasCurrentYearData = currentYearPayload && currentYearPayload.value !== null;
    const hasPreviousYearData = previousYearPayload && previousYearPayload.value !== null;

    if (!hasCurrentYearData && !hasPreviousYearData) {
      return null; // Don't render tooltip if no data for either year at this point
    }

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
        {/* Day indication removed */}
        {currentYearPayload && currentYearPayload.value !== null && (
          <div style={{ color: currentYearPayload.stroke }}>
            {currentYearPayload.name}: R {currentYearPayload.value.toLocaleString('en-ZA')}
          </div>
        )}
        {previousYearPayload && previousYearPayload.value !== null && (
          <div style={{
            color: previousYearPayload.stroke,
            marginTop: hasCurrentYearData ? '0.2rem' : '0' // Add margin only if current year data is also shown
          }}>
            {previousYearPayload.name}: R {previousYearPayload.value.toLocaleString('en-ZA')}
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Bar Chart in Carousel Slide 2
const BarChartTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const turnoverData = payload.find(p => p.dataKey === 'turnover');
    const basketValueData = payload.find(p => p.dataKey === 'avgBasketValue');

    return (
      <div style={{
        background: 'rgba(35, 43, 59, 0.9)', // Match CustomTooltip
        border: '1px solid #374151',        // Match CustomTooltip
        color: '#fff',                       // Match CustomTooltip
        borderRadius: '0.8rem',             // Match CustomTooltip
        padding: '0.8rem 1.2rem',           // Match CustomTooltip
        fontSize: '0.9rem',                 // Match CustomTooltip
        fontWeight: 500,                    // Match CustomTooltip
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)', // Match CustomTooltip
      }}>
        {turnoverData && typeof turnoverData.value === 'number' && (
          <div style={{ color: turnoverData.payload.fill || '#FF4500' }}> 
            {turnoverData.name}: R {turnoverData.value.toLocaleString('en-ZA')}
          </div>
        )}
        {basketValueData && typeof basketValueData.value === 'number' && (
          <div style={{ 
            color: basketValueData.stroke || '#82ca9d', // Default or specified stroke color
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

// Add a generic custom tooltip for single-value line/bar charts
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

function MonthlyView({ selectedPharmacy, selectedDate }) {
  const [mtdTurnover, setMtdTurnover] = useState(null); // For KPI card
  const [loadingKpi, setLoadingKpi] = useState(true);      // For KPI card
  const [errorKpi, setErrorKpi] = useState(null);        // For KPI card

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

  const [carouselPurchasesData, setCarouselPurchasesData] = useState([]);
  const [loadingCarouselPurchases, setLoadingCarouselPurchases] = useState(true);
  const [errorCarouselPurchases, setErrorCarouselPurchases] = useState(null);

  const [carouselCostOfSalesData, setCarouselCostOfSalesData] = useState([]);
  const [loadingCarouselCostOfSales, setLoadingCarouselCostOfSales] = useState(true);
  const [errorCarouselCostOfSales, setErrorCarouselCostOfSales] = useState(null);

  const [dailyTurnoverBarData, setDailyTurnoverBarData] = useState([]);
  const [loadingDailyTurnoverBar, setLoadingDailyTurnoverBar] = useState(true);
  const [errorDailyTurnoverBar, setErrorDailyTurnoverBar] = useState(null);

  const [dailyAvgBasketValueData, setDailyAvgBasketValueData] = useState([]);
  const [loadingDailyAvgBasketValue, setLoadingDailyAvgBasketValue] = useState(true);
  const [errorDailyAvgBasketValue, setErrorDailyAvgBasketValue] = useState(null);

  const [carouselCashSalesData, setCarouselCashSalesData] = useState([]);
  const [loadingCarouselCashSales, setLoadingCarouselCashSales] = useState(true);
  const [errorCarouselCashSales, setErrorCarouselCashSales] = useState(null);

  const [carouselAccountSalesData, setCarouselAccountSalesData] = useState([]);
  const [loadingCarouselAccountSales, setLoadingCarouselAccountSales] = useState(true);
  const [errorCarouselAccountSales, setErrorCarouselAccountSales] = useState(null);

  const [carouselCodSalesData, setCarouselCodSalesData] = useState([]);
  const [loadingCarouselCodSales, setLoadingCarouselCodSales] = useState(true);
  const [errorCarouselCodSales, setErrorCarouselCodSales] = useState(null);

  const [salesPieData, setSalesPieData] = useState([]);
  const [loadingSalesPie, setLoadingSalesPie] = useState(true);
  const [errorSalesPie, setErrorSalesPie] = useState(null);

  const [tenderPieData, setTenderPieData] = useState([]);
  const [loadingTenderPie, setLoadingTenderPie] = useState(true);
  const [errorTenderPie, setErrorTenderPie] = useState(null);

  const [dailyScriptsDispensedData, setDailyScriptsDispensedData] = useState([]);
  const [loadingDailyScriptsDispensed, setLoadingDailyScriptsDispensed] = useState(true);
  const [errorDailyScriptsDispensed, setErrorDailyScriptsDispensed] = useState(null);

  const [dailyGpPercentData, setDailyGpPercentData] = useState([]);
  const [loadingDailyGpPercent, setLoadingDailyGpPercent] = useState(true);
  const [errorDailyGpPercent, setErrorDailyGpPercent] = useState(null);

  const [dailyDispensaryTurnoverData, setDailyDispensaryTurnoverData] = useState([]);
  const [dailyTotalTurnoverData, setDailyTotalTurnoverData] = useState([]);
  const [loadingDailyDispensaryPercent, setLoadingDailyDispensaryPercent] = useState(true);
  const [errorDailyDispensaryPercent, setErrorDailyDispensaryPercent] = useState(null);

  const API_BASE_URL = 'http://192.168.0.104:5001';

  useEffect(() => {
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
      setCarouselPurchasesData([]);
      setLoadingCarouselPurchases(true);
      setErrorCarouselPurchases(null);
      setCarouselCostOfSalesData([]);
      setLoadingCarouselCostOfSales(true);
      setErrorCarouselCostOfSales(null);
      setDailyTurnoverBarData([]);
      setLoadingDailyTurnoverBar(true);
      setErrorDailyTurnoverBar(null);
      setDailyAvgBasketValueData([]);
      setLoadingDailyAvgBasketValue(true);
      setErrorDailyAvgBasketValue(null);
      setCarouselCashSalesData([]);
      setLoadingCarouselCashSales(true);
      setErrorCarouselCashSales(null);
      setCarouselAccountSalesData([]);
      setLoadingCarouselAccountSales(true);
      setErrorCarouselAccountSales(null);
      setCarouselCodSalesData([]);
      setLoadingCarouselCodSales(true);
      setErrorCarouselCodSales(null);
      setSalesPieData([]);
      setLoadingSalesPie(true);
      setErrorSalesPie(null);
      setTenderPieData([]);
      setLoadingTenderPie(true);
      setErrorTenderPie(null);
      setDailyScriptsDispensedData([]);
      setLoadingDailyScriptsDispensed(true);
      setErrorDailyScriptsDispensed(null);
      setDailyGpPercentData([]);
      setLoadingDailyGpPercent(true);
      setErrorDailyGpPercent(null);
      setDailyDispensaryTurnoverData([]);
      setDailyTotalTurnoverData([]);
      setLoadingDailyDispensaryPercent(true);
      setErrorDailyDispensaryPercent(null);
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

    setLoadingCarouselPurchases(true);
    setErrorCarouselPurchases(null);
    setCarouselPurchasesData([]);

    setLoadingDailyTurnoverBar(true);
    setErrorDailyTurnoverBar(null);
    setDailyTurnoverBarData([]);

    setLoadingDailyAvgBasketValue(true);
    setErrorDailyAvgBasketValue(null);
    setDailyAvgBasketValueData([]);

    const dateObj = new Date(selectedDate);
    const currentYearNum = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');

    const firstDayCurrentMonth = `${currentYearNum}-${month}-01`;
    const lastDayCurrentPeriod = selectedDate;

    const previousYearNum = currentYearNum - 1;
    const firstDayPreviousYearMonth = `${previousYearNum}-${month}-01`;
    const lastDayPreviousYearPeriodObj = new Date(previousYearNum, dateObj.getMonth(), dateObj.getDate());
    const lastDayPreviousYearPeriod = `${lastDayPreviousYearPeriodObj.getFullYear()}-${(lastDayPreviousYearPeriodObj.getMonth() + 1).toString().padStart(2, '0')}-${lastDayPreviousYearPeriodObj.getDate().toString().padStart(2, '0')}`;

    // Fetch MTD turnover for KPI card
    axios.get(`${API_BASE_URL}/api/turnover_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setMtdTurnover(res.data?.turnover ?? 0);
        setLoadingKpi(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching MTD turnover.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (KPI).';
        else errorMessage = err.message;
        setErrorKpi(errorMessage);
        setMtdTurnover(0);
        setLoadingKpi(false);
      });

    // Fetch avg basket value/size for KPI card
    axios.get(`${API_BASE_URL}/api/avg_basket_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
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

    // Fetch GP stats for left card
    axios.get(`${API_BASE_URL}/api/gp_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
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

    // Fetch cost of sales and purchases for right card
    axios.get(`${API_BASE_URL}/api/costs_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
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

    // Fetch total transactions and scripts for second row left card
    axios.get(`${API_BASE_URL}/api/transactions_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
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

    // Fetch dispensary vs total turnover for donut chart
    axios.get(`${API_BASE_URL}/api/dispensary_vs_total_turnover/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
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

    // Fetch data for overlaid chart
    const fetchCurrentYearChartData = axios.get(`${API_BASE_URL}/api/daily_turnover_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    });
    const fetchPreviousYearChartData = axios.get(`${API_BASE_URL}/api/daily_turnover_for_range/${firstDayPreviousYearMonth}/${lastDayPreviousYearPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    });

    Promise.all([fetchCurrentYearChartData, fetchPreviousYearChartData])
      .then(([resCurrent, resPrevious]) => {
        const dailyCurrent = resCurrent.data?.daily_turnover || [];
        let cumulativeCurrent = 0;
        // processedCurrent will map API data; it might be sparse if API doesn't return every day
        const processedCurrent = dailyCurrent.map(d => {
          cumulativeCurrent += d.turnover || 0; // Handles 0 or null turnover for a day
          return { day: d.date.slice(8, 10), cumulative: Math.round(cumulativeCurrent) };
        });

        const dailyPrevious = resPrevious.data?.daily_turnover || [];
        let cumulativePrevious = 0;
        // processedPrevious might also be sparse
        const processedPrevious = dailyPrevious.map(d => {
          cumulativePrevious += d.turnover || 0; // Handles 0 or null turnover for a day
          return { day: d.date.slice(8, 10), cumulative: Math.round(cumulativePrevious) };
        });

        const dayOfMonthForLoop = new Date(selectedDate).getDate();
        const combined = [];
        let lastKnownCurrentCumulative = 0; // Start at 0 before the first day
        let lastKnownPreviousCumulative = 0; // Start at 0 before the first day

        for (let i = 1; i <= dayOfMonthForLoop; i++) {
          const dayStr = i.toString().padStart(2, '0');
          
          // Find if there's processed data for this specific day
          const currentEntryFromProcessed = processedCurrent.find(d => d.day === dayStr);
          const previousEntryFromProcessed = processedPrevious.find(d => d.day === dayStr);

          // If data exists for this day in processed list, update lastKnown value
          if (currentEntryFromProcessed) {
            lastKnownCurrentCumulative = currentEntryFromProcessed.cumulative;
          }
          // Else, lastKnownCurrentCumulative retains its value from the previous day (carried forward)

          if (previousEntryFromProcessed) {
            lastKnownPreviousCumulative = previousEntryFromProcessed.cumulative;
          }
          // Else, lastKnownPreviousCumulative retains its value from the previous day (carried forward)

          combined.push({
            day: dayStr, // For XAxis label
            currentYear: lastKnownCurrentCumulative, // Now guaranteed to be a number
            previousYear: lastKnownPreviousCumulative, // Now guaranteed to be a number
          });
        }
        setCombinedChartData(combined);
        setLoadingChart(false);

        // Calculate comparison details
        if (combined.length > 0) {
          const lastDataPoint = combined[combined.length - 1];
          const currentVal = lastDataPoint.currentYear !== null ? lastDataPoint.currentYear : 0;
          const previousVal = lastDataPoint.previousYear !== null ? lastDataPoint.previousYear : 0;
          let details = null;

          if (lastDataPoint.previousYear !== null) { // Only show if previous year data is available for comparison for the last point
            const diff = currentVal - previousVal;
            const absDiff = Math.abs(diff);

            if (previousVal === 0) {
              if (currentVal > 0) {
                details = { arrow: '↑', text: `R ${currentVal.toLocaleString('en-ZA')} more than PY (was R0)`, color: '#10B981' };
              } else { // currentVal is also 0
                details = { arrow: '', text: 'Same as last year (R0)', color: '#9CA3AF' };
              }
            } else { // previousVal is not 0
              const percentage = Math.round((diff / previousVal) * 100);
              if (diff > 0) {
                details = { arrow: '↑', text: `R ${absDiff.toLocaleString('en-ZA')} (${percentage > 0 ? '+' : ''}${percentage}%) more than last year`, color: '#10B981' };
              } else if (diff < 0) {
                details = { arrow: '↓', text: `R ${absDiff.toLocaleString('en-ZA')} (${percentage}%) less than last year`, color: '#EF4444' };
              } else { // diff is 0
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
        setComparisonDetails(null); // Reset on error too
      });

    // Fetch daily purchases for the current period
    axios.get(`${API_BASE_URL}/api/daily_purchases_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        const daily = res.data?.daily_purchases || [];
        let cumulative = 0;
        const processed = daily.map(d => {
          cumulative += d.purchases || 0;
          return { day: d.date.slice(8, 10), cumulative: Math.round(cumulative) };
        });
        setCarouselPurchasesData(processed);
        setLoadingCarouselPurchases(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching purchases data.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (Purchases).';
        else errorMessage = err.message;
        setErrorCarouselPurchases(errorMessage);
        setCarouselPurchasesData([]);
        setLoadingCarouselPurchases(false);
      });

    // Fetch daily cost of sales for the current period
    axios.get(`${API_BASE_URL}/api/daily_cost_of_sales_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        const daily = res.data?.daily_cost_of_sales || [];
        let cumulative = 0;
        const processed = daily.map(d => {
          cumulative += d.cost_of_sales || 0;
          return { day: d.date.slice(8, 10), cumulative: Math.round(cumulative) };
        });
        setCarouselCostOfSalesData(processed);
        setLoadingCarouselCostOfSales(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching cost of sales data.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (Cost of Sales).';
        else errorMessage = err.message;
        setErrorCarouselCostOfSales(errorMessage);
        setCarouselCostOfSalesData([]);
        setLoadingCarouselCostOfSales(false);
      });

    // Fetch daily turnover for Bar Chart in Carousel Slide 2
    axios.get(`${API_BASE_URL}/api/daily_turnover_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
    .then(res => {
      const daily = res.data?.daily_turnover || [];
      const dayOfMonthForLoop = new Date(selectedDate).getDate();
      const processedBarData = [];
      let lastKnownTurnover = {}; // Store last known turnover for each day

      // Initialize lastKnownTurnover with 0 for all days in the month up to selectedDate
      for (let i = 1; i <= dayOfMonthForLoop; i++) {
        const dayStr = i.toString().padStart(2, '0');
        lastKnownTurnover[dayStr] = 0;
      }
      
      // Populate with actual turnover data
      daily.forEach(d => {
        const day = d.date.slice(8, 10);
        if (lastKnownTurnover.hasOwnProperty(day)) { // Ensure we only process days within the current month range
             lastKnownTurnover[day] = d.turnover || 0;
        }
      });

      // Create the final array for the bar chart
      for (let i = 1; i <= dayOfMonthForLoop; i++) {
        const dayStr = i.toString().padStart(2, '0');
        processedBarData.push({
          day: dayStr,
          turnover: Math.round(lastKnownTurnover[dayStr]),
        });
      }
      
      setDailyTurnoverBarData(processedBarData);
      setLoadingDailyTurnoverBar(false);
    })
    .catch(err => {
      let errorMessage = 'Error fetching daily turnover for bar chart.';
      if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
      else if (err.request) errorMessage = 'No response from server (Bar Chart).';
      else errorMessage = err.message;
      setErrorDailyTurnoverBar(errorMessage);
      setDailyTurnoverBarData([]);
      setLoadingDailyTurnoverBar(false);
    });

    // Fetch daily average basket value for Line Chart in Carousel Slide 2
    axios.get(`${API_BASE_URL}/api/daily_avg_basket_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
    .then(res => {
      const dailyData = res.data?.daily_avg_basket || []; // Assuming API returns { date: "YYYY-MM-DD", avg_basket_value: X }
      const dayOfMonthForLoop = new Date(selectedDate).getDate();
      const processedBasketData = [];
      const basketValuesByDay = {};

      // Initialize with null for all days in the month up to selectedDate
      for (let i = 1; i <= dayOfMonthForLoop; i++) {
        const dayStr = i.toString().padStart(2, '0');
        basketValuesByDay[dayStr] = null;
      }
      
      // Populate with actual basket data
      dailyData.forEach(d => {
        const day = d.date.slice(8, 10);
        if (basketValuesByDay.hasOwnProperty(day)) {
          basketValuesByDay[day] = d.avg_basket_value !== undefined && d.avg_basket_value !== null ? Math.round(d.avg_basket_value * 100) / 100 : null; // Keep two decimal places
        }
      });

      // Create the final array for the line chart
      for (let i = 1; i <= dayOfMonthForLoop; i++) {
        const dayStr = i.toString().padStart(2, '0');
        processedBasketData.push({
          day: dayStr,
          avgBasketValue: basketValuesByDay[dayStr],
        });
      }
      
      setDailyAvgBasketValueData(processedBasketData);
      setLoadingDailyAvgBasketValue(false);
    })
    .catch(err => {
      let errorMessage = 'Error fetching daily basket value for line chart.';
      if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
      else if (err.request) errorMessage = 'No response from server (Basket Line Chart).';
      else errorMessage = err.message;
      setErrorDailyAvgBasketValue(errorMessage);
      setDailyAvgBasketValueData([]);
      setLoadingDailyAvgBasketValue(false);
    });

    // Fetch daily cash sales for the current period (for Slide 3)
    axios.get(`${API_BASE_URL}/api/daily_cash_sales_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        const daily = res.data?.daily_cash_sales || [];
        let cumulative = 0;
        const processed = daily.map(d => {
          cumulative += d.cash_sales || 0;
          return { day: d.date.slice(8, 10), cumulative: Math.round(cumulative) };
        });
        setCarouselCashSalesData(processed);
        setLoadingCarouselCashSales(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching cash sales data.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (Cash Sales).';
        else errorMessage = err.message;
        setErrorCarouselCashSales(errorMessage);
        setCarouselCashSalesData([]);
        setLoadingCarouselCashSales(false);
      });

    // Fetch daily account (debtor) sales for the current period (for Slide 3 overlay)
    axios.get(`${API_BASE_URL}/api/daily_account_sales_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        const daily = res.data?.daily_account_sales || [];
        let cumulative = 0;
        const processed = daily.map(d => {
          cumulative += d.account_sales || 0;
          return { day: d.date.slice(8, 10), cumulative: Math.round(cumulative) };
        });
        setCarouselAccountSalesData(processed);
        setLoadingCarouselAccountSales(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching account (debtor) sales data.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (Account Sales).';
        else errorMessage = err.message;
        setErrorCarouselAccountSales(errorMessage);
        setCarouselAccountSalesData([]);
        setLoadingCarouselAccountSales(false);
      });

    // Fetch daily COD sales for the current period (for Slide 3 overlay)
    axios.get(`${API_BASE_URL}/api/daily_cod_sales_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        const daily = res.data?.daily_cod_sales || [];
        let cumulative = 0;
        const processed = daily.map(d => {
          cumulative += d.cod_sales || 0;
          return { day: d.date.slice(8, 10), cumulative: Math.round(cumulative) };
        });
        setCarouselCodSalesData(processed);
        setLoadingCarouselCodSales(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching COD sales data.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (COD Sales).';
        else errorMessage = err.message;
        setErrorCarouselCodSales(errorMessage);
        setCarouselCodSalesData([]);
        setLoadingCarouselCodSales(false);
      });

    // Calculate totals for Cash, Debtor, and COD sales for the pie chart (Slide 4)
    Promise.all([
      axios.get(`${API_BASE_URL}/api/daily_cash_sales_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } }),
      axios.get(`${API_BASE_URL}/api/daily_account_sales_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } }),
      axios.get(`${API_BASE_URL}/api/daily_cod_sales_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } })
    ])
      .then(([cashRes, accountRes, codRes]) => {
        const cashTotal = (cashRes.data?.daily_cash_sales || []).reduce((sum, d) => sum + (d.cash_sales || 0), 0);
        const accountTotal = (accountRes.data?.daily_account_sales || []).reduce((sum, d) => sum + (d.account_sales || 0), 0);
        const codTotal = (codRes.data?.daily_cod_sales || []).reduce((sum, d) => sum + (d.cod_sales || 0), 0);
        const total = cashTotal + accountTotal + codTotal;
        const pieData = [
          { name: 'Cash Sales', value: cashTotal },
          { name: 'Debtor Sales', value: accountTotal },
          { name: 'COD Sales', value: codTotal }
        ];
        setSalesPieData(total > 0 ? pieData : []);
        setLoadingSalesPie(false);
        setErrorSalesPie(null);
      })
      .catch(err => {
        let errorMessage = 'Error fetching sales data for pie chart.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (Pie Chart).';
        else errorMessage = err.message;
        setErrorSalesPie(errorMessage);
        setSalesPieData([]);
        setLoadingSalesPie(false);
      });

    // Calculate totals for Cash and Credit Card Tenders for the pie chart (Tender Breakdown Slide)
    setTenderPieData([]);
    setLoadingTenderPie(true);
    setErrorTenderPie(null);
    Promise.all([
      axios.get(`${API_BASE_URL}/api/daily_cash_tenders_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } }),
      axios.get(`${API_BASE_URL}/api/daily_credit_card_tenders_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } })
    ])
      .then(([cashRes, cardRes]) => {
        const cashTotal = (cashRes.data?.daily_cash_tenders || []).reduce((sum, d) => sum + (d.cash_tenders_today || 0), 0);
        const cardTotal = (cardRes.data?.daily_credit_card_tenders || []).reduce((sum, d) => sum + (d.credit_card_tenders_today || 0), 0);
        const total = cashTotal + cardTotal;
        const pieData = [
          { name: 'Cash Tenders', value: cashTotal },
          { name: 'Credit Card Tenders', value: cardTotal }
        ];
        setTenderPieData(total > 0 ? pieData : []);
        setLoadingTenderPie(false);
        setErrorTenderPie(null);
      })
      .catch(err => {
        let errorMessage = 'Error fetching tender data for pie chart.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (Tender Pie Chart).';
        else errorMessage = err.message;
        setErrorTenderPie(errorMessage);
        setTenderPieData([]);
        setLoadingTenderPie(false);
      });

    // Fetch daily scripts dispensed for the current period
    axios.get(`${API_BASE_URL}/api/daily_scripts_dispensed_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        const daily = res.data?.daily_scripts_dispensed || [];
        const processed = daily.map(d => ({
          day: d.date.slice(8, 10),
          scripts_dispensed: d.scripts_dispensed / 100 // Divide by 100 for actual number
        }));
        setDailyScriptsDispensedData(processed);
        setLoadingDailyScriptsDispensed(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching daily scripts dispensed.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (Scripts Dispensed).';
        else errorMessage = err.message;
        setErrorDailyScriptsDispensed(errorMessage);
        setDailyScriptsDispensedData([]);
        setLoadingDailyScriptsDispensed(false);
      });

    // Fetch daily GP percent for the current period
    axios.get(`${API_BASE_URL}/api/daily_gp_percent_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        const daily = res.data?.daily_gp_percent || [];
        const processed = daily.map(d => ({
          day: d.date.slice(8, 10),
          gp_percent: d.gp_percent
        }));
        setDailyGpPercentData(processed);
        setLoadingDailyGpPercent(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching daily GP%.';
        if (err.response && err.response.data && err.response.data.error) errorMessage = err.response.data.error;
        else if (err.request) errorMessage = 'No response from server (GP%).';
        else errorMessage = err.message;
        setErrorDailyGpPercent(errorMessage);
        setDailyGpPercentData([]);
        setLoadingDailyGpPercent(false);
      });

    // Fetch daily dispensary turnover and total turnover for the current period
    Promise.all([
      axios.get(`${API_BASE_URL}/api/daily_turnover_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } }),
      axios.get(`${API_BASE_URL}/api/daily_dispensary_turnover_for_range/${firstDayCurrentMonth}/${lastDayCurrentPeriod}`, { headers: { 'X-Pharmacy': selectedPharmacy } })
    ])
      .then(([totalTurnoverRes, dispensaryTurnoverRes]) => {
        const totalTurnover = totalTurnoverRes.data?.daily_turnover || [];
        const dispensaryTurnover = dispensaryTurnoverRes.data?.daily_dispensary_turnover || [];
        setDailyTotalTurnoverData(totalTurnover);
        setDailyDispensaryTurnoverData(dispensaryTurnover);
        setLoadingDailyDispensaryPercent(false);
      })
      .catch(err => {
        setErrorDailyDispensaryPercent('Error fetching daily turnover.');
        setDailyDispensaryTurnoverData([]);
        setLoadingDailyDispensaryPercent(false);
      });

  }, [selectedPharmacy, selectedDate]);

  // Format the selected month for display
  const getMonthName = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div style={{ width: '100vw', boxSizing: 'border-box', marginTop: '0rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                <Line type="monotone" dataKey="currentYear" name={`${new Date(selectedDate).getFullYear()} MTD`} stroke="#FF4500" strokeWidth={3} dot={false} connectNulls={true} />
                <Line type="monotone" dataKey="previousYear" name={`${new Date(selectedDate).getFullYear() - 1} MTD`} stroke="#A9A9A9" strokeWidth={3} dot={false} connectNulls={true} />
              </LineChart>
            </ResponsiveContainer>
            {comparisonDetails && (
              <div style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                background: 'rgba(255, 69, 0, 0.85)', // Orange #FF4500 with opacity
                color: '#FFFFFF', // White text for all content
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '0.7rem', // Base font size for the box
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                zIndex: 10,
                border: '1px solid rgba(255, 69, 0, 0.5)', // Orange border with opacity
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}>
                {comparisonDetails.arrow && <span style={{ fontSize: '0.9rem', lineHeight: '1', fontWeight: 700 }}>{comparisonDetails.arrow}</span>} {/* Increased arrow size and weight */}
                <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>{comparisonDetails.text.split(' ')[0]} {comparisonDetails.text.split(' ')[1]}</span> {/* Increased weight and size */}
                <span style={{ marginLeft: '2px', fontWeight: 600, fontSize: '0.75rem' }}>{comparisonDetails.text.substring(comparisonDetails.text.indexOf(' ', comparisonDetails.text.indexOf(' ') + 1) + 1)}</span> {/* Increased weight and size */}
              </div>
            )}
          </>
        )}
      </div>

      {/* KPI Card */}
      <div style={{
        width: 'calc(100vw - 5mm)', // 1.5mm left and right
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
          Turnover ({getMonthName(selectedDate)} MTD)
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
        {/* Left card: Monthly GP% and Cumulative GP */}
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
          <div style={{ color: '#bdbdbd', fontSize: '0.95rem', fontWeight: 500, marginBottom: 2 }}>Monthly GP%</div>
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
      {/* Carousel Section: Add below the last row of KPI cards */}
      <div style={{ width: '100vw', margin: '0 auto 1.5rem auto', padding: 0, maxWidth: '100vw' }}>
        {/* Label for Carousel */}
        <div style={{
          color: '#bdbdbd',
          fontSize: '0.9rem',
          fontWeight: 500,
          textAlign: 'center',
          marginBottom: '0.5rem' // Space between label and carousel
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
          <div style={{ background: '#232b3b', borderRadius: '1rem' }}>
            <div style={{ color: '#fff', fontSize: '1.1rem', textAlign: 'center', fontWeight: 600, marginBottom: 12, marginTop: 12, padding: '0rem 5rem' }}>Cost of Sales vs Purchases ({selectedDate && (new Date(selectedDate)).toLocaleString('default', { month: 'long', year: 'numeric' })})</div>
            <div style={{ width: '100%', height: 200, marginBottom: 0, marginLeft: '-1rem' }}>
              {(loadingCarouselPurchases || loadingCarouselCostOfSales) ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>Loading chart...</div>
              ) : errorCarouselPurchases ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorCarouselPurchases}</div>
              ) : errorCarouselCostOfSales ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorCarouselCostOfSales}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={carouselPurchasesData.map((p, i) => ({
                    ...p,
                    cost_of_sales: carouselCostOfSalesData[i]?.cumulative || null
                  }))} margin={{ top: 10, right: 0, left: 0, bottom: 10 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#bdbdbd' }} axisLine={{ stroke: '#374151' }} tickLine={{ stroke: '#374151' }} />
                    <YAxis
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
          <div style={{ background: '#232b3b', borderRadius: '1rem', padding: '0.4rem 0.4rem', boxSizing: 'border-box', height: '100%' }}>
            <div style={{ color: '#fff', fontSize: '1.1rem', textAlign: 'center', fontWeight: 600, marginBottom: 12, marginTop: 12, padding: '0rem 1rem' }}>Daily Turnover & Basket Value ({selectedDate && (new Date(selectedDate)).toLocaleString('default', { month: 'long', year: 'numeric' })})</div>
            <div style={{ width: '100%', height: 200, marginBottom: 0, marginLeft: '0.8rem' /* Adjust if needed based on parent padding */ }}>
              {(loadingDailyTurnoverBar || loadingDailyAvgBasketValue) ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>Loading chart...</div>
              ) : errorDailyTurnoverBar ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorDailyTurnoverBar}</div>
              ) : errorDailyAvgBasketValue ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorDailyAvgBasketValue}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={dailyTurnoverBarData.map((item, index) => ({
                      ...item,
                      avgBasketValue: dailyAvgBasketValueData[index]?.avgBasketValue ?? null,
                    }))} 
                    margin={{ top: 10, right: 5, left: -22, bottom: 10 }} // Adjusted left margin for YAxis
                  >
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#bdbdbd' }} axisLine={{ stroke: '#374151' }} tickLine={{ stroke: '#374151' }} />
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
                      tickFormatter={value => `R${value.toFixed(0)}`} // Basic formatter for basket value
                      width={50} // Adjust width as needed
                      margin={{ right: 10 }} // Add margin to the right YAxis
                    />
                    <Tooltip
                      content={<BarChartTooltip />}
                      cursor={{ fill: 'rgba(255, 69, 0, 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="plainline" wrapperStyle={{ fontSize: '0.7rem', color: '#bdbdbd', paddingTop: '0px'}}/>
                    <Bar yAxisId="left" dataKey="turnover" name="Daily Turnover" fill="#FF4500" barSize={8.5} radius={[3, 3, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="avgBasketValue" name="Avg Basket Value" stroke="#39FF14" strokeWidth={2.5} dot={false} connectNulls={true} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div style={{ background: '#232b3b', borderRadius: '1rem', padding: '20px', boxSizing: 'border-box', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, marginTop: 12 }}>
                Sales Breakdown by Type ({selectedDate && (new Date(selectedDate)).toLocaleString('default', { month: 'long', year: 'numeric' })})
              </div>
              {loadingSalesPie ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>Loading chart...</div>
              ) : errorSalesPie ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorSalesPie}</div>
              ) : salesPieData.length === 0 ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>No data available for this month.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={salesPieData}
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
          <div style={{ background: '#232b3b', borderRadius: '1rem', padding: '20px', boxSizing: 'border-box', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, marginTop: 12 }}>
                Tender Breakdown ({selectedDate && (new Date(selectedDate)).toLocaleString('default', { month: 'long', year: 'numeric' })})
              </div>
              {loadingTenderPie ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>Loading chart...</div>
              ) : errorTenderPie ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorTenderPie}</div>
              ) : tenderPieData.length === 0 ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>No data available for this month.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={tenderPieData}
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
          <div style={{ background: '#232b3b', borderRadius: '1rem', padding: '20px', boxSizing: 'border-box', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, marginTop: 12 }}>
                Scripts Dispensed per Day ({selectedDate && (new Date(selectedDate)).toLocaleString('default', { month: 'long', year: 'numeric' })})
              </div>
              {loadingDailyScriptsDispensed ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>Loading chart...</div>
              ) : errorDailyScriptsDispensed ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorDailyScriptsDispensed}</div>
              ) : dailyScriptsDispensedData.length === 0 ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>No data available for this month.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyScriptsDispensedData} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#bdbdbd' }} axisLine={{ stroke: '#374151' }} tickLine={{ stroke: '#374151' }} />
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
          <div style={{ background: '#232b3b', borderRadius: '1rem', padding: '20px', boxSizing: 'border-box', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, marginTop: 12 }}>
                Daily GP % ({selectedDate && (new Date(selectedDate)).toLocaleString('default', { month: 'long', year: 'numeric' })})
              </div>
              {(loadingDailyGpPercent || loadingDailyDispensaryPercent) ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>Loading chart...</div>
              ) : errorDailyGpPercent ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorDailyGpPercent}</div>
              ) : errorDailyDispensaryPercent ? (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{errorDailyDispensaryPercent}</div>
              ) : dailyGpPercentData.length === 0 ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', marginTop: 60 }}>No data available for this month.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyGpPercentData} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#bdbdbd' }} axisLine={{ stroke: '#374151' }} tickLine={{ stroke: '#374151' }} />
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
                    <Bar dataKey="gp_percent" name="GP" fill="#FFB800" barSize={11} radius={[3, 3, 0, 0]} />
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

export default MonthlyView; 
