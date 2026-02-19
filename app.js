const express = require("express");
const layouts = require("express-ejs-layouts");
const session = require("express-session");
const fetch = require("node-fetch");

const app = express();
app.set("view engine", "ejs");
app.use(layouts);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "weather-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 10 } // 10 minutes
  })
);

// Home page
app.get("/", (req, res) => {
  res.render("index", {
    weather: req.session.weather || null,
    city: req.session.city || null,
    codes: req.session.codes || [],
    history: req.session.history || {}
  });
});

// Search 7-day forecast by city
app.get("/weather", async (req, res) => {
  const city = req.query.city;

  if (!city) {
    // ❌ 不重定向，只渲染提示
    return res.render("index", {
      weather: null,
      city: "Please enter a city",
      codes: [],
      history: req.session.history || {}
    });
  }

  try {
    // 1️⃣ Get latitude & longitude
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    );
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return res.render("index", {
        weather: null,
        city: "City not found",
        codes: [],
        history: req.session.history || {}
      });
    }

    const { latitude, longitude, name } = geoData.results[0];

    // 2️⃣ Get 7-day forecast
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    // 3️⃣ Store in session
    req.session.weather = weatherData.daily;
    req.session.city = name;
    req.session.codes = weatherData.daily?.weathercode || [];

    // 4️⃣ Render page
    res.render("index", {
      weather: weatherData.daily,
      city: name,
      codes: req.session.codes,
      history: req.session.history || {}
    });

  } catch (err) {
    console.error(err);
    res.render("index", {
      weather: null,
      city: "Failed to fetch weather data",
      codes: [],
      history: req.session.history || {}
    });
  }
});

// Historical weather
app.get("/history", async (req, res) => {
  const { city, date } = req.query;

  if (!city || !date) return res.render("history", { history: null });

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    );
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      return res.render("history", { history: null });
    }

    const { latitude, longitude } = geoData.results[0];

    const historyRes = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${date}&end_date=${date}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    const historyData = await historyRes.json();

    req.session.history = historyData;

    res.render("history", {
      weather: req.session.weather || null,
      city: req.session.city || city,
      codes: req.session.codes || [],
      history: historyData.daily || {}
    });

  } catch (err) {
    console.error(err);
    // res.render("history", { history: null });
  }
});

// Get weather by user's location
app.get("/weatherByLocation", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.render("index", {
      weather: null,
      city: "Please allow location access",
      codes: [],
      history: req.session.history || {}
    });
  }

  try {
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    req.session.weather = weatherData.daily;
    req.session.city = "📍 Current Location";
    req.session.codes = weatherData.daily?.weathercode || [];

  
 
      res.render("index", {
        weather: weatherData.daily,
        city: "📍 Current Location",
        codes: req.session.codes,
        history: req.session.history || {}
      });
 

  } catch (err) {
    console.error(err);
    res.render("index", {
      weather: null,
      city: "Failed to fetch location weather",
      codes: [],
      history: req.session.history || {}
    });
  }
});

// Start server
app.listen(3000, () => console.log("Server running at http://localhost:3000"));
