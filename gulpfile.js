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
var m_src = {
        js: fs.realpathSync('../src/mobile/js') + '/**/*.js',
        css: fs.realpathSync('../src/mobile/css') + '/**/*',
        img: '../src/mobile/img/**',
        base: '../src/mobile/'
    },
    m_dist = {
        jscss: [
            fs.realpathSync('../dist/mobile/js') + '/**/*.js',
            fs.realpathSync('../dist/mobile/css') + '/**/*.css'
        ]
    },
    pc_src = {
        js: fs.realpathSync('../src/pc/js') + '/**/*.js',
        less: fs.realpathSync('../src/pc/css') + '/**/*.less',
        css: fs.realpathSync('../src/pc/css') + '/**/*.css',
        cssall: fs.realpathSync('../src/pc/css') + '/**',
        img: '../src/pc/img/**',
        base: '../src/pc/'
    },
    pc_dist = {
        jscss: [
            fs.realpathSync('../dist/pc/js') + '/**/*.js',
            fs.realpathSync('../dist/pc/css') + '/**/*.css'
        ]
    },
    m_output = '../dist/mobile',
    pc_output = '../dist/pc';

//定义句柄状态为未发布
var isRelease = false;

/******************************** mobile ****************************/

//清除dist目录中的js和css文件 不常用
gulp.task('clean', function() {
    return gulp.src(m_dist.jscss, { read: false })
        .pipe(clean({ force: true }));
})

//处理js 压缩 混淆 添加版本号
gulp.task('scripts', function() {
    return gulp.src(m_src.js, { base: m_src.base })
        .pipe(gulpif(!isRelease, changed(m_output)))
        .pipe(gulpif(isRelease, sourcemaps.init()))
        .pipe(gulpif(isRelease, uglify()))
        .on('error', errorHandler)
        .pipe(gulpif(isRelease, rev()))
        .pipe(debug({ title: 'js:' }))
        .pipe(gulpif(isRelease, sourcemaps.write('./maps')))
        .pipe(gulp.dest(m_output))
        .pipe(gulpif(isRelease, rev.manifest()))
        .pipe(gulpif(isRelease, gulp.dest('./rev/mobile/js/')));
});

gulp.task('less', function() {
    return gulp.src(m_src.css, { base: m_src.base })
        .pipe(gulpif(!isRelease, changed(m_output, {extension: '.css'})))
        .pipe(sourcemaps.init())
        .pipe(less()).on('error', errorHandler)
        .pipe(sourcemaps.write())
        .pipe(plumber())
        .pipe(gulpif(!isRelease, postcss([autoprefixer()])))
        .pipe(gulpif(isRelease, cleanCss()))
        .pipe(gulpif(isRelease, rev()))
        .pipe(debug({ title: 'css:' }))
        .pipe(gulp.dest(m_output))
        .pipe(gulpif(isRelease, rev.manifest()))
        .pipe(gulpif(isRelease, gulp.dest('./rev/mobile/css/')));
});

gulp.task('images', function() {
    return gulp.src(m_src.img, { base: m_src.base })
        .pipe(gulpif(!isRelease, changed(m_output)))
        .pipe(gulpif(isRelease, rev()))
        // .pipe(tiny())
        .pipe(gulp.dest(m_output))
        .pipe(gulpif(isRelease, rev.manifest()))
        .pipe(gulpif(isRelease,gulp.dest('./rev/mobile/img/')));
});

gulp.task('rev', function() {
    //为php模板添加版本号
    gulp.src(['./rev/mobile/**/*.json', '../../cblive/web/protected/modules/mobile/views/**/*.php'])
        .pipe(revCollector({replaceReved: true}))
        .pipe(gulp.dest(fs.realpathSync('../../cblive/web/protected/modules/mobile/views/')));
    //为css中图片添加版本号
    gulp.src(['./rev/mobile/img/*.json', '../dist/mobile/css/*'])
        .pipe(revCollector({replaceReved: true}))
        .pipe(gulp.dest(fs.realpathSync('../dist/mobile/css/')));
    //为js中图片添加版本号
    gulp.src(['./rev/mobile/img/*.json', '../dist/mobile/js/*'])
        .pipe(revCollector({replaceReved: true}))
        .pipe(gulp.dest(fs.realpathSync('../dist/mobile/js/')));
});


// 测试以及线上环境 ,每次发布的时候会对所有的文件添加新版本号
gulp.task('release', function() {
    //更改句柄为发布状态
    isRelease = true;
    return runSequence(
        ['images', 'less', 'scripts'], ['rev']
    );
});

