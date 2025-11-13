import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function fixAnalytics() {
  const snapshot = await db.collection("analytics").get();
  console.log(`Found ${snapshot.size} analytics documents. Starting fix...`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates: Record<string, unknown> = {};

    // ensure snsType/postType exist
    if (!data.snsType) {
      updates.snsType = "instagram";
    }
    if (!data.postType) {
      updates.postType = data.category ?? "feed";
    }

    // fill missing postId when we can match by title/user
    if (!data.postId && typeof data.title === "string" && data.title.trim() && data.userId) {
      const postsSnapshot = await db
        .collection("posts")
        .where("userId", "==", data.userId)
        .where("title", "==", data.title)
        .limit(1)
        .get();

      if (!postsSnapshot.empty) {
        updates.postId = postsSnapshot.docs[0].id;
      }
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      console.log("Updated analytics doc:", doc.id, updates);
    }
  }

  console.log("Done fixing analytics documents.");
}

fixAnalytics()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to fix analytics:", error);
    process.exit(1);
  });

