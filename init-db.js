db = db.getSiblingDB("devrelay");

db.workspaces.deleteMany({});
db.gatewayroutes.deleteMany({});

workspaceId = ObjectId("69ed0c7e1c43772d60f05401");
db.workspaces.insertOne({
  _id: workspaceId,
  name: "Demo Workspace",
  slug: "demo-workspace",
  isActive: true,
  members: [],
  createdAt: new Date("2026-04-30T17:50:00.000Z"),
  updatedAt: new Date("2026-04-30T17:50:00.000Z")
});
print("Workspace created: " + workspaceId);

routeId = ObjectId("69f3964b61bb29401402548d");
db.gatewayroutes.insertOne({
  _id: routeId,
  name: "Dog API",
  path: "/dogs",
  upstream: {url: "https://dogapi.dog", timeout: 30000},
  stripPath: true,
  methods: ["GET"],
  auth: {type: "none", required: false},
  rateLimit: {enabled: false},
  isActive: true,
  priority: 1,
  workspaceId: workspaceId,
  plugins: [],
  createdAt: new Date("2026-04-30T17:50:03.283Z"),
  updatedAt: new Date("2026-04-30T17:50:03.283Z")
});
print("Dog API created: " + routeId);
print("Done!");