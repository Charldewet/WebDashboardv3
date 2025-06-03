import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import SummaryCard from '../../components/SummaryCard'; // Adjusted path
import { theme } from '../../theme'; // Adjusted path

// Mock data - replace with API call
const mockYearlyData = {
  totalAnnualTurnover: 'R 4,200,000.00',
  averageMonthlyTurnover: 'R 350,000.00',
  yoyGrowth: '15%',
  bestPerformingMonth: 'November (R 450,000)'
};

export default function YearlyScreen() {
  return (
    <ScrollView className="flex-1 bg-cream p-4">
      <Text className="text-2xl font-bold text-dark mb-4">Yearly Report</Text>
      
      <SummaryCard title="Total Annual Turnover" value={mockYearlyData.totalAnnualTurnover} />
      <SummaryCard title="Avg. Monthly Turnover" value={mockYearlyData.averageMonthlyTurnover} />
      <SummaryCard title="Year-over-Year Growth" value={mockYearlyData.yoyGrowth} />
      <SummaryCard title="Best Performing Month" value={mockYearlyData.bestPerformingMonth} />

      {/* Placeholder for more detailed year-end analysis or comparisons */}
      {/* <Text className="text-xl text-dark mt-6 mb-2">Category Performance</Text> */}
      {/* Add charts or detailed tables here */}
    </ScrollView>
  );
} 