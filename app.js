const express = require("express");
const layouts = require("express-ejs-layouts");
const session = require("express-session");


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

 
app.get("/", (req, res) => {
  res.render("index", {
    weather: req.session.weather || null,
    city: req.session.city || null,
    codes: req.session.codes || [],
    history: req.session.history || {}
  });
});

 
app.get("/weather", async (req, res) => {
  const city = req.query.city;

  if (!city) {
   
    return res.render("index", {
      weather: null,
      city: "Please enter a city",
      codes: [],
      history: req.session.history || {}
    });
  }

  try {
  
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

 
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    const weatherData = await weatherRes.json();

 
    req.session.weather = weatherData.daily;
    req.session.city = name;
    req.session.codes = weatherData.daily?.weathercode || [];

 
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});