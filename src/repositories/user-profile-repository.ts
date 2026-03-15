import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/repositories/collections";
import type { UserProfile, UserProfileUpdate } from "@/types/user";

interface LegacyUserProfileRecord {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  preferences: {
    theme: "light" | "dark";
    language: string;
    notifications: boolean;
  };
  socialAccounts: Record<string, unknown>;
  createdAt: Date | FirebaseFirestore.Timestamp;
  updatedAt: Date | FirebaseFirestore.Timestamp;
}

interface LegacyUserProfileCreateInput {
  userId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  preferences?: {
    theme: "light" | "dark";
    language: string;
    notifications: boolean;
  };
  socialAccounts?: Record<string, unknown>;
}

export class UserProfileRepository {
  static async findLegacyProfileByUserId(userId: string): Promise<LegacyUserProfileRecord | null> {
    const snapshot = await adminDb
      .collection(COLLECTIONS.USER_PROFILES)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...(doc.data() as Omit<LegacyUserProfileRecord, "id">),
    };
  }

  static async createLegacyProfile(input: LegacyUserProfileCreateInput): Promise<LegacyUserProfileRecord> {
    const now = new Date();
    const payload = {
      userId: input.userId,
      email: input.email,
      displayName: input.displayName ?? "",
      avatarUrl: input.avatarUrl ?? "",
      bio: input.bio ?? "",
      preferences: input.preferences ?? {
        theme: "light" as const,
        language: "ja",
        notifications: true,
      },
      socialAccounts: input.socialAccounts ?? {
        instagram: { username: "", connected: false },
        twitter: { username: "", connected: false },
        youtube: { username: "", connected: false },
        tiktok: { username: "", connected: false },
      },
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection(COLLECTIONS.USER_PROFILES).add(payload);
    return {
      id: docRef.id,
      ...payload,
    };
  }

  static async updateLegacyProfile(
    userId: string,
    updates: {
      displayName?: string;
      avatarUrl?: string;
      bio?: string;
      preferences?: Record<string, unknown>;
      socialAccounts?: Record<string, unknown>;
    },
  ): Promise<{ id: string } | null> {
    const existing = await this.findLegacyProfileByUserId(userId);
    if (!existing) {
      return null;
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (updates.displayName !== undefined) {updateData.displayName = updates.displayName;}
    if (updates.avatarUrl !== undefined) {updateData.avatarUrl = updates.avatarUrl;}
    if (updates.bio !== undefined) {updateData.bio = updates.bio;}
    if (updates.preferences !== undefined) {updateData.preferences = updates.preferences;}
    if (updates.socialAccounts !== undefined) {updateData.socialAccounts = updates.socialAccounts;}

    await adminDb.collection(COLLECTIONS.USER_PROFILES).doc(existing.id).update(updateData);
    return { id: existing.id };
  }

  static async getUserDocument(userId: string): Promise<UserProfile | null> {
    const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }

    return { id: userDoc.id, ...userDoc.data() } as UserProfile;
  }

  static async updateUserDocument(userId: string, updates: UserProfileUpdate): Promise<UserProfile | null> {
    const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }

    const existingData = userDoc.data() || {};
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.businessInfo !== undefined) {
      updateData.businessInfo = {
        ...(existingData.businessInfo || {}),
        ...updates.businessInfo,
      };
    }

    if (updates.snsAISettings !== undefined) {
      updateData.snsAISettings = {
        ...(existingData.snsAISettings || {}),
        ...updates.snsAISettings,
      };
    }

    await adminDb.collection(COLLECTIONS.USERS).doc(userId).update(updateData);

    const updatedUserDoc = await adminDb.collection(COLLECTIONS.USERS).doc(userId).get();
    return { id: updatedUserDoc.id, ...updatedUserDoc.data() } as UserProfile;
  }

  static async getSnsProfiles(userId: string): Promise<Record<string, unknown> | null> {
    const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data() || {};
    return (userData.snsProfiles as Record<string, unknown> | undefined) || {};
  }

  static async updateSnsProfile(
    userId: string,
    platform: string,
    profileData: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    const userDocRef = adminDb.collection(COLLECTIONS.USERS).doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data() || {};
    const currentSnsProfiles = (userData.snsProfiles as Record<string, unknown> | undefined) || {};

    currentSnsProfiles[platform] = {
      ...(currentSnsProfiles[platform] as Record<string, unknown> | undefined),
      ...profileData,
      lastUpdated: new Date().toISOString(),
    };

    await userDocRef.update({
      snsProfiles: currentSnsProfiles,
      updatedAt: new Date(),
    });

    return currentSnsProfiles;
  }
}
