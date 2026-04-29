import { FormField, validateField, getAllFieldsForProgram } from './programFields';

/**
 * التحقق من جميع الحقول المطلوبة لبرنامج معين
 */
export function validateAllFields(
  programId: string,
  formData: Record<string, any>,
): Record<string, string> {
  const allFields = getAllFieldsForProgram(programId);
  const errors: Record<string, string> = {};

  for (const field of allFields) {
    const error = validateField(field, formData[field.name]);
    if (error) {
      errors[field.name] = error;
    }
  }

  return errors;
}

/**
 * التحقق من وجود أخطاء
 */
export function hasErrors(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * الحصول على أول خطأ
 */
export function getFirstError(errors: Record<string, string>): string | null {
  const errorMessages = Object.values(errors);
  return errorMessages.length > 0 ? errorMessages[0] : null;
}

/**
 * مسح الأخطاء لحقل معين
 */
export function clearFieldError(
  errors: Record<string, string>,
  fieldName: string,
): Record<string, string> {
  const newErrors = { ...errors };
  delete newErrors[fieldName];
  return newErrors;
}

/**
 * مسح جميع الأخطاء
 */
export function clearAllErrors(): Record<string, string> {
  return {};
}

/**
 * التحقق من أن جميع الحقول المطلوبة مملوءة
 */
export function areAllRequiredFieldsFilled(
  programId: string,
  formData: Record<string, any>,
): boolean {
  const errors = validateAllFields(programId, formData);
  return !hasErrors(errors);
}
