import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  permissions: [] as string[], data: {} as Record<string, any>, location: "/mosques",
  queries: [] as { path: string; enabled: boolean; options: any }[],
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: "super_admin", permissions: ["*"] } }) }));
vi.mock("wouter", () => ({
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
  useLocation: () => [state.location, vi.fn()],
  useParams: () => ({ id: "17" }),
}));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/EnhancedPagination", () => ({ default: () => null, usePersistedPage: () => [1, vi.fn(), vi.fn()] }));
// Render open menu/tab contents so every responsive action can be inspected without a browser.
vi.mock("@/components/ui/dropdown-menu", () => {
  const Wrapper = ({ children }: any) => <div>{children}</div>;
  return { DropdownMenu: Wrapper, DropdownMenuContent: Wrapper, DropdownMenuItem: Wrapper, DropdownMenuTrigger: Wrapper, DropdownMenuSeparator: () => null };
});
vi.mock("@/components/ui/tabs", () => {
  const Wrapper = ({ children }: any) => <div>{children}</div>;
  return { Tabs: Wrapper, TabsContent: Wrapper, TabsList: Wrapper, TabsTrigger: Wrapper };
});
vi.mock("leaflet", () => {
  class DefaultIcon { static mergeOptions() {} }
  return { default: { Icon: { Default: DefaultIcon }, divIcon: (options: any) => options } };
});
vi.mock("react-leaflet", () => {
  const Wrapper = ({ children }: any) => <div>{children}</div>;
  return {
    MapContainer: Wrapper, TileLayer: () => null, LayerGroup: Wrapper, Popup: Wrapper,
    Marker: ({ position, icon, children }: any) => (
      <div data-map-marker="" data-latitude={position[0]} data-longitude={position[1]}>
        <span dangerouslySetInnerHTML={{ __html: icon.html }} />{children}
      </div>
    ),
    useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn() }),
  };
});
vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, {
      get: (_target, name: string) => {
        if (name === "useQuery") return (_input: any, options: any = {}) => {
          const key = path.join(".");
          const enabled = options.enabled !== false;
          state.queries.push({ path: key, enabled, options });
          return { data: enabled ? key === "permissions.getUserPermissions" ? state.permissions : state.data[key] : undefined, isLoading: false };
        };
        if (name === "useMutation") return () => ({ mutate: vi.fn(), isPending: false });
        if (name === "useUtils") return () => proxy();
        return proxy([...path, name]);
      },
    });
  }
  return { trpc: proxy() };
});

import Mosques from "../client/src/pages/Mosques";
import MosqueDetails from "../client/src/pages/MosqueDetails";
import MosquesMap from "../client/src/pages/MosquesMap";
import PermissionRouteGuard from "../client/src/components/PermissionRouteGuard";
import EditImam from "../client/src/pages/EditImam";

beforeEach(() => {
  vi.stubGlobal("React", React);
  state.permissions = ["mosques.view"];
  state.location = "/mosques";
  state.queries = [];
  const mosque = { id: 17, name: "مسجد الاختبار", city: "أبها", approvalStatus: "pending", capacity: 100, images: [] };
  state.data = {
    "mosques.search": { mosques: [mosque], total: 1 },
    "mosques.getById": mosque,
    "mosques.getCities": ["أبها"],
  };
});

