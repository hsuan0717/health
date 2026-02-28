import React, { useState, useEffect, useCallback } from 'react';
import { DietData, ExerciseData, SleepData, AdviceItem, GamificationState, DashboardLayout, WidgetType, WidgetConfig } from './types';
import { analyzeFoodImage, generateWeeklyReportAI } from './services/geminiService';
import { calculateGamificationState } from './services/gamificationLogic';
import { StepsChart, NutritionPieChart, SleepBarChart } from './components/AnalysisCharts';
import { Dashboard } from './components/Dashboard';
import { LayoutDashboard, Edit3, Save, RotateCcw } from 'lucide-react';

const DEFAULT_LAYOUT: DashboardLayout = {
  id: 'default',
  name: '我的健康儀表板',
  widgets: [
    { id: 'summary', type: 'DAILY_SUMMARY', title: '今日概況', x: 0, y: 0, w: 4, h: 2 },
    { id: 'gamification', type: 'GAMIFICATION', title: '成就與挑戰', x: 4, y: 0, w: 8, h: 2 },
    { id: 'steps', type: 'STEPS_CHART', title: '步數趨勢', x: 0, y: 2, w: 6, h: 3 },
    { id: 'nutrition', type: 'NUTRITION_PIE', title: '營養比例', x: 6, y: 2, w: 6, h: 3 },
    { id: 'sleep', type: 'SLEEP_BAR', title: '睡眠時數', x: 0, y: 5, w: 6, h: 3 },
    { id: 'advice', type: 'ADVICE_LIST', title: '健康建議', x: 6, y: 5, w: 6, h: 3 },
  ]
};

// --- Helper: Generate Mock Data ---
const generateMockData = () => {
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const diets: DietData[] = dates.map(date => ({
    id: Math.random().toString(),
    date,
    calorieIntake: Math.floor(Math.random() * 600 + 400),
    vegRatio: Math.random() * 0.4 + 0.1, // 0.1 - 0.5
    proteinRatio: Math.random() * 0.3 + 0.1,
    starchRatio: Math.random() * 0.4 + 0.2,
    sugaryDrinksCount: Math.random() > 0.7 ? 1 : 0,
    friedFoodCount: Math.random() > 0.8 ? 1 : 0,
  }));

  const exercises: ExerciseData[] = dates.map(date => ({
    id: Math.random().toString(),
    date,
    dailySteps: Math.floor(Math.random() * 5000 + 4000), // 4000 - 9000
    moderateExerciseMinutes: Math.floor(Math.random() * 40),
    totalSittingMinutes: Math.floor(Math.random() * 100 + 300),
  }));

  const sleeps: SleepData[] = dates.map(date => ({
    id: Math.random().toString(),
    date,
    bedTime: "23:45",
    wakeTime: "06:30",
    sleepDuration: 6.5 + Math.random(),
    usedPhoneBeforeBed: Math.random() > 0.5,
  }));

  return { diets, exercises, sleeps };
};

// --- Core Analysis Logic Functions ---

const analyzeDiet = (weeklyData: DietData[]): AdviceItem[] => {
  const advice: AdviceItem[] = [];
  if (weeklyData.length === 0) return advice;

  const avgVeg = weeklyData.reduce((sum, d) => sum + d.vegRatio, 0) / weeklyData.length;
  const avgProtein = weeklyData.reduce((sum, d) => sum + d.proteinRatio, 0) / weeklyData.length;

  if (avgVeg < 0.5 || avgProtein < 0.25) {
    advice.push({
      category: 'Diet',
      title: '營養比例失衡',
      description: '建議採用「健康餐盤法」：1/2 蔬菜、1/4 蛋白質、1/4 澱粉。',
      priority: 'High'
    });
  }

  const totalSugary = weeklyData.reduce((sum, d) => sum + d.sugaryDrinksCount, 0);
  const avgSugary = totalSugary / weeklyData.length;
  if (avgSugary > 0.57) {
    advice.push({
      category: 'Diet',
      title: '含糖飲料攝取過多',
      description: '提醒每週至少 3 天不喝含糖飲料，多喝水。',
      priority: 'Medium'
    });
  }

  return advice;
};

