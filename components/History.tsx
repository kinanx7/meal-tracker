import React, { useState, useMemo } from 'react';
import { LoggedMeal, WaterLog, UserGoal } from '../types';
import { Trash2, Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Activity, Droplets } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid } from 'recharts';

interface HistoryProps {
  meals: LoggedMeal[];
  waterLogs: WaterLog[];
  goal: UserGoal;
  onDelete: (id: string) => void;
  currentSystemDateStr: string; // The GMT+3 "Today" string from App.tsx
  gmtOffset: number; // e.g. 3
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

const History: React.FC<HistoryProps> = ({ meals, waterLogs, goal, onDelete, currentSystemDateStr, gmtOffset }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [dateOffset, setDateOffset] = useState(0); // 0 means today, -1 yesterday, etc.

  // --- Helper Functions ---

  const getGMT3DateString = (timestamp: number) => {
      // Add offset milliseconds to get the "Local" time in UTC format, then split to get YYYY-MM-DD
      // This ensures 1AM GMT+3 counts as "Today" even if it's 10PM UTC Yesterday.
      return new Date(timestamp + gmtOffset * 3600 * 1000).toISOString().split('T')[0];
  };

  const getTargetDate = (offset: number) => {
    // We base everything off the `currentSystemDateStr` passed from App to match the GMT+3 clock
    const baseDate = new Date(currentSystemDateStr); 
    const target = new Date(baseDate);
    target.setDate(baseDate.getDate() + offset);
    return target;
  };

  const currentDate = getTargetDate(dateOffset);
  // Important: currentDate is a Date object set to 00:00 UTC representing the GMT+3 day. 
  // `.toISOString().split('T')[0]` works because it's exactly on the date boundary we constructed.
  const currentDateStr = currentDate.toISOString().split('T')[0];

  // --- Data Aggregation ---

  // Aggregate data by day for charts
  const dailyStats = useMemo(() => {
    const stats: Record<string, { calories: number; protein: number; carbs: number; fat: number; water: number }> = {};

    meals.forEach(meal => {
      const day = getGMT3DateString(meal.timestamp);
      if (!stats[day]) stats[day] = { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 };
      stats[day].calories += meal.totalCalories;
      stats[day].protein += meal.macronutrients.protein;
      stats[day].carbs += meal.macronutrients.carbs;
      stats[day].fat += meal.macronutrients.fat;
    });

    waterLogs.forEach(log => {
      const day = getGMT3DateString(log.timestamp);
      if (!stats[day]) stats[day] = { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 };
      stats[day].water += log.amount;
    });

    return stats;
  }, [meals, waterLogs]);

  // --- Render Logic for Different Views ---

  const renderDailyView = () => {
    const currentMeals = meals.filter(m => getGMT3DateString(m.timestamp) === currentDateStr);
    const dayStats = dailyStats[currentDateStr] || { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 };
    
    const calorieDiff = dayStats.calories - goal.dailyCalories;
    const isSurplus = calorieDiff > 0;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Date Navigator */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative">
          <button onClick={() => setDateOffset(prev => prev - 1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          
          <div className="text-center">
            <h2 className="font-bold text-gray-900">{currentDate.toLocaleDateString(undefined, { weekday: 'long' })}</h2>
            <p className="text-xs text-gray-500">{currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          
          <button 
            onClick={() => setDateOffset(prev => prev + 1)} 
            disabled={dateOffset === 0}
            className={`p-2 rounded-full transition-colors ${dateOffset === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>

          {/* Jump to Today Button */}
          {dateOffset !== 0 && (
              <button 
                onClick={() => setDateOffset(0)}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md hover:bg-emerald-200 transition-colors"
              >
                TODAY
              </button>
          )}
        </div>

        {/* Daily Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-4 rounded-2xl border ${isSurplus ? 'bg-orange-50 border-orange-100 text-orange-900' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>
            <div className="flex items-center gap-2 mb-1">
              {isSurplus ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="text-xs font-bold uppercase tracking-wider">Net Status</span>
            </div>
            <p className="text-2xl font-bold">{Math.abs(calorieDiff)} kcal</p>
            <p className="text-xs opacity-80">{isSurplus ? 'Over Target (Surplus)' : 'Under Target (Deficit)'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-900">
            <div className="flex items-center gap-2 mb-1">
              <Droplets size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Water</span>
            </div>
            <p className="text-2xl font-bold">{dayStats.water} ml</p>
            <p className="text-xs opacity-80">Goal: {goal.dailyWater} ml</p>
          </div>
        </div>

        {/* Macro Breakdown */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between text-center divide-x divide-gray-100">
           <div className="flex-1 px-2">
              <p className="text-xs text-gray-400 font-bold uppercase">Protein</p>
              <p className="text-lg font-semibold text-gray-900">{Math.round(dayStats.protein)}g</p>
           </div>
           <div className="flex-1 px-2">
              <p className="text-xs text-gray-400 font-bold uppercase">Carbs</p>
              <p className="text-lg font-semibold text-gray-900">{Math.round(dayStats.carbs)}g</p>
           </div>
           <div className="flex-1 px-2">
              <p className="text-xs text-gray-400 font-bold uppercase">Fat</p>
              <p className="text-lg font-semibold text-gray-900">{Math.round(dayStats.fat)}g</p>
           </div>
        </div>

        {/* Meals List */}
        <div>
           <h3 className="font-semibold text-gray-900 mb-3">Meals Logged</h3>
           {currentMeals.length === 0 ? (
             <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border-dashed border-2 border-gray-200">
                <p>No meals recorded for this day.</p>
             </div>
           ) : (
             <div className="space-y-3">
               {currentMeals.map(meal => (
                  <div key={meal.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {meal.imageUrl ? (
                          <img src={meal.imageUrl} alt={meal.mealName} className="w-full h-full object-cover" />
                      ) : (
                          <span className="text-2xl">🍽️</span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                            <span className="font-medium text-gray-900 line-clamp-1">{meal.mealName}</span>
                            <span className="font-bold text-emerald-600 text-sm">{meal.totalCalories}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">{new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <button onClick={() => onDelete(meal.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                  </div>
               ))}
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderChartView = (days: number) => {
    // Generate data array for the last X days
    const data = [];
    let totalCals = 0;
    let daysTracked = 0;

    for (let i = days - 1; i >= 0; i--) {
      // Use getTargetDate to ensure we use the same GMT+3 logic
      const d = getTargetDate(-i);
      const dStr = d.toISOString().split('T')[0];
      const stats = dailyStats[dStr] || { calories: 0 };
      
      if (stats.calories > 0) {
          totalCals += stats.calories;
          daysTracked++;
      }

      data.push({
        name: d.toLocaleDateString(undefined, { weekday: days > 7 ? undefined : 'short', day: 'numeric', month: days > 7 ? 'short' : undefined }),
        calories: stats.calories,
        fullDate: dStr
      });
    }

    const avgCals = daysTracked > 0 ? Math.round(totalCals / daysTracked) : 0;

    return (
      <div className="space-y-6 animate-fade-in">
         {/* Stats Overview */}
         <div className="grid grid-cols-2 gap-4">
             <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Avg Intake</p>
                <p className="text-2xl font-bold text-gray-900">{avgCals} <span className="text-sm font-normal text-gray-400">kcal</span></p>
             </div>
             <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Target</p>
                <p className="text-2xl font-bold text-gray-900">{goal.dailyCalories} <span className="text-sm font-normal text-gray-400">kcal</span></p>
             </div>
         </div>

         {/* Chart */}
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-80">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                Calorie Trend
            </h3>
            <ResponsiveContainer width="100%" height="100%">
               {days <= 7 ? (
                   <BarChart data={data}>
                       <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                       <YAxis hide />
                       <Tooltip 
                            cursor={{ fill: '#f3f4f6' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       />
                       <ReferenceLine y={goal.dailyCalories} stroke="#10b981" strokeDasharray="3 3" />
                       <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                         {data.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.calories > goal.dailyCalories ? '#fbbf24' : '#10b981'} />
                         ))}
                       </Bar>
                   </BarChart>
               ) : (
                   <AreaChart data={data}>
                       <defs>
                         <linearGradient id="colorCals" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                           <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={6} />
                       <YAxis hide />
                       <CartesianGrid vertical={false} stroke="#f3f4f6" />
                       <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       />
                       <ReferenceLine y={goal.dailyCalories} stroke="#9ca3af" strokeDasharray="3 3" />
                       <Area type="monotone" dataKey="calories" stroke="#10b981" fillOpacity={1} fill="url(#colorCals)" />
                   </AreaChart>
               )}
            </ResponsiveContainer>
         </div>

         <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
             <h4 className="font-bold text-blue-900 mb-2 text-sm">Insight</h4>
             <p className="text-sm text-blue-800 leading-relaxed">
                 {avgCals > goal.dailyCalories 
                    ? `You are averaging ${avgCals - goal.dailyCalories} calories over your daily maintenance goal. This is consistent with a weight gain strategy.`
                    : `You are averaging ${goal.dailyCalories - avgCals} calories under your daily goal. This creates a deficit consistent with weight loss.`
                 }
             </p>
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <header className="mb-6 flex flex-col space-y-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-500 text-sm">Track your consistency and progress.</p>
        </div>
        
        {/* View Selector Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl">
            {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
                <button
                    key={mode}
                    onClick={() => { setViewMode(mode); setDateOffset(0); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${
                        viewMode === mode 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    {mode}
                </button>
            ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        {viewMode === 'daily' && renderDailyView()}
        {viewMode === 'weekly' && renderChartView(7)}
        {viewMode === 'monthly' && renderChartView(30)}
      </div>
    </div>
  );
};

export default History;