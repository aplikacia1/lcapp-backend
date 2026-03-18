const TimelinePost = require('../models/timelinePost');
const Message = require('../models/message');

async function lifecycleCleanup() {
  try {
    console.log("🧹 Lifecycle cleanup start");

    const now = new Date();

    // 🧵 60 dní pre timeline
    const cutoffPosts = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // ✉️ 30 dní pre správy
    const cutoffMessages = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 🧵 Mazanie starých príspevkov (iba neaktívne)
    const postResult = await TimelinePost.deleteMany({
      lastActivityAt: { $lt: cutoffPosts }
    });

    // ✉️ Mazanie starých správ
    const msgResult = await Message.deleteMany({
      createdAt: { $lt: cutoffMessages }
    });

    console.log(`🧵 Deleted posts: ${postResult.deletedCount}`);
    console.log(`✉️ Deleted messages: ${msgResult.deletedCount}`);

    console.log("✅ Lifecycle cleanup done");
  } catch (err) {
    console.error("❌ Lifecycle cleanup error:", err);
  }
}

module.exports = lifecycleCleanup;