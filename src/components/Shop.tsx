/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Coins, CreditCard, Send, ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle, ShoppingBag, LogIn } from "lucide-react";

interface ShopProps {
  playerStats: any;
  user: any;
  onLoginTrigger: () => void;
}

export function Shop({ playerStats, user, onLoginTrigger }: ShopProps) {
  const [selectedPackage, setSelectedPackage] = useState<{ amount: number; coins: number } | null>(null);
  const [transferCode, setTransferCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [myRequests, setMyRequests] = useState<any[]>([]);

  // Load user's previous deposit requests
  useEffect(() => {
    if (!user || !db) return;

    try {
      const q = query(
        collection(db, "deposit_requests"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const reqs: any[] = [];
        snapshot.forEach((doc) => {
          reqs.push({ requestId: doc.id, ...doc.data() });
        });
        setMyRequests(reqs);
      }, (err) => {
        console.error("Error loading requests: ", err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Firestore loading error:", e);
    }
  }, [user]);

  const handleSelectPackage = (amount: number, coins: number) => {
    setSelectedPackage({ amount, coins });
    setSuccessMsg("");
    setErrorMsg("");
    setTransferCode("");
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !selectedPackage) return;

    if (!transferCode.trim()) {
      setErrorMsg("الرجاء إدخال كود تحويل InstaPay أولاً للتأكيد.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        userId: user.uid,
        userDisplayName: user.displayName || "لاعب بلياردو",
        userEmail: user.email || "",
        amount: selectedPackage.amount,
        coins: selectedPackage.coins,
        status: "pending",
        transferCode: transferCode.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, "deposit_requests"), payload);
      
      setSuccessMsg("تم تسجيل طلب الشحن بنجاح! نرجو منك إرسال كود التحويل عبر الواتساب لتسريع التفعيل.");
      setTransferCode("");
      
      // Auto-trigger WhatsApp message text block
      const waText = encodeURIComponent(
        `أهلاً بك يا أدمن، لقد قمت بتحويل مبلغ ${selectedPackage.amount} جنيه لشراء باقة ${selectedPackage.coins} قطعة ذهبية في لعبة النخبة للبلياردو.\n\nكود التحويل (InstaPay): ${transferCode.trim()}\nمعرف اللاعب (ID): ${user.uid}\nالبريد: ${user.email || ""}`
      );
      const waUrl = `https://wa.me/201120194940?text=${waText}`;
      
      // Open WhatsApp after a tiny delay
      setTimeout(() => {
        window.open(waUrl, "_blank");
      }, 1500);

    } catch (error: any) {
      console.error("Error submitting deposit request: ", error);
      setErrorMsg("حدث خطأ أثناء إرسال الطلب. نرجو المحاولة مجدداً.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppLink = (req: any) => {
    const waText = encodeURIComponent(
      `أهلاً بك يا أدمن، أود الاستفسار عن تفعيل باقة شحن:\nالحجم: ${req.amount} جنيه (${req.coins} ذهبة)\nكود التحويل: ${req.transferCode}\nID اللعبة: ${req.userId}`
    );
    return `https://wa.me/201120194940?text=${waText}`;
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="p-8 border border-slate-900 bg-slate-950/40 rounded-3xl max-w-lg mx-auto shadow-2xl">
          <Coins className="h-16 w-16 text-amber-500 mx-auto mb-6 animate-bounce" />
          <h2 className="text-xl font-bold text-slate-150 mb-3">شحن رصيد الذهب لشراء الطاولات والعصي المميزة</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            من أجل شحن الذهب بالباقات الآمنة ومزامنة رصيدك والتحقق من حسابك في لوحة تحكم الفايربيس، يجب عليك تسجيل الدخول أولاً باستخدام جوجل.
          </p>
          <button
            onClick={onLoginTrigger}
            className="flex items-center justify-center gap-2 mx-auto px-6 py-3 border border-emerald-500 text-emerald-400 font-bold hover:bg-emerald-950/40 bg-emerald-950/10 rounded-xl transition shadow-lg shadow-emerald-500/5 active:scale-95 cursor-pointer"
          >
            <LogIn className="h-5 w-5" />
            تسجيل الدخول باستخدام كوجل للبدء بالشحن
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" id="shop-wrapper">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-black text-slate-100 mb-2">متجر النخبة لشحن رصيد الذهب 💰</h2>
        <p className="text-slate-400 text-xs">شحن سريع وآمن عبر InstaPay وتفعيل فوري اتوماتيكياً من الإدارة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* LEADING PACKAGES list view */}
        <div className="flex flex-col gap-5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">اختر باقة الذهب المناسبة لك:</h3>
          
          {/* PACKAGE 50 EGP */}
          <div
            onClick={() => handleSelectPackage(50, 500)}
            className={`p-5 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between shadow-lg relative overflow-hidden ${
              selectedPackage?.amount === 50
                ? "border-emerald-500 bg-emerald-950/10 shadow-emerald-500/5 scale-[1.02]"
                : "border-slate-900 bg-slate-950/40 hover:border-slate-800 hover:bg-slate-900/10"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-amber-500/10 rounded-xl text-amber-500">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-250">باقة البرونز كوينز 🥉</h4>
                <p className="text-[10px] text-slate-400">مثالية للبدء والتحديات اللطيفة</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-emerald-400 block font-mono">50 جنيه</span>
              <span className="text-xs font-bold text-amber-500 block">500 قطعة ذهبية</span>
            </div>
            {selectedPackage?.amount === 50 && (
              <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
            )}
          </div>

          {/* PACKAGE 100 EGP */}
          <div
            onClick={() => handleSelectPackage(100, 1100)}
            className={`p-5 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between shadow-xl relative overflow-hidden ${
              selectedPackage?.amount === 100
                ? "border-emerald-500 bg-emerald-950/10 shadow-emerald-500/5 scale-[1.02]"
                : "border-slate-900 bg-slate-950/40 hover:border-slate-800 hover:bg-slate-900/10"
            }`}
          >
            <div className="absolute top-0 left-0 bg-amber-500 text-slate-950 px-2.5 py-0.5 text-[8px] font-black rounded-br-lg uppercase tracking-wide">
              أفضل قيمة ⭐
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-amber-500/10 rounded-xl text-amber-500">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-250">باقة النخبة الذهبية 👑</h4>
                <p className="text-[10px] text-slate-400">أعلى قيمة ربحية بأكبر كمية ذهب</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-emerald-400 block font-mono">100 جنيه</span>
              <span className="text-xs font-bold text-amber-500 block">1100 قطعة ذهبية</span>
            </div>
            {selectedPackage?.amount === 100 && (
              <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
            )}
          </div>

          {/* INSTAPAY PAYMENT CARD INFORMATION */}
          <div className="p-4 border border-cyan-500/10 bg-cyan-950/5 rounded-2xl flex gap-3 text-xs text-cyan-300 leading-relaxed">
            <CreditCard className="h-5 w-5 shrink-0 text-cyan-400" />
            <div>
              <p className="font-bold underline mb-1">تعليمات التحويل السريع:</p>
              <p className="text-[11px] text-slate-300">
                الرجاء تحويل مبلغ الباقة التي تختارها عبر تطبيق <span className="font-black text-white text-xs">InstaPay</span> على الرقم التالي:
              </p>
              <p className="font-mono text-sm font-black text-cyan-200 mt-1 select-all tracking-wider">
                01120194940
              </p>
              <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                * لن يتم تحويل الذهب تلقائياً من التطبيق إلا بعد أن تدخل كود التحويل وتضغط زر الإرسال. سنقوم بطلب كود التحويل والتحقق منه من الرسائل الواردة إلينا، ثم يتم تفعيل الباقة اتوماتيكياً من لوحة التحكم لتضاف لحسابك فوراً.
              </p>
            </div>
          </div>
        </div>

        {/* SUBMISSION FORM OR DEFAULT WAITING BOX */}
        <div className="border border-slate-900 bg-slate-950/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          {selectedPackage ? (
            <form onSubmit={handleSubmitRequest} className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-200 mb-6 bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                  <ShoppingBag className="h-4 w-4 text-emerald-500 animate-pulse" />
                  <span className="text-xs">لقد اخترت باقة:</span>
                  <span className="text-xs font-black text-emerald-400">{selectedPackage.amount} جنيه</span>
                  <span className="text-[10px] text-slate-500"> مقابل </span>
                  <span className="text-xs font-black text-amber-500">{selectedPackage.coins} قطعة ذهب</span>
                </div>

                {errorMsg && (
                  <div className="p-3 mb-4 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 mb-4 bg-emerald-950/25 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl">
                    <div className="flex gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="font-bold">{successMsg}</span>
                    </div>
                    <p className="text-[10px] text-slate-300">
                      لقد فتحنا لك نافذة الواتساب لإرسال الكود مباشرة إلينا. إذا لم تفتح، يمكنك النقر على الزر بالأسفل.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 mb-5">
                  <label htmlFor="transfer-code-input" className="text-xs font-bold text-slate-300">
                    كود / رقم التحويل في انستاباي (InstaPay Reference ID):
                  </label>
                  <p className="text-[9px] text-slate-500 mb-1 leading-normal">
                    بعد إتمام التحويل الناجح في تطبيق InstaPay، يرجى نسخ كود مرجع التحويل الفريد ولصقه هنا للتحقق منه.
                  </p>
                  <input
                    id="transfer-code-input"
                    type="text"
                    required
                    placeholder="مثال: Ref #021948..."
                    value={transferCode}
                    onChange={(e) => setTransferCode(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-900 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button
                  id="submit-deposit-request-btn"
                  type="submit"
                  disabled={isSubmitting || !transferCode}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    transferCode.trim() && !isSubmitting
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10 cursor-pointer"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750"
                  }`}
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSubmitting ? "جاري تسجيل الطلب..." : "تأكيد الطلب وإرسال عبر الواتساب"}
                </button>
                
                {successMsg && (
                  <a
                    href={`https://wa.me/201120194940?text=${encodeURIComponent(
                      `كود التحويل هو: ${transferCode}\nID اللاعب: ${user.uid}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 border border-emerald-500 text-emerald-400 rounded-xl text-xs font-bold text-center hover:bg-emerald-950/20 flex items-center justify-center gap-2"
                  >
                    فتح محادثة الواتساب اليدوية بخصوص هذا الطلب
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-slate-600 mb-4 animate-pulse" />
              <p className="text-slate-400 text-xs max-w-xs">
                الرجاء كبس أو تحديد إحدى الباقات على اليمين (باقة الـ 50 أو باقة الـ 100) ليفتح لك نموذج وبوابة التحويل الفوري.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PREVIOUS ORDER LIST HISTORY */}
      <div className="mt-8 border border-slate-900 bg-slate-950/20 rounded-3xl p-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500" />
          تاريخ طلبات الشحن الخاصة بك:
        </h3>

        {myRequests.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-900 rounded-2xl text-slate-600 text-xs">
            لا توجد طلبات شحن سابقة مسجلة على حسابك حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 font-bold">
                  <th className="pb-3 px-2">رقم الطلب</th>
                  <th className="pb-3 px-2">الباقة</th>
                  <th className="pb-3 px-2">الذهب</th>
                  <th className="pb-3 px-2">كود التحويل</th>
                  <th className="pb-3 px-2">الحالة</th>
                  <th className="pb-3 px-2">التاريخ</th>
                  <th className="pb-3 px-2">متابعة الدعم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-slate-350">
                {myRequests.map((req) => (
                  <tr key={req.requestId} className="hover:bg-slate-900/10">
                    <td className="py-3.5 px-2 font-mono text-2xs select-all max-w-[80px] break-words truncate">
                      {req.requestId.substring(0, 8)}...
                    </td>
                    <td className="py-3.5 px-2 font-bold text-slate-200">
                      {req.amount} جنيه
                    </td>
                    <td className="py-3.5 px-2 text-amber-500 font-bold">
                      +{req.coins} ذهبة
                    </td>
                    <td className="py-3.5 px-2 font-mono text-3xs select-all text-slate-300">
                      {req.transferCode}
                    </td>
                    <td className="py-3.5 px-2">
                      {req.status === "approved" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 rounded-full text-3xs font-bold font-sans">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          مقبول ومفعل ✅
                        </span>
                      ) : req.status === "rejected" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-950/30 text-red-500 border border-red-500/20 rounded-full text-3xs font-bold font-sans">
                          <XCircle className="h-2.5 w-2.5" />
                          مرفوض ❌
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-950/30 text-amber-500 border border-amber-500/20 rounded-full text-3xs font-bold font-sans">
                          <Clock className="h-2.5 w-2.5" />
                          قيد المراجعة ⏳
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-2 text-[10px] text-slate-500">
                      {new Date(req.createdAt).toLocaleDateString("ar-EG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="py-3.5 px-2">
                      <a
                        href={getWhatsAppLink(req)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-4xs font-bold rounded bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 transition"
                      >
                        واتساب
                        <ExternalLink className="h-2 w-2" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
