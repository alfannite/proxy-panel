const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to hide password typing
rl._writeToOutput = function _writeToOutput(stringToWrite) {
  if (rl.stdoutMuted)
    rl.output.write("*");
  else
    rl.output.write(stringToWrite);
};

async function main() {
  console.log("=========================================");
  console.log("     PROXYPANEL PASSWORD RESET TOOL      ");
  console.log("=========================================\n");

  const users = await prisma.user.findMany();
  
  if (users.length === 0) {
    console.log("No admin user found in the database.");
    console.log("Please open ProxyPanel in your browser to set up your account first.");
    process.exit(1);
  }

  const user = users[0]; // Single-user focus

  console.log(`Admin account found: ${user.username}`);
  
  rl.question('Enter new password (min 6 chars): ', async (newPassword) => {
    rl.stdoutMuted = false;
    
    if (!newPassword || newPassword.length < 6) {
      console.log("\n[Error] Password is too short! Must be at least 6 characters.");
      process.exit(1);
    }
    
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
      
      console.log(`\n\n[SUCCESS] Password for '${user.username}' has been updated successfully!`);
      console.log("You can now log in to the web panel with your new password.");
    } catch (e) {
      console.error("\n[ERROR] Failed to update password:", e.message);
    } finally {
      process.exit(0);
    }
  });

  rl.stdoutMuted = true;
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
