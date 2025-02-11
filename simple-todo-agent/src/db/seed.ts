import db from "./index";
import { todos } from "./schema";

async function seed() {
  try {
    // Insert sample todos
    await db.insert(todos).values([
      {
        title: "Complete project documentation",
        description: "Write comprehensive documentation for the new features",
      },
      {
        title: "Review pull requests",
        description: "Review and merge pending pull requests",
      },
      {
        title: "Setup testing environment",
        description: "Configure Jest and write initial test cases",
      },
      {
        title: "Update dependencies",
        description: "Update all npm packages to their latest versions",
      },
      {
        title: "Fix security vulnerabilities",
        description: "Address security issues reported by dependency scan",
      },
    ]);

    console.log("Seed data inserted successfully");
  } catch (error) {
    console.error("Error seeding data:", error);
  }
}

// Run the seed function
seed().catch(console.error);
