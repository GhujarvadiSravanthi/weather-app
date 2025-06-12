// script.js

// --- Configuration ---
const API_KEY = "cab7b6041b04fe86ebb467c389279bb7"; // IMPORTANT: Ensure this matches your active OpenWeatherMap API key
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const WEATHER_ICON_BASE_URL = "https://openweathermap.org/img/wn/"; // For weather condition icons

let currentWeatherData = null; // Stores the raw current weather data for unit conversion
let forecastWeatherData = null; // Stores the raw forecast data for unit conversion
let currentUnit = 'metric'; // 'metric' for Celsius, 'imperial' for Fahrenheit
let currentForecastView = 'daily'; // 'daily' or 'hourly'

// --- DOM Element References ---
const cityInput = document.getElementById('city-input');
const searchButton = document.getElementById('search-button');
const voiceSearchButton = document.getElementById('voice-search-button');
const loadingMessage = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const currentWeatherCard = document.getElementById('current-weather-card');
// const weatherMapContainer = document.getElementById('weather-map'); // REMOVED
const forecastToggleButtons = document.querySelector('.forecast-toggle-buttons');
const dailyForecastBtn = document.getElementById('daily-forecast-btn');
const hourlyForecastBtn = document.getElementById('hourly-forecast-btn');
const dailyForecastContainer = document.getElementById('daily-forecast-container');
const hourlyForecastContainer = document.getElementById('hourly-forecast-container');

// Current Weather Card elements
const currentCityElem = document.getElementById('current-city');
const currentDateElem = document.getElementById('current-date');
const currentWeatherIconElem = document.getElementById('current-weather-icon');
const currentTempElem = document.getElementById('current-temp');
const currentDescriptionElem = document.getElementById('current-description');
const currentHumidityElem = document.getElementById('current-humidity');
const currentWindElem = document.getElementById('current-wind');
const currentFeelsLikeElem = document.getElementById('current-feels-like');
const currentSunriseElem = document.getElementById('current-sunrise');
const currentSunsetElem = document.getElementById('current-sunset');
const currentVisibilityElem = document.getElementById('current-visibility');
const currentPressureElem = document.getElementById('current-pressure');
const currentUvIndexElem = document.getElementById('current-uv-index');

// Units Toggle Elements
const celsiusBtn = document.getElementById('celsius-btn');
const fahrenheitBtn = document.getElementById('fahrenheit-btn');

// --- Map Variables (REMOVED) ---
// let map = null;
// let marker = null;

// --- Speech Recognition Setup ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null; // Will hold the SpeechRecognition object

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop after first result
    recognition.lang = 'en-US'; // Set language

    recognition.onstart = () => {
        voiceSearchButton.classList.add('listening');
        cityInput.placeholder = 'Listening...';
        cityInput.value = ''; // Clear input while listening
        showMessage('loading', 'Speak the city name...');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        cityInput.value = transcript;
        voiceSearchButton.classList.remove('listening');
        cityInput.placeholder = 'Enter city...';
        // Trigger search with the recognized city
        fetchAndDisplayWeather(transcript);
        localStorage.setItem('lastCity', transcript); // Store last searched city
    };

    recognition.onend = () => {
        voiceSearchButton.classList.remove('listening');
        cityInput.placeholder = 'Enter city...';
        if (!cityInput.value && !errorMessage.classList.contains('hidden')) {
             if (!currentWeatherData) {
                hideMessages();
             }
        }
    };

    recognition.onerror = (event) => {
        voiceSearchButton.classList.remove('listening');
        cityInput.placeholder = 'Enter city...';
        console.error('Speech recognition error:', event.error);
        let errorText = 'Voice search failed. Please try again.';
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            errorText = 'Microphone permission denied. Please enable it in your browser settings.';
        } else if (event.error === 'no-speech') {
            errorText = 'No speech detected. Please try again.';
        }
        showMessage('error', errorText);
        if (!currentWeatherData) {
            setTimeout(() => {
                fetchAndDisplayWeather('Merta');
            }, 3000);
        }
    };
} else {
    console.warn('Web Speech API not supported in this browser.');
    voiceSearchButton.style.display = 'none'; // Hide the button if not supported
}


// --- Helper Functions ---

/**
 * Displays a message of a specific type (loading, error) and hides other elements.
 * @param {string} type - 'loading' or 'error'.
 * @param {string} text - The message content.
 */
