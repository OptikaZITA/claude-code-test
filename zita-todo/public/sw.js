const CACHE_NAME = 'zita-todo-v2';
const STATIC_ASSETS = [
  '/',
  '/inbox',
  '/inbox/team',
  '/calendar',
  '/settings',
  '/login',
  '/signup',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API requests - always use network
  if (url.hostname.includes('supabase')) return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // If it's a navigation request, return the cached homepage
          if (request.mode === 'navigate') {
            return caches.match('/');
          }

          // Return offline fallback for other requests
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});

// Handle background sync for offline task creation
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  // Get pending tasks from IndexedDB and sync them
  // This is a placeholder for actual implementation
  console.log('Syncing offline tasks...');
}

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'ZITA TODO';

  // Notification type determines the icon and actions
  const notificationType = data.type || 'default';

  const options = {
    body: data.body || 'Máte novú notifikáciu',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || `notification-${Date.now()}`,
    data: {
      url: data.url || '/',
      taskId: data.taskId,
      type: notificationType,
    },
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
  };

  // Add actions based on notification type
  if (notificationType === 'task_reminder') {
    options.actions = [
      { action: 'complete', title: 'Dokončiť' },
      { action: 'snooze', title: 'Odložiť' },
    ];
  } else if (notificationType === 'task_assigned') {
    options.actions = [
      { action: 'view', title: 'Zobraziť' },
    ];
  } else if (notificationType === 'comment') {
    options.actions = [
      { action: 'reply', title: 'Odpovedať' },
      { action: 'view', title: 'Zobraziť' },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  let targetUrl = notificationData.url || '/';

  // Handle specific actions
  if (action === 'complete' && notificationData.taskId) {
    // Mark task as complete - will be handled by the app
    targetUrl = `/inbox?complete=${notificationData.taskId}`;
  } else if (action === 'snooze' && notificationData.taskId) {
    // Snooze notification - schedule a new one for later
    targetUrl = `/inbox?snooze=${notificationData.taskId}`;
  } else if (action === 'reply' && notificationData.taskId) {
    targetUrl = `/inbox?reply=${notificationData.taskId}`;
  } else if (action === 'view' && notificationData.taskId) {
    targetUrl = `/inbox?task=${notificationData.taskId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
