var gulp = require('gulp'),
    upload_gh = require('gulp-gh-pages');

// Deploy to github gh-pages branch.
gulp.task('deploy', function () {
    return gulp.src(['bower_components/*/dist/**/*', 'bower_components/*/build/output/*', 'index.html', 'js/**/*', 'styles/**/*'], {base: './'})
        .pipe(upload_gh());
});