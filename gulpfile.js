(function() { "use strict"; } ());

var gulp = require("gulp");
var gulpTsLint = require("gulp-tslint");
var istanbul = require("gulp-istanbul");
var mocha = require("gulp-mocha");
var sonarqubeScanner = require("sonarqube-scanner");

gulp.task("tslint", () => {
    return gulp.src(["**/*.ts", "!**/*.d.ts", "!node_modules/**"])
      .pipe(gulpTsLint())
      .pipe(gulpTsLint.report());
});

/**
gulp.task("pre-test", function() {
  let result = gulp
    .src(["src/*.ts", "scripts/*.js"])
    .pipe(istanbul())
    .pipe(istanbul.hookRequire());
  return result;
});

gulp.task("test", gulp.series("pre-test", function() {
  let result = gulp
      .src(["src/*.ts", "scripts/*.js"])
      .pipe(mocha(process.env.CI && { reporter: "mocha-sonarqube-reporter" }))
      .pipe(istanbul.writeReports());
  return result;
}));
*/

gulp.task("default", function(callback) {
  // We just run a SonarQube analysis and push it to SonarCloud
  // (No need to pass the server URL and the token, we're using the Travis
  //  Addon for SonarCloud which does this for you.)
  // ----------------------------------------------------
  sonarqubeScanner(
    {
      options: {
        "sonar.sources": "./src/",
        "sonar.tests": "./src/test/",
      },
      "serverUrl": "https://sonarcloud.io",
    },
  callback);
});
