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
                }
            })
            .fail(function(xhr) {
                console.log(xhr);
            })
    };

    var generateTimeLines = function(scale, inc, year_start, year_end){

        for (var i = 0; i < Math.floor((year_end - year_start)/inc); i++) {

            var year = year_end - (i * inc);
            var width;

            if (year == 0) {
                width = (inc + 1) * scale;
            }
            else if (year == inc) {
                width = (inc - 1) * scale;
            } else {
                width = inc * scale;
            }

            // Columns
            $('<div></div>', {
                class : 'col col-' + (i % 2 + 1),
                style : "width:" + width + "px;"
            })
                .appendTo('#time-lines')
            ;

            // Date
            var text = year;
            if (year < 0) {
                text = Math.abs(text) + "BC";
            }
            else if (year == 0) {
                text = "1AD";
            }

            // Time scale
            var time = $('<div></div>', {
                class : 'col',
                style : "width:" + width + "px;",
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

        $.each(data, function(index, obj){

            var rowNum = obj.row;
            var row = obj.data;

            // If there's no data, just continue
            if (typeof(row[0]) === 'undefined') {
                return false;
            }

            var rowElem = $('div[data-row="' + rowNum + '"]');

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

            var highest_birth_year = parseInt(log[rowNum][log[rowNum.length]]);

            for (var i = 0; i < row.length; i++) {

                var item = row[i];

                // Get some variables
                var domain = item.domain.toLowerCase().replace(/\W+/g, "-"),
                    birth_year = parseInt(item.birthyear),
                    name = item.name,
                    occupation = item.occupation.toLowerCase(),
                    country = toTitleCase(item.countryName)
                ;

                // Create element
                var elem =
                    '<div ' +
                        'style="width:' + ((global_year_end - birth_year) * scale) + 'px" ' +
                        'class="' +  domain + ' wrapper" ' +
                        'data-birth-year="' + birth_year + '"' +
                    '>' +
                        '<div class="name-wrapper">' +
                            '<span class="bullet">•</span>' +
                            '<span ' +
                                'class="name"' +
                                'data-birth-year="' + birth_year + '" ' +
                                'data-domain="' + domain + '" ' +
                                'data-name="' + name + '" ' +
                                'data-occupation="' + occupation + '" ' +
                                'data-country="' + country + '"' +
                            '>' + name + '</span>' +
                        '</div>' +
                    '</div>'
                ;

                // Use the log to efficiently find the spot to insert

                var _row = log[rowNum];
                var pos;

                if (_row.length == 0 || birth_year > highest_birth_year) {
                    pos = _row.length;
                    highest_birth_year = birth_year;
                } else {
                    for (var x = 0; x < _row.length; x++) {
                        if (birth_year < _row[x]) {
                            pos = x;
                            x = _row.length;
                        }
                    }
                }

                // Splice into the log
                log[rowNum].splice(pos, 0, birth_year);

                if (pos === 0) {
                    // Insert at the beginning
                    rowElem.prepend(elem);
                }
                else if (pos === _row.length || _row.length === 1) {
                    // Insert at the end
                    rowElem.append(elem);
                }
                else {
                    // Insert after...
                    $('div[data-birth-year="' + log[rowNum][pos - 1] + '"]', rowElem).after(elem);
                }

            }

        });

        // Clear the hover handler and re-create
        $('.name', '.row')
            .unbind('hover').unbind('click')
            .on('hover click', function(){

                var self = $(this);

                var domain = self.data('domain'),
                    birth = self.data('birth-year'),
                    name = self.data('name'),
                    occupation = self.data('occupation'),
                    country = self.data('country')
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

                $('#profile').html(blurb);

        });

        return true;
    };

    // Variables
    var global_year_start = -3500,
        global_year_end = 2010,
        scale = 10,
        inc = 5;
    ;

    // This is the order that data gets loaded
    var loadingQueue = [];
    for (var x = 1; x <= 141; x += 20) {
        loadingQueue.push(
            {year_start : 1500, year_end : 1999, row_start : x, row_end : x + 20},
            {year_start : 1000, year_end :  1499, row_start : x, row_end : x + 20},
            {year_start : 500, year_end : 999, row_start : x, row_end : x + 20},
            {year_start : 0, year_end : 499, row_start : x, row_end : x + 20},
            {year_start : -1000, year_end : -1, row_start : x, row_end : x + 20},
            {year_start : -2000, year_end : -1001, row_start : x, row_end : x + 20},
            {year_start : -5000, year_end : -2001, row_start : x, row_end : x + 20}
        );
    }

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
        else if (i == 0) {
            text = "1AD";
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