#!/usr/bin/env node

/**
 * Emergency script to block a user via Convex internal function
 * Usage: node scripts/emergency-block.js
 *
 * This bypasses normal authentication and should only be used in emergencies
 */

const { spawn } = require("child_process");

async function runEmergencyBlock() {
  const targetClerkId = "user_2xfdcgWl6rSi4dbDAbu5anKbj1P";
  const reason = "Emergency block - suspected abuse/spam";
  const adminNote = "Blocked via emergency script due to reported abuse";

  console.log("🚨 EMERGENCY USER BLOCK");
  console.log("========================");
  console.log(`Target User: ${targetClerkId}`);
  console.log(`Reason: ${reason}`);
  console.log(`Admin Note: ${adminNote}`);
  console.log("");

  // Construct the Convex CLI command
  const command = "npx";
  const args = [
    "convex",
    "run",
    "emergency-admin:emergencyBlockUser",
    "--arg",
    JSON.stringify({
      targetClerkId,
      reason,
      adminNote,
    }),
  ];

  console.log("Running command:");
  console.log(`${command} ${args.join(" ")}`);
  console.log("");

  // Execute the command
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
  });

  child.on("close", (code) => {
    if (code === 0) {
      console.log("");
      console.log("✅ User blocked successfully!");
      console.log("");
      console.log("📋 What happens next:");
      console.log(
        "• User will get 'User access blocked' error on next API call"
      );
      console.log("• Block is logged in adminActions table");
      console.log("• To unblock: node scripts/emergency-unblock.js");
    } else {
      console.log("");
      console.log(`❌ Command failed with exit code ${code}`);
      console.log("");
      console.log("🔧 Troubleshooting:");
      console.log("• Make sure you're in the project root directory");
      console.log("• Ensure Convex is deployed: npx convex dev");
      console.log("• Check if user exists in the database");
    }
  });

  child.on("error", (error) => {
    console.error("❌ Failed to start command:", error.message);
  });
}

runEmergencyBlock();
