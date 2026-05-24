/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TablePreset, CuePreset, PlayerStats } from "../types";
import { TABLE_THEMES, CUE_SKINS } from "../data";
import { Check, Lock, Palette, Wand2, Coins } from "lucide-react";

interface ThemeCustomizerProps {
  playerStats: PlayerStats;
  onEquipTheme: (themeId: string) => void;
  onEquipCue: (cueId: string) => void;
  onUnlockTheme: (themeId: string, cost: number) => void;
  onUnlockCue: (cueId: string, cost: number) => void;
}

export function ThemeCustomizer({
  playerStats,
  onEquipTheme,
  onEquipCue,
  onUnlockTheme,
  onUnlockCue
}: ThemeCustomizerProps) {
  // Check unlock stats
  const isThemeUnlocked = (id: string) => {
    if (id === "billiard_green") return true;
    return playerStats.unlockedThemes.includes(id);
  };

  const isCueUnlocked = (id: string) => {
    if (id === "classic_wood") return true;
    return playerStats.unlockedCues.includes(id);
  };

  // Predefined costs & requirements to make customizations real progression items
  const getThemeCostAndLevel = (id: string) => {
    if (id === "royal_blue") return { cost: 300, level: 1 };
    if (id === "classy_burgundy") return { cost: 600, level: 2 };
    if (id === "midnight_slate") return { cost: 1200, level: 3 };
    return { cost: 0, level: 1 };
  };

  const getCueCostAndLevel = (id: string) => {
    if (id === "golden_elite") return { cost: 400, level: 1 };
    if (id === "carbon_fiber") return { cost: 800, level: 3 };
    if (id === "neon_pulse") return { cost: 1500, level: 5 };
    return { cost: 0, level: 1 };
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 border border-slate-900 bg-slate-950/20 backdrop-blur rounded-2xl" id="customizer-box">
      {/* Header section */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
          <Palette className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">صالة التخصيص والمظهر</h2>
          <p className="text-xs text-slate-400">
            طوّر مهاراتك وافتح طاولات وعصي حصرية باستخدام الجوائز والعملات التي تحصدها!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Table Felt customizer */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <span className="text-sm font-bold text-slate-200">ألوان وتصاميم طاولة البلياردو</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TABLE_THEMES.map((theme) => {
              const unlocked = isThemeUnlocked(theme.id);
              const active = playerStats.equippedTheme === theme.id;
              const { cost, level } = getThemeCostAndLevel(theme.id);
              const canAfford = playerStats.coins >= cost;
              const levelMet = playerStats.level >= level;

              return (
                <div
                  key={theme.id}
                  onClick={() => unlocked && !active && onEquipTheme(theme.id)}
                  className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    active
                      ? "border-emerald-500 bg-emerald-950/20"
                      : unlocked
                        ? "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                        : "border-slate-900/60 bg-slate-950/40 opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-200">{theme.name}</span>
                    {active ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                        <Check className="h-3 w-3" /> مجهّزة
                      </span>
                    ) : unlocked ? (
                      <span className="text-[10px] text-slate-400">انقر للتجهيز</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                        <Lock className="h-3 w-3" /> مقفلة
                      </span>
                    )}
                  </div>

                  {/* Circle felt representation */}
                  <div className="flex items-center gap-3 mt-1">
                    <div
                      className="w-10 h-10 rounded-full border-4 shadow-inner"
                      style={{
                        backgroundColor: theme.feltColor,
                        borderColor: theme.borderColor
                      }}
                    />
                    <div className="text-2xs font-mono text-slate-400">
                      <div>نقوش: {theme.accents === "gold" ? "ذهبية ملكية" : "فضية حادة"}</div>
                      <div>مستوى مطلوب: {level}</div>
                    </div>
                  </div>

                  {/* Lock prompt / buy footer */}
                  {!unlocked && (
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-900/50 pt-3">
                      <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                        <Coins className="h-3.5 w-3.5" />
                        <span>{cost} عملة</span>
                      </div>
                      <button
                        id={`unlock-theme-btn-${theme.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canAfford && levelMet) {
                            onUnlockTheme(theme.id, cost);
                          }
                        }}
                        disabled={!canAfford || !levelMet}
                        className={`px-3 py-1.5 text-3xs font-bold rounded-lg transition ${
                          canAfford && levelMet
                            ? "bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                            : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        {!levelMet ? `مستوى ${level}` : "شراء الان"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Billiard Cue customizer */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <span className="text-sm font-bold text-slate-200">حزمة جلود عصا البلياردو الفاخرة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CUE_SKINS.map((cue) => {
              const unlocked = isCueUnlocked(cue.id);
              const active = playerStats.equippedCue === cue.id;
              const { cost, level } = getCueCostAndLevel(cue.id);
              const canAfford = playerStats.coins >= cost;
              const levelMet = playerStats.level >= level;

              return (
                <div
                  key={cue.id}
                  onClick={() => unlocked && !active && onEquipCue(cue.id)}
                  className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    active
                      ? "border-purple-500 bg-purple-950/20"
                      : unlocked
                        ? "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                        : "border-slate-900/60 bg-slate-950/40 opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-200">{cue.name}</span>
                    {active ? (
                      <span className="flex items-center gap-1 text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full font-bold">
                        <Check className="h-3 w-3" /> مجهّزة
                      </span>
                    ) : unlocked ? (
                      <span className="text-[10px] text-slate-400">انقر للتجهيز</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                        <Lock className="h-3 w-3" /> مقفلة
                      </span>
                    )}
                  </div>

                  {/* Gradient representation with specs */}
                  <div className="flex flex-col gap-2 mt-1">
                    <div
                      className="w-full h-2.5 rounded shadow-inner"
                      style={{ background: cue.colorPattern }}
                    />
                    <div className="text-2xs font-mono text-slate-400 flex justify-between items-center">
                      <span>دقة الصوت: x{cue.clackPitchModifier}</span>
                      <span className="text-amber-500">مضاعف القوة: x{cue.powerModifier}</span>
                    </div>
                  </div>

                  {/* Lock prompt / buy footer */}
                  {!unlocked && (
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-900/50 pt-3">
                      <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                        <Coins className="h-3.5 w-3.5" />
                        <span>{cost} عملة</span>
                      </div>
                      <button
                        id={`unlock-cue-btn-${cue.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canAfford && levelMet) {
                            onUnlockCue(cue.id, cost);
                          }
                        }}
                        disabled={!canAfford || !levelMet}
                        className={`px-3 py-1.5 text-3xs font-bold rounded-lg transition ${
                          canAfford && levelMet
                            ? "bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                            : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        {!levelMet ? `مستوى ${level}` : "شراء الان"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
