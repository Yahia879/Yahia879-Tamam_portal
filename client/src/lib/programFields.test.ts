import { describe, it, expect } from 'vitest';
import {
  PROGRAM_CONFIGS,
  SHARED_FIELDS,
  PROGRAM_SPECIFIC_FIELDS,
  getProgramFields,
  isProgramField,
  isSharedField,
  getFieldsByProgram,
  validateProgramData,
} from './programFields';

describe('programFields - البرامج والحقول', () => {
  describe('PROGRAM_CONFIGS - إعدادات البرامج', () => {
    it('يجب أن يحتوي على 9 برامج', () => {
      expect(Object.keys(PROGRAM_CONFIGS)).toHaveLength(9);
    });

    it('يجب أن تحتوي كل برنامج على الخصائص المطلوبة', () => {
      Object.values(PROGRAM_CONFIGS).forEach((program) => {
        expect(program).toHaveProperty('name');
        expect(program).toHaveProperty('description');
        expect(program).toHaveProperty('color');
        expect(program).toHaveProperty('icon');
        expect(program).toHaveProperty('requiresMosque');
      });
    });

    it('يجب أن تكون جميع الألوان صحيحة', () => {
      Object.values(PROGRAM_CONFIGS).forEach((program) => {
        expect(program.color).toMatch(/^bg-/);
      });
    });
  });

  describe('SHARED_FIELDS - الحقول المشتركة', () => {
    it('يجب أن يحتوي على 6 حقول مشتركة', () => {
      expect(SHARED_FIELDS).toHaveLength(6);
    });

    it('يجب أن تحتوي كل حقل على الخصائص المطلوبة', () => {
      SHARED_FIELDS.forEach((field) => {
        expect(field).toHaveProperty('name');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('type');
        expect(field).toHaveProperty('required');
      });
    });

    it('يجب أن تكون الحقول المطلوبة موجودة', () => {
      const fieldNames = SHARED_FIELDS.map((f) => f.name);
      expect(fieldNames).toContain('title');
      expect(fieldNames).toContain('description');
      expect(fieldNames).toContain('budget');
    });
  });

  describe('PROGRAM_SPECIFIC_FIELDS - الحقول المتخصصة', () => {
    it('يجب أن يحتوي برنامج بنيان على 10 حقول متخصصة', () => {
      expect(PROGRAM_SPECIFIC_FIELDS.bunyan).toHaveLength(10);
    });

    it('يجب أن يحتوي برنامج سقيا على 3 حقول متخصصة', () => {
      expect(PROGRAM_SPECIFIC_FIELDS.suqya).toHaveLength(3);
    });

    it('يجب أن تكون البرامج الأخرى بدون حقول متخصصة', () => {
      const programs = ['daaem', 'enaya', 'emdad', 'ethraa', 'sedana', 'taqa', 'miyah'];
      programs.forEach((program) => {
        expect(PROGRAM_SPECIFIC_FIELDS[program as any] || []).toHaveLength(0);
      });
    });

    it('يجب أن تحتوي حقول برنامج بنيان على الحقول المطلوبة', () => {
      const fieldNames = PROGRAM_SPECIFIC_FIELDS.bunyan.map((f) => f.name);
      expect(fieldNames).toContain('districtName');
      expect(fieldNames).toContain('landOwnership');
      expect(fieldNames).toContain('landArea');
    });
  });

  describe('getProgramFields - الحصول على حقول البرنامج', () => {
    it('يجب أن تُرجع الحقول المشتركة والمتخصصة لبرنامج بنيان', () => {
      const fields = getProgramFields('bunyan');
      expect(fields.length).toBeGreaterThan(SHARED_FIELDS.length);
      expect(fields.some((f) => f.name === 'title')).toBe(true);
      expect(fields.some((f) => f.name === 'districtName')).toBe(true);
    });

    it('يجب أن تُرجع الحقول المشتركة فقط للبرامج بدون حقول متخصصة', () => {
      const fields = getProgramFields('daaem');
      expect(fields).toEqual(SHARED_FIELDS);
    });

    it('يجب أن تُرجع مصفوفة فارغة للبرنامج غير الموجود', () => {
      const fields = getProgramFields('invalid' as any);
      expect(fields).toEqual([]);
    });
  });

  describe('isProgramField و isSharedField - التحقق من نوع الحقل', () => {
    it('يجب أن تعيد isProgramField true للحقول المتخصصة', () => {
      expect(isProgramField('districtName', 'bunyan')).toBe(true);
      expect(isProgramField('waterContainers', 'suqya')).toBe(true);
    });

    it('يجب أن تعيد isProgramField false للحقول المشتركة', () => {
      expect(isProgramField('title', 'bunyan')).toBe(false);
    });

    it('يجب أن تعيد isSharedField true للحقول المشتركة', () => {
      expect(isSharedField('title')).toBe(true);
      expect(isSharedField('description')).toBe(true);
    });

    it('يجب أن تعيد isSharedField false للحقول المتخصصة', () => {
      expect(isSharedField('districtName')).toBe(false);
    });
  });

  describe('getFieldsByProgram - الحصول على حقول البرنامج مع التصنيف', () => {
    it('يجب أن تُرجع كائن يحتوي على shared و specific', () => {
      const result = getFieldsByProgram('bunyan');
      expect(result).toHaveProperty('shared');
      expect(result).toHaveProperty('specific');
      expect(Array.isArray(result.shared)).toBe(true);
      expect(Array.isArray(result.specific)).toBe(true);
    });

    it('يجب أن تحتوي shared على 6 حقول لبرنامج بنيان', () => {
      const result = getFieldsByProgram('bunyan');
      expect(result.shared).toHaveLength(6);
    });

    it('يجب أن تحتوي specific على 10 حقول لبرنامج بنيان', () => {
      const result = getFieldsByProgram('bunyan');
      expect(result.specific).toHaveLength(10);
    });

    it('يجب أن تحتوي specific على 0 حقول لبرنامج daaem', () => {
      const result = getFieldsByProgram('daaem');
      expect(result.specific).toHaveLength(0);
    });
  });

  describe('validateProgramData - التحقق من صحة بيانات البرنامج', () => {
    it('يجب أن تُرجع true للبيانات الصحيحة', () => {
      const validData = {
        title: 'طلب خدمة',
        description: 'وصف الطلب',
        budget: 5000,
        location: 'الرياض',
        contactName: 'أحمد',
        contactPhone: '0501234567',
      };
      expect(validateProgramData(validData, 'daaem')).toBe(true);
    });

    it('يجب أن تُرجع false عند فقدان حقل مطلوب', () => {
      const invalidData = {
        description: 'وصف الطلب',
        budget: 5000,
      };
      expect(validateProgramData(invalidData, 'daaem')).toBe(false);
    });

    it('يجب أن تتحقق من الحقول المتخصصة لبرنامج بنيان', () => {
      const validData = {
        title: 'طلب خدمة',
        description: 'وصف الطلب',
        budget: 5000,
        location: 'الرياض',
        contactName: 'أحمد',
        contactPhone: '0501234567',
        districtName: 'الحي الشرقي',
        landOwnership: 'ملك',
        landArea: 1000,
      };
      expect(validateProgramData(validData, 'bunyan')).toBe(true);
    });

    it('يجب أن تُرجع false عند فقدان حقل متخصص مطلوب', () => {
      const invalidData = {
        title: 'طلب خدمة',
        description: 'وصف الطلب',
        budget: 5000,
        location: 'الرياض',
        contactName: 'أحمد',
        contactPhone: '0501234567',
        districtName: 'الحي الشرقي',
        // landOwnership مفقود
      };
      expect(validateProgramData(invalidData, 'bunyan')).toBe(false);
    });
  });

  describe('الحقول الشرطية - Conditional Fields', () => {
    it('يجب أن تحتوي حقول برنامج بنيان على حقول شرطية', () => {
      const fields = getProgramFields('bunyan');
      const conditionalFields = fields.filter((f) => f.conditional);
      expect(conditionalFields.length).toBeGreaterThan(0);
    });

    it('يجب أن تحتوي حقول برنامج سقيا على حقول شرطية', () => {
      const fields = getProgramFields('suqya');
      const conditionalFields = fields.filter((f) => f.conditional);
      expect(conditionalFields.length).toBeGreaterThan(0);
    });
  });

  describe('البرامج المختلفة - Different Programs', () => {
    const programs = ['bunyan', 'daaem', 'enaya', 'emdad', 'ethraa', 'sedana', 'taqa', 'miyah', 'suqya'];

    programs.forEach((program) => {
      it(`يجب أن يحتوي برنامج ${program} على إعدادات صحيحة`, () => {
        const config = PROGRAM_CONFIGS[program as any];
        expect(config).toBeDefined();
        expect(config.name).toBeTruthy();
        expect(config.description).toBeTruthy();
      });

      it(`يجب أن يحتوي برنامج ${program} على حقول صحيحة`, () => {
        const fields = getProgramFields(program as any);
        expect(Array.isArray(fields)).toBe(true);
        expect(fields.length).toBeGreaterThan(0);
      });
    });
  });
});
