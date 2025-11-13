async function main() {
  const adminModule = await import("firebase-admin");
  const admin = adminModule.default ?? adminModule;

  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const db = admin.firestore();
  const snapshot = await db.collection("analytics").get();
  console.log(`Found ${snapshot.size} analytics documents. Starting fix...`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates = {};

    if (!data.snsType) {
      updates.snsType = "instagram";
    }
    if (!data.postType) {
      updates.postType = data.category ?? "feed";
    }

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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to fix analytics:", error);
    process.exit(1);
  });

