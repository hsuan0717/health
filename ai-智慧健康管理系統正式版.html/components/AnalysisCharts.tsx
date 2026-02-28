import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { DietData, ExerciseData, SleepData } from '../types';

interface ChartProps {
  dietData: DietData[];
  exerciseData: ExerciseData[];
  sleepData: SleepData[];
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

export const StepsChart: React.FC<{ data: ExerciseData[] }> = ({ data }) => {
  // Take last 7 entries
  const chartData = data.slice(-7).map(d => ({
    name: d.date.substring(5), // MM-DD
    steps: d.dailySteps
  }));

  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="name" fontSize={10} stroke="#9CA3AF" tickLine={false} axisLine={false} />
          <YAxis fontSize={10} stroke="#9CA3AF" tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
          />
          <Line type="monotone" dataKey="steps" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} activeDot={{ r: 6 }} name="步數" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const NutritionPieChart: React.FC<{ data: DietData[] }> = ({ data }) => {
  // Calculate average ratios
  const total = data.length || 1;
  const avgVeg = data.reduce((acc, curr) => acc + curr.vegRatio, 0) / total;
  const avgProtein = data.reduce((acc, curr) => acc + curr.proteinRatio, 0) / total;
  const avgStarch = data.reduce((acc, curr) => acc + curr.starchRatio, 0) / total;
  
  const sum = avgVeg + avgProtein + avgStarch || 1;
  
  const chartData = [
    { name: '蔬菜', value: avgVeg / sum },
    { name: '蛋白質', value: avgProtein / sum },
    { name: '澱粉', value: avgStarch / sum },
  ];

  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const SleepBarChart: React.FC<{ data: SleepData[] }> = ({ data }) => {
    const chartData = data.slice(-7).map(d => ({
        name: d.date.substring(5),
        hours: d.sleepDuration
    }));

    return (
        <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" fontSize={10} stroke="#9CA3AF" tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} stroke="#9CA3AF" tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', border: 'none' }}/>
                    <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} name="小時" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
