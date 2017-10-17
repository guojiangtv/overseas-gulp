### 海外项目的gulp环境配置
2017-09-26 17:59:11 jesse  

新增加插件gulp-postcss autoprefixer  （依赖包中已安装）  
作用：根据配置的浏览器兼容性列表自动添加浏览器前缀

待确认使用的插件  

* tiny = require('gulp-tinypng-nokey'), //图片压缩

2017-09-27 11:20:46 jesse

在发布到测试及线上时不执行autoprefixer,只在开发环境中执行  
.pipe(gulpif(!isRelease, postcss([autoprefixer()])))

### 待解决的问题
1. gulp release会对全部文件进行操作（压缩添加版本号等）