const analyzeExercise = (weeklyData: ExerciseData[]): AdviceItem[] => {
  const advice: AdviceItem[] = [];
  if (weeklyData.length === 0) return advice;

  const avgSteps = weeklyData.reduce((sum, d) => sum + d.dailySteps, 0) / weeklyData.length;
  if (avgSteps < 8000) {
    advice.push({
      category: 'Exercise',
      title: '活動量不足',
      description: `目前平均步數 ${Math.round(avgSteps)} 步。建議每日目標：8,000–10,000 步。`,
      priority: 'Medium'
    });
  }

  const totalModMin = weeklyData.reduce((sum, d) => sum + d.moderateExerciseMinutes, 0);
  if (totalModMin < 180) {
    advice.push({
      category: 'Exercise',
      title: '中等強度運動不足',
      description: '每週建議至少 3 次，共 180 分鐘的中等強度運動。',
      priority: 'High'
    });
  }

  const avgSitting = weeklyData.reduce((sum, d) => sum + d.totalSittingMinutes, 0) / weeklyData.length;
  if (avgSitting > 480) {
    advice.push({
      category: 'Exercise',
      title: '久坐時間過長',
      description: '建議每久坐 50 分鐘後，起身活動 5 分鐘。',
      priority: 'Low'
    });
  }

  return advice;
};

const analyzeSleep = (weeklyData: SleepData[]): AdviceItem[] => {
  const advice: AdviceItem[] = [];
  if (weeklyData.length === 0) return advice;

  const lateNights = weeklyData.filter(d => {
    const [hour] = d.bedTime.split(':').map(Number);
    return (hour >= 0 && hour < 5) || (hour === 23 && parseInt(d.bedTime.split(':')[1]) > 30);
  }).length;

  if (lateNights > 2) {
    advice.push({
      category: 'Sleep',
      title: '頻繁熬夜',
      description: '檢測到入睡時間較晚，建議養成規律作息，目標 23:00 前就寢。',
      priority: 'High'
    });
  }

  const avgSleep = weeklyData.reduce((sum, d) => sum + d.sleepDuration, 0) / weeklyData.length;
  if (avgSleep < 7.5) {
    advice.push({
      category: 'Sleep',
      title: '睡眠時數不足',
      description: `平均睡眠僅 ${avgSleep.toFixed(1)} 小時。高中生建議每晚睡足 7.5 - 8.5 小時。`,
      priority: 'High'
    });
  }

  const phoneDays = weeklyData.filter(d => d.usedPhoneBeforeBed).length;
  if (phoneDays > 3) {
    advice.push({
      category: 'Sleep',
      title: '睡前使用手機',
      description: '藍光會影響褪黑激素分泌，建議睡前 30 分鐘不要使用手機。',
      priority: 'Medium'
    });
  }

  return advice;
};

const WIDGET_TITLES: Record<WidgetType, string> = {
  STEPS_CHART: '步數趨勢',
  NUTRITION_PIE: '營養比例',
  SLEEP_BAR: '睡眠時數',
  ADVICE_LIST: '健康建議',
  GAMIFICATION: '成就與挑戰',
  DAILY_SUMMARY: '今日概況',
  AI_REPORT: 'AI 週報摘要',
};

// --- Main App Component ---

enum Tab {
  DASHBOARD = 'DASHBOARD',
  DIET = 'DIET',
  EXERCISE = 'EXERCISE',
  SLEEP = 'SLEEP',
  REPORT = 'REPORT'
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  
  // Data State
  const [dietData, setDietData] = useState<DietData[]>([]);
  const [exerciseData, setExerciseData] = useState<ExerciseData[]>([]);
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  
  // Report State
  const [adviceList, setAdviceList] = useState<AdviceItem[]>([]);
  const [aiReportSummary, setAiReportSummary] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Gamification State
  const [gameState, setGameState] = useState<GamificationState>({
      totalPoints: 0,
      level: 1,
      progressToNextLevel: 0,
      badges: [],
      challenges: []
  });

