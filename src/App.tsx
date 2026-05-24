/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { Navbar } from "./components/Navbar";
import { Lobby } from "./components/Lobby";
import { PoolTable } from "./components/PoolTable";
import { ThemeCustomizer } from "./components/ThemeCustomizer";
import { Dashboard } from "./components/Dashboard";
import { GoogleAds } from "./components/GoogleAds";
import {
  GameMode,
  Ball,
  BallType,
  BallState,
  PlayerStats,
  AICutDifficulty
} from "./types";
import { initializeBalls, getBallColor } from "./lib/physics";
import { TABLE_THEMES, CUE_SKINS } from "./data";
import {
  isFirebaseConfigured,
  auth,
  db,
  signInWithGoogle,
  logOut,
  fetchOrCreateProfile,
  updateProfile,
  OperationType,
  handleFirestoreError
} from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import {
  Volume2,
  VolumeX,
  MessageSquare,
  Send,
  Sparkles,
  Trophy,
  RotateCcw,
  RefreshCw,
  LogOut
} from "lucide-react";
import { setSoundVolume, playPocketPlop, getSoundVolume } from "./lib/audio";

const CHAT_OPTIONS = [
  "ضربة رائعة! 🎯",
  "تباً.. لقد دنت كثيراً! 💥",
  "مباراة ممتعة وحاسمة! 🤝",
  "رائع! حظاً موفقاً 🌟",
  "أحسنت التصويب! 👏",
  "عذراً! غلطة غير مقصودة 😅"
];

const DEFAULT_PLAYER_STATS: PlayerStats = {
  userId: "local_guest",
  displayName: "بلياردو هانتر",
  photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=local_guest",
  xp: 0,
  level: 1,
  coins: 500,
  playedGames: 0,
  wonGames: 0,
  equippedCue: "classic_wood",
  equippedTheme: "billiard_green",
  unlockedCues: ["classic_wood"],
  unlockedThemes: ["billiard_green"]
};

