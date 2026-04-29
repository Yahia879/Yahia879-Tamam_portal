import React from 'react';
import { FormField, shouldShowField } from '@/lib/programFields';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';

interface ConditionalFieldProps {
  field: FormField;
  formData: Record<string, any>;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  mosqueOptions?: Array<{ id: number; name: string; city?: string }>;
  onAddMosque?: () => void;
}

export const ConditionalField: React.FC<ConditionalFieldProps> = ({
  field,
  formData,
  value,
  onChange,
  error,
  disabled,
  mosqueOptions,
  onAddMosque,
}) => {
  // التحقق من الشروط
  if (!shouldShowField(field, formData)) {
    return null;
  }

  return (
    <DynamicFieldRenderer
      field={field}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
      options={mosqueOptions}
      onAddMosque={onAddMosque}
    />
  );
};
