import cron from "node-cron";
import moment from "moment";
import UserModel from "../Models/User.js";

/**
 * Cron job to check for expired memberships and revert premium usernames to free usernames
 * Runs every day at 00:00 (midnight)
 */
export const startMembershipExpiryCheck = () => {
  // Run every day at midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log(
        `[${new Date().toISOString()}] Running membership expiry check...`
      );

      // Find all premium users whose membership has expired
      const today = moment().format("YYYY-MM-DD");
      const expiredUsers = await UserModel.find({
        usertype: 1, // Premium users
        membertype: "premium",
        enddate: { $lt: today }, // Membership end date is before today
      });

      console.log(`Found ${expiredUsers.length} expired premium memberships`);

      let revertedCount = 0;
      let errorCount = 0;

      for (const user of expiredUsers) {
        try {
          // Revert to free membership
          const updateObj = {
            usertype: 0, // Free user
            membertype: "free",
            paymentstatus: 0,
            username: user.freeUsername || user.username, // Revert to free username
          };

          // If no freeUsername exists, generate one
          if (!user.freeUsername) {
            let generatedUsername = generateUsername();
            let isUnique = false;
            while (!isUnique) {
              const conflict = await UserModel.findOne({
                freeUsername: generatedUsername,
              });
              if (!conflict) {
                isUnique = true;
              } else {
                generatedUsername = generateUsername();
              }
            }
            updateObj.freeUsername = generatedUsername;
            updateObj.username = generatedUsername;
          }

          await UserModel.findByIdAndUpdate(user._id, updateObj);

          console.log(
            `[${new Date().toISOString()}] Reverted user ${
              user.tgid || user._id
            } from premium to free (username: ${updateObj.username})`
          );

          revertedCount++;
        } catch (error) {
          console.error(
            `[${new Date().toISOString()}] Error reverting user ${
              user.tgid || user._id
            }:`,
            error
          );
          errorCount++;
        }
      }

      console.log(
        `[${new Date().toISOString()}] Membership expiry check completed. Reverted: ${revertedCount}, Errors: ${errorCount}`
      );
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Membership expiry check failed:`,
        error
      );
    }
  });

  console.log("Membership expiry check cron job started (runs daily at 00:00)");
};

/**
 * Utility function to generate an 8-character random username
 */
function generateUsername() {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Manual trigger for membership expiry check (useful for testing)
 */
export const checkExpiredMemberships = async () => {
  try {
    console.log(
      `[${new Date().toISOString()}] Manually triggering membership expiry check...`
    );

    const today = moment().format("YYYY-MM-DD");
    const expiredUsers = await UserModel.find({
      usertype: 1,
      membertype: "premium",
      enddate: { $lt: today },
    });

    console.log(`Found ${expiredUsers.length} expired premium memberships`);

    let revertedCount = 0;
    let errorCount = 0;

    for (const user of expiredUsers) {
      try {
        const updateObj = {
          usertype: 0,
          membertype: "free",
          paymentstatus: 0,
          username: user.freeUsername || user.username,
        };

        if (!user.freeUsername) {
          let generatedUsername = generateUsername();
          let isUnique = false;
          while (!isUnique) {
            const conflict = await UserModel.findOne({
              freeUsername: generatedUsername,
            });
            if (!conflict) {
              isUnique = true;
            } else {
              generatedUsername = generateUsername();
            }
          }
          updateObj.freeUsername = generatedUsername;
          updateObj.username = generatedUsername;
        }

        await UserModel.findByIdAndUpdate(user._id, updateObj);

        console.log(
          `Reverted user ${user.tgid || user._id} from premium to free`
        );

        revertedCount++;
      } catch (error) {
        console.error(`Error reverting user ${user.tgid || user._id}:`, error);
        errorCount++;
      }
    }

    console.log(
      `Manual membership expiry check completed. Reverted: ${revertedCount}, Errors: ${errorCount}`
    );

    return {
      success: true,
      total: expiredUsers.length,
      reverted: revertedCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error("Manual membership expiry check failed:", error);
    return { success: false, error: error.message };
  }
};
