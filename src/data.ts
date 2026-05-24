/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TablePreset, CuePreset } from "./types";

export const TABLE_THEMES: TablePreset[] = [
  {
    id: "billiard_green",
    name: "الأخضر الكلاسيكي",
    feltColor: "#135d33", // pool emerald
    borderColor: "#4d2c18", // mahogany frame
    pocketColor: "#111111",
    accents: "gold"
  },
  {
    id: "royal_blue",
    name: "الأزرق الملكي",
    feltColor: "#0b418a", // modern tournament blue
    borderColor: "#1e1e24", // dark graphite frame
    pocketColor: "#0d0d0d",
    accents: "silver"
  },
  {
    id: "classy_burgundy",
    name: "الأرجواني الفاخر",
    feltColor: "#6b0c22", // burgundy felt
    borderColor: "#3a1d1d", // dark cherry frame
    pocketColor: "#0b0505",
    accents: "gold"
  },
  {
    id: "midnight_slate",
    name: "رمادي منتصف الليل",
    feltColor: "#323c4a", // sleek black slate
    borderColor: "#0f0f11", // jet black steel frame
    pocketColor: "#000000",
    accents: "silver"
  }
];

export const CUE_SKINS: CuePreset[] = [
  {
    id: "classic_wood",
    name: "العصا الخشبية الكلاسيكية",
    colorPattern: "linear-gradient(90deg, #623616 0%, #a46d3e 70%, #d3a26a 100%)",
    clackPitchModifier: 1.0,
    powerModifier: 1.0
  },
  {
    id: "golden_elite",
    name: "العصا الذهبية الأنيقة",
    colorPattern: "linear-gradient(90deg, #b8860b 0%, #ffd700 50%, #fffacd 100%)",
    clackPitchModifier: 1.2,
    powerModifier: 1.05
  },
  {
    id: "carbon_fiber",
    name: "ألياف الكربون الرياضية",
    colorPattern: "linear-gradient(90deg, #121212 0%, #2a2a2a 50%, #545454 100%)",
    clackPitchModifier: 0.9,
    powerModifier: 1.1
  },
  {
    id: "neon_pulse",
    name: "عصا النيون الليزرية",
    colorPattern: "linear-gradient(90deg, #ff007f 0%, #9000ff 50%, #00f0ff 100%)",
    clackPitchModifier: 1.4,
    powerModifier: 1.15
  }
];
