import React from 'react';
import { theme } from '../theme'; // Assuming theme.ts is in the root of frontend/

interface SummaryCardProps {
  title: string;
  value: string | number;
  // Optional: customize colors if needed, otherwise defaults to avocado/white
  backgroundColor?: string;
  textColor?: string;
}

export default function SummaryCard({ 
  title,
  value,
  backgroundColor = theme.avocado, // Default to avocado from theme
  textColor = theme.textLight      // Default to textLight from theme
}: SummaryCardProps) {
  return (
    <div style={{ backgroundColor, borderRadius: 16, padding: 18, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
      <h3 style={{ color: textColor, fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h3>
      <div style={{ color: textColor, fontSize: 28, fontWeight: 700, marginTop: 8 }}>{value}</div>
    </div>
  );
} 