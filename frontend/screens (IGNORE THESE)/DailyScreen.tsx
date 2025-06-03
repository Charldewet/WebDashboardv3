import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import SummaryCard from '../../components/SummaryCard'; // Adjusted path
import { theme } from '../../theme'; // Adjusted path

// Mock data - replace with API call
const mockDailyData = {
  turnover: 'R 12,345.67',
  grossProfitPercent: '25.5%',
  scriptsDispensed: 150,
  avgBasketValue: 'R 82.30'
};

export default function DailyScreen() {
  // const [data, setData] = React.useState(null);
  // React.useEffect(() => {
  //   fetch('/api/report/daily') // Replace with your actual API endpoint
  //     .then(res => res.json())
  //     .then(setData)
  //     .catch(err => console.error("Failed to fetch daily data:", err));
  // }, []);

  return (
    <ScrollView className="flex-1 bg-cream p-4">
      <Text className="text-2xl font-bold text-dark mb-4">Daily Report</Text>
      
      {/* Replace with actual data mapping once API is connected */}
      <SummaryCard title="Total Turnover" value={mockDailyData.turnover} />
      <SummaryCard title="Gross Profit %" value={mockDailyData.grossProfitPercent} />
      <SummaryCard title="Scripts Dispensed" value={mockDailyData.scriptsDispensed} />
      <SummaryCard title="Avg. Basket Value" value={mockDailyData.avgBasketValue} />

      {/* Placeholder for more detailed sections or charts */}
      {/* <Text className="text-xl text-dark mt-6 mb-2">Sales Breakdown</Text> */}
      {/* Add charts or more detailed data views here */}
    </ScrollView>
  );
} 