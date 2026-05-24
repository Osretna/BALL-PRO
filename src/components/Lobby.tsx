/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { GameMode, AICutDifficulty } from "../types";
import { isFirebaseConfigured, db, OperationType, handleFirestoreError } from "../lib/firebase";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { Play, Sparkles, LogIn, Users, Plus, Key, Cpu, HelpCircle } from "lucide-react";

interface LobbyProps {
  onSelectMode: (mode: GameMode) => void;
  onSelectAiDifficulty: (diff: AICutDifficulty) => void;
  onLoginTrigger: () => void;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  user: any;
  coins: number;
}

export function Lobby({
  onSelectMode,
  onSelectAiDifficulty,
  onLoginTrigger,
  onJoinRoom,
  onCreateRoom,
  user,
  coins
}: LobbyProps) {
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<AICutDifficulty>(AICutDifficulty.MEDIUM);

  // Monitor active public rooms waiting for players if Firebase is fully initialized
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    setLoadingRooms(true);
    const pathStr = "rooms";
    const roomsRef = collection(db, "rooms");
    const q = query(roomsRef, where("status", "==", "waiting"), limit(10));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          list.push({ ...doc.data(), id: doc.id });
        });
        setActiveRooms(list);
        setLoadingRooms(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathStr);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleDifficultyClick = (diff: AICutDifficulty) => {
    setSelectedDifficulty(diff);
    onSelectAiDifficulty(diff);
  };

  const handleJoinByCode = () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length > 2) {
      onJoinRoom(code);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8" id="lobby-container">
      {/* Hero Banner Grid */}
      <div className="relative overflow-hidden p-8 sm:p-12 border border-slate-900 bg-linear-to-br from-slate-950 to-slate-900 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-xl text-right md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/10 rounded-full font-semibold">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            البلياردو الاحترافية بتقنيات ثلاثية الأبعاد
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
            العالمي للبلياردو <span className="text-emerald-500">8-Ball Pool Pro</span>
          </h1>
          <p className="text-sm text-slate-400">
            أول لعبة بلياردو متكاملة بمحاكاة فيزيائية حقيقية، خض مباريات حاسمة ممتعة مع أصدقائك أونلاين أو واجه الذكاء الاصطناعي الأقوى بمستويات تنافسية متعددة!
          </p>
        </div>

        {/* Action center login/status panel */}
        <div className="shrink-0 w-full md:w-80 p-6 border border-slate-800 bg-slate-900/60 rounded-2xl flex flex-col items-center">
          {user ? (
            <div className="space-y-4 w-full text-center">
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-16 h-16 rounded-full border-2 border-emerald-500 mx-auto"
              />
              <div>
                <h4 className="font-bold text-slate-100">{user.displayName}</h4>
                <p className="text-xs text-slate-500 font-mono">{user.email}</p>
              </div>
              <div className="flex items-center justify-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400">قيمة العملات المتوفرة:</span>
                <span className="font-bold text-amber-500 font-mono">{coins} عملة ذهبية</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 w-full text-center">
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl">
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  سجّل دخولك الآن باستخدام بريد Google لحفظ نقاط وتقدمك وتفعيل تحدي اللعب المباشر أونلاين!
                </p>
                <button
                  id="google-signin-lobby-btn"
                  onClick={onLoginTrigger}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg transition active:scale-95 shadow"
                >
                  <LogIn className="h-4 w-4" />
                  تسجيل الدخول عبر Google
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modes split grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Category A: Offline Modes */}
        <div className="space-y-4 p-6 border border-slate-900 bg-slate-950/20 backdrop-blur rounded-2xl">
          <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">
            طور اللعب أوفلاين (بلا إنترنت)
          </h3>
          <p className="text-xs text-slate-400">
            تدرّب وحسّن مهاراتك أو خض مباريات ثنائية سريعة مع عائلتك على نفس الجهاز.
          </p>

          <div className="space-y-4 pt-2">
            {/* Solo Practice */}
            <div
              onClick={() => onSelectMode(GameMode.SOLO_PRACTICE)}
              className="group flex items-center justify-between p-4 border border-slate-800 bg-slate-900/30 hover:border-emerald-500/50 hover:bg-emerald-950/5 transition rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:scale-105 transition">
                  <Play className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition">
                    التدريب المنفرد الحر
                  </h4>
                  <p className="text-2xs text-slate-400">ميزة التدريب الحر، ترتيب الكرات والضرب بأريحية مطلقة</p>
                </div>
              </div>
              <span className="text-2xs border border-slate-800 px-2 py-1 rounded bg-slate-900 text-slate-400">ابدأ الآن</span>
            </div>

            {/* Pass & Play */}
            <div
              onClick={() => onSelectMode(GameMode.PASS_LOGIC)}
              className="group flex items-center justify-between p-4 border border-slate-800 bg-slate-900/30 hover:border-emerald-500/50 hover:bg-emerald-950/5 transition rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:scale-105 transition">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition">
                    اللعب الثنائي (تبادل الأدوار)
                  </h4>
                  <p className="text-2xs text-slate-400">لاعبان على نفس الجهاز يتبادلان ضرب الكرات بشكل متتابع</p>
                </div>
              </div>
              <span className="text-2xs border border-slate-800 px-2 py-1 rounded bg-slate-900 text-slate-400">ابدأ الآن</span>
            </div>

            {/* AI Opponent block with Selection */}
            <div className="p-4 border border-slate-800 bg-slate-900/30 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">مواجهة الحاسب والذكاء الاصطناعي</h4>
                  <p className="text-2xs text-slate-400">العب ضد المحاكي الذكي للعبة وصقل مهاراتك التصويبية</p>
                </div>
              </div>

              {/* Selector options */}
              <div className="grid grid-cols-3 gap-2 border-t border-slate-900/50 pt-3">
                {[
                  { id: AICutDifficulty.EASY, label: "مبتدئ" },
                  { id: AICutDifficulty.MEDIUM, label: "متوسط" },
                  { id: AICutDifficulty.HARD, label: "محترف" }
                ].map((diff) => (
                  <button
                    id={`ai-diff-btn-${diff.id}`}
                    key={diff.id}
                    onClick={() => handleDifficultyClick(diff.id)}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                      selectedDifficulty === diff.id
                        ? "bg-indigo-500 text-white font-bold"
                        : "bg-slate-950 text-slate-400 border border-slate-850 hover:bg-slate-900"
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>

              <button
                id="play-vs-ai-lobby-btn"
                onClick={() => onSelectMode(GameMode.VS_AI)}
                className="w-full py-2 px-4 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-lg transition"
              >
                تحدي الذكاء الاصطناعي الآن
              </button>
            </div>
          </div>
        </div>

        {/* Category B: Online Multiplayer Modes */}
        <div className="space-y-4 p-6 border border-slate-900 bg-slate-950/20 backdrop-blur rounded-2xl">
          <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">
            طور اللعب أونلاين بمزامنة مباشرة
          </h3>

          {!isFirebaseConfigured ? (
            <div className="p-8 text-center border border-dashed border-amber-900/40 bg-amber-950/10 rounded-xl space-y-3">
              <HelpCircle className="h-10 w-10 text-amber-500 mx-auto animate-bounce" />
              <h4 className="text-sm font-bold text-amber-500">ميزة الأونلاين بانتظار التكوين</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                لم يتم إكمال تكوين قاعدة بيانات Firebase بعد في هذا الإصدار. الرجاء سحب وتفعيل Firebase من لوحة التحكم، ليستمتع اللاعبون بتحدي اللعب الحقيقي.
              </p>
              <div className="inline-block px-3 py-1 bg-amber-500/10 rounded text-[10px] text-amber-500 font-mono">
                صندوق محاكاة الأوفلاين مُفعل بنجاح وبسرعة عالية!
              </div>
            </div>
          ) : !user ? (
            <div className="p-8 text-center border border-dashed border-slate-800 bg-slate-900/10 rounded-xl space-y-3">
              <Users className="h-8 w-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300 font-sans">الرجاء تسجيل الدخول أولاً</h4>
              <p className="text-xs text-slate-400">
                قنوات اللعب الجماعي أونلاين تتطلب التعرف على ملفك الإحصائي وسجل فوزك!
              </p>
              <button
                id="lobby-auth-demand-btn"
                onClick={onLoginTrigger}
                className="py-1.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition"
              >
                سجل دخولك الآن لمعاينة اللوبيات
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Join or Create widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Create Game */}
                <div
                  onClick={onCreateRoom}
                  className="p-4 border border-dashed border-emerald-500/30 bg-emerald-950/5 hover:bg-emerald-950/15 hover:border-emerald-500 transition rounded-xl cursor-pointer flex flex-col items-center justify-center text-center py-6 min-h-34"
                >
                  <Plus className="h-6 w-6 text-emerald-400 mb-2" />
                  <span className="text-sm font-bold text-slate-200">تجهيز طاولة عامة</span>
                  <span className="text-[10px] text-slate-400 mt-1">إنشاء غرفة لعب جديدة والمنافسة</span>
                </div>

                {/* Join code section */}
                <div className="p-4 border border-slate-800 bg-slate-900/30 rounded-xl flex flex-col justify-between min-h-34">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Key className="h-3.5 w-3.5 text-indigo-400" />
                    انضم لغرفة صديق:
                  </span>
                  <div className="flex gap-2.5 mt-2">
                    <input
                      id="lobby-code-input"
                      type="text"
                      maxLength={6}
                      placeholder="كود PIN"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-lg text-xs tracking-widest text-center uppercase font-mono font-bold text-indigo-400"
                    />
                    <button
                      id="lobby-verify-code-btn"
                      onClick={handleJoinByCode}
                      className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-lg transition shrink-0"
                    >
                      دخول
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-2 block">أدخل الكود المؤلف من 6 خانات رمزية.</span>
                </div>
              </div>

              {/* Table list of Public match pools */}
              <div className="space-y-3 pt-4">
                <span className="text-xs font-semibold text-slate-500 block">طاولات مفتوحة تنتظر منافسين:</span>

                {loadingRooms ? (
                  <p className="text-center text-xs text-slate-500 animate-pulse py-4">يتم الفحص والبحث عن الطاولات المتاحة...</p>
                ) : activeRooms.length === 0 ? (
                  <div className="p-6 border border-slate-900/60 bg-slate-950/20 text-center rounded-xl text-xs text-slate-500">
                    لا يوجد طاولات مفتوحة بانتظار لاعبين في الوقت الحالي. أنشئ غرفتك ودع المنافسين ينضمون إليك!
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 select-none">
                    {activeRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-3 border border-slate-850 bg-slate-900/20 hover:bg-slate-900/40 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={room.hostPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${room.hostId}`}
                            alt="host"
                            className="w-7 h-7 rounded-full bg-slate-850"
                          />
                          <div>
                            <span className="font-bold text-slate-200 block">{room.hostName}</span>
                            <span className="text-[9px] text-slate-500 block">غرفة: {room.roomId}</span>
                          </div>
                        </div>
                        <button
                          id={`join-public-room-${room.id}`}
                          onClick={() => onJoinRoom(room.id)}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-3xs rounded-md transition"
                        >
                          بدء التحدي واللعب
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
