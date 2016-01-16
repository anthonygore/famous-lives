var express     = require('express'),
    app         = express(),
    fs          = require('fs'),
    url         = require('url'),
    http        = require('http'),
    path        = require('path'),
    request     = require('request'),
    mongo       = require('mongodb'),
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
        var params = {"name":1,"birthyear":1,"domain":1,"continentName":1,_id:0};
        var sort = {
            "HPI" : 1
        };

        collection.find({}, params).sort(sort).toArray(function(err, items) {

            console.log("toArray number of rows: " + items.length);

            var year_pos = [];
            var year_neg = [];

            items.forEach(function(item, index){

                // Add the nameLength property
                item.nameLength = item.name.length;

                // Push to year object
                var yr = parseInt(item.birthyear);

                if (!isNaN(yr)) {
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
                }

            });

            callback(null, year_pos, year_neg);
            db.close();
        });

    });

};

var checkDbExists = function (callback) {

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

    //mdb_client.connect(mdb_url, function(err, db) {
    //
    //    if (err) {
    //        callback(err, null);
    //        return;
    //    }
    //
    //    db.dropDatabase(function(err){
    //        callback(err, false);
    //        db.close();
    //    });
    //
    //
    //});
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

var insertPeopleDb = function (data, callback) {

    mdb_client.connect(mdb_url, function(err, db) {

        if (err) {
            callback(err);
        }

        var collection = db.collection('people');

        collection.insertMany(data, function(err, object) {
            callback(err);
            db.close();
        });

    });

};

var insertChartDb = function (data, callback) {

    mdb_client.connect(mdb_url, function(err, db) {

        if (err) {
            callback(err);
        }

        var collection = db.collection('chart');

        collection.insertOne(data, function(err, object) {
            callback(err);
            db.close();
        });

    });

};

var getChartDb = function(callback){

    mdb_client.connect(mdb_url, function(err, db) {

        if (err) {
            callback(err, null);
        }

        var collection = db.collection('chart');

        collection.find().toArray(function(err, items) {
            callback(null, items[0].data);
            db.close();
        });

    });
};

var processFile = function(file, callback) {

    console.log("Processing data file");

    var stream = fs.createReadStream(file);

    var arr = [];

    csv
        .fromStream(stream, {
            delimiter : '\t',
            headers : true
        })
        .on("data", function(data){

            arr.push(data);

        })
        .on("end", function(){

            insertPeopleDb(arr, function(err){
                if (err != null) {
                    console.log("Error inserting people into db.");
                    console.log(err);
                }
                console.log("Processing data file complete");
                callback();
            });

        })
    ;
};

var getDataFile = function(callback) {

    console.log("Checking if data file has been downloaded.");

    var file = './data.csv';

    fs.stat(file, function(err, stat) {

        if (err && err.code == 'ENOENT') {

            console.log("File does not exist, downloading");

            downloadFile('http://pantheon.media.mit.edu/pantheon.tsv', file, function() {

                callback(file);

            });

        } else {

            callback(file);

        }

    });
};

function buildChart(callback) {

    console.log("Building chart.");

    getPeople(function(err, year_pos, year_neg){

        if (err) {

            console.log("Error getting people from db.");
            console.log(err);

        } else {

            var chart = [];
            var scale = 0.5;

            // Construct the chart data
            [year_pos].forEach(function(year, i){ // year_neg

                console.log("Year (positive) number of rows: " + year.length);
                var totalItems = 0;
                year.forEach(function(item, index){
                    totalItems += item.length;
                });
                console.log("Year (positive) total items: " + totalItems);

                var pops;
                var line = 0;
                var empty = false;
                var keys = Object.keys(year);
                var current = parseInt(keys[0]);
                var highest = parseInt(keys.slice(-1)[0]);

                // Process the year array until it's empty
                while (!empty) {

                    pops = 0;
                    current = parseInt(keys[0]);

                    while (current <= highest) {

                        // Check if there are any people in this year...
                        if (year[current] == false || year[current] == null) {

                            //If not, add 1
                            current++;

                        } else {

                            // Pop the first person off the current year
                            var person = year[current].pop();
                            pops++;

                            // Add the popped person to chart
                            if (!chart[line]) {
                                chart[line] = [];
                            }
                            chart[line].push(person);

                            // Rather than searching for the next year, move forward the number of letters (the
                            // reason for this will be obvious when presenting the data in the front end).
                            current += Math.ceil(person.nameLength * scale);
                        }

                    }

                    // After every iteration, move to the next line
                    line++;

                    // If pops is zero, it means there weren't any years with content and we must be done..
                    if (pops == 0) {
                        empty = true;
                    }

                    console.log("Pops: " + pops);

                }

            });

            // Chart should have about 11,000 items in it
            console.log("Chart number of rows: " + chart.length);
            var totalItems = 0;
            chart.forEach(function(item, index){
                totalItems += item.length;
            });
            console.log("Chart total items: " + totalItems);

            console.log("Chart built, inserting into database");

            insertChartDb({data : chart}, function(err){
                if (err) {

                    console.log("Error inserting chart into db.");
                    console.log(err);

                } else {

                    console.log("Chart build complete.");
                    callback();

                }
            });

        }

    });

}

var seedDb = function(callback) {

    console.log("Checking if database exists.");

    // Check if the database is empty
    checkDbExists(function(err, dbExists){

        if (err) {
            console.log("Error checking db.");
            console.log(err);
            return;
        }

        if (!dbExists) {

            console.log("Database does not exist.");

            getDataFile(function(file){

                processFile(file, function(){

                    buildChart(function(){

                        console.log("Database seeding complete.");
                        callback();

                    });
                })

            });

        } else {

            console.log("Data exists");
            callback();

        }
    });

};

var cache = [];

var getChartData = function (year_start, year_end, callback) {

    // Check if this exists in cache
    if (cache[year_start] && cache[year_start][year_end]) {

        console.log("[" + year_start + "," + year_end + "] found in cache.");

        callback(cache[year_start][year_end]);

    } else {

        console.log("[" + year_start + "," + year_end + "] not found in cache.");

        var rtn = [];

        getChartDb(function(err, chart){

            if (err) {
                console.log("Error gettingt chart from db.");
                console.log(err);
            }

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

            callback(rtn);

        });

    }


};

seedDb(function(){

    app.use(express.static('./src/public'));

    // Routes

    app.get('/', function(req, res) {
        res.sendFile(path.join(__dirname, 'src', 'index.html'));
    });

    app.get('/people/:year_start/:year_end/:row_start/:row_end', function(req, res) {

        var year_start = parseInt(req.params.year_start);
        var year_end = parseInt(req.params.year_end);
        var row_start = parseInt(req.params.row_start);
        var row_end = parseInt(req.params.row_end);

        getChartData(year_start, year_end, function(data){

            if (row_end > data.length) {
                row_end = data.length;
            }

            return res.json(
                data.slice(row_start, row_end)
            );

        });

    });

    var port = 4000;
    app.listen(port);
    console.log("App now listening on port " + port);

});
