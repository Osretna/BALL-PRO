/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ball, BallType, BallState, Vector2D, AICutDifficulty } from "../types";
import { playBallClack, playCushionThud, playPocketPlop } from "./audio";

export const TABLE_WIDTH = 800;
export const TABLE_HEIGHT = 400;
export const CUSHION_WIDTH = 22;
export const BALL_RADIUS = 10;
export const POCKET_RADIUS = 20;

export interface Pocket {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export const pockets: Pocket[] = [
  { id: "tl", x: CUSHION_WIDTH, y: CUSHION_WIDTH, radius: POCKET_RADIUS }, // Top Left
  { id: "tc", x: TABLE_WIDTH / 2, y: CUSHION_WIDTH - 2, radius: POCKET_RADIUS - 1 }, // Top Middle
  { id: "tr", x: TABLE_WIDTH - CUSHION_WIDTH, y: CUSHION_WIDTH, radius: POCKET_RADIUS }, // Top Right
  { id: "bl", x: CUSHION_WIDTH, y: TABLE_HEIGHT - CUSHION_WIDTH, radius: POCKET_RADIUS }, // Bottom Left
  { id: "bc", x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - CUSHION_WIDTH + 2, radius: POCKET_RADIUS - 1 }, // Bottom Middle
  { id: "br", x: TABLE_WIDTH - CUSHION_WIDTH, y: TABLE_HEIGHT - CUSHION_WIDTH, radius: POCKET_RADIUS } // Bottom Right
];

export function getBallColor(num: number): string {
  if (num === 0) return "#ffffff"; // Cue
  if (num === 8) return "#111111"; // 8-Ball Black

  const colors = [
    "#fbc02d", // 1, 9 - Yellow
    "#1565c0", // 2, 10 - Blue
    "#c62828", // 3, 11 - Red
    "#6a1b9a", // 4, 12 - Purple
    "#ef6c00", // 5, 13 - Orange
    "#2e7d32", // 6, 14 - Green
    "#800000"  // 7, 15 - Burgundy
  ];

  return colors[(num - 1) % 7];
}

export function initializeBalls(): Ball[] {
  const list: Ball[] = [];

  // 1. Cue Ball
  list.push({
    id: 0,
    x: 200,
    y: TABLE_HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    type: BallType.CUE,
    color: "#ffffff",
    label: "Cue",
    state: BallState.ON_TABLE
  });

  // 2. Rack of 15 balls
  // Apex of triangle is at x = 560, y = TABLE_HEIGHT / 2
  const rackX = 560;
  const rackY = TABLE_HEIGHT / 2;
  const colSpacing = BALL_RADIUS * Math.sqrt(3) + 0.5; // row spacing (sin 60)
  const rowSpacing = BALL_RADIUS * 2 + 0.5;

  // Let's plan distinct standard arrangement:
  // Col 0: Index 1
  // Col 1: Index 9, 2
  // Col 2: Index 10, 8, 3
  // Col 3: Index 4, 11, 12, 5
  // Col 4: Index 13, 6, 14, 7, 15
  // (Solids: 1..7, Stripes: 9..15, 8 is Black in middle of 3rd col)

  const layout = [
    [1],
    [9, 2],
    [10, 8, 3],
    [4, 11, 12, 5],
    [13, 6, 14, 7, 15]
  ];

  let colIdx = 0;
  for (const row of layout) {
    const startX = rackX + colIdx * colSpacing;
    const itemsCount = row.length;
    // vertical centering of each column
    const startY = rackY - ((itemsCount - 1) * rowSpacing) / 2;

    for (let i = 0; i < itemsCount; i++) {
      const ballNum = row[i];
      let type = BallType.SOLID;
      if (ballNum === 8) type = BallType.EIGHT_BALL;
      else if (ballNum > 8) type = BallType.STRIPE;

      list.push({
        id: ballNum,
        x: startX,
        y: startY + i * rowSpacing,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        type,
        color: getBallColor(ballNum),
        label: ballNum.toString(),
        state: BallState.ON_TABLE
      });
    }
    colIdx++;
  }

  return list;
}

/**
 * Checks for cushion boundary collision of a ball.
 */
export function resolveCushionCollision(ball: Ball, frictionCoeff = 0.99) {
  if (ball.state !== BallState.ON_TABLE) return;

  const minX = CUSHION_WIDTH + ball.radius;
  const maxX = TABLE_WIDTH - CUSHION_WIDTH - ball.radius;
  const minY = CUSHION_WIDTH + ball.radius;
  const maxY = TABLE_HEIGHT - CUSHION_WIDTH - ball.radius;

  let collided = false;

  // Left Cushion
  if (ball.x < minX) {
    ball.x = minX;
    ball.vx = -ball.vx * 0.85; // absorption
    collided = true;
  }
  // Right Cushion
  else if (ball.x > maxX) {
    ball.x = maxX;
    ball.vx = -ball.vx * 0.85;
    collided = true;
  }

  // Top Cushion
  if (ball.y < minY) {
    ball.y = minY;
    ball.vy = -ball.vy * 0.85;
    collided = true;
  }
  // Bottom Cushion
  else if (ball.y > maxY) {
    ball.y = maxY;
    ball.vy = -ball.vy * 0.85;
    collided = true;
  }

  if (collided) {
    const hitSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (hitSpeed > 0.3) {
      playCushionThud(hitSpeed);
    }
  }
}

/**
 * Resolves elastic collisions between ball A and ball B
 */
export function resolveBallBallCollision(a: Ball, b: Ball) {
  if (a.state !== BallState.ON_TABLE || b.state !== BallState.ON_TABLE) return;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radius + b.radius;

  if (dist >= minDist) return;

  // 1. Static resolution (push apart to avoid sticking)
  const overlap = minDist - dist;
  // Direction vector
  const nx = dx / (dist || 0.001);
  const ny = dy / (dist || 0.001);

  // Push apart equally
  a.x -= nx * (overlap / 2);
  a.y -= ny * (overlap / 2);
  b.x += nx * (overlap / 2);
  b.y += ny * (overlap / 2);

  // 2. Dynamic elastic collision resolution
  const tx = -ny;
  const ty = nx;

  // Project velocity onto tangent and normal
  const dpTanA = a.vx * tx + a.vy * ty;
  const dpTanB = b.vx * tx + b.vy * ty;

  const dpNormA = a.vx * nx + a.vy * ny;
  const dpNormB = b.vx * nx + b.vy * ny;

  // Relative speed on collision line to trigger sounds
  const relativeVelocity = Math.abs(dpNormA - dpNormB);

  // Swap normal velocities (since masses are equal, perfect elastic swap)
  const newNormA = dpNormB;
  const newNormB = dpNormA;

  // Convert projections back to vectors
  a.vx = tx * dpTanA + nx * newNormA;
  a.vy = ty * dpTanA + ny * newNormA;

  b.vx = tx * dpTanB + nx * newNormB;
  b.vy = ty * dpTanB + ny * newNormB;

  if (relativeVelocity > 0.2) {
    playBallClack(relativeVelocity);
  }
}

/**
 * Checks if a ball is pocketed. If yes, changes state and returns true.
 */
export function checkPocketed(ball: Ball): boolean {
  if (ball.state !== BallState.ON_TABLE) return false;

  for (const pocket of pockets) {
    const dx = ball.x - pocket.x;
    const dy = ball.y - pocket.y;
    const distSq = dx * dx + dy * dy;

    // Corner pockets are slightly wider because they are swallowed from angles.
    // If center of ball is within pocket radius (roughly 20px), ball is swallowed.
    if (distSq < pocket.radius * pocket.radius) {
      ball.state = BallState.POCKETED;
      ball.vx = 0;
      ball.vy = 0;
      playPocketPlop();
      return true;
    }
  }
  return false;
}

/**
 * Iterates a single step of the physics simulation.
 * Returns true if ANY ball is still moving.
 */
export function stepPhysics(
  balls: Ball[],
  friction = 0.990,
  pocketList: { ballId: number; type: BallType }[] = []
): boolean {
  let isMoving = false;

  // Update velocities, coordinates, pocket statuses
  for (const b of balls) {
    if (b.state !== BallState.ON_TABLE) continue;

    b.x += b.vx;
    b.y += b.vy;

    // apply friction
    b.vx *= friction;
    b.vy *= friction;

    // Stop extremely slow micro-movements to avoid endless creep
    if (Math.abs(b.vx) < 0.05) b.vx = 0;
    if (Math.abs(b.vy) < 0.05) b.vy = 0;

    if (b.vx !== 0 || b.vy !== 0) {
      isMoving = true;
    }

    // Check pockets
    if (checkPocketed(b)) {
      pocketList.push({ ballId: b.id, type: b.type });
    } else {
      resolveCushionCollision(b, friction);
    }
  }

  // Double loop for ball-to-ball collisions
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      resolveBallBallCollision(balls[i], balls[j]);
    }
  }

  return isMoving;
}

