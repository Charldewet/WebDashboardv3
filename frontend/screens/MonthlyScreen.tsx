// @ts-ignore: if types are missing for react-slick
declare module 'react-slick';
import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import SummaryCard from '../../components/SummaryCard';
import { theme } from '../../theme';

// Mock data - replace with API call
const mockMonthlyData = {
  totalTurnover: 'R 350,000.00',
  averageDailyTurnover: 'R 11,666.67',
  totalScripts: 4500,
  bestPerformingDay: '2023-03-15 (R 15,200)'
};

export default function MonthlyScreen() {
  // Carousel settings for react-slick
  const carouselSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    adaptiveHeight: true,
  };
  return (
    <div style={{ flex: 1, background: '#f5f5dc', padding: 16, minHeight: '100vh' }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: '#232b3b', marginBottom: 16 }}>Monthly Report</h2>
      <SummaryCard title="Total Turnover (Month)" value={mockMonthlyData.totalTurnover} />
      <SummaryCard title="Avg. Daily Turnover" value={mockMonthlyData.averageDailyTurnover} />
      <SummaryCard title="Total Scripts (Month)" value={mockMonthlyData.totalScripts} />
      <SummaryCard title="Best Performing Day" value={mockMonthlyData.bestPerformingDay} />
      {/* Carousel for charts */}
      <div style={{ marginTop: 32, marginBottom: 16 }}>
        <h3 style={{ fontSize: 22, fontWeight: 600, color: '#232b3b', marginBottom: 12 }}>Charts</h3>
        <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
          <Slider {...carouselSettings}>
            <div>
              <div style={{ height: 220, background: '#232b3b', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bdbdbd', fontSize: 22, fontWeight: 600, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
                Blank Chart Card 1
              </div>
            </div>
            <div>
              <div style={{ height: 220, background: '#232b3b', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bdbdbd', fontSize: 22, fontWeight: 600, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
                Blank Chart Card 2
              </div>
            </div>
            <div>
              <div style={{ height: 220, background: '#232b3b', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bdbdbd', fontSize: 22, fontWeight: 600, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
                Blank Chart Card 3
              </div>
            </div>
          </Slider>
        </div>
      </div>
    </div>
  );
} 