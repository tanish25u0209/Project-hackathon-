import { runMigrations } from "./src/db/migrate.js";
console.log("WAITING TO MIGRATE");
runMigrations()
  .then(() => {
    console.log("MIGRATIONS COMPLETE");
    process.exit(0);
  })
  .catch(err => {
    console.error("MIGRATION FAILED", err);
    process.exit(1);
  });
