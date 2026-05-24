/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import {
  Ball,
  BallType,
  BallState,
  CueStick,
  TablePreset,
  CuePreset,
  GameMode,
  AICutDifficulty
} from "../types";
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  CUSHION_WIDTH,
  BALL_RADIUS,
  pockets,
  initializeBalls,
  stepPhysics,
  calculateAIShot,
  getBallColor
} from "../lib/physics";
import { playCueHit, playBallClack, playCushionThud } from "../lib/audio";
import { RotateCcw, Power, RotateCw, Sparkles, AlertCircle } from "lucide-react";

interface PoolTableProps {
  mode: GameMode;
  aiDifficulty: AICutDifficulty;
  theme: TablePreset;
  cueSkin: CuePreset;
  currentUserId: string;
  isMyTurn: boolean;
  ballsState: Ball[];
  onTurnComplete: (updatedBalls: Ball[], ballsPocketedThisTurn: Ball[], foul: boolean) => void;
  gameStatusText: string;
  isSimulationActive: boolean;
  setSimulationActive: (active: boolean) => void;
  ballInHandActive: boolean;
  setBallInHandActive: (active: boolean) => void;
  myBallGroup: "solids" | "stripes" | "undecided";
  opponentBallGroup: "solids" | "stripes" | "undecided";
}