  // Dashboard State
  const [isEditMode, setIsEditMode] = useState(false);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>(() => {
    const saved = localStorage.getItem('health_dashboard_layout');
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
  });

  // Save layout to local storage
  useEffect(() => {
    localStorage.setItem('health_dashboard_layout', JSON.stringify(dashboardLayout));
  }, [dashboardLayout]);

  // Initialize with some mock data on first load
  useEffect(() => {
    const { diets, exercises, sleeps } = generateMockData();
    setDietData(diets);
    setExerciseData(exercises);
    setSleepData(sleeps);
  }, []);

  // Recalculate advice AND Gamification whenever data changes
  useEffect(() => {
    const dietAdvice = analyzeDiet(dietData);
    const exerciseAdvice = analyzeExercise(exerciseData);
    const sleepAdvice = analyzeSleep(sleepData);
    setAdviceList([...dietAdvice, ...exerciseAdvice, ...sleepAdvice]);

    const newGameState = calculateGamificationState(dietData, exerciseData, sleepData);
    setGameState(newGameState);

  }, [dietData, exerciseData, sleepData]);

  // --- Input Handlers ---

  const handleDietSubmit = (data: DietData) => {
    setDietData(prev => [...prev, data]);
    setActiveTab(Tab.DASHBOARD);
  };

  const handleExerciseSubmit = (data: ExerciseData) => {
    setExerciseData(prev => [...prev, data]);
    setActiveTab(Tab.DASHBOARD);
  };

  const handleSleepSubmit = (data: SleepData) => {
    setSleepData(prev => [...prev, data]);
    setActiveTab(Tab.DASHBOARD);
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const summary = await generateWeeklyReportAI(dietData, exerciseData, sleepData, adviceList);
      setAiReportSummary(summary);
    } catch (e) {
      setAiReportSummary("報告生成失敗，請檢查網路連線。");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // --- Dashboard Handlers ---

  const handleAddWidget = (type: WidgetType) => {
    const newWidget: WidgetConfig = {
      id: `${type}_${Date.now()}`,
      type,
      title: WIDGET_TITLES[type],
      x: 0,
      y: Infinity, // Put at the bottom
      w: 6,
      h: 3,
    };
    setDashboardLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget]
    }));
  };

  const handleRemoveWidget = (id: string) => {
    setDashboardLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== id)
    }));
  };

  const renderWidget = useCallback((type: WidgetType) => {
    switch (type) {
      case 'STEPS_CHART':
        return <StepsChart data={exerciseData} />;
      case 'NUTRITION_PIE':
        return <NutritionPieChart data={dietData} />;
      case 'SLEEP_BAR':
        return <SleepBarChart data={sleepData} />;
      case 'ADVICE_LIST':
        return <AdviceListView adviceList={adviceList} onNavigate={() => setActiveTab(Tab.REPORT)} />;
      case 'GAMIFICATION':
        return <GamificationWidget gameState={gameState} />;
      case 'DAILY_SUMMARY':
        return <DailySummaryWidget adviceCount={adviceList.length} onNavigate={() => setActiveTab(Tab.REPORT)} />;
      case 'AI_REPORT':
        return <AiReportWidget summary={aiReportSummary} isGenerating={isGeneratingReport} onGenerate={handleGenerateReport} />;
      default:
        return null;
    }
  }, [dietData, exerciseData, sleepData, adviceList, gameState, aiReportSummary, isGeneratingReport]);

  // --- Render Views ---

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary flex items-center">
            <i className="fa-solid fa-heart-pulse mr-2"></i>
            AI 智慧健康管理
          </h1>
          <div className="flex items-center gap-2">
            {activeTab === Tab.DASHBOARD && (
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isEditMode 
                    ? 'bg-primary text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isEditMode ? <Save size={16} /> : <Edit3 size={16} />}
                <span>{isEditMode ? '完成自訂' : '自訂版面'}</span>
              </button>
            )}
            <button 
              onClick={() => {
                 const { diets, exercises, sleeps } = generateMockData();
                 setDietData(diets); setExerciseData(exercises); setSleepData(sleeps);
                 if (confirm('確定要重置版面配置嗎？')) {
                   setDashboardLayout(DEFAULT_LAYOUT);
                 }
              }}
              className="p-2 text-gray-400 hover:text-primary transition-colors"
              title="重置數據與版面"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`mx-auto p-4 space-y-6 ${activeTab === Tab.DASHBOARD ? 'max-w-7xl' : 'max-w-md'}`}>
        
        {activeTab === Tab.DASHBOARD && (
          <Dashboard 
            layout={dashboardLayout}
            onLayoutChange={setDashboardLayout}
            renderWidget={renderWidget}
            isEditMode={isEditMode}
            onAddWidget={handleAddWidget}
            onRemoveWidget={handleRemoveWidget}
          />
        )}

        {activeTab === Tab.DIET && <DietInputView onSave={handleDietSubmit} onCancel={() => setActiveTab(Tab.DASHBOARD)} />}
        {activeTab === Tab.EXERCISE && <ExerciseInputView onSave={handleExerciseSubmit} onCancel={() => setActiveTab(Tab.DASHBOARD)} />}
        {activeTab === Tab.SLEEP && <SleepInputView onSave={handleSleepSubmit} onCancel={() => setActiveTab(Tab.DASHBOARD)} />}
        
        {activeTab === Tab.REPORT && (
          <ReportView 
            adviceList={adviceList} 
            summary={aiReportSummary} 
            isGenerating={isGeneratingReport} 
            onGenerate={handleGenerateReport}
          />
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="max-w-md mx-auto flex justify-around py-3">
          <NavButton icon="fa-house" label="首頁" active={activeTab === Tab.DASHBOARD} onClick={() => setActiveTab(Tab.DASHBOARD)} />
          <NavButton icon="fa-carrot" label="飲食" active={activeTab === Tab.DIET} onClick={() => setActiveTab(Tab.DIET)} />
          <NavButton icon="fa-person-running" label="運動" active={activeTab === Tab.EXERCISE} onClick={() => setActiveTab(Tab.EXERCISE)} />
          <NavButton icon="fa-bed" label="睡眠" active={activeTab === Tab.SLEEP} onClick={() => setActiveTab(Tab.SLEEP)} />
          <NavButton icon="fa-file-medical" label="週報" active={activeTab === Tab.REPORT} onClick={() => setActiveTab(Tab.REPORT)} />
        </div>
      </nav>
    </div>
  );
}

