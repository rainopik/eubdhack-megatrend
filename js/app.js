(function(window, document, $) {
    var app = window.app = window.app || {};

    app.ui = app.ui || {};

    app.ui = $.extend(app.ui, {
        _spinner: null,
        spinnerStart: function() {
            var options = {
                color: '#474C55',
                radius: 8,
                length: 6,
                lines: 11,
                width: 4
            };
            app.ui._spinner = new Spinner(options).spin();
            $('body').append(app.ui._spinner.el);
        },

        spinnerStop: function() {
            if (app.ui._spinner) {
                app.ui._spinner.stop();
            }
        }
    });

})(window, document, window.jQuery);
