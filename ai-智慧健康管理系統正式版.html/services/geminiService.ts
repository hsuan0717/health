import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DietData, ExerciseData, SleepData, WeeklyReport, AdviceItem } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// --- Image Analysis for Diet ---

interface FoodAnalysisResult {
  calorieIntake: number;
  vegRatio: number;
  proteinRatio: number;
  starchRatio: number;
  sugaryDrinksCount: number;
  friedFoodCount: number;
}

export const analyzeFoodImage = async (base64Image: string): Promise<FoodAnalysisResult> => {
  const ai = getClient();
  const modelId = "gemini-3-flash-preview"; // Fast and capable for vision

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      calorieIntake: { type: Type.NUMBER, description: "Estimated total calories in kcal" },
      vegRatio: { type: Type.NUMBER, description: "Ratio of vegetables (0.0 to 1.0)" },
      proteinRatio: { type: Type.NUMBER, description: "Ratio of protein sources (0.0 to 1.0)" },
      starchRatio: { type: Type.NUMBER, description: "Ratio of starch/carbs (0.0 to 1.0)" },
      sugaryDrinksCount: { type: Type.INTEGER, description: "Count of sugary drinks visible (usually 0 or 1)" },
      friedFoodCount: { type: Type.INTEGER, description: "Count of fried food items visible (usually 0 or 1)" },
    },
    required: ["calorieIntake", "vegRatio", "proteinRatio", "starchRatio", "sugaryDrinksCount", "friedFoodCount"],
  };

  const prompt = `Analyze this food image for a high school student's health log. 
  Estimate the nutritional content based on the visible food. 
  Provide ratios for vegetables, protein, and starch (they should roughly sum to 1.0, but it's okay if not exact).
  Identify if there are sugary drinks or fried foods.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as FoodAnalysisResult;
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    // Fallback or re-throw
    throw error;
  }
};

// --- Weekly Report Generation ---

export const generateWeeklyReportAI = async (
  dietData: DietData[],
  exerciseData: ExerciseData[],
  sleepData: SleepData[],
  manualAdvice: AdviceItem[]
): Promise<string> => {
  const ai = getClient();
  const modelId = "gemini-3-flash-preview"; 

  // Format data for the prompt
  const dataSummary = {
    diet: dietData.map(d => ({ date: d.date, cal: d.calorieIntake, veg: d.vegRatio, sugary: d.sugaryDrinksCount })),
    exercise: exerciseData.map(e => ({ date: e.date, steps: e.dailySteps, modMin: e.moderateExerciseMinutes, sitting: e.totalSittingMinutes })),
    sleep: sleepData.map(s => ({ date: s.date, duration: s.sleepDuration, bedTime: s.bedTime, phone: s.usedPhoneBeforeBed })),
    systemDetectedIssues: manualAdvice
  };

  const prompt = `
  Role: School Health Nurse AI.
  Target Audience: High School Student.
  Task: Write a friendly, encouraging, but serious weekly health summary based on the provided data JSON.
  
  Data Provided: ${JSON.stringify(dataSummary)}

  Requirements:
  1. Summarize their performance in Diet, Exercise, and Sleep.
  2. Specifically reference the "systemDetectedIssues" if any exist.
  3. Give 1 concrete, actionable goal for next week.
  4. Keep it under 200 words.
  5. Use Traditional Chinese (zh-TW).
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    return response.text || "無法生成報告，請稍後再試。";
  } catch (error) {
    console.error("Gemini Report Generation Error:", error);
    return "生成報告時發生錯誤。";
  }
};
