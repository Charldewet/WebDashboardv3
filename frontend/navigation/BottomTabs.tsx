import React, { useState } from 'react';
import { theme } from '../theme';

// Placeholder components for the screens
const DailyScreen = () => <div className="p-4">Daily Screen Content</div>;
const MonthlyScreen = () => <div className="p-4">Monthly Screen Content</div>;
const YearlyScreen = () => <div className="p-4">Yearly Screen Content</div>;
const StockScreen = () => <div className="p-4">Stock Screen Content</div>;

const screens = [
  { name: 'Daily', component: DailyScreen },
  { name: 'Monthly', component: MonthlyScreen },
  { name: 'Yearly', component: YearlyScreen },
  { name: 'Stock', component: StockScreen },
];

export default function BottomTabs() {
  const [activeTab, setActiveTab] = useState('Daily');
  const ActiveComponent = screens.find(screen => screen.name === activeTab)?.component || DailyScreen;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow">
        <ActiveComponent />
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex justify-around">
            {screens.map((screen) => (
              <button
                key={screen.name}
                onClick={() => setActiveTab(screen.name)}
                className={`flex flex-col items-center py-2 px-4 ${
                  activeTab === screen.name
                    ? 'text-green-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="text-sm font-medium">{screen.name}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
} 