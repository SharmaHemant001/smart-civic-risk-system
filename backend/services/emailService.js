/**
 * CivicGuard Email Service Abstraction
 * Currently logs email parameters to console for development/MVP purposes.
 * Can be extended with Resend, SendGrid, or AWS SES transporters in production.
 */

export const sendPasswordResetEmail = async (email, resetLink) => {
  console.log("\n==================================================");
  console.log("📧 CIVICGUARD OUTBOUND EMAIL (SIMULATED)");
  console.log(`To:      ${email}`);
  console.log("Subject: CivicGuard Password Reset Request");
  console.log("Body:");
  console.log("  You have requested a password reset for your CivicGuard account.");
  console.log(`  Please click the following link to reset your password:\n`);
  console.log(`  👉 ${resetLink} 👈`);
  console.log("\n  This link is valid for 1 hour.");
  console.log("==================================================\n");
  
  return { success: true };
};

export const sendWelcomeEmail = async (email, name) => {
  console.log("\n==================================================");
  console.log("📧 CIVICGUARD OUTBOUND EMAIL (SIMULATED)");
  console.log(`To:      ${email}`);
  console.log("Subject: Welcome to CivicGuard Operations Console");
  console.log("Body:");
  console.log(`  Welcome, ${name}! Your account has been registered.`);
  console.log("  You can now access the CivicGuard municipal dashboard.");
  console.log("==================================================\n");
  
  return { success: true };
};
