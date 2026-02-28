import { DietData, ExerciseData, SleepData, Badge, Challenge, GamificationState } from '../types';

export const calculateGamificationState = (
  diets: DietData[],
  exercises: ExerciseData[],
  sleeps: SleepData[]
): GamificationState => {
  let points = 0;

  // --- 1. Point Calculation System ---
  // Diet Points
  diets.forEach(d => {
    // Balanced Meal: Veg >= 30%, Protein >= 20%
    if (d.vegRatio >= 0.3 && d.proteinRatio >= 0.2) points += 20;
    // Healthy Choice: No sugary drinks
    if (d.sugaryDrinksCount === 0) points += 10;
    // Healthy Choice: No fried food
    if (d.friedFoodCount === 0) points += 10;
  });

  // Exercise Points
  exercises.forEach(e => {
    // Step Goal
    if (e.dailySteps >= 8000) points += 15;
    // Extra Push
    if (e.dailySteps >= 12000) points += 10;
    // Moderate Exercise
    if (e.moderateExerciseMinutes >= 30) points += 20;
  });

  // Sleep Points
  sleeps.forEach(s => {
    // Good Sleep Duration
    if (s.sleepDuration >= 7.0 && s.sleepDuration <= 9.0) points += 20;
    // Good Habits
    if (!s.usedPhoneBeforeBed) points += 15;
  });

  // Level System: Every 200 points is a level
  const pointsPerLevel = 200;
  const level = Math.floor(points / pointsPerLevel) + 1;
  const progressToNextLevel = Math.floor(((points % pointsPerLevel) / pointsPerLevel) * 100);

  // --- 2. Badges Logic ---
  const badges: Badge[] = [
    {
      id: 'first_step',
      name: '初出茅廬',
      description: '紀錄第一筆運動數據',
      icon: 'fa-person-walking',
      color: 'text-blue-400',
      isUnlocked: exercises.length > 0
    },
    {
      id: 'step_master',
      name: '萬步天王',
      description: '單日步數超過 10,000 步',
      icon: 'fa-fire',
      color: 'text-red-500',
      isUnlocked: exercises.some(e => e.dailySteps >= 10000)
    },
    {
      id: 'sleep_streak',
      name: '好眠大師',
      description: '連續 3 天睡眠達標 (7+ 小時)',
      icon: 'fa-moon',
      color: 'text-purple-400',
      isUnlocked: false // Calculated below
    },
    {
      id: 'clean_eater',
      name: '飲食清流',
      description: '累積 3 天不喝含糖飲料',
      icon: 'fa-leaf',
      color: 'text-green-500',
      isUnlocked: diets.filter(d => d.sugaryDrinksCount === 0).length >= 3
    }
  ];

  // Logic for Sleep Streak
  let sleepStreak = 0;
  let maxSleepStreak = 0;
  const sortedSleeps = [...sleeps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  sortedSleeps.forEach(s => {
      if (s.sleepDuration >= 7) {
          sleepStreak++;
          maxSleepStreak = Math.max(maxSleepStreak, sleepStreak);
      } else {
          sleepStreak = 0;
      }
  });
  if (maxSleepStreak >= 3) {
      const badge = badges.find(b => b.id === 'sleep_streak');
      if (badge) badge.isUnlocked = true;
  }

  // --- 3. Weekly Challenges Logic ---
  // We assume the data passed in is roughly for the "current week" for simplicity
  const totalSteps = exercises.reduce((acc, curr) => acc + curr.dailySteps, 0);
  const totalModMins = exercises.reduce((acc, curr) => acc + curr.moderateExerciseMinutes, 0);
  const balancedMeals = diets.filter(d => d.vegRatio >= 0.3 && d.proteinRatio >= 0.2).length;

  const challenges: Challenge[] = [
    {
      id: 'weekly_steps',
      title: '本週步數挑戰',
      description: '累積 50,000 步',
      target: 50000,
      current: totalSteps,
      unit: '步',
      isCompleted: totalSteps >= 50000,
      type: 'Exercise'
    },
    {
      id: 'active_week',
      title: '熱血燃燒',
      description: '累積 150 分鐘中等強度運動',
      target: 150,
      current: totalModMins,
      unit: '分鐘',
      isCompleted: totalModMins >= 150,
      type: 'Exercise'
    },
    {
      id: 'balanced_diet',
      title: '營養滿分',
      description: '攝取 5 餐均衡飲食',
      target: 5,
      current: balancedMeals,
      unit: '餐',
      isCompleted: balancedMeals >= 5,
      type: 'Diet'
    }
  ];

  return {
    totalPoints: points,
    level,
    progressToNextLevel,
    badges,
    challenges
  };
};
