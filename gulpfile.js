let preprocessor = 'sass'; // Preprocessor (sass, scss, less, styl)
let fileswatch   = 'html,htm,txt,json,md,woff2'; // List of files extensions for watching & hard reload (comma separated)
let imageswatch  = 'jpg,jpeg,png,webp,svg'; // List of images extensions for watching & compression (comma separated)

const { src, dest, parallel, series, watch } = require('gulp');
const sass         = require('gulp-sass');
const scss         = require('gulp-sass');
const less         = require('gulp-less');
const styl         = require('gulp-stylus');
const cleancss     = require('gulp-clean-css');
const concat       = require('gulp-concat');
const browserSync  = require('browser-sync').create();
const uglify       = require('gulp-uglify-es').default;
const autoprefixer = require('gulp-autoprefixer');
const imagemin     = require('gulp-imagemin');
const newer        = require('gulp-newer');
const rsync        = require('gulp-rsync');
const del          = require('del');
const htmlValidator = require('gulp-w3c-html-validator');
const plumber = require('gulp-plumber');
const pug = require('gulp-pug');
const argv = require('yargs').argv;
const gulpif = require('gulp-if');
const svgSprite = require('gulp-svg-sprite');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');
const replace = require('gulp-replace');

// Local Server

function browsersync() {
	browserSync.init({
		server: { baseDir: 'app' },
		notify: false,
		// online: false, // Work offline without internet connection
	})
}

// Custom Styles

function styles() {
	return src('app/' + preprocessor + '/main.*')
	.pipe(eval(preprocessor)())
	.pipe(concat('app.min.css'))
	.pipe(autoprefixer({ overrideBrowserslist: ['last 10 versions'], grid: true }))
	.pipe(cleancss( {level: { 1: { specialComments: 0 } } }))
	.pipe(dest('app/css'))
	.pipe(browserSync.stream())
}

// Pug

function pug2html() {
  return src('app/pug/*.pug')
    .pipe(plumber())
    .pipe(pug({pretty: true}))
    .pipe(plumber.stop())
    .pipe(gulpif(argv.prod, htmlValidator()))
    .pipe(dest('app'))
};

// Scripts & JS Libraries

function scripts() {
	return src([
		// 'node_modules/jquery/dist/jquery.min.js', // npm vendor example (npm i --save-dev jquery)
		'app/js/app.js' // app.js. Always at the end
		])
	.pipe(concat('app.min.js'))
	.pipe(uglify()) // Minify JS (opt.)
	.pipe(dest('app/js'))
	.pipe(browserSync.stream())
}

// Images

function images() {
	return src('app/images/src/**/*')
	.pipe(newer('app/images/dest'))
	.pipe(imagemin())
	.pipe(dest('app/images/dest'))
}

function cleanimg() {
	return del('app/images/dest/**/*', { force: true })
}

// Deploy

function deploy() {
	return src('app/')
	.pipe(rsync({
		root: 'app/',
		hostname: 'username@yousite.com',
		destination: 'yousite/public_html/',
		// include: ['*.htaccess'], // Included files
		exclude: ['**/Thumbs.db', '**/*.DS_Store'], // Excluded files
		recursive: true,
		archive: true,
		silent: false,
		compress: true
	}))
}

// Делаем SVG спрайт

function spriteSVG() {
  return src('app/images/sprite/svg/*.svg')
    .pipe(svgmin({
      js2svg: {
        pretty: true
      }
    }))
    .pipe(cheerio({
      run: function ($) {
        $('[fill]').removeAttr('fill');
        $('[stroke]').removeAttr('stroke');
        $('[style]').removeAttr('style');
      },
      parserOptions: {xmlMode: true}
    }))
    .pipe(replace('&gt;', '>'))
    .pipe(svgSprite({
      mode: {
        symbol: {
          sprite: "sprite.svg"
        }
      }
    }))
    .pipe(dest('app/images/sprite'));
};


// Watching

function startwatch() {
	watch('app/pug/**/*', parallel('pug2html'));
	watch('app/' + preprocessor + '/**/*', parallel('styles'));
	watch(['app/**/*.js', '!app/js/*.min.js'], parallel('scripts'));
	watch(['app/**/*.{' + imageswatch + '}'], parallel('images'));
	watch(['app/images/sprite/svg/*'], parallel('spriteSVG'));
	watch(['app/**/*.{' + fileswatch + '}']).on('change', browserSync.reload);
}

exports.browsersync = browsersync;
exports.assets      = series(pug2html,cleanimg, styles, scripts, images, spriteSVG);
exports.pug2html    = pug2html;
exports.styles      = styles;
exports.scripts     = scripts;
exports.images      = images;
exports.cleanimg    = cleanimg;
exports.spriteSVG    = spriteSVG;
exports.deploy      = deploy;
exports.default     = parallel(pug2html,images, styles, scripts, browsersync, spriteSVG, startwatch);
