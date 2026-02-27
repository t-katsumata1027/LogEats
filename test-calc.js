const age = 30;
const gender = "male";
const height = 170;
const weight = 65;
const activityLevel = "normal";
const targetWeight = "";

if (!age || !gender || !height || !weight || !activityLevel) {
    console.log("Returned early");
    process.exit(0);
}

let bmr = 0;
if (gender === "male") {
    bmr = 88.362 + (13.397 * Number(weight)) + (4.799 * Number(height)) - (5.677 * Number(age));
} else {
    bmr = 447.593 + (9.247 * Number(weight)) + (3.098 * Number(height)) - (4.330 * Number(age));
}

let multiplier = 1.2;
if (activityLevel === "normal") multiplier = 1.55;
if (activityLevel === "high") multiplier = 1.725;

const tdee = bmr * multiplier;
const isDietMode = targetWeight && Number(targetWeight) < Number(weight);
let targetDailyCalories = isDietMode ? Math.max(tdee * 0.85, bmr) : tdee;
const finalCalories = Math.round(targetDailyCalories / 10) * 10;

const refWeight = targetWeight ? Number(targetWeight) : Number(weight);
const protein = Math.round(refWeight * (isDietMode ? 1.6 : 1.2));
const fat = Math.round((finalCalories * 0.25) / 9);
const carbs = Math.round((finalCalories - protein * 4 - fat * 9) / 4);

console.log({
    finalCalories,
    protein,
    fat,
    carbs
});
