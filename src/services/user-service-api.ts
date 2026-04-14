import { apiClient, unwrapData } from '@/services/api-client';
import { API_ROUTES } from '@/lib/constants';
import type { AuthUser, Contact, ItemsPayload, ListPayload, UserSearchResult } from '@/types';

type ProfileUpdatePayload = {
  display_name?: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
};

function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    email: user.email ?? null,
    username: user.username ?? null,
    phone_number: user.phone_number ?? null,
    avatar_url: user.avatar_url ?? null,
  };
}

export async function getMyProfile(): Promise<AuthUser> {
  const user = await unwrapData<AuthUser>(apiClient.get(API_ROUTES.users.me));
  return normalizeAuthUser(user);
}

export async function updateMyProfile(input: ProfileUpdatePayload): Promise<AuthUser> {
  const user = await unwrapData<AuthUser>(apiClient.patch(API_ROUTES.users.me, input));
  return normalizeAuthUser(user);
}

export async function listContacts(): Promise<ItemsPayload<Contact>> {
  return unwrapData<ItemsPayload<Contact>>(apiClient.get(API_ROUTES.users.contacts));
}

export async function searchUsers(query: string): Promise<ListPayload<UserSearchResult>> {
  return unwrapData<ListPayload<UserSearchResult>>(
    apiClient.get(API_ROUTES.users.search, {
      params: {
        query,
        page: 1,
        limit: 12,
      },
    })
  );
}

export async function addContact(input: { contact_user_id: string; nickname?: string }): Promise<Contact> {
  return unwrapData<Contact>(apiClient.post(API_ROUTES.users.contacts, input));
}

export async function removeContact(contactUserId: string): Promise<{ removed: boolean }> {
  return unwrapData<{ removed: boolean }>(apiClient.delete(API_ROUTES.users.removeContact(contactUserId)));
}
