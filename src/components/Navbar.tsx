/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerStats } from "../types";
import { LogOut, Palette, Trophy, PlayCircle, Coins, LogIn, Swords, Megaphone, ShoppingBag, ShieldCheck } from "lucide-react";

interface NavbarProps {
  playerStats: PlayerStats;
  currentTab: "lobby" | "customizer" | "dashboard" | "ads" | "shop" | "admin";
  setTab: (tab: "lobby" | "customizer" | "dashboard" | "ads" | "shop" | "admin") => void;
  user: any;
  onLoginTrigger: () => void;
  onLogoutTrigger: () => void;
  isRoomActive: boolean;
  onQuitRoom: () => void;
}

export function Navbar({
  playerStats,
  currentTab,
  setTab,
  user,
  onLoginTrigger,
  onLogoutTrigger,
  isRoomActive,
  onQuitRoom
}: NavbarProps) {
  return (
    <header className="w-full border-b border-slate-900 bg-slate-950/60 backdrop-blur" id="app-navbar">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* LOGO TITLE */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => !isRoomActive && setTab("lobby")}>
          <div className="p-2.5 bg-emerald-500 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/10">
            <Swords className="h-5 w-5 rotate-45" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-100 tracking-tight block">النخبة للبلياردو</h1>
            <span className="text-[10px] text-emerald-500 block font-mono">8-BALL POOL</span>
          </div>
        </div>

        {/* NAVIGATION TABS IN ACTIVE LOBBY */}
        {!isRoomActive && (
          <nav className="hidden sm:flex items-center gap-1 border border-slate-900 bg-slate-900/10 rounded-xl p-1">
            <button
              id="tab-lobby-btn"
              onClick={() => setTab("lobby")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentTab === "lobby"
                  ? "bg-slate-900 text-slate-100"
                  : "text-slate-400 hover:text-slate-250 hover:bg-slate-900/20"
              }`}
            >
              <PlayCircle className="h-3.5 w-3.5" />
              مباريات الساحة
            </button>
            <button
              id="tab-customizer-btn"
              onClick={() => setTab("customizer")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentTab === "customizer"
                  ? "bg-slate-900 text-slate-100"
                  : "text-slate-400 hover:text-slate-250 hover:bg-slate-900/20"
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              متجر المظاهر
            </button>
            <button
              id="tab-dashboard-btn"
              onClick={() => setTab("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentTab === "dashboard"
                  ? "bg-slate-900 text-slate-100"
                  : "text-slate-400 hover:text-slate-250 hover:bg-slate-900/20"
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              سجل الشرف
            </button>
            <button
              id="tab-ads-btn"
              onClick={() => setTab("ads")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentTab === "ads"
                  ? "bg-slate-900 text-slate-100"
                  : "text-slate-400 hover:text-slate-250 hover:bg-slate-900/20"
              }`}
            >
              <Megaphone className="h-3.5 w-3.5 text-amber-500" />
              ذهب مجاني 🎁
            </button>
            <button
              id="tab-shop-btn"
              onClick={() => setTab("shop")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentTab === "shop"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:text-slate-250 hover:bg-slate-900/20"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              شحن الباقات 💳
            </button>
            <button
              id="tab-admin-btn"
              onClick={() => setTab("admin")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentTab === "admin"
                  ? "bg-cyan-950 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-slate-250 hover:bg-slate-900/20"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-500" />
              لوحة الإدارة ⚙️
            </button>
          </nav>
        )}

        {/* STATS & USER INFO PROFILE BANNER */}
        <div className="flex items-center gap-3">
          {/* Quick Stats pill */}
          {!isRoomActive && (
            <div className="flex items-center gap-3 bg-slate-950 px-2.5 py-1.5 border border-slate-900 rounded-xl max-xs:hidden">
              <div className="flex items-center gap-1 text-2xs text-amber-500 font-bold font-mono">
                <Coins className="h-3.5 w-3.5 shrink-0" />
                <span>{playerStats.coins}</span>
              </div>
              <div className="h-3 w-[1px] bg-slate-900" />
              <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold">
                <span>رتبة {playerStats.level}</span>
              </div>
            </div>
          )}

          {/* User Signin / Signout session controller */}
          {user ? (
            <div className="flex items-center gap-2">
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                alt="user"
                className="w-8 h-8 rounded-full border border-slate-800"
              />
              <button
                id="quit-logout-btn"
                onClick={isRoomActive ? onQuitRoom : onLogoutTrigger}
                className="p-2 bg-slate-900/40 hover:bg-red-950/20 hover:text-red-400 border border-slate-900 rounded-xl transition text-slate-400"
                title={isRoomActive ? "الانسحاب والعودة للوبّي" : "تسجيل الخروج"}
              >
                {isRoomActive ? (
                  <span className="text-2xs font-bold px-1 py-0.5 text-red-500">انسحاب</span>
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
              </button>
            </div>
          ) : (
            <button
              id="google-top-signin-btn"
              onClick={onLoginTrigger}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 border border-slate-900 hover:border-emerald-500/50 hover:text-emerald-400 rounded-xl bg-slate-900/20 text-slate-300 transition"
            >
              <LogIn className="h-3.5 w-3.5" />
              تسجيل الدخول
            </button>
          )}
        </div>
      </div>

      {/* MOBILE TAB DRAWER */}
      {!isRoomActive && (
        <div className="sm:hidden flex items-center justify-around py-2 border-t border-slate-950 bg-slate-950 px-1 select-none">
          <button
            onClick={() => setTab("lobby")}
            className={`flex flex-col items-center p-1.5 text-3xs font-semibold gap-1 ${
              currentTab === "lobby" ? "text-emerald-500" : "text-slate-500"
            }`}
          >
            <PlayCircle className="h-4.5 w-4.5" />
            الساحة
          </button>
          <button
            onClick={() => setTab("customizer")}
            className={`flex flex-col items-center p-1.5 text-3xs font-semibold gap-1 ${
              currentTab === "customizer" ? "text-emerald-500" : "text-slate-500"
            }`}
          >
            <Palette className="h-4.5 w-4.5" />
            التخصيص
          </button>
          <button
            onClick={() => setTab("dashboard")}
            className={`flex flex-col items-center p-1.5 text-3xs font-semibold gap-1 ${
              currentTab === "dashboard" ? "text-emerald-500" : "text-slate-500"
            }`}
          >
            <Trophy className="h-4.5 w-4.5" />
            الإحصائيات
          </button>
          <button
            onClick={() => setTab("shop")}
            className={`flex flex-col items-center p-1.5 text-3xs font-semibold gap-1 ${
              currentTab === "shop" ? "text-emerald-500 font-bold" : "text-slate-500"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            الشحن 💰
          </button>
          <button
            onClick={() => setTab("admin")}
            className={`flex flex-col items-center p-1.5 text-3xs font-semibold gap-1 ${
              currentTab === "admin" ? "text-cyan-400 font-bold" : "text-slate-500"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            الإدارة ⚙️
          </button>
        </div>
      )}
    </header>
  );
}
