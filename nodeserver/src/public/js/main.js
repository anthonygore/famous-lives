$(document).ready(function(){

    function toTitleCase(string) {
        // \u00C0-\u00ff for a happy Latin-1
        return string.toLowerCase().replace(/_/g, ' ').replace(/\b([a-z\u00C0-\u00ff])/g, function (_, initial) {
            return initial.toUpperCase();
        }).replace(/(\s(?:de|a|o|e|da|do|em|ou|[\u00C0-\u00ff]))\b/ig, function (_, match) {
            return match.toLowerCase();
        });
    }

    var getData = function() {
        var data = loadingQueue.shift();
        $.get(
            "/people/" + data.year_start + "/" + data.year_end + "/" + data.row_start + "/" + data.row_end,
            function() {

            })
            .done(function(data) {
                renderData(data);
                if (loadingQueue.length > 0) {
                    getData();
                } else {
                    console.log("All data loaded.");
                }
            })
            .fail(function(xhr) {
                console.log(xhr);
            })
    };

    var generateTimeLines = function(scale, inc, year_start, year_end){

        for (var i = 0; i < Math.floor((year_end - year_start)/inc); i++) {

            // Columns
            $('<div></div>', {
                class : 'col col-' + (i % 2 + 1),
                style : "width:" + (5 * scale) + "px;"
            })
                .appendTo('#time-lines')
            ;

            // Date
            var year = year_end - (i * 5);
            var text = year;
            if (year < 0) {
                text = Math.abs(text) + "BC";
            }

            // Time scale
            var time = $('<div></div>', {
                class : 'col',
                style : "width:" + (5 * scale) + "px;",
                'data-year' : year
            })
                .appendTo('#time-scale')
            ;

            if (year != year_end) {
                time.append('<div class="vertical-text">' + text + '</div>');
            }
        }

        $('#time-scale').css('width', (year_end - year_start) * scale);
        $('#time-lines').css('width', (year_end - year_start) * scale);
        $('#chart').css('width', (year_end - year_start) * scale);
        $('#chart-wrapper').css('width', (year_end - year_start) * scale);
    };

    var renderData = function(data){

        var counter = 0;

        $.each(data, function(index, obj){

            var rowNum = obj.row;
            var row = obj.data;

            var rowElem = $('[data-row="' + rowNum + '"]');

            // If row doesn't exist create it
            if (rowElem.length == 0) {
                rowElem = $('<div></div>', {
                    'data-row' : rowNum,
                    style : "width:" + ((global_year_end - global_year_start) * scale) + "px;",
                    class : 'row stripe-' + (rowNum % 4 + 1)
                }).insertAfter('[data-row="' + (rowNum - 1) + '"]');
                // Add to log
                log[rowNum] = [];
            }

            // Create the person
            $.each(row, function(i, item){

                var domain = item.domain.toLowerCase().replace(/\W+/g, "-"),
                    birth = parseInt(item.birthyear),
                    name = item.name,
                    occupation = item.occupation.toLowerCase(),
                    country = toTitleCase(item.countryName)
                    ;

                var blurb =
                    '<ul>' +
                    '<li><strong>' + name + '</strong>, ' + occupation + '</li>';
                if (country == 'Unknown') {
                    blurb += '<li>Unknown birth place, ';
                } else {
                    blurb += '<li>Born in ' + country + ', ';
                }
                if (birth < 0) {
                    blurb += Math.abs(birth) + 'BC</li>'
                } else if (birth > 0 && birth < 500) {
                    blurb += birth + 'AD</li>'
                } else {
                    blurb += birth + '</li>'
                }
                blurb += '</ul>';

                // Create element
                var elem = $('<div></div>', {
                    'data-birth-year' : birth,
                    class : domain + ' wrapper',
                    style : "width:" + ((global_year_end - birth) * scale) + "px;"
                });

                // Find the place to put it, and add to log while at it..
                if (log[rowNum].length == 0) {
                    // It's the first element of the row
                    log[rowNum].push(birth);
                    rowElem.append(elem);
                } else {
                    var pos;
                    $.each(log[rowNum], function(key, val){
                        if (birth > val) {
                            pos = key + 1;
                        } else {
                            pos = key - 1;
                            return false;
                        }
                    });
                    // It's going to be inserted after another element
                    elem.insertAfter('[data-birth-year="' + log[rowNum][pos - 1] + '"]', rowElem);
                    log[rowNum].splice(pos, 0, birth);
                }

                elem
                    .append('<div class="name-wrapper"><span class="bullet">•</span><span class="name">' + name + '</span></div>')
                    .hover(function(){
                        $('#profile').html(blurb);
                    })
                ;
            });

        });

        return true;
    };

    // Variables
    var global_year_start = 0,
        global_year_end = 2010,
        row_start = 1,
        row_end = 20,
        scale = 10,
        inc = 5
    ;

    // This is the order that data gets loaded
    var loadingQueue = [
        {year_start : 1500, year_end : 1999, row_start : 1, row_end : 20},
        //{year_start : 1000, year_end :  1499, row_start : 1, row_end : 20},
        //{year_start : 500, year_end : 999, row_start : 1, row_end : 20},
        //{year_start : 0, year_end : 499, row_start : 1, row_end : 20},
        //{year_start : -1000, year_end : -1, row_start : 1, row_end : 20},
        //{year_start : -2000, year_end : -1001, row_start : 1, row_end : 20},
        //{year_start : -5000, year_end : -2001, row_start : 1, row_end : 20},
        //{year_start : 1500, year_end : 1999, row_start : 21, row_end : 40},
        //{year_start : 1000, year_end :  1499, row_start : 21, row_end : 40},
        //{year_start : 500, year_end : 999, row_start : 21, row_end : 40},
        //{year_start : 0, year_end : 499, row_start : 21, row_end : 40},
        //{year_start : -1000, year_end : -1, row_start : 21, row_end : 40},
        //{year_start : -2000, year_end : -1001, row_start : 21, row_end : 40},
        //{year_start : -5000, year_end : -2001, row_start : 21, row_end : 40},
        //{year_start : 1500, year_end : 1999, row_start : 21, row_end : 60},
        //{year_start : 1000, year_end :  1499, row_start : 21, row_end : 60},
        //{year_start : 500, year_end : 999, row_start : 21, row_end : 60},
        //{year_start : 0, year_end : 499, row_start : 21, row_end : 60},
        //{year_start : -1000, year_end : -1, row_start : 21, row_end : 60},
        //{year_start : -2000, year_end : -1001, row_start : 21, row_end : 60},
        //{year_start : -5000, year_end : -2001, row_start : 21, row_end : 60},
        //{year_start : 1500, year_end : 1999, row_start : 21, row_end : 80},
        //{year_start : 1000, year_end :  1499, row_start : 21, row_end : 80},
        //{year_start : 500, year_end : 999, row_start : 21, row_end : 80},
        //{year_start : 0, year_end : 499, row_start : 21, row_end : 80},
        //{year_start : -1000, year_end : -1, row_start : 21, row_end : 80},
        //{year_start : -2000, year_end : -1001, row_start : 21, row_end : 80},
        //{year_start : -5000, year_end : -2001, row_start : 21, row_end : 80},
        //{year_start : 1500, year_end : 1999, row_start : 21, row_end : 100},
        //{year_start : 1000, year_end :  1499, row_start : 21, row_end : 100},
        //{year_start : 500, year_end : 999, row_start : 21, row_end : 100},
        //{year_start : 0, year_end : 499, row_start : 21, row_end : 100},
        //{year_start : -1000, year_end : -1, row_start : 21, row_end : 100},
        //{year_start : -2000, year_end : -1001, row_start : 21, row_end : 100},
        //{year_start : -5000, year_end : -2001, row_start : 21, row_end : 100}
    ];

    // Create log (with first two rows already created)
    var log = [[],[]];

    // Create first row
    $('<div></div>', {
        'data-row' : 1,
        style : "width:" + ((global_year_end - global_year_start) * scale) + "px;",
        class : 'row stripe-1'
    }).appendTo('#chart');

    // Start downloading data
    getData();

    // Generate time lines on load.
    generateTimeLines(scale, inc, global_year_start, global_year_end);

    // Populate select
    var year_select = $('select', '#year-select');
    for (var i = 2000; i >= global_year_start; i -= 50) {
        var text = i;
        if (i < 0) {
            text = Math.abs(i) + "BC"
        }
        year_select.append('<option value="' + i + '">' + text + '</option>');
    }
    year_select
        .on('change', function(event, type){
            if (typeof(type) === 'undefined') {
                type = 'scroll'
            }
            var elem = $('#wrapper');
            var pos = (scale * (parseInt(this.value) + (global_year_start * -1))) - elem.width();
            var speed = Math.max(Math.min(Math.abs(elem.scrollLeft() - pos), 2000), 500);
            if (type == 'scroll') {
                elem.animate({scrollLeft: pos}, speed);
            } else {
                elem.scrollLeft(pos);
            }
        })
        .val(2000)
        .trigger('change', 'jump')
    ;

    // On scroll, need to load more records
    //$('#wrapper').bind('scroll', function(event){
    //    //getData(1500, global_year_end, row_start, row_end, renderData);
    //});


});