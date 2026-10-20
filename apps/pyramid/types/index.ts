export type Locale = "zh-HK" | "en";

export type ThemeMode = "light" | "dark";

export type InputMode = "quick" | "pro";

export type RiskProfile = "conservative" | "stable" | "balanced" | "growth";

export type LayerId = "protection" | "stable" | "growth" | "speculative";

export type GapStatus = "enough" | "partial" | "severe";

export type GapDirection = "shortfall" | "excess" | "balanced";

export type ReasonCode =
  | "emergency_short"
  | "emergency_unknown"
  | "life_short"
  | "life_dependants_no_income"
  | "medical_missing"
  | "medical_low"
  | "ci_short"
  | "accident_missing"
  | "allocation_short"
  | "allocation_excess"
  | "negative_clamped"
  | "age_clamped"
  | "no_assets";

export interface PyramidAnswers {
  age: number;
  occupation: string;
  dependants: number;
  monthlyIncome: number;
  monthlyExpense: number;
  emergencyCash: number;
  lifeCover: number;
  criticalIllnessCover: number;
  medicalAnnualLimit: number;
  hasMedical: boolean | null;
  accidentCover: number;
  stableSavings: number;
  growthInvestments: number;
  speculative: number;
  liabilities: number;
  riskAnswers: number[];
  mode: InputMode;
}

export interface LayerAssessment {
  id: LayerId;
  status: GapStatus;
  direction: GapDirection;
  actualAmount: number;
  idealAmount: number;
  actualShare: number;
  idealShare: number;
  reasons: ReasonCode[];
}

export interface RadarScores {
  protection: number;
  savings: number;
  investment: number;
  riskControl: number;
  liquidity: number;
}

export interface Priority {
  id: string;
  layer: LayerId;
  status: GapStatus;
  reason: ReasonCode;
  rankScore: number;
}

export interface PyramidReport {
  riskProfile: RiskProfile;
  riskScore: number;
  riskAnswered: number;
  healthScore: number;
  layers: LayerAssessment[];
  radar: RadarScores;
  priorities: Priority[];
  warnings: ReasonCode[];
  emergencyMonths: number | null;
  emergencyTargetMonths: number;
  lifeTarget: number;
  lifeMultiplier: number;
  ciTarget: number;
  annualIncome: number;
  totalAssets: number;
  idealWeights: Record<LayerId, number>;
}

export interface PyramidDraft {
  consent: boolean;
  mode: InputMode;
  step: number;
  locale: Locale;
  theme: ThemeMode;
  sample: boolean;
  shareConsent: boolean;
  age: number | null;
  occupation: string;
  dependants: number | null;
  monthlyIncome: number | null;
  monthlyExpense: number | null;
  emergencyCash: number | null;
  lifeCover: number | null;
  criticalIllnessCover: number | null;
  medicalAnnualLimit: number | null;
  hasMedical: boolean | null;
  accidentCover: number | null;
  stableSavings: number | null;
  growthInvestments: number | null;
  speculative: number | null;
  liabilities: number | null;
  riskAnswers: number[];
}