// --- Widget Components ---

const DailySummaryWidget: React.FC<{ adviceCount: number, onNavigate: (t: Tab) => void }> = ({ adviceCount, onNavigate }) => (
  <div className="h-full flex flex-col justify-center">
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white p-4 rounded-xl shadow-lg cursor-pointer hover:scale-[1.02] transition-transform"
           onClick={() => onNavigate(Tab.REPORT)}>
        <div className="flex justify-between items-start">
          <span className="text-xs font-medium opacity-90">待處理建議</span>
          <i className="fa-solid fa-bell opacity-80"></i>
        </div>
        <div className="mt-1 text-2xl font-bold">{adviceCount}</div>
      </div>
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-center items-center text-center">
           <span className="text-gray-400 text-xs mb-1">今日紀錄</span>
           <span className="text-primary font-bold text-sm">
              {(new Date()).toISOString().split('T')[0].slice(5)}
           </span>
      </div>
    </div>
  </div>
);

const GamificationWidget: React.FC<{ gameState: GamificationState }> = ({ gameState }) => (
  <div className="h-full flex flex-col justify-between space-y-4">
    <div className="flex justify-between items-end">
      <div>
        <h2 className="text-sm font-bold text-gray-800">等級 {gameState.level}</h2>
        <span className="text-[10px] text-gray-500">總積分: {gameState.totalPoints}</span>
      </div>
      <span className="text-[10px] font-bold text-primary">{gameState.progressToNextLevel}%</span>
    </div>
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${gameState.progressToNextLevel}%` }}></div>
    </div>
    <div className="flex space-x-2 overflow-x-auto no-scrollbar">
      {gameState.badges.slice(0, 4).map((badge) => (
        <div key={badge.id} className={`shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-lg border ${badge.isUnlocked ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
          <i className={`fa-solid ${badge.icon} text-xs ${badge.isUnlocked ? badge.color : 'text-gray-300'}`}></i>
        </div>
      ))}
    </div>
  </div>
);

