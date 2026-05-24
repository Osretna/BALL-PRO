/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Coins, Sparkles, Volume2, X, Play, AlertCircle, CheckCircle } from "lucide-react";

interface GoogleAdsProps {
  currentCoins: number;
  onRewardEarned: (coinsAmount: number) => void;
}

export function GoogleAds({ currentCoins, onRewardEarned }: GoogleAdsProps) {
  const [adState, setAdState] = useState<"idle" | "playing" | "reward_ready" | "cooldown">("idle");
  const [timer, setTimer] = useState(5);
  const [adMobClient, setAdMobClient] = useState("");

  useEffect(() => {
    // Attempt to load standard Google AdSense tag dynamically if publisher ID is configured
    if (adMobClient && adMobClient.startsWith("ca-pub-")) {
      const script = document.createElement("script");
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adMobClient}`;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [adMobClient]);

  // Video Ad Countdown ticking
  useEffect(() => {
    if (adState !== "playing") return;

    const interval = setInterval(() => {
      setTimer((p) => {
        if (p <= 1) {
          clearInterval(interval);
          setAdState("reward_ready");
          return 5;
        }
        return p - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [adState]);

  const handleStartAd = () => {
    setAdState("playing");
    setTimer(5);
  };

  const handleClaimReward = () => {
    onRewardEarned(150); // Give 150 gold coins
    setAdState("cooldown");
    // Cooldown reset after 15 seconds
    setTimeout(() => {
      setAdState("idle");
    }, 15000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6" id="google-ads-dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Rewarded Play Unit */}
        <div className="lg:col-span-2 p-6 border border-slate-900 bg-slate-950/40 rounded-2xl flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] text-amber-500 bg-amber-500/10 border border-amber-900/40 rounded-full font-bold">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              عرض الحصيلة الذهبية المضاعفة
            </span>
            <h3 className="text-base font-bold text-slate-150">شاهد إعلاناً للحصول على عملات مجانية</h3>
            <p className="text-xs text-slate-400">
              قم بالتفاعل مع إعلان الفيديو السريع من Google Ads وجدد محفظة اللعب لديك بـ <span className="text-amber-550 font-black">+150 عملة</span> لشراء العصي الفاخرة والطاولات.
            </p>
          </div>

          {/* Ad Playbox Screen representation */}
          <div className="relative h-44 bg-slate-950 rounded-xl border border-slate-850 flex flex-col items-center justify-center overflow-hidden">
            {adState === "idle" && (
              <div className="text-center space-y-3 p-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full inline-block animate-bounce">
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <button
                    id="trigger-video-ad-btn"
                    onClick={handleStartAd}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition active:scale-95 flex items-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    شاهد الإعلان (+150 ذهبية)
                  </button>
                </div>
              </div>
            )}

            {adState === "playing" && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4">
                {/* Simulated colorful ad visual playing inside */}
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/40 to-emerald-950/40 opacity-70 animate-pulse" />
                <div className="z-10 text-center space-y-2">
                  <span className="text-3xs font-mono text-slate-500 block uppercase tracking-widest">إعلان ممول من شبكة Google Ads</span>
                  <p className="text-sm font-black text-white">العالمي للبلياردو 8-Ball Pro</p>
                  <p className="text-xs text-slate-400">حمّل اللعبة مجاناً الآن على جميع المنصات</p>
                  
                  {/* Timer Circular Countdown style fallback */}
                  <div className="inline-block mt-2 px-3  py-1 bg-slate-900 text-amber-500 text-xs font-mono font-bold rounded-full">
                    متبقي: {timer} ثوانٍ
                  </div>
                </div>
              </div>
            )}

            {adState === "reward_ready" && (
              <div className="text-center space-y-3 z-10 p-4">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-full inline-block">
                  <CheckCircle className="h-8 w-8 text-emerald-500 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-emerald-400">تم اكتمال مشاهدة الإعلان بنجاح!</h4>
                  <button
                    id="claim-reward-coins-btn"
                    onClick={handleClaimReward}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition active:scale-95"
                  >
                    احصد المكافأة الآن 🎁
                  </button>
                </div>
              </div>
            )}

            {adState === "cooldown" && (
              <div className="text-center p-4 space-y-2">
                <p className="text-xs text-slate-500">تم حصد المكافأة بنجاح! سيتم تجهيز إعلان جديد قريباً.</p>
                <div className="inline-block text-2xs px-2.5 py-1 bg-slate-900 text-slate-450 rounded-md font-mono">
                  شحن منزلي آمن
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Configuration instructions */}
        <div className="p-6 border border-slate-950 bg-slate-900/40 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">📂 إعداد وتفعيل إعلانات Google Ads الحقيقية</h4>
          
          <div className="space-y-3.5">
            <div>
              <label className="text-3xs font-bold text-slate-400 block mb-1">بيئة التطوير الحرة / مَعرف الناشر الحقيقي:</label>
              <input
                id="pub-id-input"
                type="text"
                value={adMobClient}
                onChange={(e) => setAdMobClient(e.target.value)}
                placeholder="مثال: ca-pub-0000000000000000"
                className="w-full bg-slate-950 border border-slate-850 p-2 text-xs rounded-lg text-amber-500 font-mono text-center tracking-wider"
              />
            </div>

            <div className="text-3xs text-slate-400 leading-relaxed space-y-2.5 bg-slate-950/60 p-3 rounded-lg border border-slate-900 font-sans">
              <span className="font-bold text-slate-300 block mb-1">خطوات تشغيل الإعلانات الحقيقية بالكامل:</span>
              <p>1️⃣ سجل دخولك بـ <a href="https://google.com/adsense" target="_blank" rel="noreferrer" className="text-emerald-555 hover:underline font-bold">Google AdSense</a> واطلب الموافقة على رابط موقعك.</p>
              <p>2️⃣ أنشئ وحدة إعلانية من نوع <span className="text-indigo-400 font-bold">H5 Games Ads API</span> أو <span className="text-indigo-400 font-bold">Display Ads</span> لتوليد الرمز التعريفي الخاص بك.</p>
              <p>3️⃣ ضع كود الناشر <span className="text-amber-500 font-mono font-bold">ca-pub-xxx</span> الموضح بالأعلى لتضمينه ديناميكياً وبشكل تلقائي وآمن.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Bottom Banner Ad Space representing authentic Google Ad Block */}
      <div className="p-4 border border-dashed border-slate-800 bg-slate-950/20 rounded-2xl text-center space-y-2 relative overflow-hidden">
        <span className="absolute top-1 right-2 text-4xs font-mono text-slate-500 uppercase tracking-widest bg-slate-900 px-1 rounded-sm">GOOGLE ADSENSE BANNER</span>
        
        <div className="h-20 bg-slate-950/40 flex items-center justify-center text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-350">إعلان مساحي من شبكة الدفع الإعلاني لجوجل</p>
            <p className="text-3xs text-slate-500">سوف تظهر الإعلانات هنا فور إتمام مراجعة وقبول نطاقك الإعلاني.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