/**
 * High quality geometric path simulation for AI shoots.
 * AI identifies allowable targets, computes target to pocket lines,
 * finds perfect target touchpoint vectors, checks line-of-sight clearance,
 * and adds random offset deviation depending on difficulty level.
 */
export function calculateAIShot(
  balls: Ball[],
  aiGroup: "solids" | "stripes" | "undecided",
  difficulty: AICutDifficulty
): { angle: number; power: number } | null {
  const cue = balls.find((b) => b.type === BallType.CUE);
  if (!cue || cue.state !== BallState.ON_TABLE) return null;

  // Decide what balls the AI is allowed to target
  let allowedTypes: BallType[] = [];
  let allowedIds: number[] = [];

  const activeRemainingSolids = balls.filter(
    (b) => b.type === BallType.SOLID && b.state === BallState.ON_TABLE
  );
  const activeRemainingStripes = balls.filter(
    (b) => b.type === BallType.STRIPE && b.state === BallState.ON_TABLE
  );

  if (aiGroup === "solids") {
    if (activeRemainingSolids.length > 0) {
      allowedTypes = [BallType.SOLID];
    } else {
      allowedTypes = [BallType.EIGHT_BALL];
    }
  } else if (aiGroup === "stripes") {
    if (activeRemainingStripes.length > 0) {
      allowedTypes = [BallType.STRIPE];
    } else {
      allowedTypes = [BallType.EIGHT_BALL];
    }
  } else {
    // undecided can hit any solids or stripes, but not 8-ball (unless they are the only ones left, which is not undecided case)
    allowedTypes = [BallType.SOLID, BallType.STRIPE];
  }

  const targets = balls.filter(
    (b) => allowedTypes.includes(b.type) && b.state === BallState.ON_TABLE && b.id !== 0
  );

  if (targets.length === 0) {
    // fallback if everything is pocketed, look for 8-ball
    const eight = balls.find((b) => b.type === BallType.EIGHT_BALL && b.state === BallState.ON_TABLE);
    if (eight) targets.push(eight);
  }

  if (targets.length === 0) return null;

  interface ShotCandidate {
    targetId: number;
    angle: number;
    power: number;
    rating: number; // Quality points
  }

  const candidates: ShotCandidate[] = [];

  for (const t of targets) {
    for (const p of pockets) {
      // Line from pocket to target
      const pdx = t.x - p.x;
      const pdy = t.y - p.y;
      const pocketDist = Math.sqrt(pdx * pdx + pdy * pdy);

      if (pocketDist === 0) continue;

      // Normal vector pointing from pocket to target
      const pnx = pdx / pocketDist;
      const pny = pdy / pocketDist;

      // The Cue Ball should hit the Target at the exact opposite location of the pocket
      // distance from target center to Cue Ball center at collision is (radiusA + radiusB) = 2 * r
      const impactX = t.x + pnx * (BALL_RADIUS * 2);
      const impactY = t.y + pny * (BALL_RADIUS * 2);

      // Cue Ball to Impact Point vector
      const cdx = impactX - cue.x;
      const cdy = impactY - cue.y;
      const cueToImpactDist = Math.sqrt(cdx * cdx + cdy * cdy);

      if (cueToImpactDist === 0) continue;

      const angle = Math.atan2(cdy, cdx);

      // Evaluate route validation: Check if are there obstacles blocking the cue ball to the impact spot?
      let collisionObstacle = false;
      for (const obstacle of balls) {
        if (obstacle.id === 0 || obstacle.id === t.id) continue;
        if (obstacle.state !== BallState.ON_TABLE) continue;

        // Distance from obstacle to Cue-To-Impact line segment
        const dist = distToLineSegment(obstacle.x, obstacle.y, cue.x, cue.y, impactX, impactY);
        if (dist < BALL_RADIUS * 2 - 1) {
          collisionObstacle = true;
          break;
        }
      }

      // Check if target ball to pocket path is also free of blocks
      let pocketBlocked = false;
      for (const obstacle of balls) {
        if (obstacle.id === t.id || obstacle.id === 0) continue;
        if (obstacle.state !== BallState.ON_TABLE) continue;

        const dist = distToLineSegment(obstacle.x, obstacle.y, t.x, t.y, p.x, p.y);
        if (dist < BALL_RADIUS * 2 - 1) {
          pocketBlocked = true;
          break;
        }
      }

      // Calculate the severity of the CUT angle. Cut angle is angle between (C -> T) and (T -> P).
      // If cut angle is too wide (> 85 degrees), it is a very difficult or impossible direct shot.
      const cueToTargetX = t.x - cue.x;
      const cueToTargetY = t.y - cue.y;
      const cttDist = Math.sqrt(cueToTargetX * cueToTargetX + cueToTargetY * cueToTargetY);

      // dot product
      const dot = (cueToTargetX * -pnx + cueToTargetY * -pny) / (cttDist || 1);
      const cutAngleRad = Math.acos(Math.max(-1, Math.min(1, dot)));
      const cutAngleDeg = (cutAngleRad * 180) / Math.PI;

      if (cutAngleDeg > 80) {
        continue; // Too difficult/extreme cut shot
      }

      // Rating Calculation
      let rating = 1000;
      rating -= cueToImpactDist * 0.5; // closer is preferred
      rating -= pocketDist * 0.3;      // closer to pocket is easier
      rating -= cutAngleDeg * 5;       // straightest shots preferred

      if (collisionObstacle) rating -= 500; // heavy penalty for blockages
      if (pocketBlocked) rating -= 400;

      // Recommended Power
      // Base power on total distance cue-to-impact and impact-to-pocket
      const totalDist = cueToImpactDist + pocketDist;
      let power = Math.min(95, Math.max(15, totalDist * 0.12));

      // Overdrive slightly for distant hits
      if (cueToImpactDist > 400) power += 10;

      candidates.push({
        targetId: t.id,
        angle,
        power,
        rating
      });
    }
  }

  // If no candidates found, fallback: hit random target on the billiard table
  if (candidates.length === 0) {
    const fallbackTarget = targets[Math.floor(Math.random() * targets.length)];
    const angle = Math.atan2(fallbackTarget.y - cue.y, fallbackTarget.x - cue.x);
    return { angle, power: 40 };
  }

  // Sort by rating desc
  candidates.sort((a, b) => b.rating - a.rating);
  const bestShot = candidates[0];

  let rawAngle = bestShot.angle;
  // Let's inject error adjustments depending on Difficulty settings
  let errorMargin = 0;
  if (difficulty === AICutDifficulty.EASY) {
    // Easy: +/- 10 degrees random error
    errorMargin = (Math.random() * 20 - 10) * (Math.PI / 180);
  } else if (difficulty === AICutDifficulty.MEDIUM) {
    // Medium: +/- 4 degrees random error
    errorMargin = (Math.random() * 8 - 4) * (Math.PI / 180);
  } else {
    // Hard: +/- 1 degree tiny error
    errorMargin = (Math.random() * 2 - 1) * (Math.PI / 180);
  }

  return {
    angle: rawAngle + errorMargin,
    power: bestShot.power
  };
}

/**
 * Helper: shortest distance from Point (px, py) to line segment (x1, y1) to (x2, y2).
 */
function distToLineSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));

  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);

  return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
}
