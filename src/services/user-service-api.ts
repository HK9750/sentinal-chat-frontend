import { apiClient, unwrapData } from '@/services/api-client';
import { API_ROUTES } from '@/lib/constants';
import type { Contact, ItemsPayload, ListPayload, UserSearchResult } from '@/types';

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
