$(document).ready(function(){

    var scale = 20;

    var getData = function(year_start, year_end, row_start, row_end, callback) {
        var jqxhr = $.get(
            "/people/" + year_start + "/" + year_end + "/" + row_start + "/" + row_end,
            function() {

            })
            .done(function(data) {
                callback(data);
            })
            .fail(function() {

            })
            .always(function() {

            });
    };

    var generateLines = function(scale){
        for (var i = 0; i <= 399; i++) {
            $('<div></div>', {
                class : 'line line-' + (i % 2 + 1),
                style : "width:" + (5*scale) + "px;"
            })
                .appendTo('#lines')
                .append('<div class="vertical-text">' + (2000 - (i*5)) + '</div>')
            ;
        }

        $('#lines').css('width', 2000*scale);
    };

    var year_start = 1,
        year_end = 2000,
        row_start = 1,
        row_end = 13
    ;

    generateLines(scale);

    getData(year_start, year_end, row_start, row_end, function(resp){

        $.each(resp, function(index, row){

           if ($('[data-row="' + index + '"]').length == 0) {
               $('<div></div>', {
                   'data-row' : index,
                   style : "width:" + ((2000)*scale) + "px;",
                   class : 'row stripe-' + (index % 4 + 1)
               }).insertAfter('[data-row="' + (index - 1) + '"]');
           }
           $.each(row, function(i, item){
               $('<div></div>', {
                   'data-birth-year' : item.birthyear,
                   class : item.domain.toLowerCase().replace(/\W+/g, "-") + ' wrapper',
                   style : "right:" + ((2000 - item.birthyear)*scale) + "px;"
               })
                   .appendTo('[data-row="' + index + '"]')
                   .append('<div class="name"><span class="bullet">&bull;</span><span>' + item.name + '</span></div>')
               ;

           })

       });
    });


});