describe("mosque page controls for the general administrator", () => {
  it("shows the list without actions or any add button for view-only access", () => {
    const html = renderToStaticMarkup(<Mosques />);
    expect(html).toContain("مسجد الاختبار");
    for (const label of ["الإجراءات", "إضافة مسجد", "عرض التفاصيل", "تعديل", "حذف", "اعتماد</button>", "رفض</button>"]) expect(html).not.toContain(label);
  });

  it("hides both add buttons when the list is empty until creation is granted", () => {
    state.data["mosques.search"] = { mosques: [], total: 0 };
    expect(renderToStaticMarkup(<Mosques />)).not.toContain("إضافة مسجد");
    state.permissions.push("mosques.create");
    const html = renderToStaticMarkup(<Mosques />);
    expect(html).toContain("إضافة مسجد جديد");
    expect(html.match(/href="\/mosques\/new"/g)).toHaveLength(2);
  });

  it.each([
    ["view_details", "عرض التفاصيل"], ["edit", "تعديل"], ["delete", "حذف"],
    ["approve", "اعتماد</button>"], ["reject", "رفض</button>"],
  ])("shows only the %s action and removes it when revoked", (action, label) => {
    state.permissions.push(`mosques.${action}`);
    let html = renderToStaticMarkup(<Mosques />);
    expect(html).toContain("الإجراءات");
    expect(html.split(label)).toHaveLength(3); // Desktop and mobile.
    expect(html).not.toContain("إضافة مسجد");
    for (const [other, text] of [["view_details", "عرض التفاصيل"], ["edit", "تعديل"], ["delete", "حذف"], ["approve", "اعتماد</button>"], ["reject", "رفض</button>"]]) {
      if (other !== action) expect(html).not.toContain(text);
    }
    state.permissions = ["mosques.view"];
    html = renderToStaticMarkup(<Mosques />);
    expect(html).not.toContain("الإجراءات");
    expect(html).not.toContain(label);
  });

  it("does not treat creation as permission for the actions column", () => {
    state.permissions.push("mosques.create");
    const html = renderToStaticMarkup(<Mosques />);
    expect(html).toContain("إضافة مسجد");
    expect(html).not.toContain("الإجراءات");
  });

  it.each(["pending", "approved", "rejected"])("shows approval and rejection controls for %s mosques according to permissions", status => {
    state.data["mosques.search"].mosques[0].approvalStatus = status;
    state.permissions.push("mosques.approve", "mosques.reject");
    const html = renderToStaticMarkup(<Mosques />);
    const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
    for (const [label, targetStatus] of [["اعتماد", "approved"], ["رفض", "rejected"]]) {
      const controls = buttons.filter(b => new RegExp(`${label}\\s*</button>`).test(b));
      expect(controls).toHaveLength(label === "اعتماد" && status === "approved" ? 0 : 2);
      for (const control of controls) expect(control.includes('disabled=""')).toBe(status === targetStatus);
    }
    state.permissions = ["mosques.view"];
    expect(renderToStaticMarkup(<Mosques />)).not.toMatch(/(اعتماد|رفض)\s*<\/button>/);
  });

  it("renders mosque requests as plain rows without navigation handlers", () => {
    state.permissions.push("mosques.view_details");
    state.data["requests.search"] = { requests: [{ id: 73, requestNumber: "REQ-73", programType: "test", currentStage: "closed", createdAt: "2026-11-07" }] };
    const html = renderToStaticMarkup(<MosqueDetails />);
    expect(html).toContain("REQ-73");
    expect(html).not.toContain("/requests/73");
    const rows: React.ReactElement<any>[] = [];
    function visit(node: React.ReactNode) {
      React.Children.forEach(node, child => {
        if (!React.isValidElement(child)) return;
        const element = child as React.ReactElement<{ children?: React.ReactNode }>;
        if (element.type === "div" && element.key === "73") rows.push(element);
        visit(element.props.children);
      });
    }
    visit(MosqueDetails());
    expect(rows).toHaveLength(1);
    expect(rows[0].props.onClick).toBeUndefined();
    expect(rows[0].props.className).not.toContain("cursor-pointer");
  });

  it("hides all editing entry points on the details page unless editing is granted", () => {
    state.permissions.push("mosques.view_details");
    let html = renderToStaticMarkup(<MosqueDetails />);
    for (const label of ["تعديل", "تسجيل بيانات الإمام", "إكمال البيانات"]) expect(html).not.toMatch(new RegExp(`${label}\\s*</button>`));
    state.permissions.push("mosques.edit");
    html = renderToStaticMarkup(<MosqueDetails />);
    expect(html).toMatch(/تعديل\s*<\/button>/);
    expect(html).not.toMatch(/تسجيل بيانات الإمام\s*<\/button>/);
    expect(html).toContain("إكمال البيانات");
  });
  it("shows imam registration only with its dedicated permission, and only when no imam is registered", () => {
    state.permissions = ["mosques.view_details", "mosques.add_imam"];
    expect(renderToStaticMarkup(<MosqueDetails />)).toMatch(/تسجيل بيانات الإمام\s*<\/button>/);
    state.permissions = ["mosques.view_details", "mosques.edit"];
    expect(renderToStaticMarkup(<MosqueDetails />)).not.toMatch(/تسجيل بيانات الإمام\s*<\/button>/);
    state.permissions.push("mosques.add_imam");
    state.data["mosques.getById"].imamName = "إمام مسجل";
    expect(renderToStaticMarkup(<MosqueDetails />)).not.toMatch(/تسجيل بيانات الإمام\s*<\/button>/);
    state.data["mosques.getById"].imamName = null;
    state.data["mosques.getById"].registeredByUser = { requesterType: "imam", name: "إمام المسجد" };
    expect(renderToStaticMarkup(<MosqueDetails />)).not.toMatch(/تسجيل بيانات الإمام\s*<\/button>/);
  });
  it("opens the registration form with add-imam permission without requiring mosque editing or creation", () => {
    state.permissions = ["mosques.add_imam"];
    expect(renderToStaticMarkup(<EditImam params={{ id: "17" }} />)).toContain("الاسم الكامل");
    state.permissions = ["mosques.edit"];
    expect(renderToStaticMarkup(<EditImam params={{ id: "17" }} />)).not.toContain("الاسم الكامل");
    state.data["mosques.getById"].imamName = "إمام مسجل";
    expect(renderToStaticMarkup(<EditImam params={{ id: "17" }} />)).toContain("الاسم الكامل");
    state.permissions = ["mosques.add_imam"];
    expect(renderToStaticMarkup(<EditImam params={{ id: "17" }} />)).not.toContain("الاسم الكامل");
  });

  it("ignores the stale wildcard in the auth snapshot after permission refresh", () => {
    expect(renderToStaticMarkup(<PermissionRouteGuard><span>Allowed mosque list</span></PermissionRouteGuard>)).toContain("Allowed mosque list");
    state.permissions = [];
    expect(renderToStaticMarkup(<PermissionRouteGuard><span>Allowed mosque list</span></PermissionRouteGuard>)).not.toContain("Allowed mosque list");
    state.permissions = ["*"];
    expect(renderToStaticMarkup(<Mosques />)).not.toContain("إضافة مسجد");
    expect(renderToStaticMarkup(<Mosques />)).not.toContain("الإجراءات");
  });
});

