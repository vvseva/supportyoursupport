// Import the functions you need from the SDKs you need

    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
    import { getDatabase, ref, push, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries
  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
      apiKey: "AIzaSyC-03xng3uqqQ0QOHtBgxto7ocGNwNThXQ",
      authDomain: "supportyoursupport.firebaseapp.com",
      databaseURL: "https://supportyoursupport-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "supportyoursupport",
      storageBucket: "supportyoursupport.firebasestorage.app",
      messagingSenderId: "735891274194",
      appId: "1:735891274194:web:3d57607bd48f7eb059f00b",
      measurementId: "G-0XQSBTRQM9"
    };

  // Initialize Firebase

    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);
    const tipsRef = ref(database, 'supportyoursupport');
    // MODULE 2: Global State & Theming
    const themeData = {
      viscous: { gifPath: 'img/viscous.gif' },
      rem:     { gifPath: 'img/rem.gif' },
      dynamo:  { gifPath: 'img/dynamo.gif' },
      classic: { gifPath: 'https://deadlock.wiki/images/thumb/4/45/Souls.png/21px-Souls.png.webp' } // Generic fallback GIF
    };

    const REMOTE_JSON_URL = 'https://gist.githubusercontent.com/vvseva/5f66e5edba811f8fb53ca12d5a4cd79a/raw/theme.json';

    const getThemeColor = () => getComputedStyle(document.body).getPropertyValue('--fg-color').trim();

    function applyTheme(themeName) {
      // Validate the theme. If it doesn't exist in our dictionary, force 'classic'
      const activeTheme = themeData[themeName] ? themeName : 'classic';

      if (activeTheme === 'classic') {
        document.body.removeAttribute('data-theme');
      } else {
        document.body.setAttribute('data-theme', activeTheme);
      }
      
      document.getElementById('success-gif').src = themeData[activeTheme].gifPath;
      
      // Keep Chart.js colors perfectly synced with the active theme
      if (window.tipChartInstance) {
        const activeColor = getThemeColor();
        window.tipChartInstance.data.datasets[0].borderColor = activeColor;
        window.tipChartInstance.options.scales.x.ticks.color = activeColor;
        window.tipChartInstance.options.scales.y.ticks.color = activeColor;
        window.tipChartInstance.update();
      }
    }

    async function fetchGlobalTheme() {
      try {
        const response = await fetch(REMOTE_JSON_URL + '?t=' + new Date().getTime());
        const data = await response.json();
        
        applyTheme(data.theme);
      } catch (error) {
        console.error("Theme fetch failed. Defaulting to classic old web.", error);
        applyTheme('classic');
      }
    }

    // MODULE 3: Chart.js Initialization (Histogram Setup)
    const ctx = document.getElementById('tipChart').getContext('2d');
    
    window.tipChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [], // Will hold unique tip amounts (X-axis)
        datasets: [{
          label: 'Frequency',
          data: [], // Will hold the count of each amount (Y-axis)
          backgroundColor: 'transparent',
          borderColor: '#8cff9e', 
          borderWidth: 2,
          borderRadius: 0, 
          barPercentage: 0.9,
          categoryPercentage: 1.0 // Eliminates gaps between bars for a blockier look
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, 
        scales: {
          x: {
            display: true, // Show the soul amounts
            grid: { display: false },
            ticks: {
              color: '#8cff9e',
              font: { family: 'Courier New', size: 12 }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              tickLength: 0
            },
            ticks: {
              stepSize: 1, // Force Y-axis to use whole numbers (you can't have 1.5 tips)
              color: '#8cff9e',
              font: { family: 'Courier New', size: 10 },
              maxTicksLimit: 5
            },
            border: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#000',
            titleFont: { family: 'Courier New' },
            bodyFont: { family: 'Courier New' },
            cornerRadius: 0,
            displayColors: false,
            callbacks: {
              title: (context) => `${context[0].label} Souls`,
              label: (context) => `Count: ${context.raw}`
            }
          }
        }
      }
    });

    // MODULE 4: Data Flow & Event Listeners
    const soulBtns = document.querySelectorAll('.soul-btn');
    const customInput = document.getElementById('custom-souls');
    const tipForm = document.getElementById('tip-form');
    const transferWindow = document.getElementById('transfer-window');
    const successWindow = document.getElementById('success-window');
    const resetBtn = document.getElementById('reset-btn');

    soulBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        soulBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customInput.value = btn.getAttribute('data-value');
      });
    });

    customInput.addEventListener('input', () => {
      soulBtns.forEach(b => b.classList.remove('selected'));
    });

    tipForm.addEventListener('submit', (e) => {
      e.preventDefault(); 
      const soulsToTip = parseInt(customInput.value, 10);
      
      if(soulsToTip) {
        push(tipsRef, {
          amount: soulsToTip,
          timestamp: Date.now()
        });

        transferWindow.classList.add('hidden');
        successWindow.classList.remove('hidden');
        
        applyTheme(document.body.getAttribute('data-theme') || 'viscous');
      }
    });

    resetBtn.addEventListener('click', () => {
      tipForm.reset();
      soulBtns.forEach(b => b.classList.remove('selected'));
      successWindow.classList.add('hidden');
      transferWindow.classList.remove('hidden');
    });

    // MODULE 5: Data Aggregation (Tidy Design)
    // Fetching the last 100 tips to build a meaningful distribution
    const recentTipsQuery = query(tipsRef, limitToLast(100));
    
    onValue(recentTipsQuery, (snapshot) => {
      const tipCounts = {}; // Our frequency map
      
      // Tidy aggregation: counting occurrences of each amount
      snapshot.forEach((childSnapshot) => {
        const amount = childSnapshot.val().amount;
        if (amount) {
          tipCounts[amount] = (tipCounts[amount] || 0) + 1;
        }
      });

      // Extract unique amounts and sort them numerically for the X-axis
      const sortedAmounts = Object.keys(tipCounts)
        .map(Number)
        .sort((a, b) => a - b);

      // Map the sorted amounts to their corresponding frequencies for the Y-axis
      const frequencies = sortedAmounts.map(amount => tipCounts[amount]);

      // Inject structured data into Chart.js
      window.tipChartInstance.data.labels = sortedAmounts;
      window.tipChartInstance.data.datasets[0].data = frequencies;
      window.tipChartInstance.update();
    });

    // Boot Sequence
    fetchGlobalTheme();
