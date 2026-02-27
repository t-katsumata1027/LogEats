"use client";

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";

const data = [
    { label: "月", calories: 1900, protein: 90, fat: 55, carbs: 260 },
    { label: "火", calories: 2100, protein: 110, fat: 60, carbs: 280 },
    { label: "水", calories: 1750, protein: 85, fat: 45, carbs: 230 },
    { label: "木", calories: 1850, protein: 95, fat: 50, carbs: 250 },
    { label: "金", calories: 2200, protein: 120, fat: 65, carbs: 300 },
    { label: "土", calories: 1600, protein: 80, fat: 40, carbs: 210 },
    { label: "今日", calories: 1850, protein: 96, fat: 51, carbs: 250 },
];

export function WeeklyChartDemo() {
    return (
        <div className="w-full h-40 mt-2 bg-white rounded-xl">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e8df" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#6b7c6b" }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        yAxisId="kcal"
                        orientation="left"
                        tick={{ fontSize: 10, fill: "#6b7c6b" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}`}
                        width={40}
                    />
                    <Legend
                        iconType="circle"
                        iconSize={6}
                        wrapperStyle={{ fontSize: 10, paddingTop: "8px" }}
                    />

                    {/* リファレンスライン（目標値） */}
                    <ReferenceLine
                        yAxisId="kcal" y={1850}
                        stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
                    />

                    {/* 折れ線 */}
                    <Line
                        yAxisId="kcal" type="monotone" dataKey="calories" name="カロリー"
                        stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={true} animationDuration={2000}
                    />
                    <Line
                        yAxisId="kcal" type="monotone" dataKey="protein" name="タンパク質"
                        stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={true} animationDuration={2000}
                    />
                    <Line
                        yAxisId="kcal" type="monotone" dataKey="fat" name="脂質"
                        stroke="#a855f7" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={true} animationDuration={2000}
                    />
                    <Line
                        yAxisId="kcal" type="monotone" dataKey="carbs" name="炭水化物"
                        stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={true} animationDuration={2000}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
