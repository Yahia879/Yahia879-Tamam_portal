import React, { useState } from 'react';
import { SedanaSuppliersMatrix } from './SedanaSuppliersMatrix';
import { SedanaFundingAndOpportunity } from './SedanaFundingAndOpportunity';
import { FileText, Coins, Layers, ArrowLeftRight } from 'lucide-react';

interface SedanaPricingAndFundingProps {
  request: {
    id: number;
    requestNumber: string;
    programType: string;
    programData?: any;
    currentStage: string;
  };
  onComplete?: () => void;
  canEdit?: boolean;
}

export const SedanaPricingAndFunding: React.FC<SedanaPricingAndFundingProps> = ({
  request,
  onComplete,
  canEdit = true,
}) => {
  let programData: Record<string, any> = {};
  try {
    if (typeof request.programData === 'string') {
      programData = JSON.parse(request.programData);
    } else {
      programData = request.programData || {};
    }
  } catch (e) {
    programData = {};
  }

  const hasMatrix = Boolean(programData.sedanaSuppliersMatrix?.totalActualCost > 0);
  const [activeTab, setActiveTab] = useState<'matrix' | 'funding'>(hasMatrix ? 'funding' : 'matrix');

  return (
    <div className="space-y-4" dir="rtl">
      {/* شريط التبديل بين المحطتين (المحطة 3 والمحطة 4) */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/70">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'matrix'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>المحطة 3: تجزئة الشراء وتعدد الموردين</span>
            {hasMatrix && (
              <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('funding')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'funding'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>المحطة 4: الهندسة المالية وطرح التمويل (25/30)</span>
          </button>
        </div>

        <span className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1 font-medium">
          <Layers className="w-3.5 h-3.5" />
          رحلة التسعير والتمويل لبرنامج سدانة
        </span>
      </div>

      {/* محتوى المحطة الأولى أوالثانية */}
      {activeTab === 'matrix' ? (
        <SedanaSuppliersMatrix
          request={request}
          canEdit={canEdit}
          onComplete={() => {
            setActiveTab('funding');
          }}
        />
      ) : (
        <SedanaFundingAndOpportunity
          request={request}
          canEdit={canEdit}
          onComplete={onComplete}
        />
      )}
    </div>
  );
};
