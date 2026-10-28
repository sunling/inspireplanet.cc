import { http } from '../config/http';
import type {
  SubscriberList,
  SubscriptionStatus,
} from '../../utils/newsletterSubscription';

export const newsletterSubscriptionsApi = {
  subscribe: (
    email: string,
    consent: boolean,
    source: string,
    website: string
  ) =>
    http.post<{ message: string }>('/newsletterSubscriptions', 'subscribe', {
      email,
      consent,
      source,
      website,
    }),
  tokenAction: (action: 'confirm' | 'unsubscribe', token: string) =>
    http.post<{ message: string }>('/newsletterSubscriptions', action, {
      token,
    }),
  list: (page: number, status: SubscriptionStatus | 'all', search: string) =>
    http.get<SubscriberList>('/newsletterSubscriptions', 'list', {
      page,
      status,
      search,
    }),
  remove: (id: string) =>
    http.post<{ message: string }>('/newsletterSubscriptions', 'remove', {
      id,
    }),
};
