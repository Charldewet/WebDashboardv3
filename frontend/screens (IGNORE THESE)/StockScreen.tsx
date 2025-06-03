import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import SummaryCard from '../../components/SummaryCard'; // Adjusted path
import { theme } from '../../theme'; // Adjusted path

// Mock data - replace with API call
const mockStockData = {
  totalStockValue: 'R 1,250,000.00',
  stockTurnRate: '6.5 times/year',
  itemsBelowMin: 75,
  potentialDeadStockValue: 'R 35,000.00' 
};

export default function StockScreen() {
  return (
    <ScrollView className="flex-1 bg-cream p-4">
      <Text className="text-2xl font-bold text-dark mb-4">Stock Overview</Text>
      
      <SummaryCard title="Total Stock Value (Cost)" value={mockStockData.totalStockValue} />
      <SummaryCard title="Stock Turn Rate" value={mockStockData.stockTurnRate} />
      <SummaryCard title="Items Below Min. Stock" value={mockStockData.itemsBelowMin} />
      <SummaryCard title="Potential Dead Stock" value={mockStockData.potentialDeadStockValue} />

      {/* Placeholder for stock item list, search, or category breakdown */}
      {/* <Text className="text-xl text-dark mt-6 mb-2">Low Stock Items</Text> */}
      {/* Add a list or table of stock items here */}
    </ScrollView>
  );
} 