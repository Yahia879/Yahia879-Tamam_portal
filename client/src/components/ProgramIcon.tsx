import { 
  Building2, 
  Hammer, 
  Wrench, 
  Package, 
  Receipt, 
  Sparkles, 
  Sun, 
  Droplets, 
  GlassWater,
  FileText,
  LucideIcon
} from "lucide-react";

// خريطة أيقونات البرامج
const programIconMap: Record<string, LucideIcon> = {
  bunyan: Building2,
  daaem: Hammer,
  enaya: Wrench,
  emdad: Package,
  ethraa: Receipt,
  sedana: Sparkles,
  taqa: Sun,
  miyah: Droplets,
  suqya: GlassWater,
};

// ألوان البرامج
const programColors: Record<string, string> = {
  bunyan: '#1E40AF',
  daaem: '#7C3AED',
  enaya: '#059669',
  emdad: '#D97706',
  ethraa: '#DC2626',
  sedana: '#0891B2',
  taqa: '#F59E0B',
  miyah: '#0284C7',
  suqya: '#06B6D4',
};

interface ProgramIconProps {
  program: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBackground?: boolean;
  className?: string;
}

export function ProgramIcon({ 
  program, 
  size = 'md', 
  showBackground = false,
  className = '' 
}: ProgramIconProps) {
  const Icon = programIconMap[program] || FileText;
  const color = programColors[program] || '#6B7280';
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const bgSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  };

  if (showBackground) {
    return (
      <div 
        className={`${bgSizeClasses[size]} rounded-lg flex items-center justify-center ${className}`}
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className={sizeClasses[size]} style={{ color }} />
      </div>
    );
  }

  return <Icon className={`${sizeClasses[size]} ${className}`} style={{ color }} />;
}

// تصدير الخريطة والألوان للاستخدام المباشر
export { programIconMap, programColors };
