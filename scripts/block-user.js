#!/usr/bin/env node

/**
 * Script to block a user in production
 * Usage: node scripts/block-user.js <clerkUserId> <reason>
 */

const { ConvexHttpClient } = require("convex/browser");

async function blockUser() {
  // Get command line arguments
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: node scripts/block-user.js <clerkUserId> <reason>");
    console.error("Example: node scripts/block-user.js user_123 'Spam/abuse'");
    process.exit(1);
  }

  const [targetClerkId, reason] = args;

  // Initialize Convex client
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    console.error("Error: CONVEX_URL environment variable not set");
    console.error("Set it to your production Convex URL");
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);

  try {
    console.log(`Attempting to block user: ${targetClerkId}`);
    console.log(`Reason: ${reason}`);

    // Note: This requires the admin to be authenticated
    // You'll need to modify this to include proper authentication
    const result = await client.mutation("admin:blockUser", {
      targetClerkId,
      reason,
    });

    console.log("✅ User blocked successfully");
    console.log("Block ID:", result);
  } catch (error) {
    console.error("❌ Failed to block user:");
    console.error(error.message);

    if (error.message.includes("Not authenticated")) {
      console.error(
        "\n💡 You need to be authenticated as an admin to run this script"
      );
      console.error(
        "Consider using the internal script instead: node scripts/internal-block-user.js"
      );
    }

    process.exit(1);
  }
}

blockUser();
