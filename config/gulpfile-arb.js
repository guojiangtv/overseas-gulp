//引入插件
var gulp     = require('gulp'),
cleanCss     = require('gulp-clean-css'),
uglify       = require('gulp-uglify'),
less         = require('gulp-less'),
plumber      = require('gulp-plumber'), // less报错时不退出watch
clean        = require('gulp-clean'),
fs           = require('fs'), //获取真实路径
runSequence  = require('run-sequence'),
rev          = require('gulp-rev-params'),
revCollector = require('gulp-rev-collector-params'),
gulpif       = require('gulp-if'),
changed      = require('gulp-changed'),
debug        = require('gulp-debug'),
postcss      = require('gulp-postcss'),
autoprefixer = require('autoprefixer'),
sourcemaps   = require('gulp-sourcemaps');

// 任务处理的文件路径配置
var arb_m_src = {
        js: fs.realpathSync('../src/arb/mobile/js') + '/**/*.js',
        css: fs.realpathSync('../src/arb/mobile/css') + '/**/*',
        img: '../src/arb/mobile/img/**',
        base: '../src/arb/mobile/'
    },
    arb_m_dist = {
        jscss: [
            fs.realpathSync('../dist/arb/mobile/js') + '/**/*.js',
            fs.realpathSync('../dist/arb/mobile/css') + '/**/*.css'
        ]
    },
    arb_m_output = '../dist/arb/mobile';

//定义句柄状态为未发布
var isRelease = false;

function arb(){
    /******************************** mobile ****************************/

    //清除dist目录中的js和css文件 不常用
    gulp.task('clean:arb', function() {
        return gulp.src(arb_m_dist.jscss, { read: false })
            .pipe(clean({ force: true }));
    })

    //处理js 压缩 混淆 添加版本号
    gulp.task('scripts:arb', function() {
        return gulp.src(arb_m_src.js, { base: arb_m_src.base })
            .pipe(gulpif(!isRelease, changed(arb_m_output)))
            .pipe(gulpif(isRelease, sourcemaps.init()))
            .pipe(gulpif(isRelease, uglify()))
            .on('error', errorHandler)
            .pipe(gulpif(isRelease, rev()))
            .pipe(debug({ title: 'js:' }))
            .pipe(gulpif(isRelease, sourcemaps.write('./maps')))
            .pipe(gulp.dest(arb_m_output))
            .pipe(gulpif(isRelease, rev.manifest()))
            .pipe(gulpif(isRelease, gulp.dest('./rev/mobile/js/')));
    });

    gulp.task('less:arb', function() {
        return gulp.src(arb_m_src.css, { base: arb_m_src.base })
            .pipe(gulpif(!isRelease, changed(arb_m_output, {extension: '.css'})))
            .pipe(sourcemaps.init())
            .pipe(less()).on('error', errorHandler)
            .pipe(sourcemaps.write())
            .pipe(plumber())
            .pipe(postcss([autoprefixer()]))
            .pipe(gulpif(isRelease, cleanCss()))
            .pipe(gulpif(isRelease, rev()))
            .pipe(debug({ title: 'css:' }))
            .pipe(gulp.dest(arb_m_output))
            .pipe(gulpif(isRelease, rev.manifest()))
            .pipe(gulpif(isRelease, gulp.dest('./rev/mobile/css/')));
    });

    gulp.task('images:arb', function() {
        return gulp.src(arb_m_src.img, { base: arb_m_src.base })
            .pipe(gulpif(!isRelease, changed(arb_m_output)))
            .pipe(gulpif(isRelease, rev()))
            // .pipe(tiny())
            .pipe(gulp.dest(arb_m_output))
            .pipe(gulpif(isRelease, rev.manifest()))
            .pipe(gulpif(isRelease,gulp.dest('./rev/mobile/img/')));
    });

    gulp.task('rev:arb', function() {
        //为php模板添加版本号
        gulp.src(['./rev/mobile/**/*.json', '../../cblive/web/protected/modules/arb/views/**/*.php'])
            .pipe(revCollector({replaceReved: true}))
            .pipe(gulp.dest(fs.realpathSync('../../cblive/web/protected/modules/arb/views/')));
        //为css中图片添加版本号
        gulp.src(['./rev/mobile/img/*.json', '../dist/arb/mobile/css/*'])
            .pipe(revCollector({replaceReved: true}))
            .pipe(gulp.dest(fs.realpathSync('../dist/arb/mobile/css/')));
        //为js中图片添加版本号
        gulp.src(['./rev/mobile/img/*.json', '../dist/arb/mobile/js/*'])
            .pipe(revCollector({replaceReved: true}))
            .pipe(gulp.dest(fs.realpathSync('../dist/arb/mobile/js/')));
    });


    // 测试以及线上环境 ,每次发布的时候会对所有的文件添加新版本号
    gulp.task('arb_release', function() {
        //更改句柄为发布状态
        isRelease = true;
        return runSequence(
            ['images:arb', 'less:arb', 'scripts:arb'], ['rev:arb']
        );
    });

    //本地开发环境
    gulp.task('arb_dev', function() {
        return runSequence(
            ['images:arb', 'less:arb', 'scripts:arb'],
            function() {
                var less_watcher = gulp.watch(arb_m_src.css, ['less:arb']);
                less_watcher.on('change', function(event) {
                    console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
                })
                var js_watcher = gulp.watch(arb_m_src.js, ['scripts:arb']);
                js_watcher.on('change', function(event) {
                    console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
                })
            }
        );
    });


    /***************** 移动待发布文件到trunk ***********************/

    var file = './arbfile.txt';
    gulp.task('arb_move', function() {
        fs.readFile(file, function(err, obj) {
            console.log('err:', err);
            var obj = obj.toString().replace(/\s{2,}/g, '\n').replace(/(^\s+)|(\s+$)/g, '').split('\n');
            for (var i = 0; i < obj.length; i++) {
                var srcFile = '/var/www/' + obj[i].replace(/\s+/g, '');
                if (srcFile.indexOf('.') == -1) {
                    srcFile = srcFile + '/**/*.*';
                }
                console.log('dir:', srcFile);
                gulp.src(srcFile, { base: '../../' })
                    .pipe(debug('file:', srcFile))
                    .pipe(gulp.dest(fs.realpathSync('../../trunk')));
            }
        })
    });

    /*错误处理*/
    function errorHandler(error) {
        console.log(error.toString());
        this.emit('end');
    }

}

module.exports = arb;