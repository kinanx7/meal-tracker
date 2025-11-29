import React, { useState, useEffect } from 'react';
import { LoggedMeal, UserGoal } from '../types';
import { Plus, Flame, Utensils, Droplets, Trophy, ArrowRight, Minus, CalendarDays, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  todayMeals: LoggedMeal[];
  todayWater: number;
  goal: UserGoal;
  dayCount: number;
  nextMidnight: number;
  onAddMeal: () => void;
  onAddWater: (amount: number) => void;
  onManualEndDay: () => void;
  onDeleteMeal: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    todayMeals, 
    todayWater, 
    goal, 
    dayCount, 
    nextMidnight, 
    onAddMeal, 
    onAddWater, 
    onManualEndDay,
    onDeleteMeal 
}) => {
  const [timeLeft, setTimeLeft] = useState('');

  // Update countdown to midnight (GMT+3 based)
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const diff = nextMidnight - now;
      
      if (diff <= 0) {
          setTimeLeft("0h 0m");
          return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [nextMidnight]);

  const totalCaloriesConsumed = todayMeals.reduce((acc, meal) => acc + meal.totalCalories, 0);
  const remainingCalories = Math.max(0, goal.dailyCalories - totalCaloriesConsumed);

  // Data for the radial chart
  const data = [
    { name: 'Consumed', value: totalCaloriesConsumed },
    { name: 'Remaining', value: remainingCalories },
  ];

  const COLORS = ['#10b981', '#e5e7eb']; // Emerald-500 for consumed, Gray-200 for empty

  // Macronutrient totals
  const macros = todayMeals.reduce(
    (acc, meal) => ({
      protein: acc.protein + meal.macronutrients.protein,
      carbs: acc.carbs + meal.macronutrients.carbs,
      fat: acc.fat + meal.macronutrients.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );

  // Water Progress
  const waterProgress = Math.min(100, (todayWater / goal.dailyWater) * 100);

  return (
    <div className="flex flex-col h-full space-y-6 animate-fade-in">
      <header className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2 mb-1">
             <h1 className="text-2xl font-bold text-gray-900">Today</h1>
             <span className="bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CalendarDays size={10} />
                Day {dayCount}
             </span>
          </div>
          <p className="text-gray-500 text-sm flex items-center gap-1">
             <Clock size={12} />
             <span>Ends in {timeLeft}</span>
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
             <button 
                onClick={onManualEndDay}
                className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1 active:scale-95"
                title="End Day"
             >
                <CheckCircle2 size={12} />
                End Day
             </button>
             
            <div className="flex flex-col items-end">
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 mb-1">
                    <Flame size={24} fill="currentColor" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    Made by Kinan Alrahal
                </p>
            </div>
        </div>
      </header>

      {/* Main Calorie Circle */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center relative">
        <div className="w-64 h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={100}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
                cornerRadius={10}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-4xl font-bold text-gray-900">{remainingCalories}</span>
            <span className="text-sm text-gray-400 font-medium">kcal left</span>
          </div>
        </div>

        <div className="w-full mt-4 flex justify-between text-center divide-x divide-gray-100">
            <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Protein</p>
                <p className="font-semibold text-gray-800">{Math.round(macros.protein)}g</p>
            </div>
            <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Carbs</p>
                <p className="font-semibold text-gray-800">{Math.round(macros.carbs)}g</p>
            </div>
            <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Fats</p>
                <p className="font-semibold text-gray-800">{Math.round(macros.fat)}g</p>
            </div>
        </div>
      </div>

      {/* Water Tracker */}
      <div className="bg-blue-50 rounded-3xl p-6 shadow-sm border border-blue-100 relative overflow-hidden">
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
                <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                    <Droplets size={20} className="text-blue-500" fill="currentColor" />
                    Hydration
                </h3>
                <p className="text-blue-600 text-sm">{todayWater} / {goal.dailyWater} ml</p>
            </div>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm">
                <button 
                    onClick={() => onAddWater(-250)} 
                    disabled={todayWater <= 0}
                    className="w-8 h-8 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Minus size={16} />
                </button>
                <div className="w-px h-4 bg-gray-100 mx-1"></div>
                <button onClick={() => onAddWater(250)} className="bg-blue-50 text-blue-600 text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-100 transition-colors">
                    +250
                </button>
                 <button onClick={() => onAddWater(500)} className="bg-blue-50 text-blue-600 text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-100 transition-colors">
                    +500
                </button>
            </div>
        </div>
        {/* Progress Bar Background */}
        <div className="w-full bg-blue-200 rounded-full h-3 mb-1">
            <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${waterProgress}%` }}
            />
        </div>
      </div>

      {/* Weight Goal Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Trophy size={20} />
             </div>
             <div>
                 <p className="text-xs text-gray-500 uppercase font-bold">Weight Goal</p>
                 <div className="flex items-center gap-2 text-gray-900 font-semibold">
                     <span>{goal.currentWeight} kg</span>
                     <ArrowRight size={14} className="text-gray-400" />
                     <span>{goal.targetWeight} kg</span>
                 </div>
             </div>
          </div>
          <div className="text-right">
              <span className={`text-sm font-bold px-2 py-1 rounded-lg ${
                  goal.goalType === 'lose' ? 'bg-red-50 text-red-600' :
                  goal.goalType === 'gain' ? 'bg-green-50 text-green-600' :
                  'bg-gray-50 text-gray-600'
              }`}>
                  {goal.goalType === 'lose' ? 'Lose' : goal.goalType === 'gain' ? 'Gain' : 'Maintain'}
              </span>
          </div>
      </div>

      {/* Quick Actions */}
      <div>
        <button
          onClick={onAddMeal}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center space-x-2"
        >
          <Plus size={24} />
          <span>Log a New Meal</span>
        </button>
      </div>

      {/* Recent Logs Snippet */}
      {todayMeals.length > 0 && (
        <div className="pb-4">
             <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Meals</h2>
             <div className="space-y-3">
                {todayMeals.slice(0, 5).map((meal) => (
                    <div key={meal.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center space-x-3 shadow-sm">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                             {meal.imageUrl ? (
                                <img src={meal.imageUrl} alt={meal.mealName} className="w-full h-full object-cover" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Utensils size={18} />
                                </div>
                             )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{meal.mealName}</h4>
                            <p className="text-xs text-gray-500">{new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="font-bold text-emerald-600 text-sm whitespace-nowrap">{meal.totalCalories} kcal</span>
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteMeal(meal.id);
                                }}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                                title="Delete meal"
                             >
                                <Trash2 size={16} />
                             </button>
                        </div>
                    </div>
                ))}
             </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;