const AdviceListView: React.FC<{ adviceList: AdviceItem[], onNavigate: () => void }> = ({ adviceList, onNavigate }) => (
  <div className="h-full overflow-auto no-scrollbar">
    {adviceList.length === 0 ? (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center py-4">
        <i className="fa-regular fa-thumbs-up text-2xl mb-2"></i>
        <p className="text-xs">目前沒有建議</p>
      </div>
    ) : (
      <div className="space-y-3">
        {adviceList.slice(0, 3).map((advice, idx) => (
          <div key={idx} className="flex items-start space-x-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
            <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 
                ${advice.priority === 'High' ? 'bg-red-500' : advice.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`} 
            />
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-gray-800 truncate">{advice.title}</h4>
              <p className="text-[10px] text-gray-500 line-clamp-1">{advice.description}</p>
            </div>
          </div>
        ))}
        {adviceList.length > 3 && (
          <button onClick={onNavigate} className="w-full text-center text-[10px] text-primary hover:underline">查看更多 ({adviceList.length})</button>
        )}
      </div>
    )}
  </div>
);

const AiReportWidget: React.FC<{ summary: string, isGenerating: boolean, onGenerate: () => void }> = ({ summary, isGenerating, onGenerate }) => (
  <div className="h-full flex flex-col justify-center">
    {isGenerating ? (
      <div className="text-center py-4">
        <i className="fa-solid fa-spinner fa-spin text-primary mb-2"></i>
        <p className="text-xs text-gray-500">分析中...</p>
      </div>
    ) : summary ? (
      <div className="bg-indigo-50 p-3 rounded-lg text-[10px] leading-relaxed text-indigo-900 line-clamp-4">
        {summary}
      </div>
    ) : (
      <div className="text-center py-4">
        <button onClick={onGenerate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 transition">
          生成 AI 週報
        </button>
      </div>
    )}
  </div>
);

const NavButton = ({ icon, label, active, onClick }: { icon: string, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center w-full ${active ? 'text-primary' : 'text-gray-400'}`}>
    <i className={`fa-solid ${icon} text-lg mb-1`}></i>
    <span className="text-xs font-medium">{label}</span>
  </button>
);

// --- Input Views ---

const DietInputView: React.FC<{ onSave: (d: DietData) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<DietData>>({
    date: new Date().toISOString().split('T')[0],
    sugaryDrinksCount: 0,
    friedFoodCount: 0
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      
      // Analyze with Gemini
      setAnalyzing(true);
      try {
        const base64Data = base64.split(',')[1]; // Remove data:image/jpeg;base64,
        const result = await analyzeFoodImage(base64Data);
        setFormData(prev => ({
          ...prev,
          ...result
        }));
      } catch (error) {
        alert("分析失敗，請手動輸入數據");
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.calorieIntake !== undefined) {
      onSave({
        id: Math.random().toString(),
        date: formData.date!,
        calorieIntake: formData.calorieIntake!,
        vegRatio: formData.vegRatio || 0,
        proteinRatio: formData.proteinRatio || 0,
        starchRatio: formData.starchRatio || 0,
        sugaryDrinksCount: formData.sugaryDrinksCount || 0,
        friedFoodCount: formData.friedFoodCount || 0
      });
    } else {
        alert("請輸入完整的飲食資訊或上傳照片");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md space-y-4 animate-fade-in-up">
      <h2 className="text-xl font-bold text-gray-800">新增飲食紀錄</h2>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">拍照/上傳食物 (Gemini AI 分析)</label>
        <div className="relative">
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="food-upload" />
          <label htmlFor="food-upload" className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 bg-gray-50 overflow-hidden">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <i className="fa-solid fa-camera text-2xl text-gray-400 mb-2"></i>
                <span className="text-sm text-gray-500">點擊上傳</span>
              </>
            )}
          </label>
        </div>
      </div>

      {analyzing && (
        <div className="flex items-center text-primary space-x-2">
            <i className="fa-solid fa-circle-notch fa-spin"></i>
            <span>AI 正在分析營養成分...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
           <label className="text-xs text-gray-500">日期</label>
           <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border rounded p-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs text-gray-500">熱量 (kcal)</label>
                <input type="number" value={formData.calorieIntake || ''} onChange={e => setFormData({...formData, calorieIntake: Number(e.target.value)})} className="w-full border rounded p-2" placeholder="0" />
            </div>
            <div>
                 <label className="text-xs text-gray-500">含糖飲料(次)</label>
                 <input type="number" value={formData.sugaryDrinksCount} onChange={e => setFormData({...formData, sugaryDrinksCount: Number(e.target.value)})} className="w-full border rounded p-2" />
            </div>
        </div>

        <div>
             <label className="text-xs text-gray-500 block mb-1">餐盤比例 (0-1)</label>
             <div className="flex space-x-2">
                <input type="number" step="0.1" max="1" placeholder="菜" value={formData.vegRatio || ''} onChange={e => setFormData({...formData, vegRatio: Number(e.target.value)})} className="w-full border rounded p-2 bg-green-50" />
                <input type="number" step="0.1" max="1" placeholder="肉" value={formData.proteinRatio || ''} onChange={e => setFormData({...formData, proteinRatio: Number(e.target.value)})} className="w-full border rounded p-2 bg-red-50" />
                <input type="number" step="0.1" max="1" placeholder="飯" value={formData.starchRatio || ''} onChange={e => setFormData({...formData, starchRatio: Number(e.target.value)})} className="w-full border rounded p-2 bg-yellow-50" />
             </div>
        </div>

        <div className="flex space-x-3 pt-2">
             <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600">取消</button>
             <button type="submit" className="flex-1 py-2 rounded-lg bg-primary text-white font-bold shadow-md hover:bg-emerald-600">儲存</button>
        </div>
      </form>
    </div>
  );
};

const ExerciseInputView: React.FC<{ onSave: (d: ExerciseData) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
    const [data, setData] = useState<Partial<ExerciseData>>({
        date: new Date().toISOString().split('T')[0],
        dailySteps: 0,
        moderateExerciseMinutes: 0,
        totalSittingMinutes: 0
    });

    return (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-4 animate-fade-in-up">
             <h2 className="text-xl font-bold text-gray-800">新增運動紀錄</h2>
             <div className="space-y-4">
                 <div>
                    <label className="text-xs text-gray-500">日期</label>
                    <input type="date" value={data.date} onChange={e => setData({...data, date: e.target.value})} className="w-full border rounded p-2" />
                 </div>
                 <div>
                    <label className="text-xs text-gray-500">今日步數</label>
                    <input type="number" value={data.dailySteps || ''} onChange={e => setData({...data, dailySteps: Number(e.target.value)})} className="w-full border rounded p-2" placeholder="ex: 8000" />
                 </div>
                 <div>
                    <label className="text-xs text-gray-500">中等強度運動 (分鐘)</label>
                    <input type="number" value={data.moderateExerciseMinutes || ''} onChange={e => setData({...data, moderateExerciseMinutes: Number(e.target.value)})} className="w-full border rounded p-2" placeholder="ex: 30" />
                 </div>
                 <div>
                    <label className="text-xs text-gray-500">久坐時間 (分鐘)</label>
                    <input type="number" value={data.totalSittingMinutes || ''} onChange={e => setData({...data, totalSittingMinutes: Number(e.target.value)})} className="w-full border rounded p-2" placeholder="ex: 480" />
                 </div>
                 <div className="flex space-x-3 pt-2">
                    <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600">取消</button>
                    <button onClick={() => onSave({id: Math.random().toString(), ...data} as ExerciseData)} className="flex-1 py-2 rounded-lg bg-secondary text-white font-bold shadow-md hover:bg-blue-600">儲存</button>
                </div>
             </div>
        </div>
    )
}

const SleepInputView: React.FC<{ onSave: (d: SleepData) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
    const [data, setData] = useState<Partial<SleepData>>({
        date: new Date().toISOString().split('T')[0],
        bedTime: '23:00',
        wakeTime: '07:00',
        usedPhoneBeforeBed: false
    });

    const calculateDuration = () => {
        const start = new Date(`2000-01-01T${data.bedTime}`);
        const end = new Date(`2000-01-01T${data.wakeTime}`);
        if (end < start) end.setDate(end.getDate() + 1);
        const diff = (end.getTime() - start.getTime()) / 1000 / 60 / 60;
        return diff;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-4 animate-fade-in-up">
             <h2 className="text-xl font-bold text-gray-800">新增睡眠紀錄</h2>
             <div className="space-y-4">
                 <div>
                    <label className="text-xs text-gray-500">日期</label>
                    <input type="date" value={data.date} onChange={e => setData({...data, date: e.target.value})} className="w-full border rounded p-2" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500">入睡時間</label>
                        <input type="time" value={data.bedTime} onChange={e => setData({...data, bedTime: e.target.value})} className="w-full border rounded p-2" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">起床時間</label>
                        <input type="time" value={data.wakeTime} onChange={e => setData({...data, wakeTime: e.target.value})} className="w-full border rounded p-2" />
                    </div>
                 </div>
                 
                 <div className="flex items-center space-x-2 py-2">
                    <input type="checkbox" id="phone" checked={data.usedPhoneBeforeBed} onChange={e => setData({...data, usedPhoneBeforeBed: e.target.checked})} className="w-5 h-5 text-primary rounded" />
                    <label htmlFor="phone" className="text-gray-700">睡前 30 分鐘使用手機</label>
                 </div>

                 <div className="flex space-x-3 pt-2">
                    <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600">取消</button>
                    <button onClick={() => onSave({id: Math.random().toString(), sleepDuration: calculateDuration(), ...data} as SleepData)} className="flex-1 py-2 rounded-lg bg-accent text-white font-bold shadow-md hover:bg-amber-600">儲存</button>
                </div>
             </div>
        </div>
    )
}

const ReportView: React.FC<{ adviceList: AdviceItem[], summary: string, isGenerating: boolean, onGenerate: () => void }> = ({ adviceList, summary, isGenerating, onGenerate }) => {
    return (
        <div className="space-y-6 animate-fade-in pb-12">
            
            {/* AI Report Card */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-bold"><i className="fa-solid fa-robot mr-2"></i>AI 健康週報</h2>
                     {!summary && !isGenerating && (
                         <button onClick={onGenerate} className="bg-white text-indigo-600 px-4 py-1.5 rounded-full text-sm font-bold shadow hover:bg-gray-100 transition">
                             生成分析
                         </button>
                     )}
                </div>
                
                {isGenerating ? (
                    <div className="py-8 text-center">
                        <i className="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
                        <p>AI 正在分析您的健康數據...</p>
                    </div>
                ) : summary ? (
                    <div className="bg-white/10 p-4 rounded-lg text-sm leading-relaxed backdrop-blur-sm">
                        {summary.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                    </div>
                ) : (
                    <p className="opacity-80 text-sm">點擊生成按鈕，讓 AI 為您分析本週的健康狀況並提供建議。</p>
                )}
            </div>

            {/* Advice Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-700">系統建議摘要</h3>
                </div>
                {adviceList.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <i className="fa-regular fa-thumbs-up text-3xl mb-2"></i>
                        <p>太棒了！目前沒有發現顯著的健康問題。</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {adviceList.map((advice, idx) => (
                            <div key={idx} className="p-4 flex items-start space-x-3">
                                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 
                                    ${advice.priority === 'High' ? 'bg-red-500' : advice.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`} 
                                />
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{advice.category}</span>
                                        <h4 className="font-bold text-gray-800">{advice.title}</h4>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{advice.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};