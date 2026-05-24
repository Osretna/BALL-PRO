/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, doc, updateDoc, getDoc, query, onSnapshot, orderBy } from "firebase/firestore";
import { ShieldCheck, Lock, Check, X, Users, Coins, AlertCircle, Clock, CheckCircle2, RefreshCw } from "lucide-react";

interface AdminPanelProps {
  playerStats: any;
  user: any;
}

export function AdminPanel({ playerStats, user }: AdminPanelProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [requests, setRequests] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  // Authenticate locally using the exact credentials specified in guidelines
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput === "admin" && passwordInput === "admin1234") {
      setIsAdminLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("خطأ في اسم المستخدم أو كلمة السر الخاصة بالإدارة!");
    }
  };

  // Listen to deposit requests in Firestore
  useEffect(() => {
    if (!isAdminLoggedIn || !db) return;

    try {
      const q = query(
        collection(db, "deposit_requests"),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const reqs: any[] = [];
        snapshot.forEach((docSnap) => {
          reqs.push({ requestId: docSnap.id, ...docSnap.data() });
        });
        setRequests(reqs);
      }, (err) => {
        console.error("Firestore Loading error in Admin Panel:", err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error(e);
    }
  }, [isAdminLoggedIn]);

  // Handle Approving and Activating a specific coin package
  const handleApproveRequest = async (req: any) => {
    if (!db) return;
    setIsProcessing(req.requestId);
    setFeedbackMsg("");

    try {
      // 1. Fetch current user balance from users/profiles collection
      const profileRef = doc(db, "profiles", req.userId);
      const profileSnap = await getDoc(profileRef);

      let currentCoins = 500; // default backup
      if (profileSnap.exists()) {
        currentCoins = profileSnap.data().coins ?? 500;
      }

      // 2. Calculate next coins total
      const nextCoins = currentCoins + req.coins;

      // 3. Update the profile document
      await updateDoc(profileRef, {
        coins: nextCoins,
        updatedAt: new Date().toISOString()
      });

      // 4. Set deposit_request status to approved
      const reqRef = doc(db, "deposit_requests", req.requestId);
      await updateDoc(reqRef, {
        status: "approved",
        updatedAt: new Date().toISOString()
      });

      setFeedbackMsg(`تم تفعيل الباقة بنجاح! تم إضافة ${req.coins} ذهبة إلى حساب اللاعب ${req.userDisplayName}.`);
    } catch (err: any) {
      console.error("Error approving package: ", err);
      setFeedbackMsg("فشل معالجة الطلب وتعديل رصيد اللاعب في فايربيس.");
    } finally {
      setIsProcessing(null);
    }
  };

  // Handle Rejecting a deposit request
  const handleRejectRequest = async (requestId: string) => {
    if (!db) return;
    setIsProcessing(requestId);
    setFeedbackMsg("");

    try {
      const reqRef = doc(db, "deposit_requests", requestId);
      await updateDoc(reqRef, {
        status: "rejected",
        updatedAt: new Date().toISOString()
      });
      setFeedbackMsg("تم رفض طلب الشحن بنجاح.");
    } catch (err: any) {
      console.error("Error rejecting package: ", err);
      setFeedbackMsg("خطأ أثناء رفض طلب التحويل.");
    } finally {
      setIsProcessing(null);
    }
  };

  // Log Out admin session
  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setUsernameInput("");
    setPasswordInput("");
  };

  // Filter requests based on status and toggle
  const filteredRequests = requests.filter((r) => {
    if (showCompleted) {
      return r.status === "approved" || r.status === "rejected";
    } else {
      return r.status === "pending";
    }
  });

  // Login Gaging page UI
  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-16" id="admin-login-wrapper">
        <div className="p-8 border border-cyan-500/10 bg-slate-950/40 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />
          
          <div className="text-center mb-8">
            <div className="p-4 bg-cyan-500/10 text-cyan-400 rounded-2xl inline-block mb-4 shadow-inner">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h2 className="text-lg font-black text-slate-100">لوحة التحكم والمصادقة للإدارة</h2>
            <p className="text-3xs text-slate-400 mt-1">يرجى تسجيل الدخول للتحقق من طلبات الشحن وتفعيلها على الفايربيس</p>
          </div>

          {loginError && (
            <div className="p-3 mb-5 bg-red-950/20 border border-red-500/20 text-red-500 text-xs rounded-xl flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-3xs text-slate-400 font-bold">اسم مستخدم الإدارة:</label>
              <input
                type="text"
                required
                placeholder="اسم المستخدم (admin)"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-3xs text-slate-400 font-bold">كلمة المرور السرية:</label>
              <input
                type="password"
                required
                placeholder="كلمة المرور (admin1234)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none transition"
              />
            </div>

            <button
              id="admin-login-submit-btn"
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 py-3 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-cyan-500/10 mt-2 flex items-center justify-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" />
              تسجيل دخول كأدمن
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" id="admin-dashboard-container">
      {/* HEADER LOGO PANEL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-900 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-cyan-500 text-slate-950 text-4xs font-black rounded-full uppercase tracking-wider">ADMIN ROOT</span>
            <h2 className="text-xl font-black text-slate-100">لوحة الإدارة والمراجعة المالية ⚙️</h2>
          </div>
          <p className="text-slate-400 text-3xs mt-1">تأكيد تحويلات InstaPay وإرسال رصيد كوينز الذهب مباشرةً إلى فايربيس اللاعبين</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              showCompleted
                ? "bg-slate-900 text-slate-200 border border-slate-800"
                : "bg-cyan-950/20 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-950/45"
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {showCompleted ? "عرض الطلبات المعلقة ⏳" : "عرض الطلبات المكتملة ✓"}
          </button>
          <button
            onClick={handleAdminLogout}
            className="px-4 py-2 border border-red-500/20 hover:bg-red-950/20 text-red-400 text-xs font-bold rounded-xl transition"
          >
            خروج الأدمن
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 mb-6 bg-cyan-950/25 border border-cyan-500/25 text-cyan-300 text-xs rounded-2xl flex gap-2 items-center">
          <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* REQUESTS LIST MAIN GRID CARD */}
      <div className="flex flex-col gap-4">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-900 rounded-3xl text-slate-500">
            <Coins className="h-12 w-12 text-slate-700 mx-auto mb-4 animate-bounce" />
            <p className="text-sm font-bold">لا يوجد أي طلبات من هذا النوع في الوقت الحالي.</p>
            <p className="text-3xs text-slate-600 mt-1">عندما يطلب لاعب شحن الرصيد ستظهر هنا في قائمة فورية ذات تحديث مباشر.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req) => (
              <div
                key={req.requestId}
                className="border border-slate-900 hover:border-slate-800 bg-slate-950/40 p-5 rounded-3xl shadow-xl hover:shadow-2xl transition duration-300 relative flex flex-col justify-between"
              >
                {/* Package Label Accent badge */}
                <div className="absolute top-4 left-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-3xs font-black rounded-lg">
                  {req.amount} جنيه EGP
                </div>

                <div>
                  {/* Name representation */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2.5 bg-slate-900 text-slate-100 rounded-xl font-bold">
                      <Users className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-200 font-sans">{req.userDisplayName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono select-all truncate max-w-[120px]" title={req.userId}>
                        ID: {req.userId}
                      </p>
                    </div>
                  </div>

                  {/* Transaction metadata */}
                  <div className="py-3 px-3.5 bg-slate-950 border border-slate-900/60 rounded-2xl flex flex-col gap-2.5 text-3xs mb-4">
                    <div className="flex justify-between items-center border-b border-slate-900/40 pb-1.5">
                      <span className="text-slate-500">الذهب المطلوب:</span>
                      <span className="text-amber-500 font-black flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {req.coins} ذهبة
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-slate-900/40 pb-1.5">
                      <span className="text-slate-500">كود تحويل المرجع:</span>
                      <span className="font-mono text-cyan-300 font-black select-all text-2xs truncate max-w-[140px]" title={req.transferCode}>
                        {req.transferCode}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">تاريخ التقديم:</span>
                      <span className="text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString("ar-EG", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status indicator or Approve/Reject button panel handlers */}
                <div>
                  {req.status === "pending" ? (
                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={() => handleRejectRequest(req.requestId)}
                        disabled={isProcessing !== null}
                        className="flex-1 py-2 rounded-xl text-3xs font-bold text-red-500 border border-red-500/20 hover:bg-red-950/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                        رفض والرفض
                      </button>
                      <button
                        onClick={() => handleApproveRequest(req)}
                        disabled={isProcessing !== null}
                        className="flex-2 py-2 rounded-xl text-3xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/5 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {isProcessing === req.requestId ? "جاري التفعيل..." : "موافقة وتفعيل تلقائي ✅"}
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 text-center">
                      {req.status === "approved" ? (
                        <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/10 rounded-xl text-emerald-400 font-bold text-3xs flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          تم التفعيل والتحويل للمحفظة ✅
                        </div>
                      ) : (
                        <div className="p-2.5 bg-red-950/20 border border-red-500/10 rounded-xl text-red-500 font-bold text-3xs flex items-center justify-center gap-1.5">
                          <X className="h-4 w-4" />
                          تم رفض وتفنيد الطلب ❌
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
