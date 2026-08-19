import { GET, POST } from "@/app/api/programmes/route";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({
  prisma: { programme: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() } },
}));
jest.mock("@/lib/auth-guards", () => ({ requireStaff: jest.fn() }));

describe("programme registry collection API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireStaff as jest.Mock).mockResolvedValue({ user: { id: 1, role: 1 } });
  });

  it("requires staff access", async () => {
    (requireStaff as jest.Mock).mockResolvedValue({ user: null, error: Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }) });
    const response = await GET(new Request("http://localhost/api/programmes"));
    expect(response.status).toBe(401);
    expect(prisma.programme.findMany).not.toHaveBeenCalled();
  });

  it("lists filtered programmes with pagination and safe money values", async () => {
    (prisma.programme.findMany as jest.Mock).mockResolvedValue([{ id: 2, name: "Computing", fee: { toString: () => "1250.00" }, discount: { toString: () => "10.00" }, couponLimit: 3, couponUsed: 1 }]);
    (prisma.programme.count as jest.Mock).mockResolvedValue(3);
    const response = await GET(new Request("http://localhost/api/programmes?search=comp&page=2&pageSize=1&sort=fee&order=desc"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data[0]).toMatchObject({ name: "Computing", fee: "1250.00", discount: "10.00" });
    expect(body.pagination).toEqual({ page: 2, pageSize: 1, total: 3, totalPages: 3 });
    expect(prisma.programme.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 1, take: 1, orderBy: { fee: "desc" } }));
  });

  it("rejects invalid filters before querying", async () => {
    const response = await GET(new Request("http://localhost/api/programmes?status=REMOVED&pageSize=101"));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(prisma.programme.findMany).not.toHaveBeenCalled();
  });

  it("normalizes and creates a programme", async () => {
    (prisma.programme.create as jest.Mock).mockResolvedValue({ id: 1, name: "Computer Science", fee: { toString: () => "100.00" }, discount: { toString: () => "0.00" }, couponLimit: null, couponUsed: 0 });
    const response = await POST(new Request("http://localhost/api/programmes", { method: "POST", body: JSON.stringify({ name: " Computer Science ", fee: 100 }) }));
    expect(response.status).toBe(201);
    expect(prisma.programme.create).toHaveBeenCalledWith(expect.objectContaining({ data: { name: "Computer Science", fee: 100, discount: 0, status: "ACTIVE" } }));
  });

  it.each([
    { name: "discount exceeds fee", body: { name: "Computing", fee: 100, discount: 101, coupon: "SAVE", couponLimit: 1 } },
    { name: "positive discount lacks coupon", body: { name: "Computing", fee: 100, discount: 10, couponLimit: 1 } },
    { name: "positive discount lacks valid limit", body: { name: "Computing", fee: 100, discount: 10, coupon: "SAVE", couponLimit: 0 } },
  ])("rejects programme when $name", async ({ body }) => {
    const response = await POST(new Request("http://localhost/api/programmes", { method: "POST", body: JSON.stringify(body) }));
    expect(response.status).toBe(400);
    expect(prisma.programme.create).not.toHaveBeenCalled();
  });

  it("permits zero discount with empty coupon fields", async () => {
    (prisma.programme.create as jest.Mock).mockResolvedValue({ id: 1, name: "Computing", fee: { toString: () => "100.00" }, discount: { toString: () => "0.00" }, coupon: null, couponLimit: null, couponUsed: 0 });
    const response = await POST(new Request("http://localhost/api/programmes", { method: "POST", body: JSON.stringify({ name: "Computing", fee: 100, discount: 0, coupon: "", couponLimit: null }) }));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ fee: "100.00", discount: "0.00", couponLimit: null, couponUsed: 0 });
    expect(prisma.programme.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ coupon: null, couponLimit: null }) }));
  });

  it("maps duplicate names to a conflict", async () => {
    (prisma.programme.create as jest.Mock).mockRejectedValue({ code: "P2002" });
    const response = await POST(new Request("http://localhost/api/programmes", { method: "POST", body: JSON.stringify({ name: "Computing", fee: 100 }) }));
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.code).toBe("PROGRAMME_EXISTS");
  });

  it("rejects writes from staff below registrar", async () => {
    (requireStaff as jest.Mock).mockResolvedValue({ user: null, error: Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 }) });
    const response = await POST(new Request("http://localhost/api/programmes", { method: "POST", body: JSON.stringify({ name: "Computing", fee: 100 }) }));
    expect(response.status).toBe(403);
    expect(prisma.programme.create).not.toHaveBeenCalled();
  });
});