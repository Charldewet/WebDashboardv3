// @ts-ignore: if types are missing for react-slick
// declare module 'react-slick';
import React from 'react';
// import Slider from 'react-slick';
// import 'slick-carousel/slick/slick.css';
// import 'slick-carousel/slick/slick-theme.css';
import SummaryCard from '../../components/SummaryCard';
import { theme } from '../../theme';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

// Mock data - replace with API call
const mockMonthlyData = {
  totalTurnover: 'R 350,000.00',
  averageDailyTurnover: 'R 11,666.67',
  totalScripts: 4500,
  bestPerformingDay: '2023-03-15 (R 15,200)',
  cumulativePurchases: {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        data: [20, 45, 28, 80],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // optional
        strokeWidth: 2 // optional
      }
    ],
    legend: ["Cumulative Purchases"] // optional
  }
};

const screenWidth = Dimensions.get("window").width;

export default function MonthlyScreen() {
  // Carousel settings for react-slick
  // const carouselSettings = {
  //   dots: true,
  //   infinite: false,
  //   speed: 500,
  //   slidesToShow: 1,
  //   slidesToScroll: 1,
  //   arrows: true,
  //   adaptiveHeight: true,
  // };
  return (
    <div style={{ flex: 1, background: '#f5f5dc', padding: 16, minHeight: '100vh' }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: '#232b3b', marginBottom: 16 }}>Monthly Report</h2>
      <SummaryCard title="Total Turnover (Month)" value={mockMonthlyData.totalTurnover} />
      <SummaryCard title="Avg. Daily Turnover" value={mockMonthlyData.averageDailyTurnover} />
      <SummaryCard title="Total Scripts (Month)" value={mockMonthlyData.totalScripts} />
      <SummaryCard title="Best Performing Day" value={mockMonthlyData.bestPerformingDay} />
      {/* Chart for cumulative purchases */}
      <div style={{ marginTop: 32, marginBottom: 16 }}>
        <h3 style={{ fontSize: 22, fontWeight: 600, color: '#232b3b', marginBottom: 12 }}>Cumulative Purchases</h3>
        <LineChart
          data={mockMonthlyData.cumulativePurchases}
          width={screenWidth - 32} // from react-native
          height={220}
          chartConfig={{
            backgroundColor: '#232b3b',
            backgroundGradientFrom: '#232b3b',
            backgroundGradientTo: '#232b3b',
            decimalPlaces: 2, // optional, defaults to 2dp
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: "#ffa726"
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)'
          }}
        />
      </div>
    </div>
  );
} 