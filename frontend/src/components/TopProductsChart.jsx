import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-4 bg-gray-800 bg-opacity-90 border border-gray-700 rounded-lg shadow-lg">
        <p className="text-sm text-gray-300">{`${label}`}</p>
        <p className="text-lg font-bold text-white">{`Sold: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const TopProductsChart = ({ data, loading, error }) => {
  if (loading) {
    return <div className="text-center p-4">Loading top products...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-400">{error}</div>;
  }

  if (!data || data.length === 0) {
    return (
        <div className="bg-gray-800 p-4 rounded-lg text-center">
            <h3 className="font-semibold text-white">Top 10 Selling Products by Quantity</h3>
            <p className="text-gray-400 mt-2">No sales data available for the selected date.</p>
        </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="font-semibold text-white mb-4">Top 10 Selling Products by Quantity</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{
            top: 5, right: 30, left: 100, bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" stroke="#9CA3AF" />
          <YAxis 
            dataKey="product" 
            type="category" 
            stroke="#9CA3AF"
            width={150}
            tick={{ fontSize: 12, fill: '#D1D5DB' }}
            />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.2)' }}/>
          <Legend />
          <Bar dataKey="quantity" fill="#39FF14" name="Quantity Sold" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopProductsChart; 