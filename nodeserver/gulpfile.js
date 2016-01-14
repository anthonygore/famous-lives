var gulp = require('gulp');
var sass = require('gulp-sass');

gulp.task('styles', function() {
    gulp.src('./src/resources/sass/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./src/public/css'));
});

gulp.task('default', function() {
    gulp.watch('./src/resources/sass/**/*.scss',['styles']);
});