function showMessage(type, text = '') {
    loadingMessage.classList.add('hidden');
    errorMessage.classList.add('hidden');
    currentWeatherCard.classList.add('hidden');
    // weatherMapContainer.classList.add('hidden'); // REMOVED
    forecastToggleButtons.classList.add('hidden');
    dailyForecastContainer.classList.add('hidden');
    hourlyForecastContainer.classList.add('hidden');

    if (type === 'loading') {
        loadingMessage.textContent = text;
        loadingMessage.classList.remove('hidden');
    } else if (type === 'error') {
        errorMessage.textContent = text;
        errorMessage.classList.remove('hidden');
    }
}

/**
 * Hides all messages and displays the main content sections.
 */
function hideMessages() {
    loadingMessage.classList.add('hidden');
    errorMessage.classList.add('hidden');
    currentWeatherCard.classList.remove('hidden');
    // weatherMapContainer.classList.remove('hidden'); // REMOVED
    forecastToggleButtons.classList.remove('hidden');
}

/**
 * Initializes or updates the Leaflet map with new coordinates. (REMOVED)
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @param {string} cityName - Name of the city for the marker popup.
 */
/*
function updateMap(lat, lon, cityName) {
    if (map === null) {
        map = L.map('weather-map').setView([lat, lon], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    } else {
        map.setView([lat, lon], 10);
    }

    if (marker !== null) {
        map.removeLayer(marker);
    }

    marker = L.marker([lat, lon]).addTo(map)
        .bindPopup(`<b>${cityName}</b>`).openPopup();
}
*/

/**
 * Fetches current weather data for a given city.
 * @param {string} city - The name of the city.
 * @returns {Promise<Object>} - A promise that resolves with weather data.
 */
async function getCurrentWeather(city) {
    try {
        const response = await fetch(`${BASE_URL}/weather?q=${city}&units=metric&appid=${API_KEY}`);
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                throw new Error("Invalid API key. Please check your key or wait for activation.");
            } else if (response.status === 404) {
                throw new Error(`City not found: "${city}". Please check spelling.`);
            } else {
                throw new Error(errorData.message || 'An unknown error occurred while fetching weather data.');
            }
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching current weather:", error);
        throw error;
    }
}

/**
 * Fetches 5-day weather forecast data for a given city.
 * @param {string} city - The name of the city.
 * @returns {Promise<Object>} - A promise that resolves with forecast data.
 */
async function getFiveDayForecast(city) {
    try {
        const response = await fetch(`${BASE_URL}/forecast?q=${city}&units=metric&appid=${API_KEY}`);
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                throw new Error("Invalid API key. Please check your key or wait for activation.");
            } else if (response.status === 404) {
                throw new Error(`City not found: "${city}". Please check spelling.`);
            } else {
                throw new Error(errorData.message || 'An unknown error occurred while fetching forecast data.');
            }
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching forecast:", error);
        throw error;
    }
}

/**
 * Fetches UV Index data for given coordinates using OpenWeatherMap One Call API.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @returns {Promise<Object>} - A promise that resolves with One Call API data.
 */
async function getUvIndex(lat, lon) {
    try {
        const response = await fetch(`${BASE_URL}/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily,alerts&appid=${API_KEY}`);
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                throw new Error("Invalid API key for UV Index. Please check your key or wait for activation.");
            } else {
                throw new Error(errorData.message || 'Error fetching UV Index.');
            }
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching UV Index:", error);
        return { current: { uvi: 'N/A' } }; // Return a default value if UV fails
    }
}

/**
 * Converts Celsius to Fahrenheit.
 * @param {number} celsius - Temperature in Celsius.
 * @returns {number} - Temperature in Fahrenheit.
 */
function convertCelsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

/**
 * Formats temperature based on the current unit.
 * @param {number} tempCelsius - Temperature in Celsius.
 * @returns {string} - Formatted temperature string.
 */
function formatTemperature(tempCelsius) {
    if (currentUnit === 'metric') {
        return `${Math.round(tempCelsius)}°C`;
    } else {
        return `${Math.round(convertCelsiusToFahrenheit(tempCelsius))}°F`;
    }
}

/**
 * Updates the UI with current weather data.
 * @param {Object} data - Current weather data from OpenWeatherMap.
 * @param {number|string} uvIndex - The current UV Index value or 'N/A'.
 */
