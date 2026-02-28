export interface DietData {
  id: string;
  date: string; // YYYY-MM-DD
  calorieIntake: number;
  vegRatio: number; // 0.0 - 1.0
  proteinRatio: number; // 0.0 - 1.0
  starchRatio: number; // 0.0 - 1.0
  sugaryDrinksCount: number;
  friedFoodCount: number;
  imageUrl?: string;
}

export interface ExerciseData {
  id: string;
  date: string; // YYYY-MM-DD
  dailySteps: number;
  moderateExerciseMinutes: number;
  totalSittingMinutes: number;
}

export interface SleepData {
  id: string;
  date: string; // YYYY-MM-DD
  bedTime: string; // HH:mm
  wakeTime: string; // HH:mm
  sleepDuration: number; // Hours (float)
  usedPhoneBeforeBed: boolean;
}

export interface AdviceItem {
  category: 'Diet' | 'Exercise' | 'Sleep';
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface WeeklyReport {
  generatedAt: string;
  summary: string;
  adviceList: AdviceItem[];
}

// --- Layout Types ---

export type WidgetType = 'STEPS_CHART' | 'NUTRITION_PIE' | 'SLEEP_BAR' | 'ADVICE_LIST' | 'GAMIFICATION' | 'DAILY_SUMMARY' | 'AI_REPORT';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Font Awesome class suffix (e.g., 'trophy')
  color: string; // Tailwind color class (e.g., 'text-yellow-400')
  isUnlocked: boolean;
  unlockedDate?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  isCompleted: boolean;
  type: 'Diet' | 'Exercise' | 'Sleep';
}

export interface GamificationState {
  totalPoints: number;
  level: number;
  progressToNextLevel: number; // 0 - 100
  badges: Badge[];
  challenges: Challenge[];
}
