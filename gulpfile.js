var gulp = require("gulp");

var shell = require("gulp-shell");


gulp.task("run-ff", function(){
   console.log("Running the application with Firefox");
    return gulp.src("")
        .pipe(shell([
            'firefox -app src/application.ini --jsconsole'
        ]));
});


gulp.task("run-xr", function(){
   console.log("Running the application with XULRunner");
    return gulp.src("")
        .pipe(shell([
            'xulrunner src/application.ini --jsconsole'
        ]));
});