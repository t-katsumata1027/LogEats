"use client";

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";

type MealLog = {
    total_calories: number;
    total_protein: number;
    total_fat: number;
    total_carbs: number;
    logged_at: string;
};

type Props = {
    logs: MealLog[];
    targetCalories: number | null;
    targetProtein: number | null;
    targetFat: number | null;
    targetCarbs: number | null;
};

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

/** 直近7日間（今日含む）の日付配列を生成 */
function getLast7Days(): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        return d;
    });
}

export function WeeklyChart({ logs, targetCalories, targetProtein, targetFat, targetCarbs }: Props) {
    const days = getLast7Days();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = days.map((day) => {
        const dateStr = day.toLocaleDateString();
        const isToday = day.getTime() === today.getTime();
        const label = isToday ? "今日" : `${day.getMonth() + 1}/${day.getDate()}(${DAY_NAMES[day.getDay()]})`;

        const dayLogs = logs.filter(
            (l) => new Date(l.logged_at).toLocaleDateString() === dateStr
        );

        if (dayLogs.length === 0) return { label, calories: null, protein: null, fat: null, carbs: null };

        return {
            label,
            calories: Math.round(dayLogs.reduce((s, l) => s + Number(l.total_calories), 0)),
            protein: Math.round(dayLogs.reduce((s, l) => s + Number(l.total_protein), 0)),
            fat: Math.round(dayLogs.reduce((s, l) => s + Number(l.total_fat), 0)),
            carbs: Math.round(dayLogs.reduce((s, l) => s + Number(l.total_carbs), 0)),
        };
    });

    const hasAnyData = data.some((d) => d.calories !== null);

    return (
        <div className="card bg-base-100 border border-sage-100 shadow-sm p-4">
            <h3 className="text-sm font-bold text-sage-800 mb-4 flex items-center gap-2">
                <span>📈</span> 過去7日間の栄養推移
            </h3>

            {!hasAnyData ? (
                <div className="text-center py-10 text-sage-400 text-sm">
                    記録がまだありません
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e3e8df" />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: "#6b7c6b" }}
                            tickLine={false}
                            axisLine={false}
                        />
                        {/* 左軸: kcal */}
                        <YAxis
                            yAxisId="kcal"
                            orientation="left"
                            tick={{ fontSize: 11, fill: "#6b7c6b" }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}`}
                            width={40}
                        />
                        {/* 右軸: g */}
                        <YAxis
                            yAxisId="g"
                            orientation="right"
                            tick={{ fontSize: 11, fill: "#6b7c6b" }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}g`}
                            width={44}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: 12, border: "1px solid #d4dbd0", fontSize: 12 }}
                            formatter={(value: any, name: string | undefined) => {
                                if (value === null || value === undefined) return ["—", name ?? ""];
                                const unit = name === "カロリー" ? "kcal" : "g";
                                return [`${value}${unit}`, name ?? ""];
                            }}
                        />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 12 }}
                        />

                        {/* リファレンスライン（目標値） */}
                        {targetCalories && (
                            <ReferenceLine
                                yAxisId="kcal" y={targetCalories}
                                stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
                                label={{ value: `目標 ${targetCalories}kcal`, fontSize: 10, fill: "#f59e0b", position: "insideTopRight" }}
                            />
                        )}
                        {targetProtein && (
                            <ReferenceLine
                                yAxisId="g" y={targetProtein}
                                stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={1.5}
                            />
                        )}
                        {targetFat && (
                            <ReferenceLine
                                yAxisId="g" y={targetFat}
                                stroke="#a855f7" strokeDasharray="4 3" strokeWidth={1.5}
                            />
                        )}
                        {targetCarbs && (
                            <ReferenceLine
                                yAxisId="g" y={targetCarbs}
                                stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1.5}
                            />
                        )}

                        {/* 折れ線 */}
                        <Line
                            yAxisId="kcal" type="monotone" dataKey="calories" name="カロリー"
                            stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}
                        />
                        <Line
                            yAxisId="g" type="monotone" dataKey="protein" name="タンパク質"
                            stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}
                        />
                        <Line
                            yAxisId="g" type="monotone" dataKey="fat" name="脂質"
                            stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}
                        />
                        <Line
                            yAxisId="g" type="monotone" dataKey="carbs" name="炭水化物"
                            stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
