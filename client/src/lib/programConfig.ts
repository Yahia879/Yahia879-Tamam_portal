import { PROGRAM_CONFIGS } from './programFields';

/**
 * الحصول على إعدادات برنامج معين
 */
export function getProgramConfig(programId: string) {
  return PROGRAM_CONFIGS[programId] || null;
}

/**
 * الحصول على قائمة جميع البرامج
 */
export function getAllPrograms() {
  return Object.values(PROGRAM_CONFIGS);
}

/**
 * التحقق من أن البرنامج يتطلب اختيار مسجد
 */
export function programRequiresMosque(programId: string): boolean {
  const config = getProgramConfig(programId);
  return config?.requiresMosque || false;
}

/**
 * الحصول على عدد الحقول المتخصصة لبرنامج معين
 */
export function getSpecificFieldsCount(programId: string): number {
  const config = getProgramConfig(programId);
  return config?.specificFields.length || 0;
}

/**
 * الحصول على عدد الحقول المشتركة لبرنامج معين
 */
export function getSharedFieldsCount(programId: string): number {
  const config = getProgramConfig(programId);
  return config?.sharedFields.length || 0;
}

/**
 * الحصول على إجمالي عدد الحقول لبرنامج معين
 */
export function getTotalFieldsCount(programId: string): number {
  return getSharedFieldsCount(programId) + getSpecificFieldsCount(programId);
}

/**
 * الحصول على لون البرنامج
 */
export function getProgramColor(programId: string): string {
  const config = getProgramConfig(programId);
  return config?.color || 'bg-gray-500';
}

/**
 * الحصول على أيقونة البرنامج
 */
export function getProgramIcon(programId: string) {
  const config = getProgramConfig(programId);
  return config?.icon || null;
}

/**
 * الحصول على اسم البرنامج
 */
export function getProgramName(programId: string): string {
  const config = getProgramConfig(programId);
  return config?.name || '';
}

/**
 * الحصول على وصف البرنامج
 */
export function getProgramDescription(programId: string): string {
  const config = getProgramConfig(programId);
  return config?.description || '';
}
