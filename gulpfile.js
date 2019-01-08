'use strict';
import * as gulp  from 'gulp';
import * as gulp_tslint from 'gulp-tslint';

gulp.task('tslint', () => {
    return gulp.src(['**/*.ts', '!**/*.d.ts', '!node_modules/**'])
      .pipe(gulp_tslint())
      .pipe(gulp_tslint.report());
});
