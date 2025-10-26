import request from "supertest";
import { app, prisma, wss, agentP2PService } from "../app";

describe("GET /health", () => {
  afterAll(async () => {
    await agentP2PService.shutdown();
    await prisma.$disconnect();
    await new Promise<void>((resolve) => {
      wss.close(() => resolve());
    });
  });

  it("returns OK status payload", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "OK",
    });
    expect(typeof response.body.timestamp).toBe("string");
  });
});
