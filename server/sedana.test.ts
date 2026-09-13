import { describe, it, expect } from 'vitest';
import { evaluateSedanaNeeds } from '../client/src/components/sedana/sedanaBenchmarks';
import { getDefaultBasketItems } from '../client/src/components/sedana/sedanaTypes';
import { getWorkflowForRequest, getNextStage, getPrerequisites, getStageLabel, SEDANA_WORKFLOW, WORKFLOW_STEPS } from '../shared/constants';

describe('Sedana Program - Benchmarks & Office Evaluation Engine', () => {
  it('should detect excess waste when quantities exceed fair standard (e.g. 150 worshippers requesting 1000 cartons)', () => {
    const specs = {
      capacity: 150,
      area: 300,
    };
    const requestedData = {
      cleaningMaterials: {
        tissuesQty: 1000, // 1000 cartons for 150 capacity (severe waste!)
        liquidSoapQty: 40,
        foamSoapQty: 30,
        floorDisinfectantQty: 25,
        trashBagsQty: 40,
      },
      drinkingWater: {
        cartonsQty: 250,
      },
      waterTankers: {
        isConnectedToNetwork: true,
        tankersQtyPerYear: 0,
      },
      aromaticEnvironment: {
        enabled: true,
        diffusersCount: 2,
        refillsPerYear: 4,
      },
    };

    const evaluation = evaluateSedanaNeeds(specs, requestedData);

    // Tissues must be flagged as waste
    const tissueEval = evaluation.items.find(i => i.key === 'tissuesQty');
    expect(tissueEval).toBeDefined();
    expect(tissueEval?.status).toBe('waste');
    expect(tissueEval?.ratioPercent).toBeGreaterThan(500); // 1000 vs 128 is ~780%
    expect(tissueEval?.wasteQty).toBeGreaterThan(800);
    expect(tissueEval?.warningMessage).toContain('هدر');

    // Overall evaluation
    expect(evaluation.hasWasteAlert).toBe(true);
    expect(evaluation.totalWasteAlertsCount).toBeGreaterThan(0);
    expect(evaluation.overallStatus).toBe('critical_waste');
  });

  it('should validate fair and standard quantities correctly', () => {
    const specs = {
      capacity: 150,
      area: 300,
    };
    
    // Balanced request within standard norms
    const fairRequestedData = {
      cleaningMaterials: {
        tissuesQty: 125, // Within 105 - 150
        liquidSoapQty: 30,
        foamSoapQty: 25,
        floorDisinfectantQty: 24,
        trashBagsQty: 36,
      },
      drinkingWater: {
        cartonsQty: 260,
      },
      waterTankers: {
        isConnectedToNetwork: true,
        tankersQtyPerYear: 0,
      },
      aromaticEnvironment: {
        enabled: true,
        diffusersCount: 2,
        refillsPerYear: 4,
      },
    };

    const evaluation = evaluateSedanaNeeds(specs, fairRequestedData);

    expect(evaluation.hasWasteAlert).toBe(false);
    expect(evaluation.totalWasteAlertsCount).toBe(0);
    expect(evaluation.overallStatus).toBe('balanced');
    expect(evaluation.overallHealthScore).toBeGreaterThanOrEqual(85);

    const tissueEval = evaluation.items.find(i => i.key === 'tissuesQty');
    expect(tissueEval?.status).toBe('fair');
  });

  it('should calculate water tankers standard if mosque is not connected to water network', () => {
    const specs = {
      capacity: 200,
      area: 400,
      isConnectedToWaterNetwork: false,
    };
    const requestedData = {
      cleaningMaterials: {
        tissuesQty: 170,
        liquidSoapQty: 40,
        foamSoapQty: 30,
        floorDisinfectantQty: 30,
        trashBagsQty: 48,
      },
      drinkingWater: {
        cartonsQty: 360,
      },
      waterTankers: {
        isConnectedToNetwork: false,
        tankersQtyPerYear: 120, // High demand: ~10 tankers a month
      },
      aromaticEnvironment: {
        enabled: true,
        diffusersCount: 3,
        refillsPerYear: 6,
      },
    };

    const evaluation = evaluateSedanaNeeds(specs, requestedData);
    const tankerEval = evaluation.items.find(i => i.key === 'tankersQtyPerYear');
    expect(tankerEval).toBeDefined();
    expect(tankerEval?.status).toBe('moderate');
    expect(tankerEval?.standardQty).toBeLessThan(120);

    // If requesting 200 tankers (> 2.2 * maxStd), it must be flagged as waste
    const wasteRequestedData = {
      ...requestedData,
      waterTankers: {
        isConnectedToNetwork: false,
        tankersQtyPerYear: 200,
      },
    };
    const wasteEvaluation = evaluateSedanaNeeds(specs, wasteRequestedData);
    const wasteTankerEval = wasteEvaluation.items.find(i => i.key === 'tankersQtyPerYear');
    expect(wasteTankerEval?.status).toBe('waste');
  });

  it('should automatically activate water tankers when isConnectedToDesalination is false and evaluate basket items', () => {
    // Connected to desalination
    const connectedItems = getDefaultBasketItems(250, 150, true);
    expect(connectedItems.some((i: any) => i.id === 'water_tankers')).toBe(false);

    // Disconnected from desalination
    const disconnectedItems = getDefaultBasketItems(250, 150, false);
    const tanker = disconnectedItems.find((i: any) => i.id === 'water_tankers');
    expect(tanker).toBeDefined();
    expect(tanker.category).toBe('سقيا الماء');
    expect(tanker.quantity).toBe(24);
    expect(tanker.frequency).toBe('شهري');

    // Evaluation with basket items
    const evaluation = evaluateSedanaNeeds(
      { capacity: 150, area: 250, isConnectedToDesalination: false },
      { basketItems: disconnectedItems, isConnectedToDesalination: false }
    );
    expect(evaluation.items.length).toBe(disconnectedItems.length);
    const evalTanker = evaluation.items.find(i => i.key === 'water_tankers');
    expect(evalTanker).toBeDefined();
    expect(evalTanker?.status).toBe('fair');
  });
});

