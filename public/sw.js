// Service Worker for Background Notifications
const CACHE_NAME = 'payment-background-v3';
const API_BASE_URL = 'https://h4ppy-api-getway.vercel.app'; // 🔥 YOUR BACKEND URL

// Install Service Worker
self.addEventListener('install', (event) => {
    console.log('🔄 Service Worker installing for background...');
    event.waitUntil(self.skipWaiting());
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker activated for background');
    event.waitUntil(self.clients.claim());
});

// Background Sync for payments
self.addEventListener('sync', (event) => {
    if (event.tag === 'check-payments') {
        console.log('🔄 Background Sync: Checking for payments...');
        event.waitUntil(checkPaymentsInBackground());
    }
});

// Push Notification Event
self.addEventListener('push', (event) => {
    console.log('📩 Push Notification received');
    
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: 'Payment Alert', body: 'New payment received!' };
    }
    
    const options = {
        body: data.body || 'New payment notification',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE5MiIgaGVpZ2h0PSIxOTIiIHJ4PSI5NiIgZmlsbD0iIzEwYjk4MSIvPjx0ZXh0IHg9Ijk2IiB5PSIxMDAiIGZvbnQtc2l6ZT0iODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSJ3aGl0ZSI+8J+SsDwvdGV4dD48L3N2Zz4=',
        badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHJ4PSI0OCIgZmlsbD0iIzEwYjk4MSIvPjx0ZXh0IHg9IjQ4IiB5PSI1MCIgZm9udC1zaXplPSIzNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IndoaXRlIj7wn5KwPC90ZXh0Pjwvc3ZnPg==',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
            time: new Date().toISOString()
        },
        actions: [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || '💰 Payment Alert', options)
    );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Notification clicked');
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

// Periodic Background Sync (every 2 minutes)
async function registerPeriodicSync() {
    if ('periodicSync' in self.registration) {
        try {
            await self.registration.periodicSync.register('check-payments', {
                minInterval: 2 * 60 * 1000, // 2 minutes
            });
            console.log('✅ Periodic background sync registered');
        } catch (error) {
            console.log('❌ Periodic sync failed:', error);
        }
    }
}

// Check payments in background
async function checkPaymentsInBackground() {
    try {
        console.log('🔍 Background: Checking for new payments...');
        
        const response = await fetch(`${API_BASE_URL}/api/check-new-sms`);
        const data = await response.json();
        
        if (data.success && data.announcements && data.announcements.length > 0) {
            console.log(`📨 Background: Found ${data.announcements.length} new payments`);
            
            // Show notification for each new payment
            data.announcements.forEach(payment => {
                showPaymentNotification(payment);
            });
            
            // Mark as announced
            data.announcements.forEach(async (payment) => {
                await fetch(`${API_BASE_URL}/api/mark-announced`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ announcementId: payment.id })
                });
            });
        }
        
        return data;
    } catch (error) {
        console.log('❌ Background check error:', error);
        return null;
    }
}

// Show notification for payment
function showPaymentNotification(payment) {
    const { amount, sender } = payment;
    const isCredit = payment.originalSMS?.toLowerCase().includes('prapt') || 
                     payment.originalSMS?.toLowerCase().includes('credited');
    
    const title = isCredit ? '💰 क्रेडिट प्राप्त' : '💸 डेबिट हुआ';
    const body = isCredit 
        ? `आपके खाते में ₹${amount} ${sender} के द्वारा प्राप्त हुए`
        : `आपके खाते से ₹${amount} ${sender} के खाते में ट्रांसफर हुए`;
    
    self.registration.showNotification(title, {
        body: body,
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE5MiIgaGVpZ2h0PSIxOTIiIHJ4PSI5NiIgZmlsbD0iIzEwYjk4MSIvPjx0ZXh0IHg9Ijk2IiB5PSIxMDAiIGZvbnQtc2l6ZT0iODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSJ3aGl0ZSI+8J+SsDwvdGV4dD48L3N2Zz4=',
        badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHJ4PSI0OCIgZmlsbD0iIzEwYjk4MSIvPjx0ZXh0IHg9IjQ4IiB5PSI1MCIgZm9udC1zaXplPSIzNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHY9Ii4zZW0iIGZpbGw9IndoaXRlIj7wn5KwPC90ZXh0Pjwvc3ZnPg==',
        vibrate: [200, 100, 200],
        tag: `payment-${Date.now()}`,
        renotify: true,
        data: {
            url: '/',
            paymentId: payment.id,
            amount: amount,
            sender: sender
        }
    });
}

// Message event from main app
self.addEventListener('message', (event) => {
    console.log('📨 Message from app:', event.data);
    
    if (event.data.type === 'START_BACKGROUND') {
        startBackgroundMonitoring();
    }
    
    if (event.data.type === 'STOP_BACKGROUND') {
        stopBackgroundMonitoring();
    }
    
    if (event.data.type === 'CHECK_NOW') {
        checkPaymentsInBackground();
    }
});

// Start background monitoring
let backgroundInterval = null;
function startBackgroundMonitoring() {
    console.log('🔄 Starting background monitoring...');
    
    // Clear any existing interval
    if (backgroundInterval) {
        clearInterval(backgroundInterval);
    }
    
    // Check every 30 seconds in background
    backgroundInterval = setInterval(() => {
        checkPaymentsInBackground();
    }, 30000); // 30 seconds
    
    // Register periodic sync
    registerPeriodicSync();
}

// Stop background monitoring
function stopBackgroundMonitoring() {
    console.log('⏹️ Stopping background monitoring...');
    if (backgroundInterval) {
        clearInterval(backgroundInterval);
        backgroundInterval = null;
    }
}

// Initial check when service worker starts
self.addEventListener('activate', (event) => {
    event.waitUntil(
        startBackgroundMonitoring()
    );
});
