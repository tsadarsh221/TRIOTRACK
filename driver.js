// --- PASTE YOUR FIREBASE CONFIG OBJECT HERE ---
const firebaseConfig = {
  apiKey: "AIzaSyD1KstRROoDmHP8hr6pRd7mIIZdogmu6TM",
  authDomain: "new-driver-location.firebaseapp.com",
  projectId: "new-driver-location",
  storageBucket: "new-driver-location.firebasestorage.app",
  messagingSenderId: "197479104675",
  appId: "1:197479104675:web:0a21e76becadfdc545bf16",
  measurementId: "G-J2BTQ32W5E"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let watchId = null; // To store the ID of the location watcher

// --- LOGIC FOR BOTH login.html AND driver.html ---

// Check which page we are on
if (document.getElementById('loginBtn')) {
    // --- LOGIN PAGE LOGIC ---
    const loginBtn = document.getElementById('loginBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    loginBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                window.location.href = 'driver.html';
            })
            .catch((error) => {
                errorMessage.textContent = error.message;
            });
    });

} else {
    // --- DRIVER DASHBOARD LOGIC ---
    const driverEmailSpan = document.getElementById('driverEmail');
    const busDetailsSpan = document.getElementById('busDetails');
    const startSharingBtn = document.getElementById('startSharingBtn');
    const stopSharingBtn = document.getElementById('stopSharingBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const statusP = document.getElementById('status');
    let currentBusId = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in.
            driverEmailSpan.textContent = user.email;

            // Find the bus associated with this driver
            db.collection('buses').where('driverId', '==', user.uid).get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        busDetailsSpan.textContent = "No bus assigned.";
                        startSharingBtn.disabled = true;
                        return;
                    }
                    snapshot.forEach(doc => {
                        currentBusId = doc.id; // This is the unique bus ID
                        const busData = doc.data();
                        busDetailsSpan.textContent = `${busData.busName} (${busData.busNumber})`;
                    });
                });
        } else {
            // No user is signed in. Redirect to login.
            window.location.href = 'login.html';
        }
    });

    startSharingBtn.addEventListener('click', () => {
        if (!currentBusId) {
            statusP.textContent = "Cannot start sharing: No bus assigned.";
            return;
        }

        if (!navigator.geolocation) {
            statusP.textContent = "Geolocation is not supported by your browser.";
            return;
        }

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const busLocationRef = db.collection('live_locations').doc(currentBusId);

                busLocationRef.set({
                    location: new firebase.firestore.GeoPoint(latitude, longitude),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                statusP.textContent = `Location updated at ${new Date().toLocaleTimeString()}`;
                startSharingBtn.style.display = 'none';
                stopSharingBtn.style.display = 'block';
            },
            (error) => {
                statusP.textContent = `Error: ${error.message}`;
            },
            { enableHighAccuracy: true }
        );
    });
    
    stopSharingBtn.addEventListener('click', () => {
        if(watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
            statusP.textContent = "Location sharing stopped.";
            stopSharingBtn.style.display = 'none';
            startSharingBtn.style.display = 'block';
        }
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            if(watchId !== null) navigator.geolocation.clearWatch(watchId);
            window.location.href = 'login.html';
        });
    });
}