describe('Sedana Workflow - Simplified Direct Evaluation', () => {
  it('should exclude field_visit and technical_eval and initial_review from Sedana workflow, starting with office evaluation', () => {
    const sedanaWorkflow = getWorkflowForRequest('standard', 'sedana');
    expect(sedanaWorkflow.some((s: any) => s.id === 'field_visit')).toBe(false);
    expect(sedanaWorkflow.some((s: any) => s.id === 'technical_eval')).toBe(false);
    expect(sedanaWorkflow.some((s: any) => s.id === 'initial_review')).toBe(false);
    expect(sedanaWorkflow.map((s: any) => s.id)).toEqual([
      'submitted',
      'boq_preparation',
      'financial_eval_and_approval',
      'contracting',
      'execution',
      'handover',
      'closed',
    ]);

    // Ensure standard workflow still has field_visit, technical_eval, and initial_review
    const standardWorkflow = getWorkflowForRequest('standard');
    expect(standardWorkflow.some((s: any) => s.id === 'initial_review')).toBe(true);
    expect(standardWorkflow.some((s: any) => s.id === 'field_visit')).toBe(true);
    expect(standardWorkflow.some((s: any) => s.id === 'technical_eval')).toBe(true);
  });

  it('should transition directly from submitted (دراسة وتدقيق الاحتياج) to boq_preparation for Sedana', () => {
    const nextStage = getNextStage('submitted', 'standard', 'sedana');
    expect(nextStage).toBe('boq_preparation');

    // For standard requests, submitted still transitions to initial_review
    const standardNextStage = getNextStage('submitted', 'standard');
    expect(standardNextStage).toBe('initial_review');
  });

  it('should require no prerequisites when transitioning from submitted to boq_preparation in Sedana', () => {
    const prereqs = getPrerequisites('submitted', 'boq_preparation', 'standard', undefined, 'sedana');
    expect(prereqs).toEqual([]);
  });

  it('should provide custom Arabic labels for Sedana stages', () => {
    expect(getStageLabel('submitted', undefined, 'sedana')).toBe('دراسة وتدقيق الاحتياج');
    expect(getStageLabel('execution', undefined, 'sedana')).toBe('التشغيل والتنفيذ');
    // Standard requests should still have normal labels
    expect(getStageLabel('submitted')).toBe('تقديم الطلب');
    expect(getStageLabel('initial_review')).toBe('المراجعة الأولية');
    expect(getStageLabel('execution')).toBe('التنفيذ');
  });
});

