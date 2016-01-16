$(document).ready(function(){

    function toTitleCase(string) {
        // \u00C0-\u00ff for a happy Latin-1
        return string.toLowerCase().replace(/_/g, ' ').replace(/\b([a-z\u00C0-\u00ff])/g, function (_, initial) {
            return initial.toUpperCase();
        }).replace(/(\s(?:de|a|o|e|da|do|em|ou|[\u00C0-\u00ff]))\b/ig, function (_, match) {
            return match.toLowerCase();
        });
    }

    var getData = function(year_start, year_end, row_start, row_end, callback) {
        $.get(
            "/people/" + year_start + "/" + year_end + "/" + row_start + "/" + row_end,
            function() {

            })
            .done(function(data) {
                callback(data, year_start, year_end);
            })
            .fail(function() {

            })
    };

    var generateTimeLines = function(scale, inc, year_start, year_end){

        for (var i = 0; i <= Math.floor(year_end - year_start)/inc; i++) {

            // Columns
            $('<div></div>', {
                class : 'col col-' + (i % 2 + 1),
                style : "width:" + (5 * scale) + "px;"
            })
                .appendTo('#time-lines')
            ;

            // Time scale
            $('<div></div>', {
                class : 'col',
                style : "width:" + (5 * scale) + "px;",
                'data-year' : year_end - (i * 5)
            })
                .appendTo('#time-scale')
                .append('<div class="vertical-text">' + (year_end - (i * 5)) + '</div>')
            ;
        }

        $('#time-scale').css('width', 2000 * scale);
        $('#time-lines').css('width', 2000 * scale);
        $('#chart').css('width', 2000 * scale);
        $('#chart-wrapper').css('width', 2000 * scale);
    };

    var generateRows = function(resp, year_start, year_end){

        $.each(resp, function(index, row){

            // If row doesn't exist create it
            if ($('[data-row="' + index + '"]').length == 0) {
                $('<div></div>', {
                    'data-row' : index,
                    style : "width:" + ((year_end) * scale) + "px;",
                    class : 'row stripe-' + (index % 4 + 1)
                }).insertAfter('[data-row="' + (index - 1) + '"]');
            }

            // Create the person
            $.each(row, function(i, item){

                var domain = item.domain.toLowerCase().replace(/\W+/g, "-"),
                    birth = item.birthyear,
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

                $('<div></div>', {
                    'data-birth-year' : birth,
                    class : domain + ' wrapper',
                    style : "width:" + ((year_end - birth) * scale) + "px;"
                })
                    .appendTo('[data-row="' + index + '"]')
                    .append('<div class="name-wrapper"><span class="bullet">•</span><span class="name">' + name + '</span></div>')
                    .hover(function(){
                        $('#profile').html(blurb);
                    })
                ;

            })

        });
    };

    // Variables
    var year_start = -20,
        year_end = 2010,
        row_start = 1,
        row_end = 30,
        scale = 20,
        inc = 5
    ;

    // Create first row on load
    $('<div></div>', {
        'data-row' : 0,
        style : "width:" + ((year_end) * scale) + "px;",
        class : 'row stripe-1'
    }).appendTo('#chart');

    // Get data on load.
    getData(year_start, year_end, row_start, row_end, generateRows);

    // Generate time lines on load.
    generateTimeLines(scale, inc, year_start, year_end);

    // Populate select
    var year_select = $('select', '#year-select');
    for (var i = year_end; i >= year_start; i -= inc) {
        year_select.append('<option value="' + i + '">' + i + '</option>');
    }
    year_select
        .on('change', function(event, type){
            if (typeof(type) === 'undefined') {
                type = 'scroll'
            }
            var elem = $('#wrapper');
            var pos = (scale * this.value) - elem.width();
            var speed = Math.max(Math.min(Math.abs(elem.scrollLeft() - pos), 2000), 500);
            if (type == 'scroll') {
                elem.animate({scrollLeft: pos}, speed);
            } else {
                elem.scrollLeft(pos);
            }
        })
        .val(1980)
        .trigger('change', 'jump')
    ;

    // On scroll, need to load more records
    $('#wrapper').bind('scroll', function(event){
        //
    });


});