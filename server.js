// console.log('123');

// //مصيبة 1_____________________
'use strict';
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;
const cors = require('cors');
const superagent = require('superagent')
const pg = require('pg');
console.log(process.env.DATABASE_URL);

const client = new pg.Client(process.env.DATABASE_URL);


app.use(cors());

app.get('/', (request, response) => {
    response.status(200).send('Home Page');
  });

// // app.use(errorHandler);
app.get('/location', (request, response) => {
  const city = request.query.city;
  const SQL = 'SELECT * FROM locations WHERE search_query =$1';
  const values = [city];
  client
    .query(SQL, values)
    .then((result) => {
      if (result.rows.length > 0) {
        response.status(200).json(result.rows[0]);
      } else {
        superagent(`https://eu1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json`
        )
        .then((apiResult) => {
          const geoData = apiResult.body;
          const locationData = new Location(city, geoData);
          const SQL = 'INSERT INTO locations (search_query,formatted_query,latitude,longitude)VALUES($1,$2,$3,$4) RETURNING *';
          const values = [
            locationData.search_query,
            locationData.formatted_query,
            locationData.latitude,
            locationData.longitude,
          ];
          client.query(SQL, values).then((rowResult) => {
            console.log(rowResult.rows);
            response.status(200).json(rowResult.rows[0]);
          })
        })
        .catch((err) => errorHandler(err, request, response)
        );
      }
    })
   
});


// //مصيبة 2_____________________

app.get('/weather', weatherHandler);
app.get('/trails', trailhandler);








// // //____________________

  function weatherHandler(request, response) {
    superagent(
      `https://api.weatherbit.io/v2.0/forecast/daily?city=${request.query.search_query}&key=${process.env.WEATHER_API_KEY}`
    )
      .then((weatherRes) => {
        console.log(weatherRes);
        const weatherSummaries = weatherRes.body.data.map((day) => {
          return new Weather(day);
        });
        response.status(200).json(weatherSummaries);
      })
      .catch((errT)=> errorHandler(errT, request, response));
  }




// // //___________________________________________________

    function trailhandler(request, response) {
    superagent(`https://www.hikingproject.com/data/get-trails?lat=${request.query.latitude}&lon=${request.query.longitude}&maxDistance=400&key=${process.env.TRAIL_API_KEY}`)

    .then((trailRes) => {   
        console.log(trailRes.body);
        const trailsobj = trailRes.body.trails.map((trail$$)=> {
            return new Trail(trail$$);
        });

        response.status(200).json(trailsobj);

    })
    .catch((errT)=> errorHandler(errT, request, response));

   };






// // //______________________________________________
app.use('*', notFoundHandler);

function notFoundHandler(request, response) {
  response.status(404).send('page Not Found');
}



// // constructors_______________________

function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData[0].display_name;
  this.latitude = geoData[0].lat;
  this.longitude = geoData[0].lon;
}

   function Weather(day) {
     this.forecast = day.weather.description;
     this.time = new Date(day.valid_date).toString().slice(0, 15);
  }

  function Trail(trail$$) {
    this.name = trail$$.name;
    this.location = trail$$.location ;
    this.length = trail$$.length ;
    this.stars = trail$$.stars ;
    this.star$votes = trail$$.star_votes ;
    this.summary = trail$$.summary ;
    this.trail$url = trail$$.trail_url ;
    this.conditions= trail$$.conditions;
    this.conditions_date=trail$$.condition_date;
    this.conditions_time=trail$$.condtion_time
}

 function errorHandler(error, request, response) {
   response.status(500).send(error);
 }


client
  .connect()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`my server is running on port ${PORT}`)

    );
  })
  .catch((err) => {
    throw new Error(err);
  });