export function PoolTable({
  mode,
  aiDifficulty,
  theme,
  cueSkin,
  currentUserId,
  isMyTurn,
  ballsState,
  onTurnComplete,
  gameStatusText,
  isSimulationActive,
  setSimulationActive,
  ballInHandActive,
  setBallInHandActive,
  myBallGroup,
  opponentBallGroup
}: PoolTableProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Balls state local tracker
  const [balls, setBalls] = useState<Ball[]>(ballsState);
  const [cueStick, setCueStick] = useState<CueStick>({
    angle: 0,
    power: 0,
    isActive: true,
    isAiming: false
  });

  const [powerSlider, setPowerSlider] = useState<number>(0);
  const [isStickGrabbed, setIsStickGrabbed] = useState(false);
  const [isStriking, setIsStriking] = useState(false);
  const [isAiTurnText, setIsAiTurnText] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string>("");

  // Track balls pocketed on current turn for game logic
  const [pocketedThisTurn, setPocketedThisTurn] = useState<Ball[]>([]);
  const [firstHitBallId, setFirstHitBallId] = useState<number | null>(null);
  const [foulMessage, setFoulMessage] = useState<string>("");

  // Sync props to local state when matches refresh
  useEffect(() => {
    if (!isSimulationActive) {
      setBalls(JSON.parse(JSON.stringify(ballsState)));
    }
  }, [ballsState, isSimulationActive]);

  // Adjust angle on mouse hover relative to Cue Ball center
  const getCueBall = (currentBalls: Ball[]) => currentBalls.find((b) => b.type === BallType.CUE);

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;

    const render = () => {
      // 1. Draw table felt
      ctx.fillStyle = theme.feltColor;
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // Draw standard Pool Table diamond patterns or subtle markings
      ctx.fillStyle = theme.accents === "gold" ? "rgba(255, 215, 0, 0.4)" : "rgba(192, 192, 192, 0.4)";
      // Draw head string & D-Zone marker
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(200, CUSHION_WIDTH);
      ctx.lineTo(200, TABLE_HEIGHT - CUSHION_WIDTH);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(200, TABLE_HEIGHT / 2, 60, Math.PI / 2, (3 * Math.PI) / 2);
      ctx.stroke();

      // Draw kitchen marker spot
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(600, TABLE_HEIGHT / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw outer cushions frame
      ctx.strokeStyle = theme.borderColor;
      ctx.lineWidth = CUSHION_WIDTH * 2;
      ctx.strokeRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // Frameline golden inner details
      ctx.strokeStyle = theme.accents === "gold" ? "#ffd700" : "#d1d5db";
      ctx.lineWidth = 1;
      ctx.strokeRect(CUSHION_WIDTH, CUSHION_WIDTH, TABLE_WIDTH - CUSHION_WIDTH * 2, TABLE_HEIGHT - CUSHION_WIDTH * 2);

      // 3. Draw pockets
      for (const pocket of pockets) {
        // Outer dark glow
        const outerGlow = ctx.createRadialGradient(
          pocket.x, pocket.y, pocket.radius * 0.4,
          pocket.x, pocket.y, pocket.radius
        );
        outerGlow.addColorStop(0, "#000000");
        outerGlow.addColorStop(0.85, theme.pocketColor);
        outerGlow.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, pocket.radius + 3, 0, Math.PI * 2);
        ctx.fill();

        // Inner absolute black depth hole
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, pocket.radius - 2, 0, Math.PI * 2);
        ctx.fill();

        // Shiny metal/gold lip rim
        ctx.strokeStyle = theme.accents === "gold" ? "#d4af37" : "#aaa";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, pocket.radius - 1, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Draw Balls
      for (const b of balls) {
        if (b.state !== BallState.ON_TABLE) continue;

        // shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.arc(b.x + 2, b.y + 3, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw body
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // Striped custom look
        if (b.type === BallType.STRIPE) {
          ctx.fillStyle = "#ffffff";
          // We draw white caps on sides, leaving a central colored band
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.clip();

          // Left white cap
          ctx.beginPath();
          ctx.arc(b.x - b.radius * 1.3, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();

          // Right white cap
          ctx.beginPath();
          ctx.arc(b.x + b.radius * 1.3, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        // Clean white label disc for stripes/solids
        if (b.id !== 0) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();

          // Number text
          ctx.fillStyle = "#000000";
          ctx.font = "bold 7px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(b.label, b.x, b.y + 0.5);
        }

        // Modern 3D glossy highlight dome
        const gloss = ctx.createRadialGradient(
          b.x - b.radius * 0.3, b.y - b.radius * 0.3, 0.5,
          b.x, b.y, b.radius
        );
        gloss.addColorStop(0, "rgba(255, 255, 255, 0.75)");
        gloss.addColorStop(0.3, "rgba(255, 255, 255, 0.1)");
        gloss.addColorStop(1, "rgba(0, 0, 0, 0.2)");
        ctx.fillStyle = gloss;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Drawing Aim Target Vector Guidelines
      const cueBall = getCueBall(balls);
      if (
        cueBall &&
        cueBall.state === BallState.ON_TABLE &&
        !isSimulationActive &&
        isMyTurn &&
        !ballInHandActive &&
        !isAiTurnText
      ) {
        const angle = cueStick.angle;
        // Direction vectors
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        // Projected line starting at cue center
        let lineEndX = cueBall.x + dx * 1000;
        let lineEndY = cueBall.y + dy * 1000;
        let closestIntersectionDist = 1000;
        let hitTargetBall: Ball | null = null;

        // Iterate all active balls to see which one our targeting pointer cuts first
        for (const target of balls) {
          if (target.id === 0) continue; // skip cue
          if (target.state !== BallState.ON_TABLE) continue;

          // Check vector intersection
          const vcx = target.x - cueBall.x;
          const vcy = target.y - cueBall.y;
          // projection length
          const projLen = vcx * dx + vcy * dy;

          if (projLen < 0) continue; // Behind cue ball

          // distance squared from target ball to aiming line
          const distSq = (vcx - projLen * dx) ** 2 + (vcy - projLen * dy) ** 2;
          const collisionRangeSq = (BALL_RADIUS * 2) ** 2;

          if (distSq < collisionRangeSq) {
            // we have an intersection!
            const hitDist = projLen - Math.sqrt(collisionRangeSq - distSq);
            if (hitDist > 0 && hitDist < closestIntersectionDist) {
              closestIntersectionDist = hitDist;
              lineEndX = cueBall.x + dx * hitDist;
              lineEndY = cueBall.y + dy * hitDist;
              hitTargetBall = target;
            }
          }
        }

        // Also check table boundaries
        const minValX = CUSHION_WIDTH + BALL_RADIUS;
        const maxValX = TABLE_WIDTH - CUSHION_WIDTH - BALL_RADIUS;
        const minValY = CUSHION_WIDTH + BALL_RADIUS;
        const maxValY = TABLE_HEIGHT - CUSHION_WIDTH - BALL_RADIUS;

        // Wall hit distance checks
        let tWall = 1000;
        if (dx > 0) tWall = Math.min(tWall, (maxValX - cueBall.x) / dx);
        if (dx < 0) tWall = Math.min(tWall, (minValX - cueBall.x) / dx);
        if (dy > 0) tWall = Math.min(tWall, (maxValY - cueBall.y) / dy);
        if (dy < 0) tWall = Math.min(tWall, (minValY - cueBall.y) / dy);

        if (tWall < closestIntersectionDist) {
          closestIntersectionDist = tWall;
          lineEndX = cueBall.x + dx * tWall;
          lineEndY = cueBall.y + dy * tWall;
          hitTargetBall = null;
        }

        // Draw dashed sightline
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.stroke();
        ctx.restore();

        // If target ball hit is found, draw cut deflection vector circle
        if (hitTargetBall) {
          ctx.strokeStyle = cueSkin.colorPattern.includes("ff007f") ? "#00f0ff" : "#ffd700";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(lineEndX, lineEndY, BALL_RADIUS, 0, Math.PI * 2);
          ctx.stroke();

          // Draw expected deflection pathway line of target ball
          const targetPathX = hitTargetBall.x - lineEndX;
          const targetPathY = hitTargetBall.y - lineEndY;
          const dLen = Math.sqrt(targetPathX * targetPathX + targetPathY * targetPathY) || 0.001;
          const tdx = targetPathX / dLen;
          const tdy = targetPathY / dLen;

          ctx.beginPath();
          ctx.moveTo(hitTargetBall.x, hitTargetBall.y);
          ctx.lineTo(hitTargetBall.x + tdx * 50, hitTargetBall.y + tdy * 50);
          ctx.stroke();
        }

        // 6. Draw Cue Stick pulling back
        const pullbackAmt = (powerSlider / 100) * 45;
        const stickDist = BALL_RADIUS + 8 + pullbackAmt;

        ctx.save();
        ctx.translate(cueBall.x, cueBall.y);
        ctx.rotate(angle);

        // Draw a glowing hover/drag outline around the cue stick if grabbed
        if (isStickGrabbed) {
          ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.moveTo(-stickDist - 128, 0);
          ctx.lineTo(-stickDist + 1, 0);
          ctx.stroke();

          // Outer glowing touch ring at the stick butt
          ctx.fillStyle = "rgba(16, 185, 129, 0.7)";
          ctx.beginPath();
          ctx.arc(-stickDist - 125, 0, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          // Draw a small high-contrast pointer grab tip for desktop hovered and touch guide
          ctx.fillStyle = "rgba(245, 158, 11, 0.7)";
          ctx.beginPath();
          ctx.arc(-stickDist - 125, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Create gradient color for cue stick based on current skin
        const cueGrad = ctx.createLinearGradient(-stickDist - 120, 0, -stickDist, 0);
        if (cueSkin.id === "classic_wood") {
          cueGrad.addColorStop(0, "#4d2c18");
          cueGrad.addColorStop(0.5, "#a1622b");
          cueGrad.addColorStop(1, "#ffe1b1");
        } else if (cueSkin.id === "golden_elite") {
          cueGrad.addColorStop(0, "#7a5000");
          cueGrad.addColorStop(0.3, "#e5a900");
          cueGrad.addColorStop(0.7, "#ffd700");
          cueGrad.addColorStop(1, "#ffffec");
        } else if (cueSkin.id === "carbon_fiber") {
          cueGrad.addColorStop(0, "#0a0a0d");
          cueGrad.addColorStop(0.5, "#25262e");
          cueGrad.addColorStop(0.9, "#595d6e");
          cueGrad.addColorStop(1, "#bfc2db");
        } else {
          // Neon Pulse
          cueGrad.addColorStop(0, "#800080");
          cueGrad.addColorStop(0.4, "#ff007f");
          cueGrad.addColorStop(0.7, "#00ffff");
          cueGrad.addColorStop(1, "#ffffff");
        }

        ctx.fillStyle = cueGrad;
        // Draw elegant tapered stick pointing left to strike right
        ctx.beginPath();
        ctx.moveTo(-stickDist - 125, -2.5);
        ctx.lineTo(-stickDist, -1.2);
        ctx.lineTo(-stickDist, 1.2);
        ctx.lineTo(-stickDist - 125, 2.5);
        ctx.closePath();
        ctx.fill();

        // Tip accents (Ivory ferrule + leather tip)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-stickDist - 4, -1.3, 4, 2.6);
        ctx.fillStyle = "#5c7aff";
        ctx.fillRect(-stickDist - 1.5, -1.3, 1.5, 2.6);

        ctx.restore();
      }

      // 7. Visual Ball in hand cursor glow helper
      if (ballInHandActive && isMyTurn) {
        ctx.strokeStyle = "rgba(0, 240, 255, 0.6)";
        ctx.lineWidth = 2.0;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.arc(cueBall?.x || 200, cueBall?.y || 200, BALL_RADIUS + 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [balls, cueStick, powerSlider, theme, cueSkin, isSimulationActive, isMyTurn, ballInHandActive, isAiTurnText, isStickGrabbed]);

  // Handle simulation updates (Physics tick solver)
  useEffect(() => {
    if (!isSimulationActive) return;

    let localPocketed: Ball[] = [];
    let localFirstHit: number | null = firstHitBallId;

    const interval = setInterval(() => {
      // Create clone array to pass into step simulator mutating variables
      const tempBalls = [...balls];
      const itemsPocketed: { ballId: number; type: BallType }[] = [];

      const stillMoving = stepPhysics(tempBalls, 0.991, itemsPocketed);

      // Record first ball impact event
      if (localFirstHit === null) {
        // Evaluate collision of cue with another ball
        const cue = tempBalls.find((b) => b.type === BallType.CUE);
        if (cue) {
          for (const rawB of tempBalls) {
            if (rawB.id === 0 || rawB.state !== BallState.ON_TABLE) continue;
            const dist = Math.sqrt((rawB.x - cue.x) ** 2 + (rawB.y - cue.y) ** 2);
            if (dist < BALL_RADIUS * 2 + 0.5) {
              localFirstHit = rawB.id;
              setFirstHitBallId(rawB.id);
              break;
            }
          }
        }
      }

      // Add pocketed balls into round checklist
      if (itemsPocketed.length > 0) {
        itemsPocketed.forEach((item) => {
          const original = balls.find((ob) => ob.id === item.ballId);
          if (original && !localPocketed.some((p) => p.id === original.id)) {
            localPocketed.push(original);
          }
        });
        setPocketedThisTurn([...localPocketed]);
      }

      setBalls([...tempBalls]);

      if (!stillMoving) {
        setSimulationActive(false);
        clearInterval(interval);
        // Fire Turn End handler
        onTurnComplete(tempBalls, localPocketed, false);
        // Clear collision temp tracking
        setFirstHitBallId(null);
        setPocketedThisTurn([]);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [isSimulationActive, balls, firstHitBallId]);

  // Automatic AI targeting triggers
  useEffect(() => {
    if (mode === GameMode.VS_AI && !isMyTurn && !isSimulationActive) {
      setIsAiTurnText(true);
      const thinkTime = 1200 + Math.random() * 800;
      
      const timer = setTimeout(() => {
        // run AI shooter computation
        const aiGroup = opponentBallGroup;
        const aiShot = calculateAIShot(balls, aiGroup, aiDifficulty);

        if (aiShot) {
          // Play slide pullback visual animation
          let currentPull = 0;
          const pullInterval = setInterval(() => {
            currentPull += 5;
            setPowerSlider(currentPull);
            if (currentPull >= aiShot.power) {
              clearInterval(pullInterval);
              // Trigger actual striker release
              setTimeout(() => {
                strikeCueBall(aiShot.angle, aiShot.power);
                setIsAiTurnText(false);
              }, 120);
            }
          }, 15);
        } else {
          // Fail-safe pass turn
          setIsAiTurnText(false);
          onTurnComplete(balls, [], false);
        }
      }, thinkTime);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [mode, isMyTurn, isSimulationActive, balls]);

  // Actual strike action physics impulse
  const strikeCueBall = (angle: number, power: number) => {
    if (isSimulationActive) return;

    setBalls((currentBalls) => {
      const cloned = JSON.parse(JSON.stringify(currentBalls));
      const cue = cloned.find((b: Ball) => b.type === BallType.CUE);
      if (cue && cue.state === BallState.ON_TABLE) {
        // Base velocity on power meter
        const force = (power / 100) * 16.5 * cueSkin.powerModifier;
        cue.vx = Math.cos(angle) * force;
        cue.vy = Math.sin(angle) * force;
        playCueHit(power);
      }
      return cloned;
    });

    setPowerSlider(0);
    setSimulationActive(true);
  };

  const draggingStickRef = useRef<boolean>(false);

  const isTouchNearStick = (tx: number, ty: number, cueBall: Ball, angle: number) => {
    const startDist = BALL_RADIUS + 8 + (powerSlider / 100) * 45;
    const endDist = startDist + 150;
    
    // The stick points BACKWARDS from the shooting angle (angle)
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x1 = cueBall.x - startDist * cos;
    const y1 = cueBall.y - startDist * sin;
    const x2 = cueBall.x - endDist * cos;
    const y2 = cueBall.y - endDist * sin;
    
    // Calculate distance from point (tx, ty) to segment (x1, y1)-(x2, y2)
    const A = tx - x1;
    const B = ty - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = tx - xx;
    const dy = ty - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Mouse interaction listener supporting accurate aiming relative to cue ball and stick
  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement>, isStart: boolean = false) => {
    if (!isMyTurn || isSimulationActive || isAiTurnText) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * TABLE_WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * TABLE_HEIGHT;

    const cueBall = getCueBall(balls);
    if (!cueBall || cueBall.state !== BallState.ON_TABLE) return;

    // A: Ball In Hand Active -> Click anywhere to relocate cue ball
    if (ballInHandActive) {
      const validMinX = CUSHION_WIDTH + BALL_RADIUS + 3;
      const validMaxX = TABLE_WIDTH - CUSHION_WIDTH - BALL_RADIUS - 3;
      const validMinY = CUSHION_WIDTH + BALL_RADIUS + 3;
      const validMaxY = TABLE_HEIGHT - CUSHION_WIDTH - BALL_RADIUS - 3;

      let targetX = Math.max(validMinX, Math.min(validMaxX, clickX));
      let targetY = Math.max(validMinY, Math.min(validMaxY, clickY));

      const isBehindHeadString = targetX <= 250;
      if (!isBehindHeadString && mode !== GameMode.SOLO_PRACTICE) {
        targetX = Math.min(250, targetX);
      }

      let overlaps = false;
      for (const obj of balls) {
        if (obj.id === 0 || obj.state !== BallState.ON_TABLE) continue;
        const d = Math.sqrt((obj.x - targetX) ** 2 + (obj.y - targetY) ** 2);
        if (d < BALL_RADIUS * 2) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        setBalls((current) =>
          current.map((b) => (b.id === 0 ? { ...b, x: targetX, y: targetY, vx: 0, vy: 0 } : b))
        );
      } else {
        setStatusNotification("لا يمكن وضع الكرة فوق كرة أخرى!");
        setTimeout(() => setStatusNotification(""), 2000);
      }
      return;
    }

    // B: Traditional drag and grab-stick swivel calculations
    const isDrag = e.buttons === 1;
    let grabStick = false;

    if (isDrag) {
      if (isStart) {
        const dist = isTouchNearStick(clickX, clickY, cueBall, cueStick.angle);
        grabStick = dist < 45;
        draggingStickRef.current = grabStick;
        setIsStickGrabbed(grabStick);
      } else {
        grabStick = draggingStickRef.current;
      }
    } else {
      const dist = isTouchNearStick(clickX, clickY, cueBall, cueStick.angle);
      grabStick = dist < 45;
      draggingStickRef.current = grabStick;
    }

    let finalAngle = cueStick.angle;
    if (grabStick) {
      // Direct rotate by grabbing cue stick backwards
      finalAngle = Math.atan2(clickY - cueBall.y, clickX - cueBall.x) + Math.PI;
    } else {
      // Normal drag rotates relative to cue ball placement
      finalAngle = Math.atan2(clickY - cueBall.y, clickX - cueBall.x);
    }

    setCueStick((prev) => ({ ...prev, angle: finalAngle, isAiming: true }));
  };

  // High-precision Touch interaction listener for mobile screens
  const handleTouchInteraction = (e: React.TouchEvent<HTMLCanvasElement>, isStart: boolean = false) => {
    if (!isMyTurn || isSimulationActive || isAiTurnText) return;
    
    if (e.cancelable) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return;

    const clickX = ((touch.clientX - rect.left) / rect.width) * TABLE_WIDTH;
    const clickY = ((touch.clientY - rect.top) / rect.height) * TABLE_HEIGHT;

    const cueBall = getCueBall(balls);
    if (!cueBall || cueBall.state !== BallState.ON_TABLE) return;

    // A: Ball In Hand Active
    if (ballInHandActive) {
      const validMinX = CUSHION_WIDTH + BALL_RADIUS + 3;
      const validMaxX = TABLE_WIDTH - CUSHION_WIDTH - BALL_RADIUS - 3;
      const validMinY = CUSHION_WIDTH + BALL_RADIUS + 3;
      const validMaxY = TABLE_HEIGHT - CUSHION_WIDTH - BALL_RADIUS - 3;

      let targetX = Math.max(validMinX, Math.min(validMaxX, clickX));
      let targetY = Math.max(validMinY, Math.min(validMaxY, clickY));

      const isBehindHeadString = targetX <= 250;
      if (!isBehindHeadString && mode !== GameMode.SOLO_PRACTICE) {
        targetX = Math.min(250, targetX);
      }

      let overlaps = false;
      for (const obj of balls) {
        if (obj.id === 0 || obj.state !== BallState.ON_TABLE) continue;
        const d = Math.sqrt((obj.x - targetX) ** 2 + (obj.y - targetY) ** 2);
        if (d < BALL_RADIUS * 2) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        setBalls((current) =>
          current.map((b) => (b.id === 0 ? { ...b, x: targetX, y: targetY, vx: 0, vy: 0 } : b))
        );
      }
      return;
    }

    // B: Stick/Aim dragging calculation
    let grabStick = false;
    if (isStart) {
      const dist = isTouchNearStick(clickX, clickY, cueBall, cueStick.angle);
      grabStick = dist < 50; // Super forgiving 50px finger radius
      draggingStickRef.current = grabStick;
      setIsStickGrabbed(grabStick);
    } else {
      grabStick = draggingStickRef.current;
    }

    let finalAngle = cueStick.angle;
    if (grabStick) {
      finalAngle = Math.atan2(clickY - cueBall.y, clickX - cueBall.x) + Math.PI;
    } else {
      finalAngle = Math.atan2(clickY - cueBall.y, clickX - cueBall.x);
    }

    setCueStick((prev) => ({ ...prev, angle: finalAngle, isAiming: true }));
  };

  const spinAngle = (radFraction: number) => {
    // fine tune adjustments
    setCueStick((prev) => ({ ...prev, angle: prev.angle + radFraction }));
  };

  const handleStrikeTrigger = () => {
    if (powerSlider <= 0) return;
    strikeCueBall(cueStick.angle, powerSlider);
  };

  const handleToggleBallInHand = () => {
    // Practice helper toggles
    setBallInHandActive(!ballInHandActive);
  };

  return (
    <div className="flex flex-col items-center w-full" id="pool-table-component">
      {/* Simulation/Turn Dashboard Overlay */}
      <div className="flex flex-wrap items-center justify-between w-full max-w-5xl gap-4 p-3 mb-3 border border-slate-800 bg-slate-900/90 backdrop-blur rounded-xl">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-3 w-3 rounded-full ${
              isSimulationActive ? "bg-amber-500 animate-pulse" : isMyTurn ? "bg-emerald-500" : "bg-slate-600"
            }`}
          />
          <div>
            <h4 className="text-sm font-medium text-slate-200">
              {isAiTurnText ? "الذكاء الاصطناعي يفكر ويصوب..." : gameStatusText}
            </h4>
            <p className="text-xs text-slate-400 font-mono">
              {myBallGroup === "undecided"
                ? "نوع كراتك: لم يحدد بعد"
                : `كراتك: ${myBallGroup === "solids" ? "الصلبة (1-7)" : "المقلمة (9-15)"}`}
            </p>
          </div>
        </div>

        {/* Diagnostic notification row */}
        {statusNotification && (
          <div className="px-3 py-1 text-xs text-amber-300 border border-amber-900/50 bg-amber-950/40 rounded-lg animate-fade-in">
            {statusNotification}
          </div>
        )}

        {/* Ball in Hand banner trigger */}
        {ballInHandActive && isMyTurn && (
          <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-cyan-300 border border-cyan-900/50 bg-cyan-950/40 rounded-lg">
            <Sparkles className="h-3.5 w-3.5 animate-bounce" />
            <span>حرّك الكرة البيضاء وضعها في النصف الأيسر</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {mode === GameMode.SOLO_PRACTICE && (
            <button
              id="ball-in-hand-toggle"
              onClick={handleToggleBallInHand}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg border ${
                ballInHandActive
                  ? "bg-cyan-500 text-slate-950 border-cyan-400"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              الكرة بيدك
            </button>
          )}

          {isMyTurn && !isSimulationActive && !isAiTurnText && (
            <div className="flex items-center gap-1.5 border border-slate-700 bg-slate-950 px-2 py-1 rounded-lg">
              <button
                id="aim-coarse-ccw"
                onClick={() => spinAngle(-0.02)}
                className="p-1 hover:bg-slate-800 rounded transition text-slate-400 hover:text-white"
                title="تعديل دقيق يسار"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <span className="text-2xs font-mono text-slate-500">زاوية التصويب</span>
              <button
                id="aim-coarse-cw"
                onClick={() => spinAngle(0.02)}
                className="p-1 hover:bg-slate-800 rounded transition text-slate-400 hover:text-white"
                title="تعديل دقيق يمين"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Orientation Warning / Guide */}
      <div className="block sm:hidden pb-1 w-full text-center">
        <p className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-905/20 py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 animate-pulse">
          <RotateCw className="h-3 w-3 text-amber-500" />
          💡 للعب بدقة أكبر وتكبير الطاولة، نقترح تدوير هاتفك بالوضعية الأفقية (Landscape)!
        </p>
      </div>

      {/* Primary Pool table viewport framework */}
      <div
        ref={containerRef}
        className="relative flex flex-col sm:flex-row md:flex-row lg:flex-row items-center justify-center p-2 sm:p-4 w-full max-w-5xl border border-slate-800 bg-slate-950/40 hover:border-slate-700/80 transition-all rounded-2xl md:rounded-3xl gap-4 md:gap-6 xl:gap-8"
      >
        {/* Canvas table container */}
        <div className="relative overflow-hidden border border-slate-900 shadow-2xl shadow-black/80 rounded-2xl aspect-[2/1] w-full max-w-4xl">
          <canvas
            ref={canvasRef}
            width={TABLE_WIDTH}
            height={TABLE_HEIGHT}
            onMouseMove={(e) => handleCanvasInteraction(e, false)}
            onMouseDown={(e) => handleCanvasInteraction(e, true)}
            onMouseUp={() => {
              setIsStickGrabbed(false);
              draggingStickRef.current = false;
            }}
            onTouchStart={(e) => handleTouchInteraction(e, true)}
            onTouchMove={(e) => handleTouchInteraction(e, false)}
            onTouchEnd={() => {
              setCueStick((prev) => ({ ...prev, isAiming: false }));
              setIsStickGrabbed(false);
              draggingStickRef.current = false;
            }}
            className={`w-full h-full block touch-none cursor-crosshair ${
              ballInHandActive ? "cursor-move" : "cursor-crosshair"
            }`}
          />
        </div>

        {/* Charge power shot console */}
        {isMyTurn && !isSimulationActive && !isAiTurnText && !ballInHandActive && (
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 border border-slate-800 bg-slate-900/50 rounded-2xl w-full sm:w-44 md:w-48 lg:w-48 xl:w-56 text-center shrink-0">
            <span className="text-xs font-semibold text-slate-400 mb-4 tracking-wider uppercase block">
              عداد قوة الضربة
            </span>
            
            {/* Charging Power Handle track bar */}
            <div className="relative w-full h-6 flex items-center bg-slate-950 border border-slate-800 rounded-full overflow-hidden mb-5">
              <div
                className="absolute left-0 top-0 h-full transition-all duration-75"
                style={{
                  width: `${powerSlider}%`,
                  background: `linear-gradient(90deg, #10b981 0%, #f59e0b ${Math.min(100, (powerSlider > 60 ? powerSlider : 60))}%, #ef4444 100%)`
                }}
              />
              <span className="absolute w-full text-center text-2xs font-mono font-bold text-white drop-shadow">
                {powerSlider}%
              </span>
            </div>

            <input
              id="cue-power-input"
              type="range"
              min="0"
              max="100"
              value={powerSlider}
              onChange={(e) => setPowerSlider(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg cursor-pointer appearance-none mb-5"
            />

            <button
              id="strike-action-button"
              disabled={powerSlider <= 0}
              onClick={handleStrikeTrigger}
              className={`flex items-center justify-center gap-2 w-full py-3 px-4 font-bold rounded-xl shadow-lg border transition-all ${
                powerSlider > 0
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-emerald-500/10 active:scale-95 cursor-pointer"
                  : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Power className="h-4 w-4" />
              إطلاق الضربة!
            </button>
          </div>
        )}
      </div>

      {/* Pocket Status List of Remaining Objects */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 w-full max-w-5xl">
        <div className="p-3 border border-slate-900 bg-slate-900/30 rounded-xl text-center">
          <span className="text-2xs font-mono text-slate-500 block">كرات المجموعة الصلبة</span>
          <div className="flex justify-center gap-1 mt-1 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => {
              const present = balls.some((b) => b.id === num && b.state === BallState.ON_TABLE);
              return (
                <span
                  key={num}
                  className={`w-4.5 h-4.5 rounded-full border border-black/30 flex items-center justify-center text-3xs font-bold text-black ${
                    present ? "" : "opacity-15 grayscale line-through scale-90"
                  }`}
                  style={{ backgroundColor: getBallColor(num) }}
                >
                  {num}
                </span>
              );
            })}
          </div>
        </div>

        <div className="p-3 border border-slate-900 bg-slate-900/30 rounded-xl text-center">
          <span className="text-2xs font-mono text-slate-500 block">كرات المجموعة المقلمة</span>
          <div className="flex justify-center gap-1 mt-1 flex-wrap">
            {[9, 10, 11, 12, 13, 14, 15].map((num) => {
              const present = balls.some((b) => b.id === num && b.state === BallState.ON_TABLE);
              return (
                <span
                  key={num}
                  className={`w-4.5 h-4.5 rounded-full border border-black/30 flex items-center justify-center text-3xs font-extrabold ${
                    present ? "bg-white" : "opacity-15 grayscale line-through scale-90"
                  }`}
                  style={{
                    borderColor: getBallColor(num),
                    boxShadow: present ? `inset 0 0 0 3.5px ${getBallColor(num)}` : "none",
                    color: present ? "#000000" : "transparent"
                  }}
                >
                  {num}
                </span>
              );
            })}
          </div>
        </div>

        <div className="p-3 border border-slate-900 bg-slate-900/30 rounded-xl text-center">
          <span className="text-2xs font-mono text-slate-500 block">كرة الثمانية السوداء</span>
          <div className="flex justify-center mt-1">
            <span
              className={`w-5 h-5 rounded-full border border-black/30 flex items-center justify-center text-2xs font-bold text-white bg-black ${
                balls.some((b) => b.id === 8 && b.state === BallState.ON_TABLE)
                  ? ""
                  : "opacity-10 grayscale line-through scale-90"
              }`}
            >
              8
            </span>
          </div>
        </div>

        <div className="p-3 border border-slate-900 bg-slate-900/30 rounded-xl text-center">
          <span className="text-2xs font-mono text-slate-500 block">الوضعية الحالية للعب</span>
          <span className="text-xs font-semibold text-amber-500 block mt-1.5 truncate">
            {mode === GameMode.SOLO_PRACTICE
              ? "تدريب حر"
              : mode === GameMode.PASS_LOGIC
              ? "فردي ثنائي اللاعبين"
              : mode === GameMode.VS_AI
              ? `ضد الحاسب (${difficultyText(aiDifficulty)})`
              : "تحدي اللعب المباشر"}
          </span>
        </div>
      </div>
    </div>
  );
}

function difficultyText(diff: AICutDifficulty): string {
  if (diff === AICutDifficulty.EASY) return "مبتدئ";
  if (diff === AICutDifficulty.MEDIUM) return "متوسط";
  return "محترف";
}
