/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerStats } from "../types";
import { Award, Target, Trophy, TrendingUp, Sparkles, Coins, Users } from "lucide-react";

interface DashboardProps {
  playerStats: PlayerStats;
}

export function Dashboard({ playerStats }: DashboardProps) {
  const winRate =
    playerStats.playedGames > 0
      ? Math.round((playerStats.wonGames / playerStats.playedGames) * 100)
      : 0;

  // XP Progress Calculation
  const xpNeededForNextLevel = playerStats.level * 500;
  const xpPercent = Math.min(100, Math.round((playerStats.xp / xpNeededForNextLevel) * 100));

  // Pre-configured achievements list based on accomplishments
  const achievements = [
    {
      id: "first_blood",
      title: "أول ضحكة للثقوب",
      desc: "أسقطت أول كرة بنجاح في أي نمط لعب",
      icon: Target,
      unlocked: playerStats.playedGames > 0,
      color: "text-emerald-400 border-emerald-950/40 bg-emerald-500/10"
    },
    {
      id: "champion_spirit",
      title: "أمير الصالة",
      desc: "فزت بأول مباراة لك ضد الغريم",
      icon: Trophy,
      unlocked: playerStats.wonGames > 0,
      color: "text-amber-400 border-amber-950/40 bg-amber-500/10"
    },
    {
      id: "high_roller",
      title: "تاجر الذهب",
      desc: "جمعت أكثر من 800 عملة في محفظتك",
      icon: Coins,
      unlocked: playerStats.coins >= 800,
      color: "text-yellow-400 border-yellow-950/40 bg-yellow-500/10"
    },
    {
      id: "master_level",
      title: "العقل المدبر",
      desc: "تجاوزت المستوى 2 في الرتب العسكرية للعبة",
      icon: Award,
      unlocked: playerStats.level >= 2,
      color: "text-purple-400 border-purple-950/40 bg-purple-500/10"
    }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6" id="stats-dashboard">
      
      {/* Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 - Rank Level */}
        <div className="p-5 border border-slate-900 bg-slate-950/40 backdrop-blur rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xs font-mono text-slate-500 uppercase block">مرتبة التصنيف</span>
            <span className="text-2xl font-black text-slate-100 font-mono">الرتبة {playerStats.level}</span>
            <span className="text-3xs text-slate-400 block">برونزية الهواة</span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Award className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Card 2 - Win Ratio */}
        <div className="p-5 border border-slate-900 bg-slate-950/40 backdrop-blur rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xs font-mono text-slate-500 uppercase block">معدل الانتصارات</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{winRate}%</span>
            <span className="text-3xs text-slate-400 block">فوز {playerStats.wonGames} من {playerStats.playedGames}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <TrendingUp className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Card 3 - Gold Balance */}
        <div className="p-5 border border-slate-900 bg-slate-950/40 backdrop-blur rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xs font-mono text-slate-500 uppercase block">الذهب المتوفر</span>
            <span className="text-2xl font-black text-amber-500 font-mono">{playerStats.coins}</span>
            <span className="text-3xs text-slate-400 block font-sans">عملة معدنية للتعديل</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Coins className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Card 4 - Unlocks count */}
        <div className="p-5 border border-slate-900 bg-slate-950/40 backdrop-blur rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xs font-mono text-slate-500 uppercase block">المعدات المفتوحة</span>
            <span className="text-2xl font-black text-purple-400 font-mono">
              {playerStats.unlockedCues.length + playerStats.unlockedThemes.length} / 8
            </span>
            <span className="text-3xs text-slate-400 block">عصي وجلود طاولات</span>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Sparkles className="h-5.5 w-5.5" />
          </div>
        </div>
      </div>

      {/* Progress & Badges Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Experience gauge block */}
        <div className="md:col-span-2 p-6 border border-slate-900 bg-slate-950/30 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold text-slate-200 block mb-1">التقدم نحو الرتبة التالية</span>
            <span className="text-2xs text-slate-450 block leading-relaxed">
              احصد نقاط الخبرة XP من خلال إنهاء المباريات وإجراء عمليات الاصطدام المتتالي وإسقاط الكرات الصعبة ضد الخصوم.
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-end text-xs font-mono">
              <span className="text-slate-400">التقدم {xpPercent}%</span>
              <span className="text-slate-200 font-bold">{playerStats.xp} / {xpNeededForNextLevel} XP</span>
            </div>
            <div className="w-full bg-slate-950 border border-slate-850 h-3 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-900 pt-3 text-2xs text-slate-500 font-sans">
            <Users className="h-3.5 w-3.5" />
            <span>تسجيل المجهودات بالصالة مُؤمن ضد الحيل والغش بنجاح!</span>
          </div>
        </div>

        {/* Quick Trophies Hall */}
        <div className="p-6 border border-slate-900 bg-slate-950/30 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-200 block mb-3">خزانة الميداليات</span>
            <div className="space-y-2.5 max-h-48 overflow-y-auto">
              {achievements.map((ach) => {
                const Icon = ach.icon;
                return (
                  <div
                    key={ach.id}
                    className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all ${
                      ach.unlocked
                        ? "border-slate-800 bg-slate-900/10"
                        : "border-slate-950/40 bg-slate-950/10 opacity-40 select-none grayscale"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg border shrink-0 ${ach.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-200 block">{ach.title}</span>
                      <span className="text-[8px] text-slate-400 block font-normal leading-tight mt-0.5">
                        {ach.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
