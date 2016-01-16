$(document).ready(function(){

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
                $('<div></div>', {
                    'data-birth-year' : item.birthyear,
                    class : item.domain.toLowerCase().replace(/\W+/g, "-") + ' wrapper',
                    style : "width:" + ((year_end - item.birthyear) * scale) + "px;"
                })
                    .appendTo('[data-row="' + index + '"]')
                    .append('<div class="name-wrapper"><span class="bullet">•</span><span class="name">' + item.name + '</span></div>')
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
            var elem = $('#chart-wrapper');
            var pos = (scale * this.value) - elem.width();
            var speed = Math.min(Math.abs(elem.scrollLeft() - pos), 2000);
            console.log(speed);
            if (type == 'scroll') {
                elem.animate({scrollLeft: pos}, speed);
            } else {
                elem.scrollLeft(pos);
            }
        })
        .val(1980)
        .trigger('change', 'jump')
    ;

});