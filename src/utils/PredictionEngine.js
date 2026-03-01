class PredictionEngine {
  constructor(
    visits = [],
    caseData = {},
    patient = {},
    medicalHistory = {},
    healthProfile = {}
  ) {
    this.caseData = caseData || {};
    this.patient = patient || {};
    this.medicalHistory = medicalHistory || {};
    this.healthProfile = healthProfile || {};

    this.validatedVisits = this.validateVisits(visits);
  }

  /* ================= VALIDATION ================= */
  validateVisits(visits) {
    if (!Array.isArray(visits)) return [];

    return visits
      .map((visit) => ({
        GESTATIONAL_AGE_WEEKS: Number(visit.gestational_age_weeks) || null,
        MATERNAL_WEIGHT: Number(visit.weight) || null,
        FUNDAL_HEIGHT: Number(visit.fundal_height) || null,
        HEMOGLOBIN_LEVEL: Number(visit.hemoglobin) || null,
        BLOOD_PRESSURE_SYSTOLIC: Number(visit.blood_pressure_systolic) || null,
        BLOOD_PRESSURE_DIASTOLIC: Number(visit.blood_pressure_diastolic) || null,
        FETAL_HEART_RATE: Number(visit.fetal_heart_rate) || null,
        BLOOD_SUGAR: Number(visit.blood_sugar_fasting) || null,
        URINE_PROTEIN: visit.urine_protein || null,
      }))
      .filter((v) => v.GESTATIONAL_AGE_WEEKS > 0)
      .sort((a, b) => a.GESTATIONAL_AGE_WEEKS - b.GESTATIONAL_AGE_WEEKS);
  }

  /* ================= MAIN ENTRY ================= */
  generatePrediction() {
    if (!this.validatedVisits.length) {
      return this.getFallbackPrediction();
    }

    const currentGA =
      this.caseData.current_gestation_weeks ||
      Math.max(...this.validatedVisits.map((v) => v.GESTATIONAL_AGE_WEEKS));

    const weeksToProject = Math.max(0, Math.min(40 - currentGA, 12));

    const riskScores = this.calculateRiskScores();
    const deliveryType = this.calculateDeliveryTypeProbabilities(riskScores);
    const deliveryMode = this.calculateDeliveryModeProbabilities(riskScores);
    const progression = this.generateProgression(currentGA, weeksToProject);
    const summary = this.generateSummary(riskScores, deliveryType, deliveryMode);

    return {
      summary,
      progression,

      // Required by ProbabilityBars
      probability_normal_delivery: Math.round(deliveryMode.Normal * 100),
      probability_c_section: Math.round(deliveryMode.CSection * 100),
      probability_premature_birth: Math.round(deliveryType.Premature * 100),
      probability_complications: Math.round(
        ((riskScores.hypertension +
          riskScores.anemia +
          riskScores.diabetesRisk +
          riskScores.urineProteinRisk) /
          4) *
          100
      ),

      metadata: {
        currentGestationalAge: currentGA,
        weeksProjected: weeksToProject,
        visitCount: this.validatedVisits.length,
        generatedAt: new Date().toISOString(),
        source: "enhanced-rule-engine",
      },
    };
  }

  /* ================= RISK SCORING (ENHANCED) ================= */
  calculateRiskScores() {
    const visits = this.validatedVisits;
    const latest = visits[visits.length - 1];

    // Base scores
    const scores = {
      anemia: 0.1,
      hypertension: 0.1,
      growthRestriction: 0.1,
      pretermRisk: 0.1,
      maternalAgeRisk: 0.1,
      bmiRisk: 0.1,
      diabetesRisk: 0.1,
      urineProteinRisk: 0.1,
      fetalHRRisk: 0.1,
    };

    // --- Anemia (Hb trend) ---
    const hbValues = visits.map(v => v.HEMOGLOBIN_LEVEL).filter(h => h);
    if (hbValues.length) {
      const latestHb = hbValues[hbValues.length - 1];
      const trend = hbValues.length > 1 ? hbValues[hbValues.length - 1] - hbValues[hbValues.length - 2] : 0;
      if (latestHb < 10) scores.anemia = 0.8;
      else if (latestHb < 11) scores.anemia = 0.5;
      else if (latestHb < 11.5 && trend < -0.2) scores.anemia = 0.4; // dropping
      else scores.anemia = 0.1;
    }

    // --- Hypertension (BP trend) ---
    const sysValues = visits.map(v => v.BLOOD_PRESSURE_SYSTOLIC).filter(s => s);
    const diaValues = visits.map(v => v.BLOOD_PRESSURE_DIASTOLIC).filter(d => d);
    if (sysValues.length && diaValues.length) {
      const latestSys = sysValues[sysValues.length - 1];
      const latestDia = diaValues[diaValues.length - 1];
      if (latestSys >= 140 || latestDia >= 90) scores.hypertension = 0.9;
      else if (latestSys >= 130 || latestDia >= 85) scores.hypertension = 0.6;
      else {
        // Check for upward trend
        if (sysValues.length > 1 && sysValues[sysValues.length - 1] > sysValues[sysValues.length - 2] + 5) {
          scores.hypertension += 0.2;
        }
      }
    }

    // --- Diabetes (glucose) ---
    const glucoseValues = visits.map(v => v.BLOOD_SUGAR).filter(g => g);
    if (glucoseValues.length) {
      const latestGlucose = glucoseValues[glucoseValues.length - 1];
      if (latestGlucose > 125) scores.diabetesRisk = 0.8;
      else if (latestGlucose > 100) scores.diabetesRisk = 0.4;
      else scores.diabetesRisk = 0.1;
    }

    // --- Urine protein ---
    if (latest.URINE_PROTEIN) {
      if (latest.URINE_PROTEIN.includes('+++')) scores.urineProteinRisk = 0.9;
      else if (latest.URINE_PROTEIN.includes('++')) scores.urineProteinRisk = 0.6;
      else if (latest.URINE_PROTEIN.includes('+')) scores.urineProteinRisk = 0.3;
    }

    // --- Maternal age ---
    const age = Number(this.patient.AGE) || 30;
    if (age > 40) scores.maternalAgeRisk = 0.7;
    else if (age > 35) scores.maternalAgeRisk = 0.4;
    else if (age < 18) scores.maternalAgeRisk = 0.5;

    // --- BMI ---
    const bmi = this.caseData.booking_bmi || this.healthProfile.bmi;
    if (bmi) {
      if (bmi > 35) scores.bmiRisk = 0.9;
      else if (bmi > 30) scores.bmiRisk = 0.6;
      else if (bmi > 25) scores.bmiRisk = 0.3;
    }

    // --- Fetal Heart Rate ---
    const fhrValues = visits.map(v => v.FETAL_HEART_RATE).filter(f => f);
    if (fhrValues.length) {
      const latestFHR = fhrValues[fhrValues.length - 1];
      // Normal range 120-160 bpm
      if (latestFHR < 100 || latestFHR > 180) scores.fetalHRRisk = 0.9;
      else if (latestFHR < 110 || latestFHR > 170) scores.fetalHRRisk = 0.5;
      else if (latestFHR < 120 || latestFHR > 160) scores.fetalHRRisk = 0.2;
    }

    // --- Medical history (previous C-section, hypertension, etc.) ---
    if (this.medicalHistory.hypertension) scores.hypertension += 0.2;
    if (this.medicalHistory.diabetes) scores.diabetesRisk += 0.2;
    if (this.medicalHistory.preterm_birth) scores.pretermRisk += 0.3;
    if (this.medicalHistory.previous_c_section) {
      // This will influence delivery mode later, but also add risk
      scores.pretermRisk += 0.1;
    }

    // Cap scores at 0.99
    Object.keys(scores).forEach(k => {
      scores[k] = Math.min(0.99, scores[k]);
    });

    return scores;
  }

  /* ================= DELIVERY TYPE ================= */
  calculateDeliveryTypeProbabilities(riskScores) {
    const avgRisk =
      Object.values(riskScores).reduce((a, b) => a + b, 0) /
      Object.keys(riskScores).length;

    let matured = 0.8 - avgRisk * 0.3;
    let premature = 0.15 + avgRisk * 0.2;

    matured = Math.max(0.4, matured);
    premature = Math.min(0.4, premature);

    const sum = matured + premature;
    return {
      Matured: matured / sum,
      Premature: premature / sum,
    };
  }

  /* ================= DELIVERY MODE ================= */
  calculateDeliveryModeProbabilities(riskScores) {
    let cSectionRisk = 0.2;

    if (riskScores.hypertension > 0.5) cSectionRisk += 0.2;
    if (riskScores.bmiRisk > 0.5) cSectionRisk += 0.2;
    if (riskScores.urineProteinRisk > 0.5) cSectionRisk += 0.2;
    if (riskScores.fetalHRRisk > 0.5) cSectionRisk += 0.15;
    if (this.medicalHistory.previous_c_section) cSectionRisk += 0.3;

    cSectionRisk = Math.min(0.85, cSectionRisk);

    return {
      Normal: 1 - cSectionRisk,
      CSection: cSectionRisk,
    };
  }

  /* ================= PROGRESSION (INCLUDING FHR) ================= */
  generateProgression(currentGA, weeksToProject) {
    const visits = this.validatedVisits;
    const latest = visits[visits.length - 1];

    // Base values
    const baseWeight = latest.MATERNAL_WEIGHT || 60;
    const baseHb = latest.HEMOGLOBIN_LEVEL || 11;
    const baseFundal = latest.FUNDAL_HEIGHT || currentGA;
    const baseFHR = latest.FETAL_HEART_RATE || 140;

    // Trend calculation (if multiple visits)
    let weightSlope = 0.35; // default weekly gain
    let hbSlope = -0.05;    // default slight decline
    let fundalSlope = 1.0;  // default 1 cm/week
    let fhrSlope = 0;       // FHR typically stable

    if (visits.length > 2) {
      // Simple linear regression could be used, but for simplicity use last two points
      const last = visits[visits.length - 1];
      const prev = visits[visits.length - 2];
      const weekDiff = last.GESTATIONAL_AGE_WEEKS - prev.GESTATIONAL_AGE_WEEKS;

      if (weekDiff > 0) {
        if (last.MATERNAL_WEIGHT && prev.MATERNAL_WEIGHT) {
          weightSlope = (last.MATERNAL_WEIGHT - prev.MATERNAL_WEIGHT) / weekDiff;
        }
        if (last.HEMOGLOBIN_LEVEL && prev.HEMOGLOBIN_LEVEL) {
          hbSlope = (last.HEMOGLOBIN_LEVEL - prev.HEMOGLOBIN_LEVEL) / weekDiff;
        }
        if (last.FUNDAL_HEIGHT && prev.FUNDAL_HEIGHT) {
          fundalSlope = (last.FUNDAL_HEIGHT - prev.FUNDAL_HEIGHT) / weekDiff;
        }
        if (last.FETAL_HEART_RATE && prev.FETAL_HEART_RATE) {
          fhrSlope = (last.FETAL_HEART_RATE - prev.FETAL_HEART_RATE) / weekDiff;
        }
      }
    }

    const progression = {
      weight: [],
      fundal: [],
      hemoglobin: [],
      fhr: [], // New: fetal heart rate prediction
    };

    for (let i = 0; i <= weeksToProject; i++) {
      const week = currentGA + i;
      if (week > 40) break;

      // Weight: ensure not negative
      progression.weight.push({
        week,
        value: Math.max(40, Number((baseWeight + i * weightSlope).toFixed(1))),
      });

      // Fundal height: roughly week = cm, but cap
      progression.fundal.push({
        week,
        value: Number((baseFundal + i * fundalSlope).toFixed(1)),
      });

      // Hemoglobin: floor at 8
      progression.hemoglobin.push({
        week,
        value: Math.max(8, Number((baseHb + i * hbSlope).toFixed(1))),
      });

      // Fetal heart rate: stay within 110-170, slight variation
      let fhrValue = baseFHR + i * fhrSlope;
      fhrValue = Math.min(170, Math.max(110, fhrValue));
      progression.fhr.push({
        week,
        value: Math.round(fhrValue),
      });
    }

    return progression;
  }

  /* ================= SUMMARY ================= */
  generateSummary(riskScores, deliveryType, deliveryMode) {
    const cSectionPercent = Math.round(deliveryMode.CSection * 100);
    const prematurePercent = Math.round(deliveryType.Premature * 100);
    const complicationsPercent = Math.round(
      ((riskScores.hypertension +
        riskScores.anemia +
        riskScores.diabetesRisk +
        riskScores.urineProteinRisk) /
        4) *
        100
    );

    if (cSectionPercent > 50) {
      return `Elevated C-section probability (${cSectionPercent}%). Close monitoring recommended due to ${cSectionPercent > 70 ? 'high' : 'moderate'} risk factors.`;
    }
    if (prematurePercent > 30) {
      return `Moderate premature delivery risk (${prematurePercent}%). Enhanced follow-up advised.`;
    }
    if (complicationsPercent > 30) {
      return `Overall complication risk ${complicationsPercent}%. Monitor vitals closely.`;
    }
    return `Stable pregnancy progression with good probability of normal delivery. Continue routine monitoring.`;
  }

  /* ================= FALLBACK ================= */
  getFallbackPrediction() {
    return {
      summary: "Insufficient visit data. Using baseline pregnancy model.",
      progression: {
        weight: [],
        fundal: [],
        hemoglobin: [],
        fhr: [],
      },
      probability_normal_delivery: 70,
      probability_c_section: 30,
      probability_premature_birth: 15,
      probability_complications: 10,
      isFallback: true,
    };
  }
}

export default PredictionEngine;