export default function App() {
  const [currentTab, setTab] = useState<"lobby" | "customizer" | "dashboard" | "ads">("lobby");
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<AICutDifficulty>(AICutDifficulty.MEDIUM);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(DEFAULT_PLAYER_STATS);

  // Sound preferences
  const [isMuted, setIsMuted] = useState(false);

  // Match State variables
  const [balls, setBalls] = useState<Ball[]>([]);
  const [isSimulationActive, setSimulationActive] = useState(false);
  const [ballInHandActive, setBallInHandActive] = useState(false);

  // Turn tracking systems
  const [currentTurnId, setCurrentTurnId] = useState<string>("player_1"); // or current UID
  const [turnTimer, setTurnTimer] = useState<number>(45);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Rule variables
  const [myBallGroup, setMyBallGroup] = useState<"solids" | "stripes" | "undecided">("undecided");
  const [turnStatusText, setTurnStatusText] = useState<string>("دورك للتصويب! اسحب العصا ثم اضرب.");
  const [matchWinner, setMatchWinner] = useState<string | null>(null);

  // Room synchronization for Online Multiplayer
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomDoc, setRoomDoc] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Setup sound settings from local tracker
  useEffect(() => {
    setSoundVolume(isMuted ? 0 : 0.6);
  }, [isMuted]);

  // Read/Write Local stats backup for offline persistence
  useEffect(() => {
    const backup = localStorage.getItem("billiard_local_stats");
    if (backup) {
      try {
        setPlayerStats(JSON.parse(backup));
      } catch (e) {
        console.error("Failed to load local backup stats", e);
      }
    } else {
      localStorage.setItem("billiard_local_stats", JSON.stringify(DEFAULT_PLAYER_STATS));
    }
  }, []);

  const saveStatsBackupLocally = (updated: PlayerStats) => {
    setPlayerStats(updated);
    localStorage.setItem("billiard_local_stats", JSON.stringify(updated));
  };

  // Google authentication monitor
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (parsedUser) => {
      if (parsedUser) {
        setCurrentUser(parsedUser);
        const cloudStats = await fetchOrCreateProfile(parsedUser);
        if (cloudStats) {
          saveStatsBackupLocally({
            userId: cloudStats.userId,
            displayName: cloudStats.displayName,
            photoURL: cloudStats.photoURL,
            xp: cloudStats.xp,
            level: cloudStats.level,
            coins: cloudStats.coins,
            playedGames: cloudStats.playedGames,
            wonGames: cloudStats.wonGames,
            equippedCue: cloudStats.equippedCue,
            equippedTheme: cloudStats.equippedTheme,
            unlockedCues: cloudStats.unlockedCues || ["classic_wood"],
            unlockedThemes: cloudStats.unlockedThemes || ["billiard_green"]
          });
        }
      } else {
        setCurrentUser(null);
        // Fall back to local storage profile if logged out
        const backup = localStorage.getItem("billiard_local_stats");
        if (backup) {
          setPlayerStats(JSON.parse(backup));
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Online Multiplayer Firestore listener
  useEffect(() => {
    if (!currentRoomId || !db) return;

    const pathStr = `rooms/${currentRoomId}`;
    const unsubscribe = onSnapshot(
      doc(db, "rooms", currentRoomId),
      (docSnap) => {
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        setRoomDoc(data);

        // Sync visual ball layout if we are NOT currently running local physics animations
        if (!isSimulationActive && data.ballsState) {
          try {
            const parsedBalls = JSON.parse(data.ballsState);
            setBalls(parsedBalls);
          } catch (e) {
            console.error("Failed parsing ball coordinates", e);
          }
        }

        // Trigger winner updates
        if (data.status === "finished") {
          setMatchWinner(data.winnerId);
        }

        // Track turn synchronizations
        setCurrentTurnId(data.turn);

        // Sync groups
        if (currentUser?.uid === data.hostId) {
          setMyBallGroup(data.hostBallGroup);
        } else if (currentUser?.uid === data.guestId) {
          setMyBallGroup(data.guestBallGroup);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathStr);
      }
    );

    // Sync sub-collection chat messages
    const chatUnsubscribe = onSnapshot(
      collection(db, "rooms", currentRoomId, "messages"),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((subDoc) => {
          list.push({ id: subDoc.id, ...subDoc.data() });
        });
        // Sort chronologically
        list.sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tA - tB;
        });
        setChatMessages(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `rooms/${currentRoomId}/messages`);
      }
    );

    return () => {
      unsubscribe();
      chatUnsubscribe();
    };
  }, [currentRoomId, isSimulationActive, currentUser]);

  // Turn Countdown Timer Clock Tick
  useEffect(() => {
    if (selectedMode === null || matchWinner !== null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    setTurnTimer(45);

    timerRef.current = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          // Time's Up! Trigger turn handover
          triggerAutomaticTimeoutHandover();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentTurnId, selectedMode, isSimulationActive, matchWinner]);

  const triggerAutomaticTimeoutHandover = () => {
    if (isSimulationActive) return;

    setTurnStatusText("انتهى الوقت! تم نقل اللعب للطرف الآخر.");
    // Invert turn
    if (selectedMode === GameMode.PASS_LOGIC) {
      setCurrentTurnId((prev) => (prev === "player_1" ? "player_2" : "player_1"));
    } else if (selectedMode === GameMode.VS_AI) {
      setCurrentTurnId((prev) => (prev === "player" ? "ai" : "player"));
    } else if (selectedMode === GameMode.ONLINE_MULTIPLAYER && currentRoomId && db && roomDoc) {
      const isHost = currentUser?.uid === roomDoc.hostId;
      const nextTurn = isHost ? roomDoc.guestId : roomDoc.hostId;
      const pathStr = `rooms/${currentRoomId}`;
      updateDoc(doc(db, "rooms", currentRoomId), {
        turn: nextTurn,
        updatedAt: new Date().toISOString()
      }).catch((e) => handleFirestoreError(e, OperationType.UPDATE, pathStr));
    }
  };

  // Boot standard match setup
  const handleSelectMode = (mode: GameMode) => {
    setSelectedMode(mode);
    setBalls(initializeBalls());
    setSimulationActive(false);
    setBallInHandActive(false);
    setMatchWinner(null);
    setMyBallGroup("undecided");

    if (mode === GameMode.SOLO_PRACTICE) {
      setCurrentTurnId("player_1");
      setTurnStatusText("وضع التدريب المنفرد: اضرب الكرات براحتك!");
    } else if (mode === GameMode.PASS_LOGIC) {
      setCurrentTurnId("player_1");
      setTurnStatusText("اللاعب الأول (صاحب اللون الصلب): حان دورك!");
    } else if (mode === GameMode.VS_AI) {
      setCurrentTurnId("player");
      setTurnStatusText("دورك للتصويب وإسقاط كرة!");
    }
  };

  // Master rule evaluator when billiard balls stop rolling!
  const handleTurnComplete = (
    updatedBalls: Ball[],
    ballsPocketedThisTurn: Ball[],
    foul: boolean
  ) => {
    // 1. Check if cue ball is pocketed (Scratch!)
    const cueBall = updatedBalls.find((b) => b.type === BallType.CUE);
    const cueScratch = !cueBall || cueBall.state === BallState.POCKETED;

    let localFoul = foul || cueScratch;
    let message = "";

    // Respawn cue ball if scratched
    if (cueScratch) {
      // Place at default Head string
      if (cueBall) {
        cueBall.state = BallState.ON_TABLE;
        cueBall.x = 200;
        cueBall.y = 200;
        cueBall.vx = 0;
        cueBall.vy = 0;
      }
      setBallInHandActive(true);
      message = "خطأ! تم إسقاط الكرة البيضاء (مخالفة).";
    }

    // 2. Check if the 8-ball is pocketed
    const eightBall = updatedBalls.find((b) => b.type === BallType.EIGHT_BALL);
    const eightPocketed = !eightBall || eightBall.state === BallState.POCKETED;

    const myIdStr = selectedMode === GameMode.PASS_LOGIC ? "player_1" : "player";
    const oppIdStr = selectedMode === GameMode.PASS_LOGIC ? "player_2" : "ai";

    if (eightPocketed) {
      // Evaluate if player has cleared all balls of their group
      const activeMyGroupCount = updatedBalls.filter(
        (b) =>
          b.state === BallState.ON_TABLE &&
          b.id !== 0 &&
          (myBallGroup === "solids" ? b.type === BallType.SOLID : b.type === BallType.STRIPE)
      ).length;

      const isCurrentPlayerTurnOwner = currentTurnId === myIdStr || currentTurnId === currentUser?.uid;

      if (activeMyGroupCount === 0 && !localFoul) {
        // Legal Win!
        declareWinner(isCurrentPlayerTurnOwner ? myIdStr : oppIdStr);
      } else {
        // Scratched or forced loss before clearing other balls
        declareWinner(isCurrentPlayerTurnOwner ? oppIdStr : myIdStr);
      }
      return;
    }

    // 3. Handle Solid vs Stripes assignments when "undecided"
    let currentShooterGroup = myBallGroup;
    const scoredGroupBalls = ballsPocketedThisTurn.filter((b) => b.id !== 0 && b.id !== 8);

    if (currentShooterGroup === "undecided" && scoredGroupBalls.length > 0) {
      const firstSunk = scoredGroupBalls[0];
      const selectedType = firstSunk.type === BallType.SOLID ? "solids" : "stripes";
      const oppType = selectedType === "solids" ? "stripes" : "solids";

      setMyBallGroup(selectedType);
      currentShooterGroup = selectedType;
      message += ` تم تحديد مجموعتك: ${selectedType === "solids" ? "الصلبة" : "المقلمة"}!`;
    }

    // 4. Player earns turn continuation if they successfully pocketed at least one target ball
    let nextTurnId = currentTurnId;
    let keepTurn = false;

    if (scoredGroupBalls.length > 0 && !localFoul) {
      // Check if they pocketed their own group or undecided
      const pocketedMyGroupCount = scoredGroupBalls.filter((b) => {
        if (currentShooterGroup === "solids") return b.type === BallType.SOLID;
        if (currentShooterGroup === "stripes") return b.type === BallType.STRIPE;
        return true;
      }).length;

      if (pocketedMyGroupCount > 0) {
        keepTurn = true;
        message += " ضربة موفقة! يمنحك دوراً إضافياً.";
      }
    }

    // Swivel turn if player failed to keep turn or scratched
    if (!keepTurn) {
      if (selectedMode === GameMode.PASS_LOGIC) {
        nextTurnId = currentTurnId === "player_1" ? "player_2" : "player_1";
      } else if (selectedMode === GameMode.VS_AI) {
        nextTurnId = currentTurnId === "player" ? "ai" : "player";
      } else if (selectedMode === GameMode.ONLINE_MULTIPLAYER && currentRoomId && db && roomDoc) {
        const isHost = currentUser?.uid === roomDoc.hostId;
        nextTurnId = isHost ? roomDoc.guestId : roomDoc.hostId;
      }
      message += " انتقال الدور للطرف الآخر.";
    }

    // Feed visual reports
    setTurnStatusText(message || "اسحب العصا لليمين وصوّب بحكمة.");

    // Coordinate state modifications
    if (selectedMode !== GameMode.ONLINE_MULTIPLAYER) {
      setBalls([...updatedBalls]);
      setCurrentTurnId(nextTurnId);
    } else if (currentRoomId && db && roomDoc) {
      // Matchmaker multiplayer cloud synchronizer
      const isHost = currentUser?.uid === roomDoc.hostId;
      const pathStr = `rooms/${currentRoomId}`;

      const lobbyUpdates: Partial<any> = {
        ballsState: JSON.stringify(updatedBalls),
        turn: nextTurnId,
        foulOccurred: localFoul,
        updatedAt: new Date().toISOString()
      };

      // Sync categories on first pocket event
      if (roomDoc.hostBallGroup === "undecided" && currentShooterGroup !== "undecided") {
        if (isHost) {
          lobbyUpdates.hostBallGroup = currentShooterGroup;
          lobbyUpdates.guestBallGroup = currentShooterGroup === "solids" ? "stripes" : "solids";
        } else {
          lobbyUpdates.guestBallGroup = currentShooterGroup;
          lobbyUpdates.hostBallGroup = currentShooterGroup === "solids" ? "stripes" : "solids";
        }
      }

      updateDoc(doc(db, "rooms", currentRoomId), lobbyUpdates).catch((e) =>
        handleFirestoreError(e, OperationType.UPDATE, pathStr)
      );
    }
  };

  // Declare match winner rewards payouts
  const declareWinner = (winnerId: string) => {
    setMatchWinner(winnerId);
    setTurnStatusText("لقد انتهت المواجهة التاريخية بنجاح!");

    let isMeVictory = false;
    if (selectedMode === GameMode.VS_AI && winnerId === "player") isMeVictory = true;
    if (selectedMode === GameMode.PASS_LOGIC && winnerId === "player_1") isMeVictory = true;
    if (selectedMode === GameMode.ONLINE_MULTIPLAYER && winnerId === currentUser?.uid) isMeVictory = true;

    // Award user some XP Coins on victory list
    const earnedCoins = isMeVictory ? 150 : 30;
    const earnedXp = isMeVictory ? 250 : 80;

    const nextXp = playerStats.xp + earnedXp;
    const nextLevel = Math.max(playerStats.level, Math.floor(nextXp / (playerStats.level * 500)) + 1);

    const updatedStats: PlayerStats = {
      ...playerStats,
      xp: nextXp,
      level: nextLevel,
      coins: playerStats.coins + earnedCoins,
      playedGames: playerStats.playedGames + 1,
      wonGames: playerStats.wonGames + (isMeVictory ? 1 : 0)
    };

    saveStatsBackupLocally(updatedStats);

    // Sync cloud profile also
    if (currentUser) {
      updateProfile(currentUser.uid, {
        xp: updatedStats.xp,
        level: updatedStats.level,
        coins: updatedStats.coins,
        playedGames: updatedStats.playedGames,
        wonGames: updatedStats.wonGames
      });
    }

    // Synchronize Firestore status if we match over internet
    if (selectedMode === GameMode.ONLINE_MULTIPLAYER && currentRoomId && db) {
      const pathStr = `rooms/${currentRoomId}`;
      updateDoc(doc(db, "rooms", currentRoomId), {
        status: "finished",
        winnerId,
        updatedAt: new Date().toISOString()
      }).catch((e) => handleFirestoreError(e, OperationType.UPDATE, pathStr));
    }
  };

  // Lobby Matchmaker actions
  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (e) {
      console.error(e);
    }
  };

  // Create public table match code
  const handleCreateRoom = async () => {
    if (!db || !currentUser) return;

    // 6 digit alphanumeric code
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const pathStr = `rooms/${pin}`;

    const newObj = {
      roomId: pin,
      hostId: currentUser.uid,
      hostName: currentUser.displayName || "بطل مجهول",
      hostPhoto: currentUser.photoURL || "",
      guestId: "",
      guestName: "",
      guestPhoto: "",
      status: "waiting",
      winnerId: "",
      turn: currentUser.uid,
      turnExpiresAt: 0,
      lastShotBy: "",
      foulOccurred: false,
      hostBallGroup: "undecided",
      guestBallGroup: "undecided",
      ballsState: JSON.stringify(initializeBalls()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "rooms", pin), newObj);
      setCurrentRoomId(pin);
      setSelectedMode(GameMode.ONLINE_MULTIPLAYER);
      setBalls(initializeBalls());
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathStr);
    }
  };

  // Join match by code
  const handleJoinRoom = async (roomPinId: string) => {
    if (!db || !currentUser) return;

    const pathStr = `rooms/${roomPinId}`;
    try {
      const docRef = doc(db, "rooms", roomPinId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data.status !== "waiting") {
          alert("تنبيه: الغرفة ممتلئة أو منتهية حالياً!");
          return;
        }

        // update guest profiles
        await updateDoc(docRef, {
          guestId: currentUser.uid,
          guestName: currentUser.displayName || "منافس قوي",
          guestPhoto: currentUser.photoURL || "",
          status: "playing",
          updatedAt: new Date().toISOString()
        });

        setCurrentRoomId(roomPinId);
        setSelectedMode(GameMode.ONLINE_MULTIPLAYER);
      } else {
        alert("الغرفة غير موجودة! يرجى التحقق من الكود المدخل.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, pathStr);
    }
  };

  const handleQuitRoom = () => {
    if (selectedMode === GameMode.ONLINE_MULTIPLAYER && currentRoomId && db && roomDoc && roomDoc.status === "playing") {
      // Award default forfeit win to target competitor!
      const nextOpponentId = currentUser?.uid === roomDoc.hostId ? roomDoc.guestId : roomDoc.hostId;
      if (nextOpponentId) {
        declareWinner(nextOpponentId);
      }
    }
    // Return back to safe lobby menu
    setSelectedMode(null);
    setCurrentRoomId(null);
    setRoomDoc(null);
    setTab("lobby");
  };

  // Customizer items unlock actions
  const handleUnlockTheme = (id: string, cost: number) => {
    if (playerStats.coins < cost) return;

    const updated = {
      ...playerStats,
      coins: playerStats.coins - cost,
      unlockedThemes: [...playerStats.unlockedThemes, id],
      equippedTheme: id
    };

    saveStatsBackupLocally(updated);
    if (currentUser) {
      updateProfile(currentUser.uid, {
        coins: updated.coins,
        unlockedThemes: updated.unlockedThemes,
        equippedTheme: id
      });
    }
  };

  const handleUnlockCue = (id: string, cost: number) => {
    if (playerStats.coins < cost) return;

    const updated = {
      ...playerStats,
      coins: playerStats.coins - cost,
      unlockedCues: [...playerStats.unlockedCues, id],
      equippedCue: id
    };

    saveStatsBackupLocally(updated);
    if (currentUser) {
      updateProfile(currentUser.uid, {
        coins: updated.coins,
        unlockedCues: updated.unlockedCues,
        equippedCue: id
      });
    }
  };

  const handleEquipTheme = (id: string) => {
    const updated = { ...playerStats, equippedTheme: id };
    saveStatsBackupLocally(updated);
    if (currentUser) {
      updateProfile(currentUser.uid, { equippedTheme: id });
    }
  };

  const handleEquipCue = (id: string) => {
    const updated = { ...playerStats, equippedCue: id };
    saveStatsBackupLocally(updated);
    if (currentUser) {
      updateProfile(currentUser.uid, { equippedCue: id });
    }
  };

  // Online pre-formatted chat sender
  const handleSendChatMessage = async (text: string) => {
    if (!currentRoomId || !db || !currentUser) return;
    const pathStr = `rooms/${currentRoomId}/messages`;

    try {
      await addDoc(collection(db, "rooms", currentRoomId, "messages"), {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "لاعب غامض",
        text,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, pathStr);
    }
  };

  const selectedThemePreset =
    TABLE_THEMES.find((t) => t.id === playerStats.equippedTheme) || TABLE_THEMES[0];
  const selectedCuePreset =
    CUE_SKINS.find((c) => c.id === playerStats.equippedCue) || CUE_SKINS[0];

  const renderActivePlayMode = () => {
    const isOnline = selectedMode === GameMode.ONLINE_MULTIPLAYER;
    let turnText = turnStatusText;
    let isMyTurnIndicator = false;

    if (selectedMode === GameMode.SOLO_PRACTICE) {
      isMyTurnIndicator = true;
    } else if (selectedMode === GameMode.PASS_LOGIC) {
      isMyTurnIndicator = true;
      turnText =
        currentTurnId === "player_1"
          ? "دور اللاعب الأول (صاحب اللون الصلب)"
          : "دور اللاعب الثاني (صاحب اللون المقلم)";
    } else if (selectedMode === GameMode.VS_AI) {
      isMyTurnIndicator = currentTurnId === "player";
      turnText = isMyTurnIndicator ? "دورك للتصويب!" : "الحاسب الآلي يصوّب العصا...";
    } else if (isOnline && roomDoc) {
      isMyTurnIndicator = currentTurnId === currentUser?.uid;
      const isGuestJoined = roomDoc.guestId && roomDoc.guestId !== "";

      if (!isGuestJoined) {
        turnText = "بانتظار منافس للانضمام للطاولة... شارك الكود PIN الموضح مع غريمك!";
      } else {
        turnText = isMyTurnIndicator
          ? "دورك للتسديد والضرب! احذر الزمن الأقصى"
          : "دور منافسك الآن للتسديد، جهّز استراتيجيتك.";
      }
    }

    return (
      <div className="space-y-6 animate-fade-in py-4 px-2" id="gameplay-arena">
        {/* Header scoreboard */}
        <div className="flex flex-wrap items-center justify-between p-4 border border-slate-900 bg-slate-950/40 rounded-2xl gap-4">
          <div className="flex items-center gap-3">
            <button
              id="quit-match-btn"
              onClick={handleQuitRoom}
              className="text-2xs font-bold text-red-500 hover:text-red-400 px-3 py-1.5 border border-red-500/20 bg-red-950/10 rounded-xl transition"
            >
              مغادرة الصالة
            </button>
            <div className="h-5 w-[1px] bg-slate-900" />
            <span className="text-xs text-slate-400 font-semibold font-mono">
              مؤقت الوقت: <span className="text-sm font-black text-white">{turnTimer}ث</span>
            </span>
          </div>

          {/* Room PIN Code display for friend challenge */}
          {isOnline && (
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/60 p-2 border border-slate-800 rounded-xl">
              <span className="text-2xs text-slate-400">انضم بكود PIN:</span>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-850">
                {currentRoomId}
              </span>
            </div>
          )}

          {/* Score details */}
          <div className="flex items-center gap-3 text-xs">
            <button
              id="sound-toggle-btn"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 px-2 border border-slate-900 hover:bg-slate-900/40 text-slate-400 hover:text-white rounded-lg transition shrink-0"
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* The active billiard canvas element */}
        <PoolTable
          mode={selectedMode!}
          aiDifficulty={aiDifficulty}
          theme={selectedThemePreset}
          cueSkin={selectedCuePreset}
          currentUserId={currentUser?.uid || "guest_player"}
          isMyTurn={isMyTurnIndicator}
          ballsState={balls}
          onTurnComplete={handleTurnComplete}
          gameStatusText={turnText}
          isSimulationActive={isSimulationActive}
          setSimulationActive={setSimulationActive}
          ballInHandActive={ballInHandActive}
          setBallInHandActive={setBallInHandActive}
          myBallGroup={myBallGroup}
          opponentBallGroup={
            myBallGroup === "undecided"
              ? "undecided"
              : myBallGroup === "solids"
                ? "stripes"
                : "solids"
          }
        />

        {/* Online Chat and Messages bubble drawer */}
        {isOnline && roomDoc && roomDoc.status === "playing" && (
          <div className="border border-slate-900 bg-slate-950/30 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              صندوق الروح الرياضية والدردشة الفورية
            </h4>

            {/* Selector messages buttons block */}
            <div className="flex flex-wrap gap-2">
              {CHAT_OPTIONS.map((msg, i) => (
                <button
                  id={`fast-chat-btn-${i}`}
                  key={msg}
                  onClick={() => handleSendChatMessage(msg)}
                  className="px-3 py-1.5 border border-slate-905 bg-slate-900/30 hover:border-slate-800 rounded-lg text-2xs font-semibold text-slate-450 hover:text-slate-200 transition active:scale-95"
                >
                  {msg}
                </button>
              ))}
            </div>

            {/* Simple text input entry */}
            <div className="flex gap-2 border-t border-slate-900 pt-3">
              <input
                id="custom-chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="اكتب رسالة خاصة هنا للخصم..."
                className="w-full bg-slate-950/80 border border-slate-850 px-3 py-1.5 rounded-xl text-xs text-slate-300"
              />
              <button
                id="send-custom-chat-btn"
                onClick={() => {
                  if (chatInput.trim() !== "") {
                    handleSendChatMessage(chatInput);
                    setChatInput("");
                  }
                }}
                className="p-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
              >
                ارسال
              </button>
            </div>

            {/* Show logs preview scrolling */}
            <div className="max-h-34 overflow-y-auto space-y-2.5 pt-2 border-t border-slate-900">
              {chatMessages.map((m) => {
                const isMe = m.senderId === currentUser?.uid;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-lg p-2.5 rounded-xl text-xs leading-relaxed ${
                      isMe
                        ? "bg-slate-900 mr-auto border border-slate-850"
                        : "bg-emerald-950/10 ml-auto border border-emerald-900/30"
                    }`}
                  >
                    <span className="text-[9px] font-bold text-slate-500">
                      {isMe ? "أنت" : m.senderName}
                    </span>
                    <p className="font-semibold text-slate-200 mt-1">{m.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Match Finished Declarations Modal Banner overlay */}
        {matchWinner && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="border border-slate-800 bg-linear-to-b from-slate-950 to-slate-900 p-8 rounded-3xl text-center space-y-6 max-w-md w-full shadow-2xl animate-scale-in">
              <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl inline-block">
                <Trophy className="h-10 w-10 animate-bounce" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-100 uppercase tracking-wider mb-2">
                  اكتمل التحدي التاريخي!
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {matchWinner === "player_1" || matchWinner === "player" || matchWinner === currentUser?.uid
                    ? "لقد فزت في الجولة الصعبة وحققت رصيد عملات ذهبية ونقاط XP حصرية!"
                    : "حظ أوفر في مواجهاتك القادمة بالصالة الملكية لبلياردو النخبة!"}
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-900 rounded-2xl flex justify-around items-center divide-x divide-slate-900 gap-2">
                <div>
                  <span className="text-2xs font-mono text-slate-500 block mb-1">الجوائز المكتسبة</span>
                  <span className="text-sm font-bold text-amber-500">+150 ذهبة</span>
                </div>
                <div className="pl-4">
                  <span className="text-2xs font-mono text-slate-500 block mb-1">حجم الخبرة</span>
                  <span className="text-sm font-bold text-indigo-400">+250 XP</span>
                </div>
              </div>

              <button
                id="modal-finish-back-btn"
                onClick={() => {
                  setSelectedMode(null);
                  setCurrentRoomId(null);
                  setTab("lobby");
                  setMatchWinner(null);
                }}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition"
              >
                العودة لصالة اللوبي مجدداً
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-all selection:bg-emerald-500 selection:text-slate-950 pb-10" id="main-app-container">
      {/* Upper header navbar */}
      <Navbar
        playerStats={playerStats}
        currentTab={currentTab}
        setTab={setTab}
        user={currentUser}
        onLoginTrigger={handleGoogleAuth}
        onLogoutTrigger={handleLogout}
        isRoomActive={selectedMode !== null}
        onQuitRoom={handleQuitRoom}
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {selectedMode !== null ? (
          renderActivePlayMode()
        ) : currentTab === "lobby" ? (
          <Lobby
            onSelectMode={handleSelectMode}
            onSelectAiDifficulty={setAiDifficulty}
            onLoginTrigger={handleGoogleAuth}
            onJoinRoom={handleJoinRoom}
            onCreateRoom={handleCreateRoom}
            user={currentUser}
            coins={playerStats.coins}
          />
        ) : currentTab === "customizer" ? (
          <ThemeCustomizer
            playerStats={playerStats}
            onEquipTheme={handleEquipTheme}
            onEquipCue={handleEquipCue}
            onUnlockTheme={handleUnlockTheme}
            onUnlockCue={handleUnlockCue}
          />
        ) : currentTab === "ads" ? (
          <GoogleAds
            currentCoins={playerStats.coins}
            onRewardEarned={(amount) => {
              const nextCoins = playerStats.coins + amount;
              const updated = {
                ...playerStats,
                coins: nextCoins
              };
              saveStatsBackupLocally(updated);
              if (currentUser) {
                updateProfile(currentUser.uid, {
                  coins: nextCoins
                });
              }
            }}
          />
        ) : (
          <Dashboard playerStats={playerStats} />
        )}
      </main>
    </div>
  );
}