//本地开发环境
gulp.task('dev', function() {
    return runSequence(
        ['images', 'less', 'scripts'],
        function() {
            var less_watcher = gulp.watch(m_src.css, ['less']);
            less_watcher.on('change', function(event) {
                console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
            })
            var js_watcher = gulp.watch(m_src.js, ['scripts']);
            js_watcher.on('change', function(event) {
                console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
            })
        }
    );
});

//默认执行gulp dev命令
gulp.task('default', ['dev'])




/***************** 移动待发布文件到trunk ***********************/

var file = './cblivefile.txt';
gulp.task('move', function() {
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




/******************************** PC 暂无********************************/

/*清除*/
gulp.task('pc_clean', function() {
    return gulp.src(pc_dist.jscss, { read: false })
        .pipe(clean({ force: true }));
})

gulp.task('pc_scripts', function() {
    return gulp.src(pc_src.js, { base: pc_src.base })
        .pipe(gulpif(!isRelease, changed(pc_output)))
        .pipe(gulpif(isRelease, sourcemaps.init()))
        .pipe(gulpif(isRelease, uglify()))
        .on('error', errorHandler)
        .pipe(rev())
        .pipe(debug({ title: 'js:' }))
        .pipe(gulpif(isRelease, sourcemaps.write('./maps')))
        .pipe(gulp.dest(pc_output))
        .pipe(rev.manifest())
        .pipe(gulp.dest('./rev/pc/js/'));
});

gulp.task('pc_less', function() {
    return gulp.src(pc_src.less, { base: pc_src.base })
        .pipe(gulpif(!isRelease, changed(pc_output, { extension: '.css' })))
        .pipe(plumber())
        .pipe(less()).on('error', errorHandler)
        .pipe(gulpif(isRelease, cleanCss({ compatibility: 'ie7' })))
        .pipe(rev())
        .pipe(debug({ title: 'css:' }))
        .pipe(gulp.dest(pc_output))
        .pipe(rev.manifest())
        .pipe(gulp.dest('./rev/pc/css/'));
});
gulp.task('pc_css', function() {
    return gulp.src(pc_src.css, { base: pc_src.base })
        .pipe(gulpif(!isRelease, changed(pc_output, { extension: '.css' })))
        .pipe(plumber())
        .pipe(gulpif(isRelease, cleanCss({ compatibility: 'ie7' })))
        .pipe(rev())
        .pipe(debug({ title: 'css:' }))
        .pipe(gulp.dest(pc_output))
        .pipe(rev.manifest())
        .pipe(gulp.dest('./rev/pc/css/'));
});

gulp.task('pc_images', function() {
    return gulp.src(pc_src.img, { base: pc_src.base })
        .pipe(gulpif(!isRelease, changed(pc_output)))
        .pipe(rev())
        .pipe(gulp.dest(pc_output))
        .pipe(rev.manifest())
        .pipe(gulp.dest('./rev/pc/img/'));

});
gulp.task('pc_rev', function() {
    gulp.src(['./rev/pc/**/*.json', '../../cblive/web/protected/views/**/*.php'])
        .pipe(revCollector({
            replaceReved: true
        }))
        .pipe(gulp.dest(fs.realpathSync('../../cblive/web/protected/views/')));

    gulp.src(['./rev/pc/img/*.json', '../dist/pc/css/*'])
        .pipe(revCollector({
            replaceReved: true
        }))
        .pipe(gulp.dest(fs.realpathSync('../dist/pc/css/')));

    gulp.src(['./rev/pc/img/*.json', '../dist/pc/js/*'])
        .pipe(revCollector({
            replaceReved: true
        }))
        .pipe(gulp.dest(fs.realpathSync('../dist/pc/js/')));
});


/* 测试 和 线上环境 */
gulp.task('pc_release', function() {
    isRelease = true;
    return runSequence(
        ['pc_images', 'pc_less', 'pc_css', 'pc_scripts'], ['pc_rev']
    );
});

/* 本地开发环境 */
gulp.task('pc_dev', function() {
    return runSequence(
        ['pc_images', 'pc_less', 'pc_css', 'pc_scripts'],
        function() {
            //watch监听需要监听路径，不能监听具体后缀名文件，所以此处用cssall
            var less_watcher = gulp.watch(pc_src.cssall, ['pc_less']);
            less_watcher.on('change', function(event) {
                console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
            })

            var js_watcher = gulp.watch(pc_src.js, ['pc_scripts']);
            js_watcher.on('change', function(event) {
                console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
            })

        }
    );

});





//使用connect启动一个Web服务器
gulp.task('server', function() {
    connect.server();
});

