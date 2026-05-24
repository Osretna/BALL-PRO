/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameMode {
  SOLO_PRACTICE = "solo_practice",
  VS_AI = "vs_ai",
  PASS_LOGIC = "pass_and_play",
  ONLINE_MULTIPLAYER = "online_multiplayer"
}

export enum GameStatus {
  LOBBY = "lobby",
  ARRANGING = "arranging",
  PLAYING = "playing",
  SOLUTIONS_REPLY = "solutions_reply",
  GAME_OVER = "game_over"
}

export enum BallType {
  CUE = "cue",
  SOLID = "solid",
  STRIPE = "stripe",
  EIGHT_BALL = "eight_ball"
}

export enum BallState {
  ON_TABLE = "on_table",
  POCKETED = "pocketed"
}

export enum AICutDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard"
}

export interface PlayerStats {
  userId: string;
  displayName: string;
  photoURL: string;
  xp: number;
  level: number;
  coins: number;
  playedGames: number;
  wonGames: number;
  equippedCue: string;
  equippedTheme: string;
  unlockedCues: string[];
  unlockedThemes: string[];
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: BallType;
  color: string;
  label: string;
  state: BallState;
}

export interface CueStick {
  angle: number; // in radians
  power: number; // 0 to 100
  isActive: boolean;
  isAiming: boolean;
}

export interface TablePreset {
  id: string;
  name: string;
  feltColor: string;
  borderColor: string;
  pocketColor: string;
  accents: string; // "gold" | "silver"
}

export interface CuePreset {
  id: string;
  name: string;
  colorPattern: string; // Tailwind representation
  clackPitchModifier: number; // Visual sound differentiator
  powerModifier: number; // Subtle physics styling
}

export interface PhysicsWorldConfig {
  width: number;
  height: number;
  friction: number;
  elasticity: number;
  cushionWidth: number;
}