function updateCurrentWeatherUI(data, uvIndex) {
    const date = new Date(data.dt * 1000);
    currentCityElem.textContent = `${data.name}, ${data.sys.country}`;
    currentDateElem.textContent = `${date.toDateString()} | ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    currentWeatherIconElem.src = `${WEATHER_ICON_BASE_URL}${data.weather[0].icon}@2x.png`;
    currentWeatherIconElem.alt = data.weather[0].description;
    currentTempElem.textContent = formatTemperature(data.main.temp);
    currentDescriptionElem.textContent = data.weather[0].description;
    currentFeelsLikeElem.textContent = formatTemperature(data.main.feels_like);
    currentHumidityElem.textContent = `${data.main.humidity}%`;
    currentWindElem.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;

    currentVisibilityElem.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    currentPressureElem.textContent = `${data.main.pressure} hPa`;

    currentUvIndexElem.textContent = uvIndex !== undefined ? uvIndex : 'N/A';

    const sunriseTime = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sunsetTime = new Date(data.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    currentSunriseElem.textContent = sunriseTime;
    currentSunsetElem.textContent = sunsetTime;
}

/**
 * Updates the UI with 5-day daily forecast data.
 * @param {Object} data - 5-day forecast data from OpenWeatherMap.
 */
function updateDailyForecastUI(data) {
    dailyForecastContainer.innerHTML = '';
    const dailyForecasts = data.list.filter(item => item.dt_txt.includes("12:00:00"));

    dailyForecasts.forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const forecastIconUrl = `${WEATHER_ICON_BASE_URL}${day.weather[0].icon}@2x.png`;

        const forecastCard = document.createElement('div');
        forecastCard.classList.add('forecast-day-card');
        forecastCard.innerHTML = `
            <p class="day-name">${dayName}</p>
            <img class="forecast-icon" src="${forecastIconUrl}" alt="${day.weather[0].description}">
            <span class="forecast-temp">${formatTemperature(day.main.temp)}</span>
            <p class="forecast-description">${day.weather[0].description}</p>
        `;
        dailyForecastContainer.appendChild(forecastCard);
    });
}

/**
 * Updates the UI with hourly forecast data.
 * @param {Object} data - 5-day forecast data from OpenWeatherMap (contains hourly steps).
 */
function updateHourlyForecastUI(data) {
    hourlyForecastContainer.innerHTML = '';
    const hourlyForecasts = data.list.slice(0, 8); // Get the next 8 entries (24 hours)

    hourlyForecasts.forEach(hour => {
        const date = new Date(hour.dt * 1000);
        const hourTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const forecastIconUrl = `${WEATHER_ICON_BASE_URL}${hour.weather[0].icon}@2x.png`;

        const hourlyCard = document.createElement('div');
        hourlyCard.classList.add('hourly-forecast-card');
        hourlyCard.innerHTML = `
            <p class="hour-time">${hourTime}</p>
            <img class="hourly-icon" src="${forecastIconUrl}" alt="${hour.weather[0].description}">
            <span class="hourly-temp">${formatTemperature(hour.main.temp)}</span>
            <p class="hourly-description">${hour.weather[0].description}</p>
        `;
        hourlyForecastContainer.appendChild(hourlyCard);
    });
}

/**
 * Renders either the daily or hourly forecast based on currentForecastView.
 * @param {Object} forecastData - The raw 5-day forecast data.
 */
function renderForecast(forecastData) {
    dailyForecastContainer.classList.add('hidden');
    hourlyForecastContainer.classList.add('hidden');

    if (currentForecastView === 'daily') {
        updateDailyForecastUI(forecastData);
        dailyForecastContainer.classList.remove('hidden');
    } else { // 'hourly'
        updateHourlyForecastUI(forecastData);
        hourlyForecastContainer.classList.remove('hidden');
    }
}

/**
 * Changes the background image based on weather condition.
 * @param {string} condition - Main weather condition (e.g., "Clear", "Rain", "Clouds").
 */
function setDynamicBackground(condition) {
    document.body.classList.remove('clear-sky', 'rainy-sky', 'cloudy-sky');
    if (condition.includes("Rain") || condition.includes("Drizzle")) {
        document.body.classList.add('rainy-sky');
    } else if (condition.includes("Clear")) {
        document.body.classList.add('clear-sky');
    } else if (condition.includes("Clouds") || condition.includes("Mist") || condition.includes("Haze") || condition.includes("Fog")) {
        document.body.classList.add('cloudy-sky');
    }
}

/**
 * Main function to fetch and display weather data.
 * @param {string} city - The city to fetch weather for.
 */
async function fetchAndDisplayWeather(city) {
    showMessage('loading', 'Loading weather data...');
    try {
        const currentWeather = await getCurrentWeather(city);
        const fiveDayForecast = await getFiveDayForecast(city);

        currentWeatherData = currentWeather;
        forecastWeatherData = fiveDayForecast;

        const lat = currentWeather.coord.lat;
        const lon = currentWeather.coord.lon;
        const uvIndexData = await getUvIndex(lat, lon);

        updateCurrentWeatherUI(currentWeatherData, uvIndexData.current.uvi);
        renderForecast(forecastWeatherData);
        setDynamicBackground(currentWeatherData.weather[0].main);
        hideMessages();
        // updateMap(lat, lon, currentWeather.name); // REMOVED
        // weatherMapContainer.classList.remove('hidden'); // REMOVED

    } catch (error) {
        showMessage('error', `Error: ${error.message}`);
        console.error("Failed to fetch weather data:", error);
        forecastToggleButtons.classList.add('hidden');
        // weatherMapContainer.classList.add('hidden'); // REMOVED
    }
}

/**
 * Handles initial load and user's current location.
 */
function initializeWeather() {
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
        cityInput.value = lastCity;
        fetchAndDisplayWeather(lastCity);
    } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}`);
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Could not determine city from location.');
                    }
                    const data = await response.json();
                    if (data && data.name) {
                        cityInput.value = data.name;
                        fetchAndDisplayWeather(data.name);
                        localStorage.setItem('lastCity', data.name);
                    } else {
                        fetchAndDisplayWeather('Merta');
                    }
                } catch (geoError) {
                    console.error("Error getting city from geolocation:", geoError);
                    showMessage('error', "Could not get your location. Defaulting to Merta.");
                    fetchAndDisplayWeather('Merta');
                }
            },
            (geoError) => {
                console.error("Geolocation denied or error:", geoError);
                showMessage('error', "Geolocation denied. Defaulting to Merta.");
                fetchAndDisplayWeather('Merta');
            }
        );
    } else {
        console.log("Geolocation is not supported by this browser.");
        showMessage('error', "Geolocation not supported. Defaulting to Merta.");
        fetchAndDisplayWeather('Merta');
    }
    // Set initial unit active state
    if (currentUnit === 'metric') {
        celsiusBtn.classList.add('active');
        fahrenheitBtn.classList.remove('active');
    } else {
        fahrenheitBtn.classList.add('active');
        celsiusBtn.classList.remove('active');
    }
    // Set initial forecast view active state and hide containers
    dailyForecastBtn.classList.add('active');
    hourlyForecastBtn.classList.remove('active');
    dailyForecastContainer.classList.remove('hidden');
    hourlyForecastContainer.classList.add('hidden');
    forecastToggleButtons.classList.add('hidden'); // Hide until data is loaded
    // weatherMapContainer.classList.add('hidden'); // REMOVED
}


