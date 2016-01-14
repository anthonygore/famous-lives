var express     = require('express'),
    app         = express(),
    fs          = require('fs'),
    request     = require('request'),
    url         = require('url'),
    mongo       = require('mongodb'),
    http        = require('http'),
    csv         = require('fast-csv')
    ;

var MONGO_URL           = process.env.MONGO_PORT,
    MONGO_URL_PARSED    = url.parse(MONGO_URL),
    MONGO_HOST          = MONGO_URL_PARSED.hostname,
    MONGO_PORT          = MONGO_URL_PARSED.port,
    DB_NAME             = "hh"
    ;

var mdb_client = mongo.MongoClient;
var mdb_url = "mongodb://" + MONGO_HOST + ":" + MONGO_PORT + "/" + DB_NAME;

// Functions

var getPeople = function (callback) {

    mdb_client.connect(mdb_url, function(err, db) {

        if (err) {
            callback(err, null, null);
        }

        var collection = db.collection('people');
        var params = {
            "name":1,
            "birthyear":1,
            "domain":1,
            "continentName":1,
            _id:0
        };
        var sort = {
            "HPI" : -1
        };

        collection.find({}, params).sort(sort).toArray(function(err, items) {

            var year_pos = [];
            var year_neg = [];

            items.forEach(function(item, index){

                // Add the nameLength property
                item.nameLength = item.name.length;

                // Push to year object
                var yr = parseInt(item.birthyear);

                if (yr < 0) {
                    if (!year_neg[yr*-1]) {
                        year_neg[yr*-1] = [];
                    }
                    year_neg[yr*-1].push(item);
                } else {
                    if (!year_pos[yr]) {
                        year_pos[yr] = [];
                    }
                    year_pos[yr].push(item);
                }

            });

            callback(null, year_pos, year_neg);
            db.close();
        });

    });

};

var checkSeeded = function (callback) {

    mdb_client.connect(mdb_url, function(err, db) {

        if (err) {
            callback(err, null);
            return;
        }

        db.listCollections({name: "people"})
            .next(function(err, collinfo) {
                callback(err, collinfo);
                db.close();
            });

    });
};

var downloadFile = function(url, dest, cb) {

    var file = fs.createWriteStream(dest);

    var request = http.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb);
        });
    }).on('error', function(err) {
        fs.unlink(dest);
        if (cb) cb(err.message);
    });

};

var insertDb = function (data, callback) {

    mdb_client.connect(mdb_url, function(err, db) {

        if (err) {
            callback(err);
        }

        var collection = db.collection('people');

        collection.insertOne(data, function(err, object) {
            callback(err);
            db.close();
        });

    });

};

var seedDB = function(callback) {

    console.log("Checking if database exists.");

    // Check if the database is empty
    checkSeeded(function(err, exists){

        if (err) {
            console.log(err);
            return;
        }

        if (!exists) {

            console.log("Database does not exist. Downloading data file.");

            // Download file
            downloadFile('http://pantheon.media.mit.edu/pantheon.tsv', './data.csv', function() {

                console.log("Processing data file");

                var stream = fs.createReadStream("./data.csv");

                csv
                    .fromStream(stream, {delimiter : '\t', headers : true})
                    .on("data", function(data){
                        insertDb(data, function(err){
                            if (err != null) {
                                console.log(err);
                            }
                        });
                    })
                    .on("end", function(){

                        console.log("Processing data file complete.");
                        callback();

                    })
                ;

            });

        } else {

            console.log("Data exists");
            callback();
        }
    });

};

var chart = [];

function buildChart(callback) {

    console.log("Checking if row data is built.");

    if (chart.length == 0) {

        console.log("Building chart.");

        getPeople(function(err, year_pos, year_neg){
            if (err) {
                console.log(err);
            } else {

                var line = 0;
                var scale = 1;

                // Construct the chart data
                [year_pos].forEach(function(year, i){ // year_neg,

                    // "Sign" means -1 or +1
                    //var sign; if (i == 0) {sign = -1;} else {sign = 1;}

                    var startTime = new Date().getTime();
                    while (year.length > 0 && (new Date().getTime() - startTime < 10000)) {

                        var keys = Object.keys(year);
                        var current = parseInt(keys[0]);
                        var highest = parseInt(keys.slice(-1)[0]);

                        while (current < highest && (new Date().getTime() - startTime < 10000)) {

                            // Check if there are any people in this year...
                            if (!year[current]) {

                                //If not, add 1
                                current++;

                            } else {

                                // Pop the first person off the current year
                                var person = year[current].pop();

                                // Add to chart
                                if (!chart[line]) {
                                    chart[line] = [];
                                }
                                chart[line].push(person);

                                // If that year is empty, remove it
                                if (year[current].length == 0) {
                                    year.splice(current, 1);
                                }

                                current += (person.nameLength * scale);
                            }

                        }

                        line++;
                    }

                    console.log("Chart build complete.");
                    callback();

                });

            }

        });


    } else {

        console.log("Chart already built.");
        callback();

    }

}

seedDB(function(){

    buildChart(function(){

        app.use(express.static('public'));

        // Routes

        app.get('/', function(req, res) {
            res.sendFile('src/index.html');
        });

        var cache = [];

        app.get('/people/:year_start/:year_end/:row_start/:row_end', function(req, res) {

            var year_start = parseInt(req.params.year_start);
            var year_end = parseInt(req.params.year_end);
            var row_start = parseInt(req.params.row_start);
            var row_end = parseInt(req.params.row_end);

            if (row_end > chart.length) {
                row_end = chart.length;
            }

            // Check if this exists in cache
            if (cache[year_start] && cache[year_start][year_end]) {

                console.log("[" + year_start + "," + year_end + "] found in cache.");

            } else {

                console.log("[" + year_start + "," + year_end + "] not found in cache.");

                var rtn = [];

                chart.forEach(function(line, index){
                    rtn[index] = [];
                    line.forEach(function(person, i){
                        if (person.birthyear > year_start && person.birthyear <= year_end) {
                            rtn[index].push(person);
                        }
                    });
                });

                // Put into cache
                if (!cache[year_start]) {
                    cache[year_start] = [];
                }

                cache[year_start][year_end] = rtn;

            }

            return res.json({
                data: cache[year_start][year_end].slice(row_start, row_end)
            });

        });

        var port = 4000;
        app.listen(port);
        console.log("App now listening on port " + port);

    });

});
