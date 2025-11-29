export interface Macronutrients {
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealItem {
  name: string;
  calories: number;
}

export interface MealAnalysis {
  mealName: string;
  items: MealItem[];
  totalCalories: number;
  macronutrients: Macronutrients;
  confidenceScore: number;
}

export interface LoggedMeal extends MealAnalysis {
  id: string;
  timestamp: number;
  imageUrl?: string;
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Gender = 'male' | 'female';
export type GoalType = 'lose' | 'maintain' | 'gain';

export interface UserGoal {
  dailyCalories: number;
  dailyWater: number; // in ml
  currentWeight: number; // in kg
  targetWeight: number; // in kg
  height: number; // in cm
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goalType: GoalType;
}

export interface WaterLog {
  id: string;
  timestamp: number;
  amount: number; // in ml
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  ADD_MEAL = 'ADD_MEAL',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS'
}