describe("mosque map permission controls", () => {
  beforeEach(() => {
    state.location = "/mosques/map";
    state.permissions = ["mosque_map.view"];
    state.data["mosques.search"] = {
      mosques: ["approved", "pending", "rejected"].map((approvalStatus, index) => ({
        id: index + 1, name: `Map mosque ${index + 1}`, city: "أبها", approvalStatus,
        latitude: `${24 + index}`, longitude: `${46 + index}`,
      })),
      total: 3,
    };
  });

  it("shows mosque pins with their status colors without details buttons for map-only access", () => {
    const html = renderToStaticMarkup(<MosquesMap />);
    expect(html.match(/data-map-marker=""/g)).toHaveLength(3);
    for (const color of ["#22c55e", "#f59e0b", "#ef4444"]) expect(html).toContain(`fill="${color}"`);
    for (const color of ["#22c55e", "#f59e0b", "#ef4444"]) expect(html).toContain(`style="fill: ${color};"`);
    expect(html).not.toContain("عرض التفاصيل");
    expect(state.queries.find(q => q.path === "mosques.search")?.enabled).toBe(true);
  });

  it("normalizes mosque status values consistently for pins and popup badges", () => {
    state.data["mosques.search"].mosques.forEach((mosque: any) => { mosque.approvalStatus = ` ${mosque.approvalStatus.toUpperCase()} `; });
    const html = renderToStaticMarkup(<MosquesMap />);
    for (const color of ["#22c55e", "#f59e0b", "#ef4444"]) expect(html).toContain(`fill="${color}"`);
    expect(html).not.toContain('fill="#3b82f6"');
  });
  it("colors the encoded status values returned by the database instead of falling back to a single color", () => {
    state.data["mosques.search"].mosques.forEach((mosque: any) => {
      mosque.approvalStatus = "\0" + mosque.approvalStatus.split("").join("\0");
    });
    const html = renderToStaticMarkup(<MosquesMap />);
    for (const color of ["#22c55e", "#f59e0b", "#ef4444"]) expect(html).toContain(`fill="${color}"`);
    expect(html).not.toContain('fill="#3b82f6"');
  });

  it("refreshes mosque states while open and updates the marker when a mosque is rejected", () => {
    renderToStaticMarkup(<MosquesMap />);
    const options = state.queries.find(q => q.path === "mosques.search")?.options;
    expect(options).toMatchObject({ staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true, refetchInterval: 5000 });
    state.data["mosques.search"].mosques[0].approvalStatus = "rejected";
    const html = renderToStaticMarkup(<MosquesMap />);
    expect(html).not.toContain('fill="#22c55e"');
    expect(html.match(/fill="#ef4444"/g)).toHaveLength(2);
  });

  it("shows details buttons only with map details permission and removes them on revocation", () => {
    state.permissions.push("mosques.view_details");
    expect(renderToStaticMarkup(<MosquesMap />)).not.toContain("عرض التفاصيل");
    state.permissions.push("mosque_map.view_details");
    let html = renderToStaticMarkup(<MosquesMap />);
    expect(html.match(/عرض التفاصيل/g)).toHaveLength(3);
    for (const id of [1, 2, 3]) expect(html).toContain(`href="/mosques/${id}"`);
    state.permissions = ["mosque_map.view"];
    html = renderToStaticMarkup(<MosquesMap />);
    expect(html).not.toContain("عرض التفاصيل");
    expect(html.match(/data-map-marker=""/g)).toHaveLength(3);
  });

  it.each([{ permissions: [] }, { permissions: ["*"] }, { permissions: ["mosques_map"] }, { permissions: ["mosque_map.view_details"] }])("hides the map and stops fetching its data without map view permission: %j", ({ permissions }) => {
    state.permissions = permissions;
    const html = renderToStaticMarkup(<MosquesMap />);
    expect(html).not.toContain("data-map-marker");
    expect(state.queries.find(q => q.path === "mosques.search")?.enabled).toBe(false);
    expect(renderToStaticMarkup(<PermissionRouteGuard><span>Authorized map</span></PermissionRouteGuard>)).not.toContain("Authorized map");
  });
});
