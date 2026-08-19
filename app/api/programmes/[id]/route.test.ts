import { GET, PATCH, DELETE } from "@/app/api/programmes/[id]/route";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({ prisma: { programme: { findFirst: jest.fn(), update: jest.fn() } } }));
jest.mock("@/lib/auth-guards", () => ({ requireStaff: jest.fn() }));

describe("programme registry detail API", () => {
  beforeEach(() => { jest.clearAllMocks(); (requireStaff as jest.Mock).mockResolvedValue({ user: { id: 1, role: 3 } }); });
  it("returns not found for an unknown programme", async () => {
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue(null);
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "9" }) });
    expect(response.status).toBe(404);
  });

  it("returns detail data inside the shared success envelope", async () => {
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue({ id: 9, name: "Computing", fee: { toString: () => "100.00" }, discount: { toString: () => "0.00" }, couponLimit: null, couponUsed: 0 });
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "9" }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ id: 9, name: "Computing", fee: "100.00" });
    expect(body).not.toHaveProperty("passwordHash");
  });
  it("does not reactivate an archived programme", async () => {
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue({ id: 9, name: "Computing", fee: "100.00", discount: "0.00", coupon: null, couponLimit: null, couponUsed: 0, status: "ARCHIVED" });
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "ACTIVE" }) }), { params: Promise.resolve({ id: "9" }) });
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("updates a programme inside the shared success envelope", async () => {
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue({ id: 9, name: "Computing", fee: "100.00", discount: "0.00", coupon: null, couponLimit: null, couponUsed: 0, status: "ACTIVE" });
    (prisma.programme.update as jest.Mock).mockResolvedValue({ id: 9, name: "Advanced Computing", fee: { toString: () => "125.00" }, discount: { toString: () => "5.00" }, coupon: null, couponLimit: null, couponUsed: 0 });
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ name: "Advanced Computing", fee: 125 }) }), { params: Promise.resolve({ id: "9" }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ name: "Advanced Computing", fee: "125.00" });
    expect(prisma.programme.update).toHaveBeenCalledWith(expect.objectContaining({ data: { name: "Advanced Computing", fee: 125 } }));
  });
  it("soft deletes only for admin and archives the programme", async () => {
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue({ id: 9, status: "ACTIVE" });
    (prisma.programme.update as jest.Mock).mockResolvedValue({ id: 9, status: "ARCHIVED", deletedAt: new Date() });
    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ id: "9" }) });
    expect(response.status).toBe(200);
    expect(prisma.programme.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ARCHIVED" }) }));
  });

  it("rejects archive requests from non-admin users", async () => {
    (requireStaff as jest.Mock).mockResolvedValue({ user: null, error: Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 }) });
    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ id: "9" }) });
    expect(response.status).toBe(403);
    expect(prisma.programme.update).not.toHaveBeenCalled();
  });
});