const express = require('express');
const bodyParser = require('body-parser');
var session = require('express-session');
const https = require('https');
var dateFormat = require('dateformat');
const app = express();
const path = require('path');
const router = express.Router();
var ssn ;

const hostname = '127.0.0.1';
const port = 1337;

const hash_substr1 = '#access_token=';
const hash_substr2 = '&token_type=bearer&expires_in=3600';

const CITY_NEW_YORK = 'New York';
const CITY_SAN_FRANCISCO = 'San Francisco';

const NEW_YORK_LAT = 40.730610;
const NEW_YORK_LON = -73.935242;

const SAN_FRANCISCO_LAT = 37.773972;
const SAN_FRANCISCO_LON = -122.431297;

const COUNTRY = 'us';

const STATE_CA = 'CA';
const STATE_NY = 'NY';

const DAY_START_TIME = 'T00:00:00';

const MASK = "yyyy-mm-dd";

const EVENT_NAME = 'name';
const EVENT_DESC = 'description';
const EVENT_DATE = 'local_date';
const EVENT_TIME = 'local_time';
const EVENT_ADDRESS_1 = 'address_1';
const EVENT_ADDRESS_2 = 'address_2';
const EVENT_VENUE = 'venue';
const EVENT_DURATION = 'duration';

app.use(bodyParser.urlencoded({ extended: true }));
//app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 5*60*1000 }}));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}))

router.get('/',function(req,res){
    res.sendFile(path.join(__dirname + '/index.html'));
    //__dirname : It will resolve to your project folder.
});

router.post('/save',function(req,res){

    ssn = req.session;
    ssn.CITY = req.body.CITY;
    ssn.KEYWORD = req.body.KEYWORD;
    ssn.START_DATE = req.body.START_DATE;
    ssn.END_DATE = req.body.END_DATE;

    res.end("ok");
});

router.post('/set',function(req,res){

    var data = null;

    if (typeof ssn !== 'undefined' && ssn !== null) {
        data = JSON.stringify({ city : ssn.CITY, start_date : ssn.START_DATE, end_date : ssn.END_DATE, keyword: ssn.KEYWORD });
    }
    console.log('data: ' + data);
    res.end(data);
});

router.post('/', (req, res) => {

    var date_start_input = ssn.START_DATE;
    var date_end_input = ssn.END_DATE;
    var city = ssn.CITY;
    var keyword = ssn.KEYWORD;
    var window_location_hash = req.body.WINDOW_LOCATION_HASH;
    var token = window_location_hash.replace(hash_substr1,'').replace(hash_substr2,'');

    var date_start = new Date(date_start_input);
    var date_end = new Date(date_end_input);

    var startDate = dateFormat(date_start, MASK);
    var endDate = dateFormat(date_end, MASK);

    var lon = NEW_YORK_LON;
    var lat = NEW_YORK_LAT;

    if(city == CITY_SAN_FRANCISCO){
        lon = SAN_FRANCISCO_LON;
        lat = SAN_FRANCISCO_LAT;
    }

    var path =
        `/find/upcoming_events?lon=${lon}&end_date_range=${endDate}T00:00:00&start_date_range=${startDate}T00:00:00&text=${keyword}&lat=${lat}`;

    var options = {
        hostname: 'api.meetup.com',
        path: path,
        method: 'GET',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}
    };

    callback = function(response) {
        var str = '';

        //another chunk of data has been received, so append it to `str`
        response.on('data', function (chunk) {
            str += chunk;
        });

        //the whole response has been received, so we just print it out here
        response.on('end', function () {
            //console.log(str);
            json = JSON.parse(str);
            var events = { "events" : [] };
            var i = 0;
            json.events.forEach(function(entry) {
                i++;
                var event;
                if("venue" in entry) {
                    event = {
                        "name": `<h3>${i}. ${entry.name}</h3>`,
                        "description": entry.description,
                        "local_date": entry.local_date,
                        "local_time": entry.local_time,
                        "address": entry.venue.address_1
                    };
                }
                else{
                    event = {
                        "name": `<h3>${i}. ${entry.name}</h3>`,
                        "description": entry.description,
                        "local_date": entry.local_date,
                        "local_time": entry.local_time,
                    };
                }
                events.events.push(event);
            });

            res.json(events);
        });
    }

    https.request(options, callback).on('error', function(e){
        console.log("Got an error: ", e);
    }).end();

    //res.end("ok");
});

//add the router
app.use('/', router);
app.listen(process.env.port || port);

console.log(`Server running at http://${hostname}:${port}/`);