// --- Event Listeners ---
searchButton.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        fetchAndDisplayWeather(city);
        localStorage.setItem('lastCity', city);
    } else {
        showMessage('error', 'Please enter a city name to search.');
    }
});

cityInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        searchButton.click();
    }
});

celsiusBtn.addEventListener('click', () => {
    if (currentUnit !== 'metric') {
        currentUnit = 'metric';
        celsiusBtn.classList.add('active');
        fahrenheitBtn.classList.remove('active');
        if (currentWeatherData && forecastWeatherData) {
            const currentUvValue = currentUvIndexElem.textContent.replace('N/A', '').trim();
            updateCurrentWeatherUI(currentWeatherData, parseFloat(currentUvValue) || undefined);
            renderForecast(forecastWeatherData);
        }
    }
});

fahrenheitBtn.addEventListener('click', () => {
    if (currentUnit !== 'imperial') {
        currentUnit = 'imperial';
        fahrenheitBtn.classList.add('active');
        celsiusBtn.classList.remove('active');
        if (currentWeatherData && forecastWeatherData) {
            const currentUvValue = currentUvIndexElem.textContent.replace('N/A', '').trim();
            updateCurrentWeatherUI(currentWeatherData, parseFloat(currentUvValue) || undefined);
            renderForecast(forecastWeatherData);
        }
    }
});

dailyForecastBtn.addEventListener('click', () => {
    if (currentForecastView !== 'daily') {
        currentForecastView = 'daily';
        dailyForecastBtn.classList.add('active');
        hourlyForecastBtn.classList.remove('active');
        if (forecastWeatherData) {
            renderForecast(forecastWeatherData);
        }
    }
});

hourlyForecastBtn.addEventListener('click', () => {
    if (currentForecastView !== 'hourly') {
        currentForecastView = 'hourly';
        hourlyForecastBtn.classList.add('active');
        dailyForecastBtn.classList.remove('active');
        if (forecastWeatherData) {
            renderForecast(forecastWeatherData);
        }
    }
});

if (voiceSearchButton) {
    voiceSearchButton.addEventListener('click', () => {
        if (recognition) {
            try {
                recognition.start();
            } catch (e) {
                console.error("Speech recognition already started or error:", e);
                showMessage('error', 'Voice search is already active or an error occurred. Please try again.');
                voiceSearchButton.classList.remove('listening');
            }
        } else {
            showMessage('error', 'Voice search not supported in this browser.');
        }
    });
}

// --- Initialize on Load ---
document.addEventListener('DOMContentLoaded', initializeWeather);
