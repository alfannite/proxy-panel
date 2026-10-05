// @ts-ignore
import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
  migrate: {
    connection: {
      url: "file:./dev.db",
    },
  },
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
});
