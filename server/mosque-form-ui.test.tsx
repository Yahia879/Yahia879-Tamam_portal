import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "مدير النظام", role: "super_admin", status: "active" },
    logout: vi.fn(),
  }),
}));

vi.mock("wouter", () => ({
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
  useLocation: () => ["/mosques/new", vi.fn()],
  useParams: () => ({}),
  useSearch: () => "",
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: any) => <div data-layout="dashboard">{children}</div>,
}));

vi.mock("@/components/BeneficiaryLayout", () => ({
  default: ({ children, title, subtitle }: any) => (
    <div data-layout="beneficiary">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

vi.mock("@/components/LocationPicker", () => ({
  LocationPicker: () => <div data-testid="location-picker" />,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    categories: {
      getAllCategories: { useQuery: () => ({ data: [{ type: "city", nameAr: "أبها" }] }) },
    },
    mosques: {
      getById: { useQuery: () => ({ data: null, isLoading: false }) },
      getMyMosques: { useQuery: () => ({ data: [], isLoading: false }) },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      update: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

import {
  INITIAL_MOSQUE_FORM_STATE,
  MosqueFormFields,
  applyMosqueFormChange,
} from "../client/src/components/MosqueFormFields";
import MosqueForm from "../client/src/pages/MosqueForm";
import RequesterMosqueForm from "../client/src/pages/RequesterMosqueForm";

describe("MosqueForm & RequesterMosqueForm UI and auto-area behavior", () => {
  it("derives areas from length × width and ignores direct area edits", () => {
    let state = applyMosqueFormChange(INITIAL_MOSQUE_FORM_STATE, "menLengthM", "20");
    expect(state.area).toBe("");

    state = applyMosqueFormChange(state, "menWidthM", "15");
    expect(state.area).toBe("300");

    // Direct manual edits to area must be ignored
    const attemptedManualArea = applyMosqueFormChange(state, "area", "999");
    expect(attemptedManualArea.area).toBe("300");

    // Clearing width clears calculated area
    state = applyMosqueFormChange(state, "menWidthM", "");
    expect(state.area).toBe("");

    // Women prayer hall area behaves identically
    state = applyMosqueFormChange(state, "womenLengthM", "12.5");
    state = applyMosqueFormChange(state, "womenWidthM", "8");
    expect(state.womenPrayerArea).toBe("100");
    expect(applyMosqueFormChange(state, "womenPrayerArea", "500").womenPrayerArea).toBe("100");

    state = applyMosqueFormChange(state, "womenLengthM", "0");
    expect(state.womenPrayerArea).toBe("");
  });

  it("renders read-only auto-calculated area inputs for men and women prayer halls", () => {
    const html = renderToStaticMarkup(
      <MosqueFormFields
        formData={{
          ...INITIAL_MOSQUE_FORM_STATE,
          menLengthM: "20",
          menWidthM: "15",
          area: "300",
          hasPrayerHall: true,
          womenLengthM: "10",
          womenWidthM: "8",
          womenPrayerArea: "80",
        }}
        availableCities={["أبها"]}
        locationValue={{ lat: 18.2164, lng: 42.5053 }}
        onFieldChange={vi.fn()}
        onCityChange={vi.fn()}
        onLocationChange={vi.fn()}
        onTogglePrayerHall={vi.fn()}
        onSubmit={vi.fn()}
        cancelHref="/mosques"
        submitLabel="حفظ المسجد"
        submittingLabel="جاري الحفظ..."
        isSubmitting={false}
      />
    );

    expect(html).toContain('id="area"');
    expect(html).toContain('id="womenPrayerArea"');
    expect(html).toMatch(/id="area"[^>]*readonly=""/i);
    expect(html).toMatch(/id="womenPrayerArea"[^>]*readonly=""/i);
    expect(html).toContain("تُحسب تلقائياً من الطول × العرض");
  });

  it("renders MosqueForm (/mosques/new) with the exact 3-step card UI of RequesterMosqueForm (/requester/mosques/new)", () => {
    const adminHtml = renderToStaticMarkup(<MosqueForm />);
    const requesterHtml = renderToStaticMarkup(<RequesterMosqueForm />);

    const sharedMarkers = [
      "تسجيل مسجد جديد",
      "1. البيانات الأساسية للمسجد",
      "2. الموقع الجغرافي والعنوان",
      "3. مصلى النساء والتفاصيل الإضافية",
      "هل يتضمن المشروع مصلى للنساء؟",
      'id="menLengthM"',
      'id="menWidthM"',
      'id="area"',
      "تُحسب تلقائياً من الطول × العرض",
    ];

    for (const marker of sharedMarkers) {
      expect(adminHtml).toContain(marker);
      expect(requesterHtml).toContain(marker);
    }
  });
});
