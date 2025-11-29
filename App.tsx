import React, { useState, useEffect, useCallback } from 'react';
import { AppView, LoggedMeal, MealAnalysis, UserGoal, WaterLog, ActivityLevel, Gender, GoalType } from './types';
import Dashboard from './components/Dashboard';
import AddMeal from './components/AddMeal';
import History from './components/History';
import { LayoutDashboard, PlusCircle, History as HistoryIcon, User, Calculator, ChevronRight, Search, RotateCcw } from 'lucide-react';

const DEFAULT_GOAL: UserGoal = {
  dailyCalories: 2200,
  dailyWater: 2500,
  currentWeight: 70,
  targetWeight: 70,
  height: 170,
  age: 30,
  gender: 'male',
  activityLevel: 'moderate',
  goalType: 'maintain'
};

const GMT_OFFSET_HOURS = 3;

// Helper to get the YYYY-MM-DD string for GMT+3
const getGMT3DateString = (timestamp: number) => {
    const offset = GMT_OFFSET_HOURS * 60 * 60 * 1000;
    return new Date(timestamp + offset).toISOString().split('T')[0];
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [goal, setGoal] = useState<UserGoal>(DEFAULT_GOAL);
  
  const [addMealInitialMode, setAddMealInitialMode] = useState<'camera' | 'text'>('camera');
  const [tempGoal, setTempGoal] = useState<UserGoal>(DEFAULT_GOAL);

  // Day Offset: How many days "ahead" of real time the user is working.
  // 0 = Today, 1 = Tomorrow, etc.
  const [dayOffset, setDayOffset] = useState<number>(0);
  
  const [dayCount, setDayCount] = useState<number>(1);
  const [lastRealDateStr, setLastRealDateStr] = useState<string>(() => getGMT3DateString(Date.now()));

  // Load data on mount
  useEffect(() => {
    const savedMeals = localStorage.getItem('snapcalorie_meals');
    const savedWater = localStorage.getItem('snapcalorie_water');
    const savedGoal = localStorage.getItem('snapcalorie_goal');
    const savedDayOffset = localStorage.getItem('snapcalorie_day_offset');
    const savedDayCount = localStorage.getItem('snapcalorie_day_count');
    const savedLastRealDate = localStorage.getItem('snapcalorie_last_real_date');
    
    if (savedMeals) setMeals(JSON.parse(savedMeals));
    if (savedWater) setWaterLogs(JSON.parse(savedWater));
    if (savedGoal) {
        const parsedGoal = JSON.parse(savedGoal);
        setGoal({ ...DEFAULT_GOAL, ...parsedGoal });
        setTempGoal({ ...DEFAULT_GOAL, ...parsedGoal });
    }
    if (savedDayOffset) setDayOffset(Number(savedDayOffset));
    if (savedDayCount) setDayCount(Number(savedDayCount));
    if (savedLastRealDate) setLastRealDateStr(savedLastRealDate);
  }, []);

  // Save data on change
  useEffect(() => {
    localStorage.setItem('snapcalorie_meals', JSON.stringify(meals));
    localStorage.setItem('snapcalorie_water', JSON.stringify(waterLogs));
    localStorage.setItem('snapcalorie_goal', JSON.stringify(goal));
    localStorage.setItem('snapcalorie_day_offset', String(dayOffset));
    localStorage.setItem('snapcalorie_day_count', String(dayCount));
    localStorage.setItem('snapcalorie_last_real_date', lastRealDateStr);
  }, [meals, waterLogs, goal, dayOffset, dayCount, lastRealDateStr]);

  // --- Real Time Synchronization Logic ---
  // This checks if the *Actual* GMT+3 date has changed (passed midnight).
  useEffect(() => {
    const checkDate = () => {
        const nowStr = getGMT3DateString(Date.now());
        
        if (nowStr !== lastRealDateStr) {
            // A new REAL day has started!
            setLastRealDateStr(nowStr);

            if (dayOffset > 0) {
                // If the user was working ahead (Offset 1), the real day has now caught up.
                // We reduce the offset so they are now working on "Today" (Offset 0) which is physically the same day they were on.
                // We do NOT increment dayCount here, because they already "spent" that increment when they manually ended the day.
                setDayOffset(prev => Math.max(0, prev - 1));
            } else {
                // Natural transition: User was on Today, Midnight passed.
                // Increment day count naturally.
                setDayCount(prev => prev + 1);
            }
        }
    };

    const interval = setInterval(checkDate, 1000); // Check every second
    return () => clearInterval(interval);
  }, [lastRealDateStr, dayOffset]);


  // --- Helper: Get Virtual "Now" ---
  // Returns the timestamp representing the time inside the app's current logical day.
  const getVirtualNow = useCallback(() => {
      const msPerDay = 86400000;
      return Date.now() + (dayOffset * msPerDay);
  }, [dayOffset]);


  // --- Helper: Get Real GMT+3 Next Midnight (For Timer) ---
  // Always returns the timestamp of the upcoming REAL midnight.
  const getRealGMT3NextMidnight = () => {
      const msPerDay = 86400000;
      const gmt3OffsetMs = GMT_OFFSET_HOURS * 3600 * 1000;
      
      const now = Date.now();
      const timeWithOffset = now + gmt3OffsetMs;
      
      const startOfDay = timeWithOffset - (timeWithOffset % msPerDay);
      const startOfDayUTC = startOfDay - gmt3OffsetMs;
      
      return startOfDayUTC + msPerDay;
  };

  const handleManualEndDay = () => {
      // Manually skip to the next day.
      setDayOffset(prev => prev + 1);
      setDayCount(prev => prev + 1);
      // We do NOT change the real date tracker here. The app is simply "ahead" now.
      // The Timer will continue to show time to REAL midnight.
  };

  const resetDayCounter = () => {
      setDayCount(1);
      setDayOffset(0);
      setLastRealDateStr(getGMT3DateString(Date.now()));
      alert("Day counter reset to Day 1.");
  };

  const handleSaveMeal = (analysis: MealAnalysis, imageUrl: string) => {
    const newMeal: LoggedMeal = {
      ...analysis,
      id: crypto.randomUUID(),
      timestamp: getVirtualNow(), // Uses offset time
      imageUrl,
    };
    setMeals((prev) => [newMeal, ...prev]);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleDeleteMeal = (id: string) => {
    setMeals((prev) => prev.filter(m => m.id !== id));
  };

  const handleAddWater = (amount: number) => {
    const newLog: WaterLog = {
        id: crypto.randomUUID(),
        timestamp: getVirtualNow(), // Uses offset time
        amount: amount
    };
    setWaterLogs(prev => [...prev, newLog]);
  };

  // --- Dashboard Data Filtering ---
  // We filter meals based on the current "Virtual Date".
  // If Offset is 0, we show today's meals.
  // If Offset is 1, we show tomorrow's meals (which acts as the new "Today" for the user).
  const virtualNowTimestamp = getVirtualNow();
  const currentVirtualDateStr = getGMT3DateString(virtualNowTimestamp);

  const todayMeals = meals.filter(m => getGMT3DateString(m.timestamp) === currentVirtualDateStr);
  
  const todayWater = waterLogs
    .filter(w => getGMT3DateString(w.timestamp) === currentVirtualDateStr)
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Stats Calculator
  const calculateRecommendedCalories = () => {
    let bmr = (10 * tempGoal.currentWeight) + (6.25 * tempGoal.height) - (5 * tempGoal.age);
    if (tempGoal.gender === 'male') {
        bmr += 5;
    } else {
        bmr -= 161;
    }

    const activityMultipliers: Record<ActivityLevel, number> = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9
    };

    const tdee = bmr * activityMultipliers[tempGoal.activityLevel];
    
    let recommendedCalories = tdee;
    if (tempGoal.goalType === 'lose') recommendedCalories -= 500;
    if (tempGoal.goalType === 'gain') recommendedCalories += 500;

    const finalCalories = Math.round(recommendedCalories);
    
    setTempGoal(prev => ({ ...prev, dailyCalories: finalCalories }));
    return finalCalories;
  };

  const saveSettings = () => {
    setGoal(tempGoal);
    alert("Profile and goals updated!");
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return (
            <Dashboard 
                todayMeals={todayMeals} 
                todayWater={todayWater}
                goal={goal} 
                dayCount={dayCount}
                nextMidnight={getRealGMT3NextMidnight()} // Always REAL midnight
                onAddMeal={() => {
                  setAddMealInitialMode('camera');
                  setCurrentView(AppView.ADD_MEAL);
                }} 
                onAddWater={handleAddWater}
                onManualEndDay={handleManualEndDay}
                onDeleteMeal={handleDeleteMeal}
            />
        );
      case AppView.ADD_MEAL:
        return (
          <AddMeal 
            onSave={handleSaveMeal} 
            onCancel={() => setCurrentView(AppView.DASHBOARD)} 
            initialMode={addMealInitialMode}
          />
        );
      case AppView.HISTORY:
        return (
            <History 
                meals={meals} 
                waterLogs={waterLogs}
                goal={goal}
                onDelete={handleDeleteMeal}
                currentSystemDateStr={currentVirtualDateStr}
                gmtOffset={GMT_OFFSET_HOURS}
            />
        );
      case AppView.SETTINGS:
        return (
            <div className="flex flex-col h-full animate-fade-in pb-12">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Profile & Goals</h1>
                    <p className="text-gray-500">Update your stats to recalculate your targets.</p>
                </header>
                
                <div className="space-y-6">
                     {/* Data Management Section */}
                     <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                             <RotateCcw size={18} />
                             App Settings
                        </h2>
                        <button 
                            onClick={resetDayCounter}
                            className="w-full py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            Reset Day Counter
                        </button>
                    </section>

                    {/* Physical Stats Section */}
                    <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <User size={18} />
                            Personal Details
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
                                <select 
                                    value={tempGoal.gender}
                                    onChange={(e) => setTempGoal({...tempGoal, gender: e.target.value as Gender})}
                                    className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Age</label>
                                <input 
                                    type="number" 
                                    value={tempGoal.age || ''}
                                    onChange={(e) => setTempGoal({...tempGoal, age: Number(e.target.value)})}
                                    className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Height (cm)</label>
                                <input 
                                    type="number" 
                                    value={tempGoal.height || ''}
                                    onChange={(e) => setTempGoal({...tempGoal, height: Number(e.target.value)})}
                                    className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Current Weight (kg)</label>
                                <input 
                                    type="number" 
                                    value={tempGoal.currentWeight || ''}
                                    onChange={(e) => setTempGoal({...tempGoal, currentWeight: Number(e.target.value)})}
                                    className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200"
                                />
                             </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Activity Level</label>
                            <select 
                                value={tempGoal.activityLevel}
                                onChange={(e) => setTempGoal({...tempGoal, activityLevel: e.target.value as ActivityLevel})}
                                className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200"
                            >
                                <option value="sedentary">Sedentary (Little/no exercise)</option>
                                <option value="light">Lightly Active (1-3 days/week)</option>
                                <option value="moderate">Moderately Active (3-5 days/week)</option>
                                <option value="active">Active (6-7 days/week)</option>
                                <option value="very_active">Very Active (Physical job/training)</option>
                            </select>
                        </div>
                    </section>

                    {/* Goals Section */}
                    <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                             <Calculator size={18} />
                             Goals
                        </h2>
                        
                         <div className="grid grid-cols-2 gap-4 mb-4">
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Goal Type</label>
                                <select 
                                    value={tempGoal.goalType}
                                    onChange={(e) => setTempGoal({...tempGoal, goalType: e.target.value as GoalType})}
                                    className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                    <option value="lose">Lose Weight</option>
                                    <option value="maintain">Maintain</option>
                                    <option value="gain">Gain Muscle</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Target Weight (kg)</label>
                                <input 
                                    type="number" 
                                    value={tempGoal.targetWeight || ''}
                                    onChange={(e) => setTempGoal({...tempGoal, targetWeight: Number(e.target.value)})}
                                    className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200"
                                />
                             </div>
                         </div>
                         
                         <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-bold text-emerald-800">Daily Calorie Target</label>
                                <button 
                                    onClick={calculateRecommendedCalories}
                                    className="text-xs bg-emerald-600 text-white px-2 py-1 rounded shadow-sm hover:bg-emerald-700 transition-colors"
                                >
                                    Auto-Calculate
                                </button>
                            </div>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={tempGoal.dailyCalories || ''}
                                    onChange={(e) => setTempGoal({...tempGoal, dailyCalories: Number(e.target.value)})}
                                    className="w-full p-3 text-2xl font-bold text-center text-emerald-700 bg-white rounded-lg border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kcal</span>
                            </div>
                         </div>

                         <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Daily Water Goal (ml)</label>
                            <input 
                                type="number" 
                                value={tempGoal.dailyWater || ''}
                                onChange={(e) => setTempGoal({...tempGoal, dailyWater: Number(e.target.value)})}
                                className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200"
                            />
                         </div>
                    </section>

                    <button 
                        onClick={saveSettings}
                        className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-all flex items-center justify-center space-x-2"
                    >
                        <span>Save Changes</span>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-900 flex justify-center">
      {/* Mobile Container Limit */}
      <div className="w-full max-w-md bg-white min-h-screen relative shadow-2xl overflow-hidden flex flex-col">
        
        {/* View Content */}
        <main className={`flex-1 overflow-y-auto ${currentView !== AppView.ADD_MEAL ? 'p-6 pb-24' : ''}`}>
          {renderContent()}
        </main>

        {/* Bottom Navigation */}
        {currentView !== AppView.ADD_MEAL && (
          <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-between items-center z-50 safe-area-bottom">
            <button
              onClick={() => setCurrentView(AppView.DASHBOARD)}
              className={`flex flex-col items-center space-y-1 transition-colors ${currentView === AppView.DASHBOARD ? 'text-emerald-600' : 'text-gray-400'}`}
            >
              <LayoutDashboard size={24} />
              <span className="text-[10px] font-medium">Today</span>
            </button>
            
            <button
              onClick={() => {
                setAddMealInitialMode('text');
                setCurrentView(AppView.ADD_MEAL);
              }}
              className="flex flex-col items-center space-y-1 transition-colors text-gray-400 hover:text-emerald-600"
            >
              <Search size={24} />
              <span className="text-[10px] font-medium">Search</span>
            </button>

            {/* Floating Add Button Effect */}
            <div className="relative -top-6">
                <button
                onClick={() => {
                  setAddMealInitialMode('camera');
                  setCurrentView(AppView.ADD_MEAL);
                }}
                className="bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-transform active:scale-95 border-4 border-gray-50"
                >
                <PlusCircle size={32} />
                </button>
            </div>

            <button
              onClick={() => setCurrentView(AppView.HISTORY)}
              className={`flex flex-col items-center space-y-1 transition-colors ${currentView === AppView.HISTORY ? 'text-emerald-600' : 'text-gray-400'}`}
            >
              <HistoryIcon size={24} />
              <span className="text-[10px] font-medium">Reports</span>
            </button>
            
            <button
              onClick={() => setCurrentView(AppView.SETTINGS)}
               className={`flex flex-col items-center space-y-1 transition-colors ${currentView === AppView.SETTINGS ? 'text-emerald-600' : 'text-gray-400'}`}
            >
                <User size={24} />
                <span className="text-[10px] font-medium">Profile</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};

export default App;